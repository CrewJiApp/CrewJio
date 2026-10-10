// Turns list-view roster rows (the shape Claude returns from a screenshot, see
// samples/nov-2026-roster.json) into duties. Every Duty value is cross-checked against
// roster-codes.json; unknown codes are kept but flagged "needs a look", never guessed.
import { friendsLabel, lookupCode, type CodeCategory } from './roster-codes';
import { addDays } from './dates';
import type { DutyKind, HHMM, IsoDate } from './duty';
import type { NewDuty } from './duty-entry';

/** One row of the airline's list view. Rows without a date belong to the date above. */
export interface RosterRow {
  date: IsoDate;
  duty: string;
  flight?: string;
  sector?: string;
  rpt?: HHMM;
  std?: HHMM;
  sta?: HHMM;
  /** Aircraft type and acting rank are read but not stored. */
  ac?: string;
  actingRank?: string;
}

const CATEGORY_KIND: Record<CodeCategory, DutyKind> = {
  off: 'off',
  part_off: 'off',
  layover: 'layover',
  standby: 'standby',
  reserve: 'reserve',
  training: 'training',
  flight: 'flight',
  leave: 'annual_leave',
  national_service: 'other',
  private: 'other',
  busy: 'other',
};

const time = (t?: string): HHMM | null => (t && /^\d{4}$/.test(t) ? t : null);

/**
 * Converts rows to duties. A row that only carries an arrival time (an overnight flight or a
 * standby running past midnight) is merged into the same duty on the day before, so each
 * flight is one duty with an arrival date.
 */
export function rowsToDuties(rows: RosterRow[]): NewDuty[] {
  const out: NewDuty[] = [];
  for (const row of rows) {
    const code = row.duty.trim().toUpperCase();
    const known = lookupCode(code);
    const sector = row.sector?.trim().toUpperCase() || null;

    // Continuation: same duty, next date, only the end time.
    const prev = out[out.length - 1];
    const continues =
      prev &&
      !row.rpt &&
      !row.std &&
      row.sta &&
      prev.code === code &&
      addDays(prev.date, 1) === row.date &&
      (code !== 'FLY' || (prev.flightNumber === normaliseFlight(row.flight) && prev.sector === sector));
    if (continues) {
      prev.arriveTime = time(row.sta);
      prev.arriveDate = row.date;
      continue;
    }

    const category: CodeCategory = known?.category ?? 'busy';
    const isFlight = category === 'flight';
    const timed = category === 'standby' || category === 'reserve' || category === 'training';
    out.push({
      date: row.date,
      kind: CATEGORY_KIND[category],
      category,
      code,
      friendsLabel: known ? friendsLabel(known) : 'Busy',
      flightNumber: isFlight ? normaliseFlight(row.flight) : null,
      sector,
      reportTime: isFlight ? time(row.rpt) : timed ? time(row.rpt ?? row.std) : null,
      departTime: isFlight ? time(row.std) : null,
      arriveTime: isFlight || timed ? time(row.sta) : null,
      arriveDate: null,
      note: null,
      source: 'import',
      needsReview: !known,
    });
  }
  return out;
}

function normaliseFlight(f?: string): string | null {
  const m = /^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/.exec((f ?? '').trim().toUpperCase());
  return m ? `${m[1]} ${m[2]}` : null;
}
