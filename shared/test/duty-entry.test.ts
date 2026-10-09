import { describe, expect, it } from 'vitest';
import {
  DutyInputError,
  buildFlightDuties,
  buildLeave,
  buildOffDuty,
  buildTimedDuty,
  dayBadge,
  monthGrid,
  nextDuty,
  normaliseFlightNumber,
  normaliseTime,
  dutyToRow,
  rowToDuty,
  type NewDuty,
} from '../src';

const fails = (fn: () => unknown, field: string) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DutyInputError);
    expect((e as DutyInputError).field).toBe(field);
    return;
  }
  throw new Error(`expected a DutyInputError on ${field}`);
};

describe('normalisers', () => {
  it('reads the ways crew type times', () => {
    expect(normaliseTime('2105')).toBe('2105');
    expect(normaliseTime('21:05')).toBe('2105');
    expect(normaliseTime('9:05')).toBe('0905');
    expect(normaliseTime('905')).toBe('0905');
    expect(normaliseTime('0000')).toBe('0000');
  });

  it('rejects times that do not exist', () => {
    for (const t of ['2400', '1260', 'abc', '', '21', '12345']) expect(normaliseTime(t)).toBeNull();
  });

  it('tidies flight numbers', () => {
    expect(normaliseFlightNumber('sq322')).toBe('SQ 322');
    expect(normaliseFlightNumber(' SQ 322 ')).toBe('SQ 322');
    expect(normaliseFlightNumber('tr18')).toBe('TR 18');
    expect(normaliseFlightNumber('3K 685')).toBe('3K 685');
    expect(normaliseFlightNumber('SQ 31A')).toBe('SQ 31A');
    expect(normaliseFlightNumber('322')).toBeNull();
    expect(normaliseFlightNumber('SQ')).toBeNull();
  });
});

describe('flights', () => {
  it('builds a single flight from base', () => {
    const [f] = buildFlightDuties({ date: '2026-10-03', flightNumber: 'sq322', to: 'lhr', reportTime: '21:05', departTime: '2335', arriveTime: '0620', arrivesNextDay: true });
    expect(f).toMatchObject({
      kind: 'flight',
      category: 'flight',
      friendsLabel: 'Flying',
      flightNumber: 'SQ 322',
      sector: 'SIN-LHR',
      reportTime: '2105',
      departTime: '2335',
      arriveTime: '0620',
      arriveDate: '2026-10-04',
      source: 'manual',
      code: null,
    });
  });

  it('builds a turnaround as two flights on one day', () => {
    const duties = buildFlightDuties({
      date: '2026-11-02',
      flightNumber: 'SQ 148',
      to: 'BWN',
      reportTime: '0700',
      returnFlight: { date: '2026-11-02', flightNumber: 'SQ 147', arriveTime: '1430' },
    });
    expect(duties.map((d) => [d.date, d.kind, d.sector])).toEqual([
      ['2026-11-02', 'flight', 'SIN-BWN'],
      ['2026-11-02', 'flight', 'BWN-SIN'],
    ]);
  });

  it('fills a trip with layover days at the destination', () => {
    // SQ 322 Sat 3 Oct, back on SQ 317 Mon 5 Oct (mockup 12).
    const duties = buildFlightDuties({
      date: '2026-10-03',
      flightNumber: 'SQ 322',
      to: 'LHR',
      arrivesNextDay: true,
      returnFlight: { date: '2026-10-05', flightNumber: 'SQ 317' },
    });
    expect(duties.map((d) => [d.date, d.kind, d.sector, d.friendsLabel])).toEqual([
      ['2026-10-03', 'flight', 'SIN-LHR', 'Flying'],
      ['2026-10-04', 'layover', 'LHR', 'Away (layover)'],
      ['2026-10-05', 'flight', 'LHR-SIN', 'Flying'],
    ]);
  });

  it('rejects bad input with the field to fix', () => {
    fails(() => buildFlightDuties({ date: '2026-10-03', flightNumber: '322', to: 'LHR' }), 'flightNumber');
    fails(() => buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'London' }), 'to');
    fails(() => buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'SIN' }), 'to');
    fails(() => buildFlightDuties({ date: '2026-02-30', flightNumber: 'SQ 322', to: 'LHR' }), 'date');
    fails(() => buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'LHR', departTime: '25:00' }), 'departTime');
    fails(
      () => buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'LHR', returnFlight: { date: '2026-10-01', flightNumber: 'SQ 317' } }),
      'return.date',
    );
    fails(
      () => buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'LHR', returnFlight: { date: '2026-10-30', flightNumber: 'SQ 317' } }),
      'return.date',
    );
  });
});

