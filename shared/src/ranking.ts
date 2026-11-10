// Day ranking. See CLAUDE.md "Day ranking". Port of scripts/try_roster.py onto the app's duty
// model, where an overnight flight is one duty with an arrival date.
import { addDays, dateRange } from './dates';
import { BASE_AIRPORT, displayTime, type NewDuty } from './duty-entry';
import { KIND_CATEGORY, type DutyKind, type HHMM, type Holiday, type IsoDate } from './duty';
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
  /** Free on the day, but starts early the next morning, so the evening is not free. */
  noEvening?: boolean;
}

/** Landing back at base from these counts as long-haul: the next day is a recovery day. */
export const LONG_HAUL_AIRPORTS: ReadonlySet<string> = new Set([
  'SFO', 'LAX', 'SEA', 'JFK', 'EWR', 'IAH', 'YVR',
  'LHR', 'MAN', 'FRA', 'CDG', 'AMS', 'ZRH', 'MUC', 'MXP', 'FCO', 'BCN', 'IST', 'CPH',
]);

const BLOCKING = new Set(['national_service', 'leave', 'private']);
/** Starting before this the next morning (a report, a standby, training) rules out a late evening. */
export const EARLY_START = '0700';
const START_KINDS = new Set<DutyKind>(['flight', 'standby', 'reserve', 'training', 'sim', 'ground_school']);
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

  const classifyDay = (date: IsoDate, day: typeof duties): PersonDay => {
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
      const onCall = !day.some((d) => d.kind === 'layover');
      return { date, status: 'Away', note: onCall ? `Standby in ${layover}` : `Layover ${layover}`, layover: away.sector ?? undefined };
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

    // Busy for part of the day (work hours, or a phone calendar event) leaves the rest free.
    const busy = day.filter((d) => d.category === 'busy' && d.kind === 'other');
    if (busy.length > 0 && busy.length === day.length && busy.every((d) => d.reportTime && d.arriveTime && !d.arriveDate)) {
      const first = busy.map((d) => d.reportTime!).sort()[0]!;
      const last = busy.map((d) => d.arriveTime!).sort().at(-1)!;
      const what = busy[0]!.friendsLabel || 'Busy';
      if (last <= '1800') return { date, status: 'Evening', note: `${what} until ${displayTime(last)}` };
      if (first >= '1800') return { date, status: 'Daytime', note: `Free until ${displayTime(first)}` };
      if (first >= '1200') return { date, status: 'Morning', note: `Free until ${displayTime(first)}` };
    }

    return { date, status: 'Busy', note: [...cats].sort().join(', ') };
  };

  const withBusy = (date: IsoDate): PersonDay => {
    const all = duties.filter((d) => d.date === date);
    const busy = all.filter(isBusyEntry);
    // Work and phone-calendar busy entries sit on top of the roster. A day with nothing but
    // busy entries (a partner's calendar) is classified on its own, below.
    if (busy.length === 0 || busy.length === all.length) return classifyDay(date, all);
    return limitByBusy(classifyDay(date, all.filter((d) => !isBusyEntry(d))), busy);
  };

  // The earliest start the next day: a report, a standby or training.
  const nextStart = (date: IsoDate): HHMM | null => {
    const tomorrow = addDays(date, 1);
    const starts = duties
      .filter((d) => d.date === tomorrow && START_KINDS.has(d.kind))
      .map((d) => d.reportTime ?? d.departTime)
      .filter((t): t is HHMM => !!t)
      .sort();
    return starts[0] ?? null;
  };

  return dateRange(start, end).map((date): PersonDay => limitByNextDay(withBusy(date), nextStart(date)));
}

type DutyLike = PersonRoster['duties'][number];
/** Work or a phone-calendar event: an `other` duty in the busy category. */
const isBusyEntry = (d: DutyLike) => d.kind === 'other' && d.category === 'busy';
const isTimedBusy = (d: DutyLike) => !!d.reportTime && !!d.arriveTime && !d.arriveDate;

/**
 * A start before EARLY_START the next morning (standby from 06:00, a 05:40 report) rules out a
 * late evening, however free the day is. A day that was free all day becomes free in the day
 * only; a day that was free from the evening alone becomes busy. Someone just back from a
 * long-haul flight stays Tired, but without the evening (`noEvening`).
 */
function limitByNextDay(day: PersonDay, nextStart: HHMM | null): PersonDay {
  if (!nextStart || nextStart >= EARLY_START || !WINDOWS[day.status].e) return day;
  if (day.status === 'Great') {
    const note = day.note === 'Off' ? `Off, but reports ${nextStart} next morning` : `${day.note} · reports ${displayTime(nextStart)} next morning`;
    return { ...day, status: 'Daytime', note };
  }
  const note = `${day.note} · reports ${displayTime(nextStart)} next morning`;
  if (day.status === 'Tired') return { ...day, note, noEvening: true };
  return { date: day.date, status: 'Busy', note, ...(day.layover ? { layover: day.layover } : {}) };
}

/**
 * Takes busy entries (work or a phone calendar) off a day the roster says is free. A busy entry
 * without hours takes the whole day. With hours it takes the parts of the day it touches
 * (morning before 12:00, afternoon 12:00 to 18:00, evening from 18:00), and what is left decides
 * the status. There is no afternoon-only status, so an afternoon on its own counts as busy.
 */
