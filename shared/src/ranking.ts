// Day ranking. See CLAUDE.md "Day ranking". Port of scripts/try_roster.py onto the app's duty
// model, where an overnight flight is one duty with an arrival date.
import { addDays, dateRange } from './dates';
import { BASE_AIRPORT, displayTime, type NewDuty } from './duty-entry';
import { KIND_CATEGORY, type DutyKind, type Holiday, type IsoDate } from './duty';
import type { SharedRosterEntry } from './sharing';

/** Days ranked for a group, best first by quality. */
export const DAY_STATUSES = ['Great', 'Evening', 'Daytime', 'SameLayover', 'Tired', 'Morning', 'Almost', 'Blocked', 'NoMatch'] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

/** One person's availability on one day, before combining people. */
export const PERSON_DAY_STATUSES = ['Great', 'Evening', 'Tired', 'Morning', 'Daytime', 'Away', 'Busy', 'Blocked'] as const;
export type PersonDayStatus = (typeof PERSON_DAY_STATUSES)[number];

export interface PersonRoster {
  userId: string;
  duties: Omit<NewDuty, 'note' | 'source' | 'needsReview' | 'code'>[];
  holidays: Pick<Holiday, 'kind' | 'startDate' | 'endDate'>[];
}

export interface PersonDay {
  date: IsoDate;
  status: PersonDayStatus;
  note: string;
  /** Layover airport when away on a layover (only known at "destinations" sharing and above). */
  layover?: string;
}

/** Landing back at base from these counts as long-haul: the next day is a recovery day. */
export const LONG_HAUL_AIRPORTS: ReadonlySet<string> = new Set([
  'SFO', 'LAX', 'SEA', 'JFK', 'EWR', 'IAH', 'YVR',
  'LHR', 'MAN', 'FRA', 'CDG', 'AMS', 'ZRH', 'MUC', 'MXP', 'FCO', 'BCN', 'IST', 'CPH',
]);

const BLOCKING = new Set(['national_service', 'leave', 'private']);
const TRAINING_KINDS = new Set<DutyKind>(['training', 'sim', 'ground_school']);

const from = (sector: string | null) => sector?.split('-')[0] ?? null;
const to = (sector: string | null) => sector?.split('-')[1] ?? null;

/**
 * Classifies each day of one person's roster between `start` and `end` (inclusive).
 * A day with nothing on it counts as off: rosters list every day, and people adding duties by
 * hand rarely add their days off. Use `hasRosterIn` to leave people out who haven't added a month.
 */
