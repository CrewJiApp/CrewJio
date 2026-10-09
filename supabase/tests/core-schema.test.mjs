// Validates every migration in supabase/migrations against an in-memory Postgres (PGlite) and
// tests the row-level security rules from CLAUDE.md between real users.
// Run from the repo root: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './harness.mjs';

const U = {
  ana: '00000000-0000-0000-0000-00000000000a', // owner of most rosters in these tests
  ben: '00000000-0000-0000-0000-00000000000b', // in "Batch" with Ana
  cai: '00000000-0000-0000-0000-00000000000c', // in "Ex-Scoot" with Ana only
  dee: '00000000-0000-0000-0000-00000000000d', // Ana's partner
  eve: '00000000-0000-0000-0000-00000000000e', // stranger
};

let db;
let as;

async function fails(userId, sql, params = []) {
  await assert.rejects(() => as(userId, sql, params));
}

before(async () => {
  ({ db, as } = await createDb());

  for (const [name, id] of Object.entries(U)) {
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await as(id, `insert into public.profiles (id, display_name, role, airline) values ($1, $2, 'cabin_crew', 'SIA')`, [
      id,
      name,
    ]);
  }

  // Ana's November: off, a turnaround, a medical (private) day, a layover, training.
  const duties = [
    ['2026-11-01', 'off', 'off', 'ATDO', 'Off', null, null, null, null],
    ['2026-11-02', 'flight', 'flight', 'FLY', 'Flying', 'SQ 148', 'SIN-BWN', '07:00', '11:15'],
    ['2026-11-03', 'other', 'private', 'MC', 'Unavailable', null, null, null, null],
    ['2026-11-04', 'layover', 'layover', 'LO', 'Away (layover)', null, 'SFO', null, null],
    ['2026-11-05', 'training', 'training', 'CRM1', 'Training', null, null, '09:00', null],
  ];
  for (const [date, kind, category, code, label, flight, sector, rpt, sta] of duties) {
    await as(
      U.ana,
      `insert into public.duties (duty_date, kind, category, code, friends_label, flight_number, sector, report_time, arrive_time, note)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'secret note')`,
      [date, kind, category, code, label, flight, sector, rpt, sta],
    );
  }
  await as(U.ana, `insert into public.holidays (start_date, end_date, kind, note) values ('2026-11-06', '2026-11-07', 'holiday', 'Bali')`);

  // Groups: Batch (Ana + Ben), Ex-Scoot (Ana + Cai). Ben and Cai never meet.
  const [batch] = await as(U.ana, `select * from public.create_group('Batch')`);
  const [scoot] = await as(U.ana, `select * from public.create_group('Ex-Scoot')`);
  await as(U.ben, 'select public.join_group($1)', [batch.invite_code]);
  await as(U.cai, 'select public.join_group($1)', [scoot.invite_code]);
  await as(U.ana, `update public.group_members set sharing_level = 'full' where group_id = $1`, [batch.id]);

  // Partner: Ana asks, Dee accepts.
  await as(U.ana, 'insert into public.partners (addressee_id) values ($1)', [U.dee]);
  await as(U.dee, `update public.partners set status = 'active'`);
});

const roster = (viewer) =>
  as(viewer, `select * from public.get_shared_roster($1, '2026-11-01', '2026-11-30')`, [U.ana]);
const byDay = (rows, day) => rows.filter((r) => r.day.toISOString().startsWith(day));

