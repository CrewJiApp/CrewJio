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

// Returns the new import's id, or null when refused. Pass `why` to get the reason instead.
const claimFull = async (user, { limit = 3, images = 2, userDay = 100, allDay = 1000 } = {}) =>
  (await db.query('select * from public.claim_roster_import($1, $2, $3, $4, $5)', [user, images, limit, userDay, allDay])).rows[0];
const claim = async (user, limit = 3, images = 2) => (await claimFull(user, { limit, images })).import_id;
// Marks everything a person has started as finished, so the "one at a time" check does not get in the way.
const settle = (user) => db.query(`update public.roster_imports set status = 'done' where user_id = $1 and status = 'started'`, [user]);

test('row-level security is on, and nobody can write imports directly', async () => {
  const [{ relrowsecurity }] = (await db.query(`select relrowsecurity from pg_class where oid = 'public.roster_imports'::regclass`)).rows;
  assert.equal(relrowsecurity, true);
  await assert.rejects(() => as(ANA, `insert into public.roster_imports (user_id, images) values ($1, 1)`, [ANA]));
  await assert.rejects(() => as(null, 'select * from public.roster_imports'));
});

test('only the service role can claim or finish an import', async () => {
  for (const user of [ANA, null]) {
    await assert.rejects(() => as(user, 'select * from public.claim_roster_import($1, 1, 5, 6, 100)', [ANA]));
    await assert.rejects(() => as(user, `select public.finish_roster_import(gen_random_uuid(), 'done')`));
  }
});

test('an import is allowed until the monthly limit, then refused', async () => {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    ids.push(await claim(ANA));
    await settle(ANA);
  }
  assert.ok(ids.every(Boolean));
  const refused = await claimFull(ANA, { limit: 3 });
  assert.deepEqual([refused.import_id, refused.reason], [null, 'limit_reached']);
  // The limit is per person.
  assert.ok(await claim(BEN));
  await settle(BEN);
});

test('failed imports do not use up the limit, and last month does not count', async () => {
  const [{ id }] = (await db.query(`select id from public.roster_imports where user_id = $1 order by created_at limit 1`, [ANA])).rows;
  await db.query(`select public.finish_roster_import($1, 'failed')`, [id]);
  assert.ok(await claim(ANA));
  await settle(ANA);
  assert.equal(await claim(ANA), null);
  await db.query(`update public.roster_imports set created_at = now() - interval '40 days' where user_id = $1`, [ANA]);
  assert.ok(await claim(ANA));
  await settle(ANA);
});

test('people see only their own imports and how many are left', async () => {
  assert.ok((await as(ANA, 'select * from public.roster_imports')).every((r) => r.user_id === ANA));
  assert.ok((await as(BEN, 'select * from public.roster_imports')).every((r) => r.user_id === BEN));
  const [{ roster_imports_left: left }] = await as(BEN, 'select public.roster_imports_left(3)');
  assert.equal(left, 2);
  await assert.rejects(() => as(null, 'select public.roster_imports_left(3)'));
});

test('finish only accepts done or failed', async () => {
  const id = await claim(BEN, 10);
  await db.query(`select public.finish_roster_import($1, 'bogus')`, [id]);
  const [{ status }] = (await db.query('select status from public.roster_imports where id = $1', [id])).rows;
  assert.equal(status, 'started');
  await db.query(`select public.finish_roster_import($1, 'done')`, [id]);
  assert.equal((await db.query('select status from public.roster_imports where id = $1', [id])).rows[0].status, 'done');
});

test('only one import at a time per person, and a stuck one frees itself after 3 minutes', async () => {
  const cara = '00000000-0000-0000-0000-0000000000c3';
  await db.query('insert into auth.users (id) values ($1)', [cara]);
  await as(cara, `insert into public.profiles (id, display_name, role, airline) values ($1, 'Cara', 'cabin_crew', 'SIA')`, [cara]);
  assert.ok((await claimFull(cara)).import_id);
  const second = await claimFull(cara);
  assert.deepEqual([second.import_id, second.reason], [null, 'busy']);
  await db.query(`update public.roster_imports set created_at = now() - interval '4 minutes' where user_id = $1`, [cara]);
  assert.ok((await claimFull(cara)).import_id);
});

test('a daily limit per person counts failed reads too', async () => {
  const dan = '00000000-0000-0000-0000-0000000000c4';
  await db.query('insert into auth.users (id) values ($1)', [dan]);
  await as(dan, `insert into public.profiles (id, display_name, role, airline) values ($1, 'Dan', 'cabin_crew', 'SIA')`, [dan]);
  for (let i = 0; i < 3; i++) {
    const { import_id } = await claimFull(dan, { limit: 50, userDay: 3 });
    assert.ok(import_id);
    await db.query(`select public.finish_roster_import($1, 'failed')`, [import_id]);
  }
  const refused = await claimFull(dan, { limit: 50, userDay: 3 });
  assert.deepEqual([refused.import_id, refused.reason], [null, 'daily_limit']);
  // Tries from more than a day ago do not count.
  await db.query(`update public.roster_imports set created_at = now() - interval '25 hours' where user_id = $1`, [dan]);
  assert.ok((await claimFull(dan, { limit: 50, userDay: 3 })).import_id);
});

test('a daily limit across everybody stops many accounts adding up', async () => {
  const eve = '00000000-0000-0000-0000-0000000000c5';
  await db.query('insert into auth.users (id) values ($1)', [eve]);
  await as(eve, `insert into public.profiles (id, display_name, role, airline) values ($1, 'Eve', 'cabin_crew', 'SIA')`, [eve]);
  const [{ n }] = (await db.query(`select count(*)::int as n from public.roster_imports where created_at > now() - interval '24 hours'`)).rows;
  const refused = await claimFull(eve, { limit: 50, userDay: 50, allDay: n });
  assert.deepEqual([refused.import_id, refused.reason], [null, 'service_busy']);
  assert.ok((await claimFull(eve, { limit: 50, userDay: 50, allDay: n + 1 })).import_id);
});
