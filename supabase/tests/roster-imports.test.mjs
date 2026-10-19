// The monthly limit on screenshot roster imports (supabase/migrations/*_roster_imports.sql).
// Run from the repo root: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './harness.mjs';

const ANA = '00000000-0000-0000-0000-0000000000c1';
const BEN = '00000000-0000-0000-0000-0000000000c2';

let db;
let as;

before(async () => {
  ({ db, as } = await createDb());
  await db.query('insert into auth.users (id) values ($1), ($2)', [ANA, BEN]);
  for (const [id, name] of [[ANA, 'Ana'], [BEN, 'Ben']]) {
    await as(id, `insert into public.profiles (id, display_name, role, airline) values ($1, $2, 'cabin_crew', 'SIA')`, [id, name]);
  }
});

const claim = async (user, limit = 3, images = 2) => (await db.query('select public.claim_roster_import($1, $2, $3) as id', [user, images, limit])).rows[0].id;

test('row-level security is on, and nobody can write imports directly', async () => {
  const [{ relrowsecurity }] = (await db.query(`select relrowsecurity from pg_class where oid = 'public.roster_imports'::regclass`)).rows;
  assert.equal(relrowsecurity, true);
  await assert.rejects(() => as(ANA, `insert into public.roster_imports (user_id, images) values ($1, 1)`, [ANA]));
  await assert.rejects(() => as(null, 'select * from public.roster_imports'));
});

test('only the service role can claim or finish an import', async () => {
  for (const user of [ANA, null]) {
    await assert.rejects(() => as(user, 'select public.claim_roster_import($1, 1, 5)', [ANA]));
    await assert.rejects(() => as(user, `select public.finish_roster_import(gen_random_uuid(), 'done')`));
  }
});

test('an import is allowed until the monthly limit, then refused', async () => {
  const ids = [await claim(ANA), await claim(ANA), await claim(ANA)];
  assert.ok(ids.every(Boolean));
  assert.equal(await claim(ANA), null);
  // The limit is per person.
  assert.ok(await claim(BEN));
});

test('failed imports do not use up the limit, and last month does not count', async () => {
  const [{ id }] = (await db.query(`select id from public.roster_imports where user_id = $1 order by created_at limit 1`, [ANA])).rows;
  await db.query(`select public.finish_roster_import($1, 'failed')`, [id]);
  assert.ok(await claim(ANA));
  assert.equal(await claim(ANA), null);
  await db.query(`update public.roster_imports set created_at = now() - interval '40 days' where user_id = $1`, [ANA]);
  assert.ok(await claim(ANA));
});

test('people see only their own imports and how many are left', async () => {
  assert.ok((await as(ANA, 'select * from public.roster_imports')).every((r) => r.user_id === ANA));
  assert.ok((await as(BEN, 'select * from public.roster_imports')).every((r) => r.user_id === BEN));
  const [{ roster_imports_left: left }] = await as(BEN, 'select public.roster_imports_left(3)');
  assert.equal(left, 2);
  await assert.rejects(() => as(null, 'select public.roster_imports_left(3)'));
});

test('finish only accepts done or failed', async () => {
  const id = await claim(BEN);
  await db.query(`select public.finish_roster_import($1, 'bogus')`, [id]);
  const [{ status }] = (await db.query('select status from public.roster_imports where id = $1', [id])).rows;
  assert.equal(status, 'started');
  await db.query(`select public.finish_roster_import($1, 'done')`, [id]);
  assert.equal((await db.query('select status from public.roster_imports where id = $1', [id])).rows[0].status, 'done');
});
