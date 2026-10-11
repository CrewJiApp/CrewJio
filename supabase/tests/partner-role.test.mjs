// Not-crew users (role 'partner') and busy times copied from a phone calendar.
// Run from the repo root: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './harness.mjs';

const KIM = '00000000-0000-0000-0000-0000000000a1'; // cabin crew
const LEE = '00000000-0000-0000-0000-0000000000a2'; // Kim's partner, not crew
const MAX = '00000000-0000-0000-0000-0000000000a3'; // stranger

let db;
let as;

before(async () => {
  ({ db, as } = await createDb());
  for (const [id, name, role] of [[KIM, 'Kim', 'cabin_crew'], [LEE, 'Lee', 'partner'], [MAX, 'Max', 'partner']]) {
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await as(id, `insert into public.profiles (id, display_name, role, airline, open_to_swaps) values ($1, $2, $3, 'other', false)`, [id, name, role]);
  }
  const [{ create_partner_invite: code }] = await as(KIM, 'select public.create_partner_invite()');
  await as(LEE, 'select public.accept_partner_invite($1)', [code]);
});

test('a partner has no rank, fleets or JCL', async () => {
  await assert.rejects(() => as(LEE, `update public.profiles set rank = 'captain'`));
  await assert.rejects(() => as(LEE, `update public.profiles set rank = 'flight_steward'`));
  await assert.rejects(() => as(LEE, `update public.profiles set fleets = '{A350}'`));
  await assert.rejects(() => as(LEE, `update public.profiles set jcl_trained = true`));
  await assert.rejects(() => as(LEE, `update public.profiles set role = 'astronaut'`));
});

test('work hours and phone calendar times reach the crew partner, titles never exist', async () => {
  await as(
    LEE,
    `insert into public.duties (duty_date, kind, category, friends_label, report_time, arrive_time, source, note)
     values ('2026-11-02', 'other', 'busy', 'Working', '09:00', '18:00', 'manual', 'office'),
            ('2026-11-03', 'other', 'busy', 'Busy', '19:00', '21:00', 'calendar', null)`,
  );
  await assert.rejects(() =>
    as(LEE, `insert into public.duties (duty_date, kind, category, friends_label, source) values ('2026-11-04', 'other', 'busy', 'Busy', 'phone')`),
  );

  const rows = await as(KIM, `select * from public.get_shared_roster($1, '2026-11-01', '2026-11-30')`, [LEE]);
  const day = (d) => rows.find((r) => r.day.toISOString().startsWith(d));
  assert.equal(day('2026-11-02').label, 'Working');
  assert.equal(day('2026-11-02').kind, 'other');
  assert.equal(day('2026-11-02').report_time, '09:00:00');
  assert.equal(day('2026-11-02').arrive_time, '18:00:00');
  assert.equal(day('2026-11-03').label, 'Busy');
  // The note stays with Lee: get_shared_roster has no note column at all.
  assert.ok(!('note' in day('2026-11-02')));

  // A stranger sees nothing, and the partner reads it only through get_shared_roster.
  assert.deepEqual(await as(MAX, `select * from public.get_shared_roster($1, '2026-11-01', '2026-11-30')`, [LEE]), []);
  assert.deepEqual(await as(KIM, 'select * from public.duties where user_id = $1', [LEE]), []);
});
