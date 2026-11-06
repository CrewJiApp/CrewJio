// Runs the roster-import Edge Function for real in Deno, with fetch stubbed for Supabase and Claude.
// Needs Deno (nothing to install: npx deno works). Run from the repo root:
//   npx deno run --node-modules-dir=none --no-lock --allow-env --allow-net --allow-read --allow-import supabase/tests/functions/roster-import.e2e.ts
const calls: { url: string; body?: string }[] = [];
let claudeAnswer: unknown = {};
let claudeStatus = 200;
const OK_CLAIM = { import_id: '11111111-1111-1111-1111-111111111111', reason: null };
let claimResult: { import_id: string | null; reason: string | null } = OK_CLAIM;
let user: unknown = { id: '22222222-2222-2222-2222-222222222222', aud: 'authenticated', role: 'authenticated', email: 'a@b.co', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const finished: string[] = [];

const realFetch = globalThis.fetch;
globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
  const req = new Request(input, init);
  const url = req.url;
  const body = req.method === 'POST' ? await req.clone().text() : undefined;
  calls.push({ url, body });
  if (url.startsWith('https://example.supabase.co/auth/v1/user')) {
    return user ? Response.json(user) : Response.json({ msg: 'bad jwt' }, { status: 401 });
  }
  if (url.includes('/rest/v1/rpc/claim_roster_import')) return Response.json([claimResult]);
  if (url.includes('/rest/v1/rpc/finish_roster_import')) { finished.push(JSON.parse(body!).p_status); return new Response(null, { status: 204 }); }
  if (url === 'https://api.anthropic.com/v1/messages') {
    if (req.headers.get('x-api-key') !== 'test-key') return new Response('no', { status: 401 });
    return Response.json(claudeAnswer, { status: claudeStatus });
  }
  return realFetch(input, init);
};

Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
let handler!: (r: Request) => Promise<Response>;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: typeof handler) => { handler = h; };
await import('../../functions/roster-import/index.ts');

const jpeg = '/9j/4AAQSkZJRgABAQ' + 'A'.repeat(100);
const post = (b: unknown, headers: Record<string, string> = { Authorization: 'Bearer user-jwt' }) =>
  handler(new Request('http://fn/roster-import', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b) }));
const answer = (rows: unknown[], looks = true) => ({ content: [{ type: 'tool_use', name: 'submit_roster', input: { looksLikeRoster: looks, view: 'list', rows } }] });
let failures = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(extra)); if (!ok) failures++; };

// 1. happy path
claudeAnswer = answer([
  { date: '2026-11-02', duty: 'fly', flight: 'sq148', sector: 'sin-bwn', rpt: '07:00', std: '0900', sta: '1115', ac: '7M8', actingRank: 'FSS', staffNo: '555555' },
  { date: '2026-11-02', duty: 'OFFD' }, { date: '2026-11-02', duty: 'OFFD' }, { date: 'bad', duty: 'X' },
]);
let r = await post({ images: [jpeg, 'data:image/jpeg;base64,' + jpeg], today: '2026-10-19' });
let j = await r.json();
check('200 with cleaned rows', r.status === 200 && j.rows.length === 2 && j.dropped === 2 && j.rows[0].flight === 'SQ 148' && !JSON.stringify(j).includes('555555') && !JSON.stringify(j).includes('7M8'), j);
check('import marked done', finished.at(-1) === 'done', finished);
const sent = JSON.parse(calls.find((c) => c.url.includes('anthropic'))!.body!);
check('two images and the date went to Claude', sent.messages[0].content.filter((c: { type: string }) => c.type === 'image').length === 2 && sent.messages[0].content.at(-1).text.includes('2026-10-19') && sent.tool_choice.type === 'auto' && sent.tools[0].name === 'submit_roster', sent.tool_choice);
const claim = JSON.parse(calls.find((c) => c.url.includes('claim_roster_import'))!.body!);
check('claimed for the signed-in user with 2 images and the default limits (8 a month, 6 a day each, 120 a day in all)', claim.p_user === '22222222-2222-2222-2222-222222222222' && claim.p_images === 2 && claim.p_limit === 8 && claim.p_user_day === 6 && claim.p_all_day === 120, claim);

