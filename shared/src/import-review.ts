// The check-it-before-it's-saved step of screenshot import: what was found, which entries need a
// look, and what finally gets saved. Pure code, shared by the app and its tests.
import { friendsLabel, lookupCode } from './roster-codes';
import { dateRange } from './dates';
import type { IsoDate } from './duty';
import { BASE_AIRPORT, type NewDuty } from './duty-entry';

export interface ImportSummary {
  duties: number;
  /** Codes that are not in the airline code list: the person must confirm or remove each. */
  needsReview: number;
  from: IsoDate | null;
  to: IsoDate | null;
}

export function summariseImport(duties: NewDuty[]): ImportSummary {
  const dates = duties.map((d) => d.date).sort();
  return {
    duties: duties.length,
    needsReview: duties.filter((d) => d.needsReview).length,
    from: dates[0] ?? null,
    to: dates.length ? (duties.map((d) => d.arriveDate ?? d.date).sort().at(-1) ?? null) : null,
  };
}

/** "STANDBY AT BASE 0600-2359" -> "Standby at base 0600-2359". */
const sentence = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** The words shown for one found duty. */
export function importLabel(d: NewDuty): { title: string; detail: string } {
  const times = (a: string | null, b: string | null) => (a && b ? `${a.slice(0, 2)}:${a.slice(2)} to ${b.slice(0, 2)}:${b.slice(2)}` : null);
  const t = (x: string | null) => (x ? `${x.slice(0, 2)}:${x.slice(2)}` : null);
  if (d.kind === 'flight') {
    const [from, to] = (d.sector ?? '').split('-');
    const parts = [t(d.reportTime) && `Report ${t(d.reportTime)}`, t(d.departTime) && `Departs ${t(d.departTime)}`, t(d.arriveTime) && `Lands ${t(d.arriveTime)}${d.arriveDate ? ' +1' : ''}`].filter(Boolean);
    return { title: `${d.flightNumber ?? 'Flight'} · ${from ?? ''} → ${to ?? ''}`, detail: parts.join(' · ') };
  }
  if (!d.code && d.kind === 'training') return { title: 'Training', detail: 'Pink day in your roster · 09:00 to 17:00, edit if different' };
  const known = d.code ? lookupCode(d.code) : undefined;
  if (d.needsReview) return { title: `${d.code} · not in the code list`, detail: 'Needs a look. We would save it as Busy.' };
  const base = known ? sentence(known.description) : d.friendsLabel;
  const hours = times(d.reportTime, d.arriveTime);
  const where = d.sector && d.sector !== BASE_AIRPORT ? `In ${d.sector}` : null;
  return {
    title: `${d.code ?? ''}${d.code ? ' · ' : ''}${base}`,
    detail: [known ? `Friends see ${friendsLabel(known)}` : null, hours, where].filter(Boolean).join(' · '),
  };
}

/**
 * What gets saved: everything found, minus what the person removed. A code that needs a look is
 * only saved when they confirmed it, and then as plain Busy (never guessed).
 */
export function finalDuties(found: NewDuty[], decisions: { removed: ReadonlySet<number>; confirmed: ReadonlySet<number> }): NewDuty[] {
  const out: NewDuty[] = [];
  found.forEach((d, i) => {
    if (decisions.removed.has(i)) return;
    if (d.needsReview) {
      if (decisions.confirmed.has(i)) out.push({ ...d, needsReview: false });
      return;
    }
    out.push(d);
  });
  return out;
}

/** True while some code that needs a look has been neither confirmed nor removed. */
export function hasUnresolved(found: NewDuty[], decisions: { removed: ReadonlySet<number>; confirmed: ReadonlySet<number> }): boolean {
  return found.some((d, i) => d.needsReview && !decisions.removed.has(i) && !decisions.confirmed.has(i));
}

/** The days the import covers, for replacing what is already on them (after asking). */
export function importedDays(duties: NewDuty[]): IsoDate[] {
  const s = summariseImport(duties);
  if (!s.from || !s.to) return [];
  // An overnight flight on the last day lands on the next, but only its departure day is replaced.
  const last = duties.map((d) => d.date).sort().at(-1)!;
  return dateRange(s.from, last > s.to ? s.to : last);
}