export function classifyPersonDays(roster: PersonRoster, start: IsoDate, end: IsoDate): PersonDay[] {
  const { duties, holidays } = roster;
  const arrivalDate = (d: (typeof duties)[number]) => d.arriveDate ?? d.date;
  const flights = duties.filter((d) => d.kind === 'flight');
  const landsLongHaul = (date: IsoDate) =>
    flights.some((f) => to(f.sector) === BASE_AIRPORT && f.arriveTime && arrivalDate(f) === date && LONG_HAUL_AIRPORTS.has(from(f.sector) ?? ''));

  return dateRange(start, end).map((date): PersonDay => {
    const day = duties.filter((d) => d.date === date);
    const cats = new Set(day.map((d) => d.category));

    // Holidays, leave, reservist and private days are untouchable.
    const leave = holidays.find((h) => h.startDate <= date && date <= h.endDate);
    if (leave || [...cats].some((c) => BLOCKING.has(c))) {
      const reservist = leave?.kind === 'reservist' || cats.has('national_service');
      const priv = !leave && cats.has('private');
      return { date, status: 'Blocked', note: reservist ? 'Reservist (untouchable)' : priv ? 'Unavailable' : 'Leave' };
    }

    const touching = flights.filter((f) => f.date === date || arrivalDate(f) === date);
    if (touching.length > 0) {
      const dep = touching.filter((f) => f.date === date && from(f.sector) === BASE_AIRPORT && f.departTime);
      const arr = touching.filter((f) => to(f.sector) === BASE_AIRPORT && f.arriveTime && arrivalDate(f) === date);
      const firstDep = dep[0];
      const lastArr = arr[arr.length - 1];
      if (firstDep && lastArr && firstDep.reportTime) {
        const back = lastArr.arriveTime!;
        return { date, status: back >= '2000' ? 'Busy' : 'Evening', note: `Turnaround, back ${back}` };
      }
      if (lastArr) {
        const origin = from(lastArr.sector) ?? '';
        const t = lastArr.arriveTime!;
        return LONG_HAUL_AIRPORTS.has(origin) || t < '1200'
          ? { date, status: 'Tired', note: `Lands ${t} from ${origin}` }
          : { date, status: 'Evening', note: `Lands ${t}` };
      }
      if (firstDep) {
        const rpt = firstDep.reportTime ?? firstDep.departTime!;
        return rpt >= '1100' ? { date, status: 'Morning', note: `Reports ${rpt}` } : { date, status: 'Away', note: `Departs ${firstDep.departTime}` };
      }
      return { date, status: 'Away', note: '' };
    }

    // Away on a layover, or on standby somewhere other than base.
    const away = day.find((d) => d.kind === 'layover' || ((d.kind === 'standby' || d.kind === 'reserve') && d.sector && !d.sector.includes('-') && d.sector !== BASE_AIRPORT));
    if (away) {
      const layover = day.find((d) => d.sector)?.sector ?? away.sector ?? '';
      return { date, status: 'Away', note: `Layover ${layover}`, layover: away.sector ?? undefined };
    }

    if ([...cats].every((c) => c === 'off' || c === 'part_off')) {
      const early = duties.filter((d) => d.date === addDays(date, 1) && d.reportTime && d.reportTime < '0400');
      if (early[0]) return { date, status: 'Daytime', note: `Off, but reports ${early[0].reportTime} next morning` };
      if (landsLongHaul(addDays(date, -1))) return { date, status: 'Tired', note: 'Off, day after long-haul' };
      return { date, status: 'Great', note: 'Off' };
    }

    // Training that finishes by early evening leaves the evening free (CLAUDE.md).
    const training = day.filter((d) => TRAINING_KINDS.has(d.kind));
    if (training.length === day.length && training.every((d) => d.arriveTime && !d.arriveDate && d.arriveTime <= '1800')) {
      const ends = training.map((d) => d.arriveTime!).sort().at(-1)!;
      return { date, status: 'Evening', note: `Training until ${displayTime(ends)}` };
    }

    return { date, status: 'Busy', note: [...cats].sort().join(', ') };
  });
}

/** True when the person has anything on their roster in the range, i.e. they've added that month. */
export function hasRosterIn(roster: PersonRoster, start: IsoDate, end: IsoDate): boolean {
  return (
    roster.duties.some((d) => d.date >= start && d.date <= end) ||
    roster.holidays.some((h) => h.startDate <= end && h.endDate >= start)
  );
}

// Parts of the day a person is free: morning, afternoon, evening.
type Window = { m: boolean; a: boolean; e: boolean };
const WINDOWS: Record<PersonDayStatus, Window> = {
  Great: { m: true, a: true, e: true },
  Tired: { m: true, a: true, e: true },
  Evening: { m: false, a: false, e: true },
  Daytime: { m: true, a: true, e: false },
  Morning: { m: true, a: false, e: false },
  Away: { m: false, a: false, e: false },
  Busy: { m: false, a: false, e: false },
  Blocked: { m: false, a: false, e: false },
};
const isFree = (s: PersonDayStatus) => WINDOWS[s].m || WINDOWS[s].a || WINDOWS[s].e;

export interface RankedPerson extends PersonDay {
  userId: string;
}

export interface RankedDay {
  date: IsoDate;
  status: DayStatus;
  people: RankedPerson[];
  /** Present when status is "Almost": the one person who is not free. */
  busyUserId?: string;
  /** Present when status is "SameLayover": the shared airport. */
  layover?: string;
  /** Short line, e.g. "All 5 off · well rested". */
  summary: string;
}

const QUALITY: Record<DayStatus, number> = { Great: 8, Evening: 6, Daytime: 6, SameLayover: 5, Tired: 4, Morning: 3, Almost: 2, Blocked: 0, NoMatch: 0 };

function everyone(n: number): string {
  return n === 2 ? 'Both' : `All ${n}`;
}

