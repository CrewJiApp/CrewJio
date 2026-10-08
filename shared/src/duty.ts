// Duties and holidays. See CLAUDE.md "Domain model".
import type { CodeCategory } from './roster-codes';

/** ISO date, e.g. "2026-11-04". Dates are Singapore local dates. */
export type IsoDate = string;
/** 24h local time "HHMM", as printed on the roster, e.g. "1755". */
export type HHMM = string;

export const DUTY_KINDS = [
  'flight',
  'layover',
  'standby',
  'reserve',
  'training',
  'sim',
  'ground_school',
  'off',
  'holiday',
  'annual_leave',
  'busy_personal',
  'other',
] as const;
export type DutyKind = (typeof DUTY_KINDS)[number];

/** Category used for matching and sharing when a duty is entered by hand (no roster code). */
export const KIND_CATEGORY: Record<DutyKind, CodeCategory> = {
  flight: 'flight',
  layover: 'layover',
  standby: 'standby',
  reserve: 'reserve',
  training: 'training',
  sim: 'training',
  ground_school: 'training',
  off: 'off',
  holiday: 'leave',
  annual_leave: 'leave',
  busy_personal: 'busy',
  other: 'busy',
};

export interface Duty {
  id: string;
  userId: string;
  date: IsoDate;
  kind: DutyKind;
  category: CodeCategory;
  /** Raw roster code (e.g. "ATDO"). Owner only, never shared. */
  code: string | null;
  /** Label friends see at "destinations" level and above, e.g. "Training". */
  friendsLabel: string;
  flightNumber: string | null;
  /** "SIN-LHR" for a flight, "LHR" for a layover. */
  sector: string | null;
  reportTime: HHMM | null;
  departTime: HHMM | null;
  arriveTime: HHMM | null;
  /** Set when the flight lands on a later date than it departs. */
  arriveDate: IsoDate | null;
  /** Owner only, never shared. */
  note: string | null;
  source: 'manual' | 'import';
  /** Import found a code or value not in the code list. The user must confirm it. */
  needsReview: boolean;
}

export const HOLIDAY_KINDS = ['holiday', 'annual_leave', 'busy_personal', 'reservist'] as const;
export type HolidayKind = (typeof HOLIDAY_KINDS)[number];

/** Holidays, leave, busy and reservist (NTSV) always block matching, even on roster off days. */
export interface Holiday {
  id: string;
  userId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  kind: HolidayKind;
  /** Owner only, never shared. */
  note: string | null;
}