test('every table has row-level security enabled', async () => {
  const rows = (await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`)).rows;
  assert.deepEqual(rows, []);
});

test('anon can read nothing and call nothing', async () => {
  await fails(null, 'select * from public.profiles');
  await fails(null, 'select * from public.duties');
  await fails(null, `select * from public.get_shared_roster($1, '2026-11-01', '2026-11-30')`, [U.ana]);
});

test('duties and holidays are owner-only at table level', async () => {
  assert.equal((await as(U.ana, 'select * from public.duties')).length, 5);
  assert.equal((await as(U.dee, 'select * from public.duties')).length, 0);
  assert.equal((await as(U.ben, 'select * from public.holidays')).length, 0);
  await fails(U.ben, `insert into public.duties (user_id, duty_date, kind, category, friends_label) values ($1, '2026-11-09', 'off', 'off', 'Off')`, [U.ana]);
  await as(U.ben, `update public.duties set friends_label = 'hacked'`);
  assert.equal((await as(U.ana, `select * from public.duties where friends_label = 'hacked'`)).length, 0);
});

test('nobody can search for anyone: strangers see no profiles', async () => {
  const names = (await as(U.eve, 'select display_name from public.profiles')).map((r) => r.display_name);
  assert.deepEqual(names, ['eve']);
  assert.deepEqual(await roster(U.eve), []);
});

test('groups never see each other', async () => {
  const benSees = (await as(U.ben, 'select display_name from public.profiles order by 1')).map((r) => r.display_name);
  assert.deepEqual(benSees, ['ana', 'ben']);
  const benGroups = (await as(U.ben, 'select name from public.groups')).map((r) => r.name);
  assert.deepEqual(benGroups, ['Batch']);
  const benMembers = await as(U.ben, 'select user_id from public.group_members');
  assert.ok(benMembers.every((m) => m.user_id !== U.cai));
});

test('off-days level shows only Off / Busy / Away / Unavailable', async () => {
  const rows = await roster(U.cai);
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Off', 'Busy', 'Unavailable', 'Away', 'Busy', 'Away', 'Away'],
  );
  assert.ok(rows.every((r) => r.sector === null && r.flight_number === null && r.report_time === null));
});

test('full level shows flights and times but never codes, notes or private details', async () => {
  const rows = await roster(U.ben);
  const flight = byDay(rows, '2026-11-02')[0];
  assert.equal(flight.flight_number, 'SQ 148');
  assert.equal(flight.sector, 'SIN-BWN');
  assert.equal(flight.label, 'Flying');
  assert.equal(byDay(rows, '2026-11-03')[0].label, 'Unavailable');
  assert.equal(byDay(rows, '2026-11-06')[0].label, 'Away');
  assert.ok(!('code' in flight) && !('note' in flight));
});

test('most generous group level wins, capped by a per-person override', async () => {
  // Put Ben in Ex-Scoot too (off days only). Batch is full, so he still sees flights.
  const [scoot] = await db.query(`select invite_code from public.groups where name = 'Ex-Scoot'`).then((r) => r.rows);
  await as(U.ben, 'select public.join_group($1)', [scoot.invite_code]);
  assert.equal(byDay(await roster(U.ben), '2026-11-02')[0].flight_number, 'SQ 148');

  await as(U.ana, `insert into public.sharing_overrides (viewer_id, max_level) values ($1, 'destinations')`, [U.ben]);
  const capped = byDay(await roster(U.ben), '2026-11-02')[0];
  assert.equal(capped.sector, 'SIN-BWN');
  assert.equal(capped.flight_number, null);

  await as(U.ana, `update public.sharing_overrides set max_level = 'hidden' where viewer_id = $1`, [U.ben]);
  assert.deepEqual(await roster(U.ben), []);

  // Ben cannot see the override exists.
  assert.deepEqual(await as(U.ben, 'select * from public.sharing_overrides'), []);
  await as(U.ana, 'delete from public.sharing_overrides');
  await as(U.ben, `delete from public.group_members where user_id = $1 and group_id = (select id from public.groups where name = 'Ex-Scoot')`, [U.ben]);
});

test('partner sees full detail and holiday kind, but private stays Unavailable', async () => {
  const rows = await roster(U.dee);
  assert.equal(byDay(rows, '2026-11-02')[0].flight_number, 'SQ 148');
  assert.equal(byDay(rows, '2026-11-03')[0].label, 'Unavailable');
  assert.equal(byDay(rows, '2026-11-03')[0].sector, null);
  assert.equal(byDay(rows, '2026-11-06')[0].label, 'Holiday');
});

test('members only change their own sharing level', async () => {
  await as(U.ben, `update public.group_members set sharing_level = 'off_days' where user_id = $1`, [U.ana]);
  const levels = await db.query(`select sharing_level from public.group_members m join public.groups g on g.id = m.group_id where g.name = 'Batch' and user_id = $1`, [U.ana]).then((r) => r.rows);
  assert.equal(levels[0].sharing_level, 'full');
  await fails(U.ben, `update public.group_members set role = 'owner' where user_id = $1`, [U.ben]);
  await fails(U.ben, `update public.group_members set sharing_level = 'hidden' where user_id = $1`, [U.ben]);
  await as(U.ben, `update public.group_members set sharing_level = 'destinations' where user_id = $1`, [U.ben]);
  const mine = await as(U.ben, 'select sharing_level from public.group_members where user_id = $1', [U.ben]);
  assert.equal(mine[0].sharing_level, 'destinations');
});

test('members cannot add people directly; only invite codes work', async () => {
  const [batch] = await db.query(`select id from public.groups where name = 'Batch'`).then((r) => r.rows);
  await fails(U.eve, `insert into public.groups (name) values ('Sneaky')`);
  await fails(U.ben, 'insert into public.group_members (group_id, user_id) values ($1, $2)', [batch.id, U.eve]);
  await fails(U.eve, `select public.join_group('not-a-code')`);
});

test('partner requests: only the addressee accepts, one active partner each', async () => {
  await as(U.ben, 'insert into public.partners (addressee_id) values ($1)', [U.eve]);
  await as(U.ben, `update public.partners set status = 'active'`); // requester cannot self-accept
  assert.equal((await as(U.eve, 'select status from public.partners'))[0].status, 'pending');
  await fails(U.ben, `insert into public.partners (requester_id, addressee_id) values ($1, $2)`, [U.eve, U.cai]);
  // Dee already has Ana; Ben asks Dee, Dee cannot accept a second partner.
  await as(U.ben, 'delete from public.partners');
  await as(U.ben, 'insert into public.partners (addressee_id) values ($1)', [U.dee]);
  await fails(U.dee, `update public.partners set status = 'active' where requester_id = $1`, [U.ben]);
});

test('only a group owner can rename or delete it', async () => {
  await as(U.ben, `update public.groups set name = 'Mine now'`);
  assert.equal((await as(U.ben, 'select name from public.groups'))[0].name, 'Batch');
  await as(U.ben, 'delete from public.groups');
  assert.equal((await as(U.ana, 'select * from public.groups')).length, 2);
});

test('rank must match the role and JCL is crew only', async () => {
  await fails(U.eve, `update public.profiles set rank = 'captain'`);
  await fails(U.eve, `update public.profiles set role = 'pilot', jcl_trained = true`);
  await as(U.eve, `update public.profiles set role = 'pilot', rank = 'captain', fleets = '{A350,787}'`);
  await fails(U.eve, `update public.profiles set fleets = '{A320}'`);
});

test('the waitlist stays locked to the service role', async () => {
  await fails(U.ana, 'select * from public.waitlist');
  await fails(null, `insert into public.waitlist (first_name, email, role, airline, consent_at) values ('x', 'x@y.z', 'pilot', 'SIA', now())`);
});
