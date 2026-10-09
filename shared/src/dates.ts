// ISO date helpers. Roster dates are calendar dates with no time zone, so all arithmetic is done
// in UTC to avoid daylight-saving and device time-zone surprises.
import type { IsoDate } from './duty';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: string): s is IsoDate {
  const m = ISO.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
}

function toDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDate(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** Every date from `from` to `to`, inclusive. */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(iso: IsoDate): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName(month: number): string {
  return MONTHS[month - 1]!;
}

/** "Sat 3 Oct" */
export function shortDate(iso: IsoDate): string {
  const d = toDate(iso);
  return `${DOW[weekdayIndex(iso)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)}`;
}

/** "Sat 3 Oct 2026" */
export function longDate(iso: IsoDate): string {
  return `${shortDate(iso)} ${iso.slice(0, 4)}`;
}

/** Today's date in Singapore, where every roster lives. */
export function todayInSingapore(now: Date = new Date()): IsoDate {
  return fromDate(new Date(now.getTime() + 8 * 3_600_000));
}