describe('training, standby, off and leave', () => {
  it('stores training hours as start and end', () => {
    const d = buildTimedDuty({ kind: 'training', date: '2026-10-19', start: '0900', end: '1700', note: ' Recurrent SEP ' });
    expect(d).toMatchObject({ kind: 'training', category: 'training', friendsLabel: 'Training', reportTime: '0900', arriveTime: '1700', arriveDate: null, note: 'Recurrent SEP' });
  });

  it('handles a standby that runs past midnight', () => {
    const d = buildTimedDuty({ kind: 'standby', date: '2026-10-12', start: '1600', end: '0200' });
    expect(d).toMatchObject({ kind: 'standby', category: 'standby', arriveDate: '2026-10-13' });
  });

  it('maps pilot duties to the right categories', () => {
    expect(buildTimedDuty({ kind: 'sim', date: '2026-10-09' }).category).toBe('training');
    expect(buildTimedDuty({ kind: 'ground_school', date: '2026-10-13' }).category).toBe('training');
    expect(buildTimedDuty({ kind: 'reserve', date: '2026-10-01' }).category).toBe('reserve');
  });

  it('builds an off day', () => {
    expect(buildOffDuty('2026-10-06')).toMatchObject({ kind: 'off', category: 'off', friendsLabel: 'Off' });
  });

  it('builds leave over a date range, including reservist', () => {
    expect(buildLeave({ kind: 'annual_leave', startDate: '2026-12-20', endDate: '2026-12-27', note: 'Bali' })).toEqual({
      kind: 'annual_leave',
      startDate: '2026-12-20',
      endDate: '2026-12-27',
      note: 'Bali',
    });
    expect(buildLeave({ kind: 'reservist', startDate: '2026-11-10' })).toMatchObject({ startDate: '2026-11-10', endDate: '2026-11-10' });
    fails(() => buildLeave({ kind: 'holiday', startDate: '2026-12-20', endDate: '2026-12-19' }), 'endDate');
  });
});

describe('calendar', () => {
  it('lays out October 2026 starting on a Thursday (mockup 10)', () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks[4]!.slice(-2)).toEqual(['2026-10-31', null]);
  });

  it('handles February and a month starting on Monday', () => {
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
    expect(monthGrid(2027, 2)[0]![0]).toBe('2027-02-01');
  });

  const trip = buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'LHR', reportTime: '2105', returnFlight: { date: '2026-10-05', flightNumber: 'SQ 317' } });

  it('shows the destination on every day of a trip, including the flight home', () => {
    for (const day of ['2026-10-03', '2026-10-04', '2026-10-05']) expect(dayBadge(day, trip, [])).toEqual({ tone: 'flight', code: 'LHR' });
  });

  it('labels training, sim, ground school, standby and reserve', () => {
    const duties = [
      buildTimedDuty({ kind: 'training', date: '2026-10-19' }),
      buildTimedDuty({ kind: 'sim', date: '2026-10-09' }),
      buildTimedDuty({ kind: 'ground_school', date: '2026-10-13' }),
      buildTimedDuty({ kind: 'standby', date: '2026-10-12' }),
      buildTimedDuty({ kind: 'reserve', date: '2026-10-01' }),
      buildOffDuty('2026-10-06'),
    ];
    expect(dayBadge('2026-10-19', duties, [])).toEqual({ tone: 'training', code: 'TRG' });
    expect(dayBadge('2026-10-09', duties, [])).toEqual({ tone: 'training', code: 'SIM' });
    expect(dayBadge('2026-10-13', duties, [])).toEqual({ tone: 'training', code: 'GND' });
    expect(dayBadge('2026-10-12', duties, [])).toEqual({ tone: 'standby', code: 'SBY' });
    expect(dayBadge('2026-10-01', duties, [])).toEqual({ tone: 'standby', code: 'RSV' });
    expect(dayBadge('2026-10-06', duties, [])).toEqual({ tone: 'off', code: null });
    expect(dayBadge('2026-10-07', duties, [])).toEqual({ tone: 'empty', code: null });
  });

  it('always shows leave, even on a roster day', () => {
    const leave = [buildLeave({ kind: 'reservist', startDate: '2026-10-04', endDate: '2026-10-04' })];
    expect(dayBadge('2026-10-04', trip, leave)).toEqual({ tone: 'leave', code: 'NS' });
  });

  it('shows the next flight with report time and trip length (mockup 10)', () => {
    expect(nextDuty('2026-10-01', trip)).toEqual({
      date: '2026-10-03',
      tag: 'NEXT',
      title: 'SQ 322 · SIN → LHR',
      detail: 'Sat 3 Oct · Report 21:05 · 3-day trip',
      mono: true,
    });
  });

  it('shows a sim check with hours (mockup 11)', () => {
    const sim = buildTimedDuty({ kind: 'sim', date: '2026-10-09', start: '0800', end: '1400', note: 'Recurrent sim check' });
    expect(nextDuty('2026-10-08', [sim])).toEqual({
      date: '2026-10-09',
      tag: 'SIM',
      title: 'Recurrent sim check',
      detail: 'Fri 9 Oct · 08:00 to 14:00 · free after',
      mono: false,
    });
  });

  it('calls a same-day return a turnaround and skips past days and days off', () => {
    const turn = buildFlightDuties({ date: '2026-11-02', flightNumber: 'SQ 148', to: 'BWN', reportTime: '0700', returnFlight: { date: '2026-11-02', flightNumber: 'SQ 147' } });
    const duties: NewDuty[] = [buildOffDuty('2026-11-01'), ...turn];
    expect(nextDuty('2026-11-01', duties)?.detail).toBe('Mon 2 Nov · Report 07:00 · Turnaround');
    expect(nextDuty('2026-11-03', duties)).toBeNull();
  });
});

describe('database rows', () => {
  it('round-trips a duty through the row format', () => {
    const [f] = buildFlightDuties({ date: '2026-10-03', flightNumber: 'SQ 322', to: 'LHR', reportTime: '2105', arriveTime: '0620', arrivesNextDay: true });
    const row = dutyToRow(f!);
    expect(row).toMatchObject({ duty_date: '2026-10-03', report_time: '21:05', arrive_time: '06:20', arrive_date: '2026-10-04' });
    // Postgres returns times with seconds.
    const back = rowToDuty({ ...row, id: 'x', user_id: 'u', report_time: '21:05:00', arrive_time: '06:20:00' });
    expect(back).toEqual({ ...f, id: 'x', userId: 'u' });
  });
});
