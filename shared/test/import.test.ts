// Screenshot import end to end without the network: the November 2026 sample as Claude would
// return it, cleaned by the Edge Function's code, turned into duties, checked against the code
// list, and ranked. Plus the review step.
import { describe, expect, it } from 'vitest';
import roster from '../../samples/nov-2026-roster.json';
import expected from '../../samples/nov-2026-days.json';
import { sanitizeRows } from '../../supabase/functions/roster-import/parse';
import {
  classifyPersonDays,
  finalDuties,
  hasUnresolved,
  importLabel,
  importedDays,
  rowsToDuties,
  summariseImport,
  type PersonRoster,
  type RosterRow,
} from '../src';

const cleaned = sanitizeRows(roster.rows);

describe('the sample roster through the whole import', () => {
  it('survives cleaning with every row, and without aircraft or acting rank', () => {
    expect(cleaned.dropped).toBe(0);
    expect(cleaned.rows).toHaveLength(roster.rows.length);
    const text = JSON.stringify(cleaned.rows);
    expect(text).not.toMatch(/7M8|35U|actingRank|"ac"/);
  });

  it('becomes exactly the days in samples/nov-2026-days.json', () => {
    const duties = rowsToDuties(cleaned.rows as RosterRow[]);
    expect(duties.some((d) => d.needsReview)).toBe(false);
    const days = classifyPersonDays({ userId: 'me', duties, holidays: [] } as PersonRoster, '2026-11-01', '2026-11-30');
    expect(days.map(({ date, status, note }) => ({ date, status, note }))).toEqual(expected.map(({ date, status, note }) => ({ date, status, note })));
  });
});

describe('pink training days', () => {
  it('a pink day with no code is training 09:00 to 17:00', () => {
    const [d] = rowsToDuties([{ date: '2026-11-12', duty: '', highlight: 'pink' }]);
    expect(d).toMatchObject({ kind: 'training', category: 'training', code: null, friendsLabel: 'Training', reportTime: '0900', arriveTime: '1700', source: 'import', needsReview: false });
    expect(importLabel(d!).title).toBe('Training');
  });

  it('a pink day that does show a code keeps that code', () => {
    const [d] = rowsToDuties([{ date: '2026-11-12', duty: 'OFFD', highlight: 'pink' }]);
    expect(d).toMatchObject({ code: 'OFFD', kind: 'off' });
  });
});

describe('the review step', () => {
  const found = rowsToDuties([
    { date: '2026-11-02', duty: 'OFFD' },
    { date: '2026-11-03', duty: 'QX7Q' },
    { date: '2026-11-04', duty: 'FLY', flight: 'SQ 34', sector: 'SIN-SFO', rpt: '1755', std: '1955', sta: '1835' },
    { date: '2026-11-05', duty: 'STBY', sector: 'SFO', rpt: '2005', std: '2005' },
    { date: '2026-11-06', duty: 'ZZ9Z' },
  ]);

  it('summarises what was found', () => {
    expect(summariseImport(found)).toEqual({ duties: 5, needsReview: 2, from: '2026-11-02', to: '2026-11-06' });
    expect(summariseImport([])).toEqual({ duties: 0, needsReview: 0, from: null, to: null });
  });

  it('describes duties in plain words', () => {
    expect(importLabel(found[2]!)).toEqual({ title: 'SQ 34 · SIN → SFO', detail: 'Report 17:55 · Departs 19:55 · Lands 18:35' });
    expect(importLabel(found[0]!).title).toMatch(/^OFFD · /);
    expect(importLabel(found[1]!)).toEqual({ title: 'QX7Q · not in the code list', detail: 'Needs a look. We would save it as Busy.' });
  });

  it('never saves a code that needs a look until it is confirmed, then as plain Busy', () => {
    const none = { removed: new Set<number>(), confirmed: new Set<number>() };
    expect(hasUnresolved(found, none)).toBe(true);
    expect(finalDuties(found, none).map((d) => d.code)).toEqual(['OFFD', 'FLY', 'STBY']);

    const some = { removed: new Set([4]), confirmed: new Set([1]) };
    expect(hasUnresolved(found, some)).toBe(false);
    const final = finalDuties(found, some);
    expect(final.map((d) => d.code)).toEqual(['OFFD', 'QX7Q', 'FLY', 'STBY']);
    expect(final[1]).toMatchObject({ kind: 'other', category: 'busy', friendsLabel: 'Busy', needsReview: false });
  });

  it('removing a duty leaves it out', () => {
    expect(finalDuties(found, { removed: new Set([0, 1, 4]), confirmed: new Set() }).map((d) => d.code)).toEqual(['FLY', 'STBY']);
  });

  it('knows which days it covers', () => {
    expect(importedDays(found)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(importedDays([])).toEqual([]);
  });
});