function limitByBusy(day: PersonDay, busy: DutyLike[]): PersonDay {
  const w = WINDOWS[day.status];
  if (!(w.m || w.a || w.e)) return day; // away, blocked or busy already: nothing to take off
  if (busy.some((d) => !isTimedBusy(d))) return { date: day.date, status: 'Busy', note: 'Busy all day' };
  const free = { m: w.m, a: w.a, e: w.e };
  for (const d of busy) {
    const start = d.reportTime!;
    const end = d.arriveTime!;
    if (start < '1200') free.m = false;
    if (start < '1800' && end > '1200') free.a = false;
    if (end > '1800') free.e = false;
  }
  const first = busy.map((d) => d.reportTime!).sort()[0]!;
  const last = busy.map((d) => d.arriveTime!).sort().at(-1)!;
  const note = `${day.note} · busy ${displayTime(first)} to ${displayTime(last)}`;
  if (free.m === w.m && free.a === w.a && free.e === w.e) return { ...day, note };
  const status: PersonDayStatus = free.e ? 'Evening' : free.m && free.a ? 'Daytime' : free.m ? 'Morning' : 'Busy';
  return { date: day.date, status, note, ...(day.layover ? { layover: day.layover } : {}) };
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
const windowOf = (p: Pick<PersonDay, 'status' | 'noEvening'>): Window => (p.noEvening ? { ...WINDOWS[p.status], e: false } : WINDOWS[p.status]);
const isFree = (p: Pick<PersonDay, 'status' | 'noEvening'>) => { const w = windowOf(p); return w.m || w.a || w.e; };

/** The part of the day people want to meet. "any" keeps every day that works at some point. */
export const DAY_PARTS = ['any', 'morning', 'afternoon', 'evening'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_LABEL: Record<DayPart, string> = { any: 'Any time', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

/** Morning is before 12:00, afternoon 12:00 to 18:00, evening from 18:00 (see classifyPersonDays). */
const PART_KEY: Record<Exclude<DayPart, 'any'>, keyof Window> = { morning: 'm', afternoon: 'a', evening: 'e' };

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
 * With a `part` of the day chosen (morning, afternoon or evening), a day only counts when everyone
 * who is free is free in that part. Days that do not fit become NoMatch, so they drop out of the
 * best days. A shared layover is not affected: everyone is away from home all day.
 */
export function rankDays(people: PersonRoster[], start: IsoDate, end: IsoDate, part: DayPart = 'any'): RankedDay[] {
  const perPerson = people.map((p) => classifyPersonDays(p, start, end));
  return dateRange(start, end).map((date, i): RankedDay => {
    const day: RankedPerson[] = people.map((p, k) => ({ ...perPerson[k]![i]!, userId: p.userId }));
    const n = day.length;
    if (n === 0) return { date, status: 'NoMatch', people: day, summary: '' };
    if (day.some((p) => p.status === 'Blocked')) return { date, status: 'Blocked', people: day, summary: 'Someone is away' };

    const free = day.filter((p) => isFree(p));
    const window = free.reduce<Window>((w, p) => ({ m: w.m && windowOf(p).m, a: w.a && windowOf(p).a, e: w.e && windowOf(p).e }), { m: true, a: true, e: true });
    const overlap = window.m || window.a || window.e;
    // Does the chosen part of the day work for everyone who is free?
    const fits = part === 'any' || window[PART_KEY[part]];
    const works = part === 'any' ? '' : ` · ${part} works`;

    if (free.length === n && overlap) {
      if (!fits) return { date, status: 'NoMatch', people: day, summary: '' };
      const tired = day.filter((p) => p.status === 'Tired').length;
      if (window.m && window.a && window.e) {
        return tired
          ? { date, status: 'Tired', people: day, summary: `${everyone(n)} off · ${tired} just landed${works}` }
          : { date, status: 'Great', people: day, summary: `${everyone(n)} off · well rested${works}` };
      }
      if (window.e) return { date, status: 'Evening', people: day, summary: `${everyone(n)} free from evening` };
      if (window.a) {
        const notes = [tired ? `${tired} just landed` : '', part === 'morning' || part === 'afternoon' ? `${part} works` : ''].filter(Boolean);
        return { date, status: 'Daytime', people: day, summary: `${everyone(n)} free in the day${notes.map((x) => ` · ${x}`).join('')}` };
      }
      return { date, status: 'Morning', people: day, summary: `${everyone(n)} free in the morning` };
    }

    const layovers = new Set(day.map((p) => p.layover));
    if (n >= 2 && day.every((p) => p.status === 'Away' && p.layover) && layovers.size === 1) {
      const city = day[0]!.layover!;
      return { date, status: 'SameLayover', people: day, layover: city, summary: `${everyone(n)} on layover in ${city}` };
    }

    const busy = day.filter((p) => !isFree(p));
    if (n >= 3 && busy.length === 1 && overlap && fits) {
      return { date, status: 'Almost', people: day, busyUserId: busy[0]!.userId, summary: `${n - 1} of ${n} free${part === 'any' ? '' : ` in the ${part}`}` };
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
