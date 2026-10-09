// Mapping between app types and database rows (public.duties, public.holidays, public.profiles).
import type { Duty, HHMM, Holiday } from './duty';
import type { NewDuty, NewHoliday } from './duty-entry';
import type { Profile } from './profile';

export interface DutyRow {
  id?: string;
  user_id?: string;
  duty_date: string;
  kind: string;
  category: string;
  code: string | null;
  friends_label: string;
  flight_number: string | null;
  sector: string | null;
  report_time: string | null;
  depart_time: string | null;
  arrive_time: string | null;
  arrive_date: string | null;
  note: string | null;
  source: string;
  needs_review: boolean;
}

export interface HolidayRow {
  id?: string;
  user_id?: string;
  start_date: string;
  end_date: string;
  kind: string;
  note: string | null;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  role: string;
  airline: string;
  rank: string | null;
  fleets: string[];
  jcl_trained: boolean;
  open_to_swaps: boolean;
}

/** "2105" -> "21:05" for Postgres. */
const toDbTime = (t: HHMM | null) => (t ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : null);
/** "21:05:00" -> "2105". */
const fromDbTime = (t: string | null) => (t ? t.slice(0, 5).replace(':', '') : null);

export function dutyToRow(d: NewDuty): DutyRow {
  return {
    duty_date: d.date,
    kind: d.kind,
    category: d.category,
    code: d.code,
    friends_label: d.friendsLabel,
    flight_number: d.flightNumber,
    sector: d.sector,
    report_time: toDbTime(d.reportTime),
    depart_time: toDbTime(d.departTime),
    arrive_time: toDbTime(d.arriveTime),
    arrive_date: d.arriveDate,
    note: d.note,
    source: d.source,
    needs_review: d.needsReview,
  };
}

export function rowToDuty(r: DutyRow & { id: string; user_id: string }): Duty {
  return {
    id: r.id,
    userId: r.user_id,
    date: r.duty_date,
    kind: r.kind as Duty['kind'],
    category: r.category as Duty['category'],
    code: r.code,
    friendsLabel: r.friends_label,
    flightNumber: r.flight_number,
    sector: r.sector,
    reportTime: fromDbTime(r.report_time),
    departTime: fromDbTime(r.depart_time),
    arriveTime: fromDbTime(r.arrive_time),
    arriveDate: r.arrive_date,
    note: r.note,
    source: r.source as Duty['source'],
    needsReview: r.needs_review,
  };
}

export function holidayToRow(h: NewHoliday): HolidayRow {
  return { start_date: h.startDate, end_date: h.endDate, kind: h.kind, note: h.note };
}

export function rowToHoliday(r: HolidayRow & { id: string; user_id: string }): Holiday {
  return { id: r.id, userId: r.user_id, startDate: r.start_date, endDate: r.end_date, kind: r.kind as Holiday['kind'], note: r.note };
}

export function profileToRow(p: Profile): ProfileRow {
  return {
    id: p.id,
    display_name: p.displayName.trim(),
    role: p.role,
    airline: p.airline,
    rank: p.rank,
    fleets: p.fleets,
    jcl_trained: p.jclTrained,
    open_to_swaps: p.openToSwaps,
  };
}

export function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    displayName: r.display_name,
    role: r.role as Profile['role'],
    airline: r.airline as Profile['airline'],
    rank: r.rank as Profile['rank'],
    fleets: r.fleets as Profile['fleets'],
    jclTrained: r.jcl_trained,
    openToSwaps: r.open_to_swaps,
  };
}
