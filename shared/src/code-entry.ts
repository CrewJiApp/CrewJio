// Typing a roster code by hand: the user enters a code from their roster (STBY, OFFD, AALV,
// NTSV...), we look it up in roster-codes.json and show what it means, then save it as duties.
// A code that is not in the list is never guessed: it is saved as Busy after the user confirms.
import { allCodes, friendsLabel, lookupCode, type CodeCategory, type RosterCode } from './roster-codes';
import { CATEGORY_KIND } from './roster-import';
import { DEFAULT_HOURS, DutyInputError, entryDates, normaliseTime, standbyLocation, type NewDuty } from './duty-entry';
import { addDays } from './dates';
import type { HHMM } from './duty';

export interface CodeMatch extends RosterCode {
  code: string;
}

/** "stby", " s s 6 0" -> "STBY", "SS60". Codes are letters and digits only. */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * Codes matching what the user typed: the exact code first, then codes starting with it, then
 * codes whose description contains every word typed ("annual" finds AALV).
 */
export function searchCodes(query: string, limit = 6): CodeMatch[] {
  const q = query.trim();
  if (!q) return [];
  const code = normaliseCode(q);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const exact: CodeMatch[] = [];
  const prefix: CodeMatch[] = [];
  const described: CodeMatch[] = [];
  for (const [c, info] of allCodes()) {
    if (c === code) exact.push({ code: c, ...info });
    else if (code.length >= 1 && c.startsWith(code)) prefix.push({ code: c, ...info });
    else if (q.length >= 3 && words.every((w) => info.description.toLowerCase().includes(w))) described.push({ code: c, ...info });
  }
  prefix.sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
  return [...exact, ...prefix, ...described].slice(0, limit);
}

/** What else the user has to fill in for a code. */
export type CodeShape =
  /** FLY: use the flight form (flight number, sector, times). */
  | 'flight'
  /** Standby, reserve, training: one day with start and end times. */
  | 'timed'
  /** Everything else (off, leave, reservist, private, busy, layover): one day or a range of days. */
  | 'days';

export function codeShape(category: CodeCategory): CodeShape {
  if (category === 'flight') return 'flight';
  if (category === 'standby' || category === 'reserve' || category === 'training') return 'timed';
  return 'days';
}

/**
 * Default hours for a timed code, read from its description when it has them
 * ("STANDBY AT BASE 0600-2359" -> 0600 to 2359). Training otherwise defaults to 09:00 to 17:00.
 */
export function defaultCodeHours(code: CodeMatch): { start: HHMM; end: HHMM } | null {
  const m = /(\d{4})\s*-\s*(\d{4})/.exec(code.description);
  if (m) {
    const start = normaliseTime(m[1]!);
    const end = normaliseTime(m[2]!);
    if (start && end) return { start, end };
  }
  return code.category === 'training' ? DEFAULT_HOURS.training : null;
}

/** Plain-language line shown under the code while typing. */
export function explainCode(code: CodeMatch): string {
  const friends = friendsLabel(code);
  const what: Record<CodeCategory, string> = {
    off: 'Day off',
    part_off: 'Part of the day off',
    layover: 'Layover',
    standby: 'Standby',
    reserve: 'Reserve',
    training: 'Training',
    flight: 'Flying duty',
    leave: 'Leave. Always blocked when finding days',
    national_service: 'Reservist. Untouchable, never offered for swaps',
    private: 'Private. Only you see the code',
    busy: 'Busy',
  };
  return `${what[code.category]} · friends see "${friends}"`;
}

export interface CodedEntryInput {
  code: string;
  date: string;
  /** Last day, for codes that cover several days (leave, off, reservist...). */
  endDate?: string;
  start?: string;
  end?: string;
  /** Standby or reserve on a layover, or the layover city for LO: the airport, e.g. "SFO". */
  where?: string;
  /** The user confirmed saving a code that is not in the list. */
  allowUnknown?: boolean;
}

/**
 * Builds the duties for a typed code. Known codes take their category and what friends see
 * from the code list; the raw code is stored for the owner only. Unknown codes need
 * `allowUnknown` and are saved as Busy.
 */
export function buildCodedDuties(input: CodedEntryInput): NewDuty[] {
  const code = normaliseCode(input.code);
  if (!code) throw new DutyInputError('code', 'Type the code from your roster, like STBY or OFFD.');
  const known = lookupCode(code);
  if (!known && !input.allowUnknown) throw new DutyInputError('code', `${code} is not in our code list.`);
  const category: CodeCategory = known?.category ?? 'busy';
  const shape = codeShape(category);
  if (shape === 'flight') throw new DutyInputError('code', 'That is a flight. Use the Flight tab to add the flight number and times.');

  const base = (date: string): NewDuty => ({
    date,
    kind: CATEGORY_KIND[category],
    category,
    code,
    friendsLabel: known ? friendsLabel(known) : 'Busy',
    flightNumber: null,
    sector: null,
    reportTime: null,
    departTime: null,
    arriveTime: null,
    arriveDate: null,
    note: null,
    source: 'manual',
    needsReview: false,
  });

  if (shape === 'timed') {
    const [date] = entryDates(input.date, undefined);
    const start = input.start?.trim() ? normaliseTime(input.start) : null;
    const end = input.end?.trim() ? normaliseTime(input.end) : null;
    if (input.start?.trim() && !start) throw new DutyInputError('start', 'Use 24-hour time, like 0600 or 06:00.');
    if (input.end?.trim() && !end) throw new DutyInputError('end', 'Use 24-hour time, like 2359 or 23:59.');
    const onCall = category === 'standby' || category === 'reserve';
    return [
      {
        ...base(date!),
        sector: onCall ? standbyLocation(input.where) : null,
        reportTime: start,
        arriveTime: end,
        arriveDate: start && end && end <= start ? addDays(date!, 1) : null,
      },
    ];
  }

  const sector = category === 'layover' ? standbyLocation(input.where) : null;
  return entryDates(input.date, input.endDate).map((date) => ({ ...base(date), sector }));
}
