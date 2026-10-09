// Manual duty entry: turns what the user types into duty and holiday rows, with validation.
// Used by the Add duty sheet; the database constraints in core_schema.sql mirror these rules.
import { addDays, daysBetween, isIsoDate } from './dates';
import { KIND_CATEGORY, type Duty, type DutyKind, type HHMM, type Holiday, type HolidayKind, type IsoDate } from './duty';

/** A duty before it is saved: no id or owner yet. */
export type NewDuty = Omit<Duty, 'id' | 'userId'>;
export type NewHoliday = Omit<Holiday, 'id' | 'userId'>;

export const BASE_AIRPORT = 'SIN';

/** What friends see for a hand-entered duty (same words as the roster code list). */
export const KIND_FRIENDS_LABEL: Record<DutyKind, string> = {
  flight: 'Flying',
  layover: 'Away (layover)',
  standby: 'Standby',
  reserve: 'Reserve',
  training: 'Training',
  sim: 'Sim',
  ground_school: 'Ground school',
  off: 'Off',
  holiday: 'Away',
  annual_leave: 'Away',
  busy_personal: 'Away',
  other: 'Busy',
};

export const HOLIDAY_LABELS: Record<HolidayKind, string> = {
  holiday: 'Holiday',
  annual_leave: 'Annual leave',
  busy_personal: 'Busy (personal)',
  reservist: 'Reservist (NTSV)',
};

export class DutyInputError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

/** "2105", "21:05", "9:05" or "905" -> "2105". Returns null for anything that is not a real time. */
export function normaliseTime(input: string): HHMM | null {
  const s = input.trim().replace(/[.:h]/gi, '');
  if (!/^\d{3,4}$/.test(s)) return null;
  const padded = s.padStart(4, '0');
  const h = Number(padded.slice(0, 2));
  const m = Number(padded.slice(2));
  return h < 24 && m < 60 ? padded : null;
}

/** "sq322", "SQ 322", "tr 18" -> "SQ 322". Two-character airline code, then 1 to 4 digits, optional suffix letter. */
export function normaliseFlightNumber(input: string): string | null {
  const m = /^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/.exec(input.trim().toUpperCase());
  if (!m || /^\d{2}$/.test(m[1]!)) return null;
  return `${m[1]} ${m[2]}`;
}

export function normaliseAirport(input: string): string | null {
  const s = input.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : null;
}

/** "HHMM" -> "HH:MM" for display and for Postgres `time` columns. */
export function displayTime(t: HHMM): string {
  return `${t.slice(0, 2)}:${t.slice(2)}`;
}

function required<T>(value: T | null | undefined, field: string, message: string): T {
  if (value == null) throw new DutyInputError(field, message);
  return value;
}

function optionalTime(input: string | undefined, field: string): HHMM | null {
  if (!input?.trim()) return null;
  return required(normaliseTime(input), field, 'Use 24-hour time, like 2105 or 21:05.');
}

function checkDate(date: string, field: string): IsoDate {
  if (!isIsoDate(date)) throw new DutyInputError(field, 'Pick a date.');
  return date;
}

function base(kind: DutyKind, date: IsoDate): NewDuty {
  return {
    date,
    kind,
    category: KIND_CATEGORY[kind],
    code: null,
    friendsLabel: KIND_FRIENDS_LABEL[kind],
    flightNumber: null,
    sector: null,
    reportTime: null,
    departTime: null,
    arriveTime: null,
    arriveDate: null,
    note: null,
    source: 'manual',
    needsReview: false,
  };
}

export interface FlightLegInput {
  date: string;
  flightNumber: string;
  departTime?: string;
  arriveTime?: string;
  /** Lands the day after it departs (shown as +1). */
  arrivesNextDay?: boolean;
}

export interface FlightInput extends FlightLegInput {
  from?: string;
  to: string;
  reportTime?: string;
  /** Optional return flight. Days in between become layover days at the destination. */
  returnFlight?: FlightLegInput;
}

