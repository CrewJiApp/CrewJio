// Day ranking. See CLAUDE.md "Day ranking". Implemented in build step 4 (port of scripts/try_roster.py).
import type { Duty, Holiday, IsoDate } from './duty';

export const DAY_STATUSES = ['Great', 'Evening', 'Tired', 'Almost', 'Morning', 'Daytime', 'Blocked'] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

/** One person's availability on one day, before combining people. */
export const PERSON_DAY_STATUSES = ['Great', 'Evening', 'Tired', 'Morning', 'Daytime', 'Away', 'Busy', 'Blocked'] as const;
export type PersonDayStatus = (typeof PERSON_DAY_STATUSES)[number];

export interface PersonRoster {
  userId: string;
  duties: Duty[];
  holidays: Holiday[];
}

export interface PersonDay {
  date: IsoDate;
  status: PersonDayStatus;
  note: string;
}

export interface RankedDay {
  date: IsoDate;
  status: DayStatus;
  /** Present when status is "Almost": the one person who is not free. */
  busyUserId?: string;
  /** Short, shareable reason, e.g. "All 5 off, rested". */
  summary: string;
}

/** Classify each day of one person's roster between from and to (inclusive). */
export function classifyPersonDays(_roster: PersonRoster, _from: IsoDate, _to: IsoDate): PersonDay[] {
  throw new Error('classifyPersonDays is not implemented yet (build step 4)');
}

/** Rank each day for a group of people, best days first. */
export function rankDays(_people: PersonRoster[], _from: IsoDate, _to: IsoDate): RankedDay[] {
  throw new Error('rankDays is not implemented yet (build step 4)');
}
