// Every kind of hand-entered duty must be accepted by the real database constraints and stay
// private to its owner. Runs the migrations in an in-memory Postgres (see supabase/tests/harness.mjs).
import { beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain JS helper shared with the database tests
import { createDb } from '../../supabase/tests/harness.mjs';
import {
  buildFlightDuties,
  buildLeave,
  buildOffDuty,
  buildTimedDuty,
  dutyToRow,
  holidayToRow,
  rowToDuty,
  type NewDuty,
} from '../src';

type Db = { as: (user: string | null, sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>; addUser: (id: string) => Promise<void> };

const ME = '00000000-0000-0000-0000-0000000000a1';
const OTHER = '00000000-0000-0000-0000-0000000000b2';
let db: Db;

beforeAll(async () => {
  db = await createDb();
  await db.addUser(ME);
  await db.addUser(OTHER);
}, 30_000);

async function insertDuty(user: string, d: NewDuty) {
  const r = dutyToRow(d);
  const cols = Object.keys(r);
  // Read dates back as text, the way Supabase's API returns them.
  const returning = 'id, user_id, kind, category, code, friends_label, flight_number, sector, note, source, needs_review, ' +
    'duty_date::text as duty_date, arrive_date::text as arrive_date, report_time::text as report_time, depart_time::text as depart_time, arrive_time::text as arrive_time';
  const rows = await db.as(user, `insert into public.duties (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning ${returning}`, Object.values(r));
  return rows[0]!;
}

const everyKind: NewDuty[] = [
  ...buildFlightDuties({
    date: '2026-10-03',
    flightNumber: 'SQ 322',
    to: 'LHR',
    reportTime: '2105',
    departTime: '2335',
    arriveTime: '0620',
    arrivesNextDay: true,
    returnFlight: { date: '2026-10-05', flightNumber: 'SQ 317', departTime: '1100', arriveTime: '0700', arrivesNextDay: true },
  }),
  buildTimedDuty({ kind: 'training', date: '2026-10-19', start: '0900', end: '1700', note: 'Recurrent' }),
  buildTimedDuty({ kind: 'sim', date: '2026-10-09', start: '0800', end: '1400' }),
  buildTimedDuty({ kind: 'ground_school', date: '2026-10-13' }),
  buildTimedDuty({ kind: 'standby', date: '2026-10-12', start: '1600', end: '0200' }),
  buildTimedDuty({ kind: 'reserve', date: '2026-10-01' }),
  buildOffDuty('2026-10-06'),
];

describe('duties in the database', () => {
  it('accepts every kind the Add duty sheet can build, and reads them back unchanged', async () => {
    for (const d of everyKind) {
      const row = await insertDuty(ME, d);
      const back = rowToDuty(row as never);
      expect({ ...back, id: undefined, userId: undefined }).toEqual({ ...d, id: undefined, userId: undefined });
      expect(back.userId).toBe(ME);
    }
  });

  it('accepts leave of every kind', async () => {
    for (const kind of ['holiday', 'annual_leave', 'busy_personal', 'reservist'] as const) {
      const r = holidayToRow(buildLeave({ kind, startDate: '2026-12-20', endDate: '2026-12-22', note: 'private' }));
      const rows = await db.as(ME, 'insert into public.holidays (start_date, end_date, kind, note) values ($1, $2, $3, $4) returning user_id', [r.start_date, r.end_date, r.kind, r.note]);
      expect(rows[0]!.user_id).toBe(ME);
    }
  });

  it('keeps duties private to their owner', async () => {
    expect(await db.as(OTHER, 'select * from public.duties')).toEqual([]);
    expect(await db.as(OTHER, 'select * from public.holidays')).toEqual([]);
    expect((await db.as(ME, 'select * from public.duties')).length).toBe(everyKind.length);
  });

  it('lets the owner delete a duty', async () => {
    const [first] = await db.as(ME, `select id from public.duties where kind = 'off'`);
    await db.as(ME, 'delete from public.duties where id = $1', [first!.id]);
    expect(await db.as(ME, `select id from public.duties where kind = 'off'`)).toEqual([]);
  });
});
