// Runs the delete-account Edge Function for real in Deno, with fetch stubbed for Supabase.
// Run from the repo root: npm run test:functions
const calls: { method: string; url: string; body?: string }[] = [];
const ME = '22222222-2222-2222-2222-222222222222';
let user: unknown = { id: ME, aud: 'authenticated', role: 'authenticated', email: 'a@b.co', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
let prepareStatus = 204;
let deleteStatus = 200;

const realFetch = globalThis.fetch;
globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
  const req = new Request(input, init);
  const body = req.method === 'POST' ? await req.clone().text() : undefined;
  calls.push({ method: req.method, url: req.url, body });
  if (req.url.startsWith('https://example.supabase.co/auth/v1/user')) return user ? Response.json(user) : Response.json({ msg: 'bad jwt' }, { status: 401 });
  if (req.url.includes('/rest/v1/rpc/prepare_account_deletion')) return prepareStatus === 204 ? new Response(null, { status: 204 }) : Response.json({ message: 'boom' }, { status: prepareStatus });
  if (req.url.includes('/auth/v1/admin/users/') && req.method === 'DELETE') return deleteStatus === 200 ? Response.json({}) : Response.json({ message: 'boom' }, { status: deleteStatus });
  return realFetch(input, init);
};

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
let handler!: (r: Request) => Promise<Response>;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: typeof handler) => { handler = h; };
await import('../../functions/delete-account/index.ts');

const post = (headers: Record<string, string> = { Authorization: 'Bearer user-jwt' }, body: unknown = {}) =>
  handler(new Request('http://fn/delete-account', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
let failures = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(extra)); if (!ok) failures++; };

let r = await post();
check('200 and the account is deleted', r.status === 200 && (await r.json()).ok === true);
const prep = calls.find((c) => c.url.includes('prepare_account_deletion'));
const del = calls.find((c) => c.method === 'DELETE');
check('groups are handed over before the delete', !!prep && !!del && calls.indexOf(prep) < calls.indexOf(del));
check('only the signed-in person is deleted', JSON.parse(prep!.body!).p_user === ME && del!.url.endsWith(`/admin/users/${ME}`), [prep?.body, del?.url]);

// Someone else's id in the request changes nothing: the token decides.
calls.length = 0;
r = await post({ Authorization: 'Bearer user-jwt' }, { userId: '99999999-9999-9999-9999-999999999999' });
check('an id in the body is ignored', r.status === 200 && calls.find((c) => c.method === 'DELETE')!.url.endsWith(`/admin/users/${ME}`) && !calls.some((c) => c.url.includes('9999')));

user = null; calls.length = 0;
r = await post();
check('401 when the token is not valid, and nothing is deleted', r.status === 401 && !calls.some((c) => c.method === 'DELETE' || c.url.includes('prepare_account_deletion')));
r = await post({});
check('401 with no token', r.status === 401);
user = { id: ME, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

prepareStatus = 500; calls.length = 0;
r = await post();
check('500 and nothing deleted when handing over groups fails', r.status === 500 && !calls.some((c) => c.method === 'DELETE'));
prepareStatus = 204; deleteStatus = 500;
r = await post();
check('500 when the delete itself fails', r.status === 500 && (await r.json()).error === 'delete_failed');

check('405 for GET', (await handler(new Request('http://fn/delete-account'))).status === 405);

console.log(failures === 0 ? 'ALL PASSED' : `${failures} FAILED`);
Deno.exit(failures === 0 ? 0 : 1);