// 2. not signed in
user = null;
r = await post({ images: [jpeg] });
check('401 when the token is not valid', r.status === 401 && (await r.json()).error === 'not_signed_in');
user = { id: '22222222-2222-2222-2222-222222222222', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
r = await post({ images: [jpeg] }, {});
check('401 with no token at all', r.status === 401);

// 3. bad input never reaches Claude or uses up an import
const before = calls.length;
const b64 = (text: string) => btoa(text);
const pdf = (pages: number) => b64('%PDF-1.4\n' + Array.from({ length: pages }, () => '<< /Type /Page /Parent 1 0 R >>').join('\n'));
const png = 'iVBORw0KGgoAAAANSUhEUgAA' + 'A'.repeat(100);
const webp = 'UklGRgAAAABXRUJQ' + 'A'.repeat(100);
for (const [name, body] of [
  ['no images', { images: [] }],
  ['5 images', { images: [jpeg, jpeg, jpeg, jpeg, jpeg] }],
  ['a PNG', { images: [png] }],
  ['a WebP', { images: [webp] }],
  ['a GIF', { images: ['R0lGODlhAQABAA' + 'A'.repeat(100)] }],
  ['a PDF with too many pages', { images: [pdf(7)] }],
  ['a PDF that is too big', { images: ['JVBERi0x' + 'A'.repeat(3_500_000)] }],
  ['a PDF mixed with a screenshot', { images: [pdf(1), jpeg] }],
  ['two PDFs', { images: [pdf(1), pdf(1)] }],
  ['a JPEG that is too big', { images: ['/9j/' + 'A'.repeat(5_000_000)] }],
  ['not an array', { images: 'x' }],
] as const) {
  const res = await post(body);
  check(`400 for ${name}`, res.status === 400, res.status);
}
check('bad input made no Claude or claim calls', !calls.slice(before).some((c) => c.url.includes('anthropic') || c.url.includes('claim_roster_import')));
r = await handler(new Request('http://fn/roster-import', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '30000000', Authorization: 'Bearer user-jwt' }, body: '{}' }));
check('413 for a request body over 20 MB, unread', r.status === 413);

// 3b. a single small PDF is accepted and goes to Claude as a document
claudeAnswer = answer([{ date: '2026-11-03', duty: 'OFFD' }]);
r = await post({ images: [pdf(3)] });
const pdfSent = JSON.parse(calls.filter((c) => c.url.includes('anthropic')).at(-1)!.body!);
check('a 3-page PDF is read as one document', r.status === 200 && pdfSent.messages[0].content[0].type === 'document' && pdfSent.messages[0].content[0].source.media_type === 'application/pdf' && pdfSent.max_tokens === 8000, r.status);

// 4. monthly limit
claimResult = { import_id: null, reason: 'limit_reached' };
r = await post({ images: [jpeg] });
j = await r.json();
check('429 limit_reached, and Claude is not called', r.status === 429 && j.error === 'limit_reached' && j.limit === 8 && !calls.slice(-2).some((c) => c.url.includes('anthropic')), j);
for (const [reason, status] of [['busy', 429], ['daily_limit', 429], ['service_busy', 503]] as const) {
  claimResult = { import_id: null, reason };
  const n = calls.length;
  r = await post({ images: [jpeg] });
  check(`${status} ${reason}, and Claude is not called`, r.status === status && (await r.json()).error === reason && !calls.slice(n).some((c) => c.url.includes('anthropic')), r.status);
}
claimResult = OK_CLAIM;

// 5. not a roster
claudeAnswer = answer([], false);
r = await post({ images: [jpeg] });
check('422 not_a_roster and the import is marked failed', r.status === 422 && (await r.json()).error === 'not_a_roster' && finished.at(-1) === 'failed');
claudeAnswer = answer([{ date: 'nope', duty: '??' }]);
r = await post({ images: [jpeg] });
check('422 when nothing usable comes back', r.status === 422 && finished.at(-1) === 'failed');
claudeAnswer = { content: [{ type: 'text', text: 'I cannot' }] };
r = await post({ images: [jpeg] });
check('422 when Claude makes no tool call', r.status === 422);

// 6. Claude is down
claudeStatus = 529; claudeAnswer = { error: { message: 'overloaded: here is some echoed screenshot text' } };
r = await post({ images: [jpeg] });
j = await r.json();
check('502 read_failed, marked failed, and no Claude text is passed on', r.status === 502 && j.error === 'read_failed' && finished.at(-1) === 'failed' && !JSON.stringify(j).includes('echoed'), j);
claudeStatus = 200;

// 7. wrong method / options
const get = await handler(new Request('http://fn/roster-import'));
check('405 for GET', get.status === 405);
const opt = await handler(new Request('http://fn/roster-import', { method: 'OPTIONS' }));
check('OPTIONS answers', opt.status === 200);

console.log(failures === 0 ? 'ALL PASSED' : `${failures} FAILED`);
Deno.exit(failures === 0 ? 0 : 1);
