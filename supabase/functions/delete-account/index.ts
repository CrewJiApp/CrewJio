// Delete the signed-in person's account and everything in it. Required by the App Store and
// Google Play. Only the person themselves can call it: the account deleted is always the one the
// request's own token belongs to, never one named in the request.
//
// 1. prepare_account_deletion hands any group they started to its longest-standing other member,
//    so other people's groups are not deleted with them.
// 2. Deleting the auth user removes their profile, roster, memberships, partner link, overrides and
//    import counts through the existing "on delete cascade" links.
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.error('[delete-account] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return reply(500, { error: 'not_set_up' });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) return reply(401, { error: 'not_signed_in' });
  const userId = data.user.id;

  const { error: prepareError } = await admin.rpc('prepare_account_deletion', { p_user: userId });
  if (prepareError) {
    console.error('[delete-account] prepare failed:', prepareError.code);
    return reply(500, { error: 'delete_failed' });
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('[delete-account] delete failed:', deleteError.status);
    return reply(500, { error: 'delete_failed' });
  }
  return reply(200, { ok: true });
});