/**
 * Ranks each day for a set of people. Pass only people who have the range in (see hasRosterIn).
 * - Great: everyone off and rested. Tired: everyone off, someone just landed from long-haul.
 * - Evening / Daytime / Morning: the part of the day everyone is free.
 * - SameLayover: everyone away on a layover in the same city.
 * - Almost: all but one free (3+ people, and the busy one is not on leave), which triggers swap ideas.
 * - Blocked: someone is on holiday, leave, reservist or a private day.
 */
export function rankDays(people: PersonRoster[], start: IsoDate, end: IsoDate): RankedDay[] {
  const perPerson = people.map((p) => classifyPersonDays(p, start, end));
  return dateRange(start, end).map((date, i): RankedDay => {
    const day: RankedPerson[] = people.map((p, k) => ({ ...perPerson[k]![i]!, userId: p.userId }));
    const n = day.length;
    if (n === 0) return { date, status: 'NoMatch', people: day, summary: '' };
    if (day.some((p) => p.status === 'Blocked')) return { date, status: 'Blocked', people: day, summary: 'Someone is away' };

    const free = day.filter((p) => isFree(p.status));
    const window = free.reduce<Window>((w, p) => ({ m: w.m && WINDOWS[p.status].m, a: w.a && WINDOWS[p.status].a, e: w.e && WINDOWS[p.status].e }), { m: true, a: true, e: true });
    const overlap = window.m || window.a || window.e;

    if (free.length === n && overlap) {
      const tired = day.filter((p) => p.status === 'Tired').length;
      if (window.m && window.a && window.e) {
        return tired
          ? { date, status: 'Tired', people: day, summary: `${everyone(n)} off · ${tired} just landed` }
          : { date, status: 'Great', people: day, summary: `${everyone(n)} off · well rested` };
      }
      if (window.e) return { date, status: 'Evening', people: day, summary: `${everyone(n)} free from evening` };
      if (window.a) return { date, status: 'Daytime', people: day, summary: `${everyone(n)} free in the day` };
      return { date, status: 'Morning', people: day, summary: `${everyone(n)} free in the morning` };
    }

    const layovers = new Set(day.map((p) => p.layover));
    if (n >= 2 && day.every((p) => p.status === 'Away' && p.layover) && layovers.size === 1) {
      const city = day[0]!.layover!;
      return { date, status: 'SameLayover', people: day, layover: city, summary: `${everyone(n)} on layover in ${city}` };
    }

    const busy = day.filter((p) => !isFree(p.status));
    if (n >= 3 && busy.length === 1 && overlap) {
      return { date, status: 'Almost', people: day, busyUserId: busy[0]!.userId, summary: `${n - 1} of ${n} free` };
    }
    return { date, status: 'NoMatch', people: day, summary: '' };
  });
}

/** The best matching days, best quality first, then soonest. */
export function bestDays(days: RankedDay[], limit = 5): RankedDay[] {
  return days
    .filter((d) => QUALITY[d.status] > 0)
    .sort((a, b) => QUALITY[b.status] - QUALITY[a.status] || a.date.localeCompare(b.date))
    .slice(0, limit);
}

/**
 * A friend's roster as the ranking sees it, built from what get_shared_roster returned to the
 * viewer. Less sharing means less detail: at "off days only" a duty is just Busy, and anything
 * shown as Away without detail counts as untouchable leave, so it never prompts a swap idea.
 */
export function sharedEntriesToRoster(userId: string, entries: SharedRosterEntry[]): PersonRoster {
  const duties: PersonRoster['duties'] = entries.map((e) => {
    const kind: DutyKind = e.kind ?? (e.status === 'off' ? 'off' : 'other');
    const category =
      e.status === 'unavailable' ? 'private' : e.kind ? KIND_CATEGORY[e.kind] : e.status === 'off' ? 'off' : e.status === 'away' ? 'leave' : 'busy';
    return {
      date: e.day,
      kind,
      category,
      friendsLabel: e.label,
      flightNumber: e.flightNumber,
      sector: e.sector,
      reportTime: e.reportTime,
      departTime: e.departTime,
      arriveTime: e.arriveTime,
      arriveDate: e.arriveDate,
    };
  });
  return { userId, duties, holidays: [] };
}
