import { describe, expect, it } from 'vitest';
import roster from '../../samples/nov-2026-roster.json';
import expected from '../../samples/nov-2026-days.json';
import {
  bestDays,
  buildFlightDuties,
  buildLeave,
  buildOffDuty,
  buildTimedDuty,
  classifyPersonDays,
  DAY_PARTS,
  hasRosterIn,
  rankDays,
  rowsToDuties,
  sharedEntriesToRoster,
  type PersonRoster,
  type RosterRow,
  type SharedRosterEntry,
} from '../src';

const nickDuties = rowsToDuties(roster.rows as RosterRow[]);
const nick: PersonRoster = { userId: 'nick', duties: nickDuties, holidays: [] };

describe('list-view rows to duties', () => {
  it('knows every code in the sample and flags none for review', () => {
    expect(nickDuties.every((d) => !d.needsReview)).toBe(true);
  });

  it('merges an overnight flight into one duty that lands the next day', () => {
    const sq31 = nick.duties.filter((d) => d.flightNumber === 'SQ 31');
    expect(sq31).toHaveLength(1);
    expect(sq31[0]).toMatchObject({ date: '2026-11-07', sector: 'SFO-SIN', reportTime: '0840', departTime: '0940', arriveTime: '1905', arriveDate: '2026-11-08' });
  });

  it('merges a standby that runs past midnight', () => {
    const stby = nickDuties.filter((d) => d.code === 'STBY');
    expect(stby).toHaveLength(1);
    expect(stby[0]).toMatchObject({ kind: 'standby', date: '2026-11-06', sector: 'SFO', reportTime: '2005', arriveTime: '0040', arriveDate: '2026-11-07' });
  });

  it('keeps turnaround legs as two flights and maps reservist and off days', () => {
    expect(nick.duties.filter((d) => d.date === '2026-11-02').map((d) => d.flightNumber)).toEqual(['SQ 148', 'SQ 147']);
    expect(nickDuties.find((d) => d.date === '2026-11-23')).toMatchObject({ code: 'NTSV', category: 'national_service', friendsLabel: 'Away' });
    expect(nickDuties.find((d) => d.date === '2026-11-01')).toMatchObject({ code: 'ATDO', kind: 'off', category: 'off', friendsLabel: 'Off' });
  });

  it('flags unknown codes instead of guessing', () => {
    const [d] = rowsToDuties([{ date: '2026-11-01', duty: 'QX7Q', sector: 'SIN' }]);
    expect(d).toMatchObject({ needsReview: true, category: 'busy', friendsLabel: 'Busy', code: 'QX7Q' });
  });
});

describe('one person (port of scripts/try_roster.py)', () => {
  it('reproduces samples/nov-2026-days.json exactly', () => {
    const days = classifyPersonDays(nick, '2026-11-01', '2026-11-30');
    expect(days.map(({ date, status, note }) => ({ date, status, note }))).toEqual(expected.map(({ date, status, note }) => ({ date, status, note })));
  });

  it('works the same on duties added by hand', () => {
    const duties = [
      ...buildFlightDuties({ date: '2026-11-04', flightNumber: 'SQ 34', to: 'SFO', reportTime: '1755', departTime: '1955', returnFlight: { date: '2026-11-07', flightNumber: 'SQ 31', departTime: '0940', arriveTime: '1905', arrivesNextDay: true } }),
      buildOffDuty('2026-11-09'),
    ];
    const days = classifyPersonDays({ userId: 'x', duties, holidays: [] }, '2026-11-04', '2026-11-10');
    expect(days.map((d) => d.status)).toEqual(['Morning', 'Away', 'Away', 'Away', 'Tired', 'Tired', 'Great']);
  });

  it('frees the evening after training that ends by 18:00, but not after standby', () => {
    const duties = [buildTimedDuty({ kind: 'training', date: '2026-11-03', start: '0900', end: '1700' }), buildTimedDuty({ kind: 'standby', date: '2026-11-04', start: '0600', end: '1400' })];
    const [trg, sby] = classifyPersonDays({ userId: 'x', duties, holidays: [] }, '2026-11-03', '2026-11-04');
    expect(trg).toMatchObject({ status: 'Evening', note: 'Training until 17:00' });
    expect(sby).toMatchObject({ status: 'Busy' });
  });

  it('blocks holidays even on roster off days', () => {
    const days = classifyPersonDays({ userId: 'x', duties: [buildOffDuty('2026-11-01')], holidays: [buildLeave({ kind: 'holiday', startDate: '2026-11-01' })] }, '2026-11-01', '2026-11-01');
    expect(days[0]).toMatchObject({ status: 'Blocked', note: 'Leave' });
  });

  it('knows whether someone has added a month', () => {
    expect(hasRosterIn(nick, '2026-11-01', '2026-11-30')).toBe(true);
    expect(hasRosterIn(nick, '2026-12-01', '2026-12-31')).toBe(false);
  });
});

