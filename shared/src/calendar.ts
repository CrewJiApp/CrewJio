// My Roster calendar: month grid, what each day cell shows, and the "next duty" card.
import { addDays, dateRange, daysBetween, shortDate, weekdayIndex } from './dates';
import { BASE_AIRPORT, HOLIDAY_LABELS, displayTime, type NewDuty } from './duty-entry';
import type { Holiday, IsoDate } from './duty';

/** Weeks of a month, Monday first. Days outside the month are null. */
export function monthGrid(year: number, month: number): (IsoDate | null)[][] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const days = dateRange(first, addDays(next, -1));
  const cells: (IsoDate | null)[] = [...Array(weekdayIndex(first)).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Colour family of a day cell. Matches the legend under the calendar. */
export type DayTone = 'flight' | 'training' | 'standby' | 'leave' | 'off' | 'empty';

export interface DayBadge {
  tone: DayTone;
  /** Short code under the date: destination (LHR), SBY, RSV, TRG, SIM, GND, AL, HOL, NS... */
  code: string | null;
}

type DutyLike = Pick<NewDuty, 'date' | 'kind' | 'sector'>;
type HolidayLike = Pick<Holiday, 'kind' | 'startDate' | 'endDate'>;

const HOLIDAY_CODE: Record<Holiday['kind'], string> = { holiday: 'HOL', annual_leave: 'AL', busy_personal: 'BUSY', reservist: 'NS' };

/** The airport away from base on a sector: SIN-LHR -> LHR, LHR-SIN -> LHR, LHR -> LHR. */
export function awayAirport(sector: string | null): string | null {
  if (!sector) return null;
  const ends = sector.split('-');
  return ends.find((a) => a !== BASE_AIRPORT) ?? ends[0] ?? null;
}

/**
 * What a day cell shows. Leave always wins (it blocks matching even on a roster day), then
 * flying and layovers, then training, then standby or reserve, then a day off.
 */
export function dayBadge(date: IsoDate, duties: DutyLike[], holidays: HolidayLike[]): DayBadge {
  const leave = holidays.find((h) => h.startDate <= date && date <= h.endDate);
  if (leave) return { tone: 'leave', code: HOLIDAY_CODE[leave.kind] };
  const today = duties.filter((d) => d.date === date);
  const away = today.find((d) => d.kind === 'flight' || d.kind === 'layover');
  if (away) return { tone: 'flight', code: awayAirport(away.sector) };
  const training = today.find((d) => d.kind === 'training' || d.kind === 'sim' || d.kind === 'ground_school');
  if (training) return { tone: 'training', code: training.kind === 'sim' ? 'SIM' : training.kind === 'ground_school' ? 'GND' : 'TRG' };
  const standby = today.find((d) => d.kind === 'standby' || d.kind === 'reserve');
  if (standby) return { tone: 'standby', code: standby.kind === 'reserve' ? 'RSV' : 'SBY' };
  if (today.some((d) => d.kind === 'holiday' || d.kind === 'annual_leave' || d.kind === 'busy_personal')) return { tone: 'leave', code: 'AL' };
  if (today.some((d) => d.kind === 'off')) return { tone: 'off', code: null };
  return { tone: 'empty', code: null };
}

export interface NextDuty {
  date: IsoDate;
  /** Badge on the card: NEXT, SIM, TRG, SBY... */
  tag: string;
  title: string;
  detail: string;
  /** Title uses the flight-code font. */
  mono: boolean;
}

/** The next thing on the roster from today: a flight, training or standby. Leave and off days are skipped. */
export function nextDuty(today: IsoDate, duties: NewDuty[], holidays: HolidayLike[] = []): NextDuty | null {
  const upcoming = duties
    .filter((d) => d.date >= today && d.kind !== 'off' && d.kind !== 'layover')
    // Same day: earliest time first. Entries without a time keep their order (outbound before return).
    .sort((a, b) => {
      const ta = a.reportTime ?? a.departTime;
      const tb = b.reportTime ?? b.departTime;
      return a.date.localeCompare(b.date) || (ta && tb ? ta.localeCompare(tb) : 0);
    });
  const next = upcoming[0];
  if (!next) return null;
  const when = shortDate(next.date);

  if (next.kind === 'flight') {
    const [from, to] = (next.sector ?? '').split('-');
    const tripEnd = duties
      .filter((d) => d !== next && d.date >= next.date && d.kind === 'flight' && d.sector === `${to}-${from}`)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const blockedByLeave = holidays.some((h) => h.startDate <= next.date && next.date <= h.endDate);
    const parts = [when];
    if (next.reportTime) parts.push(`Report ${displayTime(next.reportTime)}`);
    else if (next.departTime) parts.push(`Departs ${displayTime(next.departTime)}`);
    if (tripEnd) {
      const days = daysBetween(next.date, tripEnd.date) + 1;
      parts.push(days === 1 ? 'Turnaround' : `${days}-day trip`);
    }
    if (blockedByLeave) parts.push('On leave');
    return { date: next.date, tag: 'NEXT', title: `${next.flightNumber ?? 'Flight'} · ${from} → ${to}`, detail: parts.join(' · '), mono: true };
  }

  const names: Record<string, [string, string]> = {
    training: ['TRG', 'Training'],
    sim: ['SIM', 'Sim session'],
    ground_school: ['GND', 'Ground school'],
    standby: ['SBY', 'Standby'],
    reserve: ['RSV', 'Reserve'],
  };
  const [tag, title] = names[next.kind] ?? ['NEXT', HOLIDAY_LABELS.busy_personal];
  const hours = next.reportTime && next.arriveTime ? `${displayTime(next.reportTime)} to ${displayTime(next.arriveTime)}` : next.reportTime ? `From ${displayTime(next.reportTime)}` : null;
  const free = next.arriveTime && next.arriveTime <= '1800' && !next.arriveDate ? 'free after' : null;
  return { date: next.date, tag, title: next.note && next.kind !== 'standby' && next.kind !== 'reserve' ? next.note : title, detail: [when, hours, free].filter(Boolean).join(' · '), mono: false };
}
