// Typing a roster code, standby on a layover, work hours for people who are not crew, and
// copying a phone calendar. Plus how each of them ranks.
import { describe, expect, it } from 'vitest';
import {
  DutyInputError,
  buildBusyDays,
  buildCodedDuties,
  buildFlightDuties,
  buildTimedDuty,
  classifyPersonDays,
  codeShape,
  dayBadge,
  defaultCodeHours,
  eventsToBusyDuties,
  explainCode,
  normaliseCode,
  normaliseProfile,
  rankDays,
  searchCodes,
  sharedEntriesToRoster,
  type PersonRoster,
} from '../src';

const person = (userId: string, duties: PersonRoster['duties']): PersonRoster => ({ userId, duties, holidays: [] });
const fieldOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof DutyInputError ? e.field : 'not a DutyInputError';
  }
  return null;
};

describe('typing a roster code', () => {
  it('cleans up what was typed', () => {
    expect(normaliseCode(' stby ')).toBe('STBY');
    expect(normaliseCode('s s-6 0')).toBe('SS60');
  });

  it('finds the exact code first, then codes that start with it, then by description', () => {
    expect(searchCodes('stby')[0]).toMatchObject({ code: 'STBY', category: 'standby' });
    expect(searchCodes('SS6').map((c) => c.code)).toContain('SS60');
    expect(searchCodes('annual').map((c) => c.code)).toContain('AALV');
    expect(searchCodes('')).toEqual([]);
    expect(searchCodes('S', 3)).toHaveLength(3);
  });

  it('knows what else to ask for', () => {
    expect(codeShape('flight')).toBe('flight');
    expect(codeShape('standby')).toBe('timed');
    expect(codeShape('training')).toBe('timed');
    expect(codeShape('leave')).toBe('days');
  });

  it('reads default hours from the description, training defaults to 09:00 to 17:00', () => {
    const [ss60] = searchCodes('SS60');
    expect(defaultCodeHours(ss60!)).toEqual({ start: '0600', end: '2359' });
    const [stby] = searchCodes('STBY');
    expect(defaultCodeHours(stby!)).toBeNull();
    const training = searchCodes('CRM').find((c) => c.category === 'training' && !/\d{4}-\d{4}/.test(c.description));
    if (training) expect(defaultCodeHours(training)).toEqual({ start: '0900', end: '1700' });
  });

  it('explains private and reservist codes without revealing them to friends', () => {
    const [ntsv] = searchCodes('NTSV');
    expect(explainCode(ntsv!)).toMatch(/Untouchable/);
    const priv = searchCodes('medical').find((c) => c.category === 'private');
    expect(priv && explainCode(priv)).toMatch(/friends see "Unavailable"/);
  });

  it('builds a standby with its hours, at base or on a layover', () => {
    const [atBase] = buildCodedDuties({ code: 'ss60', date: '2026-11-10', start: '0600', end: '2359' });
    expect(atBase).toMatchObject({ code: 'SS60', kind: 'standby', category: 'standby', friendsLabel: 'Standby', sector: null, reportTime: '0600', arriveTime: '2359', source: 'manual' });
    const [away] = buildCodedDuties({ code: 'STBY', date: '2026-11-06', start: '2005', end: '0040', where: 'sfo' });
    expect(away).toMatchObject({ sector: 'SFO', arriveDate: '2026-11-07' });
  });

  it('builds one duty per day for leave, off and reservist ranges', () => {
    const leave = buildCodedDuties({ code: 'AALV', date: '2026-11-10', endDate: '2026-11-12' });
    expect(leave.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(leave[0]).toMatchObject({ kind: 'annual_leave', category: 'leave', friendsLabel: 'Away' });
    expect(buildCodedDuties({ code: 'NTSV', date: '2026-11-13' })[0]).toMatchObject({ category: 'national_service', friendsLabel: 'Away' });
    expect(buildCodedDuties({ code: 'OFFD', date: '2026-11-14' })[0]).toMatchObject({ kind: 'off', category: 'off' });
  });

  it('keeps private codes private', () => {
    const priv = searchCodes('medical').find((c) => c.category === 'private')!;
    const [d] = buildCodedDuties({ code: priv.code, date: '2026-11-15' });
    expect(d).toMatchObject({ code: priv.code, category: 'private', friendsLabel: 'Unavailable' });
  });

  it('never guesses an unknown code: it needs a yes, then it is Busy', () => {
    expect(fieldOf(() => buildCodedDuties({ code: 'QX7Q', date: '2026-11-16' }))).toBe('code');
    const [d] = buildCodedDuties({ code: 'QX7Q', date: '2026-11-16', allowUnknown: true });
    expect(d).toMatchObject({ code: 'QX7Q', kind: 'other', category: 'busy', friendsLabel: 'Busy' });
  });

  it('sends FLY to the flight form and checks every field', () => {
    expect(fieldOf(() => buildCodedDuties({ code: 'FLY', date: '2026-11-16' }))).toBe('code');
    expect(fieldOf(() => buildCodedDuties({ code: '', date: '2026-11-16' }))).toBe('code');
    expect(fieldOf(() => buildCodedDuties({ code: 'STBY', date: '2026-11-16', start: '25:00' }))).toBe('start');
    expect(fieldOf(() => buildCodedDuties({ code: 'STBY', date: '2026-11-16', where: 'London' }))).toBe('where');
    expect(fieldOf(() => buildCodedDuties({ code: 'AALV', date: '2026-11-16', endDate: '2026-11-10' }))).toBe('endDate');
    expect(fieldOf(() => buildCodedDuties({ code: 'AALV', date: '2026-11-01', endDate: '2026-12-31' }))).toBe('endDate');
  });
});

describe('standby on a layover', () => {
  it('stores the airport, and at base stores nothing', () => {
    expect(buildTimedDuty({ kind: 'standby', date: '2026-11-06', where: 'SFO' }).sector).toBe('SFO');
    expect(buildTimedDuty({ kind: 'standby', date: '2026-11-06', where: 'sin' }).sector).toBeNull();
    expect(buildTimedDuty({ kind: 'standby', date: '2026-11-06' }).sector).toBeNull();
    expect(buildTimedDuty({ kind: 'training', date: '2026-11-06', where: 'SFO' }).sector).toBeNull();
  });

  it('counts as away, and as a shared layover with a friend in the same city', () => {
    const trip = buildFlightDuties({ date: '2026-11-04', flightNumber: 'SQ 34', to: 'SFO', departTime: '1955', returnFlight: { date: '2026-11-07', flightNumber: 'SQ 33', departTime: '0040' } });
    const me = person('me', [...trip, buildTimedDuty({ kind: 'standby', date: '2026-11-06', start: '2005', end: '0040', where: 'SFO' })]);
    const onlyStandby = person('sb', [buildTimedDuty({ kind: 'standby', date: '2026-11-06', start: '0800', end: '2000', where: 'SFO' })]);
    expect(classifyPersonDays(onlyStandby, '2026-11-06', '2026-11-06')[0]).toMatchObject({ status: 'Away', note: 'Standby in SFO', layover: 'SFO' });
    expect(classifyPersonDays(me, '2026-11-06', '2026-11-06')[0]).toMatchObject({ status: 'Away', note: 'Layover SFO' });
    expect(rankDays([me, onlyStandby], '2026-11-06', '2026-11-06')[0]).toMatchObject({ status: 'SameLayover', layover: 'SFO' });
    expect(dayBadge('2026-11-06', onlyStandby.duties, [])).toEqual({ tone: 'standby', code: 'SBY' });
  });
});

describe('people who are not crew', () => {
  it('have no rank, fleets, JCL, airline or swaps', () => {
    expect(
      normaliseProfile({ role: 'partner', rank: 'captain', fleets: ['A350'], jclTrained: true, airline: 'SIA', openToSwaps: true }),
    ).toEqual({ role: 'partner', rank: null, fleets: [], jclTrained: false, airline: 'other', openToSwaps: false });
  });

  it('add work days with hours, weekdays only if they like', () => {
    const days = buildBusyDays({ label: 'Working', date: '2026-11-06', endDate: '2026-11-10', weekdaysOnly: true, start: '9:00', end: '18:00' });
    // Fri 6, then Mon 9 and Tue 10: the weekend is skipped.
    expect(days.map((d) => d.date)).toEqual(['2026-11-06', '2026-11-09', '2026-11-10']);
    expect(days[0]).toMatchObject({ kind: 'other', category: 'busy', friendsLabel: 'Working', reportTime: '0900', arriveTime: '1800', source: 'manual' });
    expect(buildBusyDays({ label: 'Busy', date: '2026-11-07' })[0]).toMatchObject({ reportTime: null, arriveTime: null });
    expect(fieldOf(() => buildBusyDays({ label: 'Busy', date: '2026-11-07', start: '0900' }))).toBe('end');
    expect(fieldOf(() => buildBusyDays({ label: 'Busy', date: '2026-11-07', endDate: '2026-11-08', weekdaysOnly: true }))).toBe('endDate');
  });

  it('are free in the evening after work, and free until an evening plan', () => {
    const partner = person('p', [
      ...buildBusyDays({ label: 'Working', date: '2026-11-09', start: '0900', end: '1800' }),
      ...buildBusyDays({ label: 'Busy', date: '2026-11-10', start: '1930', end: '2200' }),
      ...buildBusyDays({ label: 'Busy', date: '2026-11-11', start: '1400', end: '1700' }),
      ...buildBusyDays({ label: 'Working', date: '2026-11-14', start: '1300', end: '2200' }),
      ...buildBusyDays({ label: 'Busy', date: '2026-11-12' }),
      ...buildBusyDays({ label: 'Working', date: '2026-11-13', start: '0900', end: '2000' }),
    ]);
    const days = classifyPersonDays(partner, '2026-11-09', '2026-11-15');
    expect(days.map((d) => [d.status, d.note])).toEqual([
      ['Evening', 'Working until 18:00'],
      ['Daytime', 'Free until 19:30'],
      ['Evening', 'Busy until 17:00'],
      ['Busy', 'busy'],
      ['Busy', 'busy'],
      ['Morning', 'Free until 13:00'],
      ['Great', 'Off'],
    ]);
  });

  it('match their crew partner through the partner connection', () => {
    // What get_shared_roster returns to the crew partner (full detail, times as HHMM).
    const shared = sharedEntriesToRoster('p', [
      { day: '2026-11-09', status: 'away', kind: 'other', label: 'Working', sector: null, flightNumber: null, reportTime: '0900', departTime: null, arriveTime: '1800', arriveDate: null },
    ]);
    const crew = person('c', [...buildFlightDuties({ date: '2026-11-09', flightNumber: 'SQ 148', to: 'BWN', reportTime: '0700', departTime: '0900', arriveTime: '1115', returnFlight: { date: '2026-11-09', flightNumber: 'SQ 147', departTime: '1205', arriveTime: '1430' } })]);
    expect(rankDays([crew, shared], '2026-11-09', '2026-11-09')[0]).toMatchObject({ status: 'Evening', summary: 'Both free from evening' });
  });

  it('show work, busy and their own codes on the calendar', () => {
    const work = buildBusyDays({ label: 'Working', date: '2026-11-09', start: '0900', end: '1800' });
    expect(dayBadge('2026-11-09', work, [])).toEqual({ tone: 'busy', code: 'WORK' });
    expect(dayBadge('2026-11-10', buildBusyDays({ label: 'Busy', date: '2026-11-10' }), [])).toEqual({ tone: 'busy', code: 'BUSY' });
    expect(dayBadge('2026-11-11', buildCodedDuties({ code: 'NTSV', date: '2026-11-11' }), [])).toEqual({ tone: 'leave', code: 'NS' });
    expect(dayBadge('2026-11-12', buildCodedDuties({ code: 'AALV', date: '2026-11-12' }), [])).toEqual({ tone: 'leave', code: 'AL' });
  });
});

describe('copying a phone calendar', () => {
  it('keeps only when they are busy: one block per day, all-day events fill the day', () => {
    const duties = eventsToBusyDuties(
      [
        { startDate: '2026-11-02', startTime: '0900', endDate: '2026-11-02', endTime: '1000', allDay: false },
        { startDate: '2026-11-02', startTime: '1500', endDate: '2026-11-02', endTime: '1730', allDay: false },
        { startDate: '2026-11-03', startTime: '0000', endDate: '2026-11-04', endTime: '0000', allDay: true },
        { startDate: '2026-11-05', startTime: '2200', endDate: '2026-11-06', endTime: '0130', allDay: false },
        { startDate: '2026-11-07', startTime: '1000', endDate: '2026-11-07', endTime: '1100', allDay: false, free: true },
        { startDate: '2026-11-08', startTime: '2000', endDate: '2026-11-09', endTime: '0000', allDay: false },
        // Outside the range.
        { startDate: '2026-12-01', startTime: '0900', endDate: '2026-12-01', endTime: '1000', allDay: false },
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(duties.map((d) => [d.date, d.reportTime, d.arriveTime])).toEqual([
      ['2026-11-02', '0900', '1730'],
      ['2026-11-03', null, null],
      ['2026-11-04', null, null],
      ['2026-11-05', '2200', '2359'],
      ['2026-11-06', '0000', '0130'],
      ['2026-11-08', '2000', '2359'],
    ]);
    expect(duties.every((d) => d.source === 'calendar' && d.friendsLabel === 'Busy' && d.note === null && d.code === null)).toBe(true);
  });

  it('clips long events to the range', () => {
    const duties = eventsToBusyDuties([{ startDate: '2020-01-01', startTime: '0000', endDate: '2030-01-01', endTime: '0000', allDay: true }], '2026-11-01', '2026-11-03');
    expect(duties).toHaveLength(3);
  });
});