// Three friends for November, built by hand around Nick's real sample.
const jia: PersonRoster = {
  userId: 'jia',
  duties: [
    ...buildFlightDuties({ date: '2026-11-02', flightNumber: 'SQ 978', to: 'BKK', reportTime: '0730', departTime: '0930', returnFlight: { date: '2026-11-02', flightNumber: 'SQ 979', arriveTime: '1600' } }),
    ...buildFlightDuties({ date: '2026-11-15', flightNumber: 'SQ 318', to: 'LHR', reportTime: '2120', departTime: '2320', arrivesNextDay: true, returnFlight: { date: '2026-11-17', flightNumber: 'SQ 317', departTime: '1130', arriveTime: '0730', arrivesNextDay: true } }),
    buildTimedDuty({ kind: 'standby', date: '2026-11-20', start: '0600', end: '1800' }),
    buildOffDuty('2026-11-30'),
  ],
  holidays: [buildLeave({ kind: 'annual_leave', startDate: '2026-11-25', endDate: '2026-11-26' })],
};
const arif: PersonRoster = {
  userId: 'arif',
  duties: [
    ...buildFlightDuties({ date: '2026-11-15', flightNumber: 'SQ 52', to: 'MAN', reportTime: '0010', departTime: '0210', returnFlight: { date: '2026-11-17', flightNumber: 'SQ 51', departTime: '1005', arriveTime: '0715', arrivesNextDay: true } }),
    buildOffDuty('2026-11-30'),
  ],
  holidays: [],
};
const pri: PersonRoster = { userId: 'pri', duties: [], holidays: [] };

describe('a group', () => {
  const group = [nick, jia, arif];
  const days = rankDays(group, '2026-11-01', '2026-11-30');
  const on = (date: string) => days.find((d) => d.date === date)!;

  it('finds days everyone is off and rested', () => {
    expect(on('2026-11-01')).toMatchObject({ status: 'Great', summary: 'All 3 off · well rested' });
    expect(on('2026-11-10').status).toBe('Great');
  });

  it('finds evenings when someone is back from a turnaround', () => {
    expect(on('2026-11-02')).toMatchObject({ status: 'Evening', summary: 'All 3 free from evening' });
  });

  it('marks days after long-haul as tired', () => {
    // Nick lands from SFO on the 8th.
    expect(on('2026-11-08')).toMatchObject({ status: 'Tired', summary: 'All 3 off · 1 just landed' });
  });

  it('spots a shared layover city', () => {
    // Nick and Arif are both in Manchester on the 16th, but Jia is in London.
    expect(on('2026-11-16').status).toBe('NoMatch');
    const pair = rankDays([nick, arif], '2026-11-16', '2026-11-16');
    expect(pair[0]).toMatchObject({ status: 'SameLayover', layover: 'MAN', summary: 'Both on layover in MAN' });
  });

  it('suggests an almost-day when exactly one person is on duty', () => {
    expect(on('2026-11-20')).toMatchObject({ status: 'Almost', busyUserId: 'jia', summary: '2 of 3 free' });
  });

  it('blocks reservist and leave days for the whole group', () => {
    expect(on('2026-11-23').status).toBe('Blocked'); // Nick's reservist
    expect(on('2026-11-25').status).toBe('Blocked'); // Jia's annual leave
  });

  it('lists the best days first', () => {
    const best = bestDays(days, 3);
    expect(best.map((d) => d.status)).toEqual(['Great', 'Great', 'Great']);
    expect(best[0]!.date).toBe('2026-11-01');
    expect(best.every((d, i) => i === 0 || d.date > best[i - 1]!.date)).toBe(true);
  });

  it('leaves people out who have not added the month', () => {
    const included = [nick, jia, arif, pri].filter((p) => hasRosterIn(p, '2026-11-01', '2026-11-30'));
    expect(included.map((p) => p.userId)).toEqual(['nick', 'jia', 'arif']);
  });
});

