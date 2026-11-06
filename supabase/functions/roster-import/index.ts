// Screenshot roster import. The app sends 1 to 4 resized roster screenshots; we read them with
// Claude (vision), clean the rows, and send them back for the person to check. Nothing is
// stored: the screenshots live only in this request, and only a count is logged for the
// monthly limit. Secrets (Edge Function secrets only, never the app):
//   ANTHROPIC_API_KEY             Claude API key
//   ROSTER_IMPORT_MONTHLY_LIMIT   optional, imports per person per month (default 8)
//   ROSTER_IMPORT_DAILY_LIMIT     optional, tries per person per 24 hours, failed ones included (default 6)
//   ROSTER_IMPORT_DAILY_LIMIT_ALL optional, tries across everybody per 24 hours (default 120)
//   ROSTER_IMPORT_MODEL           optional, Claude model id
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
// Setup steps for Nick: docs/setup-roster-import.md.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { sanitizeRows } from './parse.ts';
import { buildRequest, extractResult, fileType, pdfPageCount, type ImageInput } from './prompt.ts';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const DEFAULT_LIMIT = 8;
const DEFAULT_DAILY_LIMIT = 6;
const DEFAULT_DAILY_LIMIT_ALL = 120;
const MAX_IMAGES = 4;
/** About 3.5 MB of image per screenshot once base64 encoded. The app resizes well below this. */
const MAX_IMAGE_CHARS = 4_700_000;
/** A PDF is one file of about 2.5 MB at most (base64), and a few pages: a month of roster is 1 to 3. */
const MAX_PDF_CHARS = 3_400_000;
const MAX_PDF_PAGES = 6;
/** Everything in one request: four screenshots plus the wrapper. Anything bigger is refused unread. */
const MAX_BODY_BYTES = 20_000_000;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !url || !serviceKey) {
    console.error('[roster-import] missing ANTHROPIC_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return reply(500, { error: 'not_set_up' });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Who is asking: the signed-in person's own token.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply(401, { error: 'not_signed_in' });
  const userId = auth.user.id;

  if (Number(req.headers.get('content-length')) > MAX_BODY_BYTES) return reply(413, { error: 'bad_image' });

  let body: { images?: unknown; today?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  const raw = Array.isArray(body.images) ? body.images : [];
  if (raw.length < 1 || raw.length > MAX_IMAGES) return reply(400, { error: 'bad_request' });
  const images: ImageInput[] = [];
  for (const item of raw) {
    const data = typeof item === 'string' ? item.replace(/^data:[^,]+,/, '') : '';
    const mediaType = fileType(data);
    if (!mediaType) return reply(400, { error: 'bad_image' });
    if (mediaType === 'application/pdf' && (data.length > MAX_PDF_CHARS || pdfPageCount(data) > MAX_PDF_PAGES)) return reply(400, { error: 'bad_image' });
    if (mediaType === 'image/jpeg' && data.length > MAX_IMAGE_CHARS) return reply(400, { error: 'bad_image' });
    images.push({ mediaType, data });
  }
  // A PDF goes alone: one file, never mixed with screenshots.
  if (images.some((i) => i.mediaType === 'application/pdf') && images.length > 1) return reply(400, { error: 'bad_image' });
  const today = typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);

  // Reserve one import for this month, or say the month is used up.
  const limit = Number(Deno.env.get('ROSTER_IMPORT_MONTHLY_LIMIT')) || DEFAULT_LIMIT;
  const { data: claim, error: claimError } = await admin.rpc('claim_roster_import', {
    p_user: userId,
    p_images: images.length,
    p_limit: limit,
    p_user_day: Number(Deno.env.get('ROSTER_IMPORT_DAILY_LIMIT')) || DEFAULT_DAILY_LIMIT,
    p_all_day: Number(Deno.env.get('ROSTER_IMPORT_DAILY_LIMIT_ALL')) || DEFAULT_DAILY_LIMIT_ALL,
  });
  const claimed = Array.isArray(claim) ? claim[0] : claim;
  if (claimError || !claimed) {
    console.error('[roster-import] claim failed:', claimError?.code);
    return reply(500, { error: 'read_failed' });
  }
  const importId: string | null = claimed.import_id ?? null;
  if (!importId) {
    const reason = String(claimed.reason ?? '');
    if (reason === 'service_busy') console.error('[roster-import] the daily allowance for everybody is used up');
    if (reason === 'service_busy') return reply(503, { error: 'service_busy' });
    if (reason === 'busy' || reason === 'daily_limit') return reply(429, { error: reason });
    return reply(429, { error: 'limit_reached', limit });
  }

  const finish = (status: 'done' | 'failed') => admin.rpc('finish_roster_import', { p_id: importId, p_status: status });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(buildRequest({ model: Deno.env.get('ROSTER_IMPORT_MODEL') || DEFAULT_MODEL, images, today })),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      // Log the status and Anthropic's error type and short message only, never the whole body.
      const detail = await res.json().then((b: { error?: { type?: unknown; message?: unknown } }) => ({ type: String(b?.error?.type ?? '').slice(0, 60), message: String(b?.error?.message ?? '').slice(0, 200) })).catch(() => ({ type: '', message: '' }));
      console.error('[roster-import] Claude returned', res.status, detail.type, detail.message);
      await finish('failed');
      return reply(502, { error: 'read_failed' });
    }
    const result = extractResult(await res.json());
    if (!result || !result.looksLikeRoster) {
      await finish('failed');
      return reply(422, { error: 'not_a_roster' });
    }
    const { rows, dropped } = sanitizeRows(result.rows);
    if (rows.length === 0) {
      await finish('failed');
      return reply(422, { error: 'not_a_roster' });
    }
    await finish('done');
    return reply(200, { rows, dropped, view: result.view, limit });
  } catch (e) {
    console.error('[roster-import] failed:', e instanceof Error ? e.name : 'error');
    await finish('failed');
    return reply(502, { error: 'read_failed' });
  }
});