/** Longest trip we accept in one entry. */
export const MAX_TRIP_DAYS = 14;

function leg(input: FlightLegInput, from: string, to: string, prefix: string, reportTime: HHMM | null): NewDuty {
  const date = checkDate(input.date, `${prefix}date`);
  return {
    ...base('flight', date),
    flightNumber: required(normaliseFlightNumber(input.flightNumber), `${prefix}flightNumber`, 'Flight number looks like SQ 322.'),
    sector: `${from}-${to}`,
    reportTime,
    departTime: optionalTime(input.departTime, `${prefix}departTime`),
    arriveTime: optionalTime(input.arriveTime, `${prefix}arriveTime`),
    arriveDate: input.arrivesNextDay ? addDays(date, 1) : null,
  };
}

/**
 * A single flight, a turnaround (return the same day) or a trip (return later). A trip fills every
 * day between the two flights with a layover at the destination, so friends see you as away.
 */
export function buildFlightDuties(input: FlightInput): NewDuty[] {
  const from = required(normaliseAirport(input.from ?? BASE_AIRPORT), 'from', 'Use a 3-letter airport code, like SIN.');
  const to = required(normaliseAirport(input.to), 'to', 'Use a 3-letter airport code, like LHR.');
  if (from === to) throw new DutyInputError('to', 'Departure and arrival airports are the same.');
  const out = leg(input, from, to, '', optionalTime(input.reportTime, 'reportTime'));
  if (!input.returnFlight) return [out];

  const back = leg(input.returnFlight, to, from, 'return.', null);
  const gap = daysBetween(out.date, back.date);
  if (gap < 0) throw new DutyInputError('return.date', 'The return flight is before the outbound flight.');
  if (gap > MAX_TRIP_DAYS) throw new DutyInputError('return.date', `Trips longer than ${MAX_TRIP_DAYS} days need to be added in parts.`);

  const layovers: NewDuty[] = [];
  for (let d = addDays(out.date, 1); d < back.date; d = addDays(d, 1)) {
    layovers.push({ ...base('layover', d), sector: to });
  }
  return [out, ...layovers, back];
}

export type TimedKind = 'training' | 'sim' | 'ground_school' | 'standby' | 'reserve';

/** Default hours: training is usually 09:00 to 17:00 (CLAUDE.md). */
export const DEFAULT_HOURS: Record<TimedKind, { start: HHMM; end: HHMM } | null> = {
  training: { start: '0900', end: '1700' },
  ground_school: { start: '0900', end: '1700' },
  sim: null,
  standby: null,
  reserve: null,
};

/**
 * Training, sim, ground school, standby or reserve on one day.
 * For these duties report_time holds the start and arrive_time the end.
 */
export function buildTimedDuty(input: { kind: TimedKind; date: string; start?: string; end?: string; note?: string }): NewDuty {
  const date = checkDate(input.date, 'date');
  const start = optionalTime(input.start, 'start');
  const end = optionalTime(input.end, 'end');
  return {
    ...base(input.kind, date),
    reportTime: start,
    arriveTime: end,
    // Ends after midnight, e.g. a 1600 to 0200 standby.
    arriveDate: start && end && end <= start ? addDays(date, 1) : null,
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
  };
}

export function buildOffDuty(date: string): NewDuty {
  return base('off', checkDate(date, 'date'));
}

/** Holiday, annual leave, busy or reservist over one or more days. Always blocks matching. */
export function buildLeave(input: { kind: HolidayKind; startDate: string; endDate?: string; note?: string }): NewHoliday {
  const startDate = checkDate(input.startDate, 'startDate');
  const endDate = input.endDate ? checkDate(input.endDate, 'endDate') : startDate;
  if (endDate < startDate) throw new DutyInputError('endDate', 'The end date is before the start date.');
  if (daysBetween(startDate, endDate) > 366) throw new DutyInputError('endDate', 'Leave can be up to a year at a time.');
  return {
    kind: input.kind,
    startDate,
    endDate,
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
  };
}