describe('friends seen through sharing levels', () => {
  const base = { label: '', sector: null, flightNumber: null, reportTime: null, departTime: null, arriveTime: null, arriveDate: null };
  const entry = (day: string, status: SharedRosterEntry['status'], extra: Partial<SharedRosterEntry> = {}): SharedRosterEntry => ({ ...base, day, status, kind: null, ...extra });

  it('ranks off-days-only friends as off or busy', () => {
    const friend = sharedEntriesToRoster('f', [entry('2026-11-01', 'off'), entry('2026-11-02', 'busy')]);
    const days = classifyPersonDays(friend, '2026-11-01', '2026-11-03');
    expect(days.map((d) => d.status)).toEqual(['Great', 'Busy', 'Great']);
  });

  it('treats unexplained Away and Unavailable as untouchable', () => {
    const friend = sharedEntriesToRoster('f', [entry('2026-11-01', 'away'), entry('2026-11-02', 'unavailable')]);
    expect(classifyPersonDays(friend, '2026-11-01', '2026-11-02').map((d) => d.status)).toEqual(['Blocked', 'Blocked']);
  });

  it('uses full detail when it is shared', () => {
    const friend = sharedEntriesToRoster('f', [
      entry('2026-11-02', 'busy', { kind: 'flight', sector: 'SIN-BWN', flightNumber: 'SQ 148', reportTime: '0700', departTime: '0900' }),
      entry('2026-11-02', 'busy', { kind: 'flight', sector: 'BWN-SIN', flightNumber: 'SQ 147', departTime: '1205', arriveTime: '1430' }),
      entry('2026-11-03', 'away', { kind: 'layover', sector: 'LHR' }),
    ]);
    const days = classifyPersonDays(friend, '2026-11-02', '2026-11-03');
    expect(days[0]).toMatchObject({ status: 'Evening', note: 'Turnaround, back 1430' });
    expect(days[1]).toMatchObject({ status: 'Away', layover: 'LHR' });
  });
});

describe('choosing a time of day', () => {
  const dateWith = (status: string) => expected.find((d) => d.status === status)!.date;
  const only = (date: string, part: Parameters<typeof rankDays>[3]) => rankDays([nick], date, date, part)[0]!;

  it('offers any time, morning, afternoon and evening', () => {
    expect(DAY_PARTS).toEqual(['any', 'morning', 'afternoon', 'evening']);
  });

  it('any time ranks exactly as before', () => {
    expect(rankDays([nick], '2026-11-01', '2026-11-30', 'any')).toEqual(rankDays([nick], '2026-11-01', '2026-11-30'));
  });

  it('keeps an evening-only day for Evening, and drops it for morning and afternoon', () => {
    const day = dateWith('Evening');
    expect(only(day, 'evening').status).toBe('Evening');
    expect(only(day, 'morning').status).toBe('NoMatch');
    expect(only(day, 'afternoon').status).toBe('NoMatch');
    expect(only(day, 'any').status).toBe('Evening');
  });

  it('keeps a morning-only day for Morning, and drops it for the afternoon and evening', () => {
    const day = dateWith('Morning');
    expect(only(day, 'morning').status).toBe('Morning');
    expect(only(day, 'afternoon').status).toBe('NoMatch');
    expect(only(day, 'evening').status).toBe('NoMatch');
  });

  it('a fully free day fits every part, and the summary says which one', () => {
    const day = dateWith('Great');
    for (const part of ['morning', 'afternoon', 'evening'] as const) {
      expect(only(day, part)).toMatchObject({ status: 'Great' });
      expect(only(day, part).summary).toContain(`${part} works`);
    }
    expect(only(day, 'any').summary).not.toContain('works');
  });

  it('takes the best days for the chosen part only, and never offers a day that does not fit', () => {
    const evening = bestDays(rankDays([nick], '2026-11-01', '2026-11-30', 'evening'), 30);
    const morning = bestDays(rankDays([nick], '2026-11-01', '2026-11-30', 'morning'), 30);
    const any = bestDays(rankDays([nick], '2026-11-01', '2026-11-30'), 30);
    expect(evening.length).toBeGreaterThan(0);
    expect(evening.length).toBeLessThanOrEqual(any.length);
    expect(morning.length).toBeLessThanOrEqual(any.length);
    // An evening-only day is never offered for the morning, and the other way round.
    expect(morning.some((d) => d.status === 'Evening')).toBe(false);
    expect(evening.some((d) => d.status === 'Morning')).toBe(false);
  });

  it('still blocks the day when someone is on leave, whatever part is chosen', () => {
    expect(only('2026-11-23', 'evening').status).toBe('Blocked'); // Nick's reservist
  });
});

