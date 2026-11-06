// Deleting an account removes the person's data and leaves other people's groups intact.
// Run from the repo root: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './harness.mjs';

const U = {
  ana: '00000000-0000-0000-0000-0000000000d1', // owns "Batch" (with Ben and Cai) and "Solo"; has a partner
  ben: '00000000-0000-0000-0000-0000000000d2', // joined Batch first
  cai: '00000000-0000-0000-0000-0000000000d3', // joined Batch second
  dee: '00000000-0000-0000-0000-0000000000d4', // Ana's partner
};

let db;
let as;
let batch;

before(async () => {
  ({ db, as } = await createDb());
  for (const [name, id] of Object.entries(U)) {
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await as(id, `insert into public.profiles (id, display_name, role, airline) values ($1, $2, 'cabin_crew', 'SIA')`, [id, name]);
  }
  [batch] = await as(U.ana, `select * from public.create_group('Batch')`);
  await as(U.ana, `select * from public.create_group('Solo')`);
  await as(U.ben, 'select public.join_group($1)', [batch.invite_code]);
  await db.query(`update public.group_members set joined_at = now() - interval '2 days' where user_id = $1`, [U.ben]);
  await as(U.cai, 'select public.join_group($1)', [batch.invite_code]);
  await as(U.ana, `insert into public.duties (duty_date, kind, category, friends_label) values ('2026-11-02', 'off', 'off', 'Off')`);
  await as(U.ana, `insert into public.holidays (start_date, end_date, kind) values ('2026-11-06', '2026-11-07', 'holiday')`);
  await as(U.ana, 'insert into public.partners (addressee_id) values ($1)', [U.dee]);
  await as(U.dee, `update public.partners set status = 'active'`);
  await as(U.ana, `insert into public.sharing_overrides (viewer_id, max_level) values ($1, 'hidden')`, [U.cai]);
  await db.query('select * from public.claim_roster_import($1, 1, 5, 6, 100)', [U.ana]);
  await db.query('select * from public.claim_roster_import($1, 1, 5, 6, 100)', [U.ben]);
});

const count = async (sql, params) => Number((await db.query(sql, params)).rows[0].n);

test('only the service role can prepare a deletion', async () => {
  for (const user of [U.ana, null]) {
    await assert.rejects(() => as(user, 'select public.prepare_account_deletion($1)', [U.ana]));
  }
});

test('deleting an account removes everything the person owns', async () => {
  await db.query('select public.prepare_account_deletion($1)', [U.ana]);
  await db.query('delete from auth.users where id = $1', [U.ana]);
  for (const table of ['profiles', 'duties', 'holidays', 'roster_imports']) {
    const col = table === 'profiles' ? 'id' : 'user_id';
    assert.equal(await count(`select count(*) as n from public.${table} where ${col} = $1`, [U.ana]), 0, table);
  }
  assert.equal(await count('select count(*) as n from public.group_members where user_id = $1', [U.ana]), 0);
  assert.equal(await count('select count(*) as n from public.partners where $1 in (requester_id, addressee_id)', [U.ana]), 0);
  assert.equal(await count('select count(*) as n from public.sharing_overrides where owner_id = $1', [U.ana]), 0);
});

test('a group with other members survives and goes to the longest-standing member', async () => {
  const [g] = (await db.query('select created_by from public.groups where id = $1', [batch.id])).rows;
  assert.equal(g.created_by, U.ben);
  const members = (await db.query('select user_id, role from public.group_members where group_id = $1 order by user_id', [batch.id])).rows;
  assert.deepEqual(members.map((m) => [m.user_id, m.role]), [[U.ben, 'owner'], [U.cai, 'member']]);
  // Ben can now manage it; Cai cannot.
  await as(U.ben, `update public.groups set name = 'Batch 2019' where id = $1`, [batch.id]);
  assert.equal((await db.query('select name from public.groups where id = $1', [batch.id])).rows[0].name, 'Batch 2019');
  assert.equal((await as(U.cai, `update public.groups set name = 'Nope' where id = $1 returning id`, [batch.id])).length, 0);
});

test('a group with nobody else in it goes with its creator', async () => {
  assert.equal(await count(`select count(*) as n from public.groups where name = 'Solo'`), 0);
});

test('other people keep their own data', async () => {
  assert.equal(await count('select count(*) as n from public.profiles where id = any($1)', [[U.ben, U.cai, U.dee]]), 3);
  assert.equal(await count('select count(*) as n from public.roster_imports where user_id = $1', [U.ben]), 1);
});