describe('a phone calendar on top of a crew roster', () => {
  const busy = (date: string, reportTime: string, arriveTime: string) => ({
    ...buildOffDuty(date),
    kind: 'other' as const,
    category: 'busy' as const,
    friendsLabel: 'Busy',
    reportTime,
    departTime: null,
    arriveTime,
  });
  const day = (duties: PersonRoster['duties'], date = '2026-12-03') => classifyPersonDays({ userId: 'u', duties, holidays: [] }, date, date)[0]!;

  it('a day off with a dinner at 19:00 is free until the evening', () => {
    expect(day([buildOffDuty('2026-12-03'), busy('2026-12-03', '1900', '2100')])).toMatchObject({ status: 'Daytime' });
  });

  it('a day off with a morning appointment is free from the afternoon, so it counts as evening', () => {
    expect(day([buildOffDuty('2026-12-03'), busy('2026-12-03', '0900', '1130')]).status).toBe('Evening');
  });

  it('a day off busy from the afternoon into the night is free in the morning only', () => {
    expect(day([buildOffDuty('2026-12-03'), busy('2026-12-03', '1300', '2100')]).status).toBe('Morning');
  });

  it('a day off busy in the middle of the afternoon is still free in the evening', () => {
    expect(day([buildOffDuty('2026-12-03'), busy('2026-12-03', '1400', '1600')]).status).toBe('Evening'); // morning and evening stay free, evening is the one we keep
  });

  it('an all-day event takes the whole day', () => {
    const allDay = { ...busy('2026-12-03', '0000', '2359'), reportTime: null, arriveTime: null };
    expect(day([buildOffDuty('2026-12-03'), allDay])).toMatchObject({ status: 'Busy', note: 'Busy all day' });
  });

  it('an early event takes the morning part of the day', () => {
    const r = day([buildOffDuty('2026-12-03'), busy('2026-12-03', '0200', '0300')]);
    expect(r.status).toBe('Evening'); // afternoon and evening stay free, evening is the one we keep
  });

  it('a turnaround that is back in the afternoon is busy if there is a dinner that evening', () => {
    const duties = buildFlightDuties({ date: '2026-12-03', flightNumber: 'SQ 978', to: 'BKK', reportTime: '0730', departTime: '0930', arriveTime: '1100', returnFlight: { date: '2026-12-03', flightNumber: 'SQ 979', departTime: '1230', arriveTime: '1600' } });
    expect(day(duties).status).toBe('Evening');
    expect(day([...duties, busy('2026-12-03', '1900', '2100')]).status).toBe('Busy');
  });

  it('leaves and a phone calendar together stay blocked', () => {
    const r = classifyPersonDays({ userId: 'u', duties: [busy('2026-12-03', '1900', '2100')], holidays: [{ kind: 'holiday', startDate: '2026-12-03', endDate: '2026-12-03' }] }, '2026-12-03', '2026-12-03')[0]!;
    expect(r.status).toBe('Blocked');
  });

  it('a partner with only busy entries is classified as before', () => {
    expect(day([busy('2026-12-03', '0900', '1700')]).status).toBe('Evening');
  });
});
