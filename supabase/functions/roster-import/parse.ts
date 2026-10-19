// Cleans what Claude read from a roster screenshot before it leaves the server. Pure code, no
// network, so the database test suite can test it. Anything that is not a plain, valid roster
// row is dropped, and only the fields CrewJio needs are kept: no aircraft type, acting rank,
// staff number, name or anything else that happened to be on the screen.

export interface ParsedRow {
  date: string;
  /** The Duty code as printed, e.g. "FLY", "STBY", "OFFD". Empty only on a pink training day. */
  duty: string;
  flight?: string;
  sector?: string;
  rpt?: string;
  std?: string;
  sta?: string;
  /** Pink highlighted days in the airline's calendar view are training. */
  highlight?: 'pink';
}

export const MAX_ROWS = 400;
/** Rows further than this from the middle of the roster are a misread year or month. */
const MAX_DAYS_FROM_MIDDLE = 100;

const DAY_MS = 86_400_000;

function isoToDay(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  const ok = d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  return ok ? Math.round(t / DAY_MS) : null;
}

/** "2105", "21:05", "9:05" -> "HHMM", or undefined when it is not a real time. */
export function cleanTime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim().replace(/[.:h]/gi, '');
  if (!/^\d{3,4}$/.test(s)) return undefined;
  const p = s.padStart(4, '0');
  return Number(p.slice(0, 2)) < 24 && Number(p.slice(2)) < 60 ? p : undefined;
}

/** "sq322", "SQ 322" -> "SQ 322". */
export function cleanFlight(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = /^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/.exec(value.trim().toUpperCase());
  return m && !/^\d{2}$/.test(m[1]!) ? `${m[1]} ${m[2]}` : undefined;
}

/** "SIN-SFO", "SIN → SFO", "SIN/SFO" -> "SIN-SFO"; a single airport "SFO" stays. */
export function cleanSector(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim().toUpperCase().replace(/\s*(?:-|–|→|>|\/)\s*|\s+/g, '-');
  return /^[A-Z]{3}(-[A-Z]{3})?$/.test(s) ? s : undefined;
}

/** Roster codes are letters and digits, up to 8. */
export function cleanDuty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length <= 8 ? s : undefined;
}

export function sanitizeRows(raw: unknown): { rows: ParsedRow[]; dropped: number } {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_ROWS) : [];
  let dropped = Math.max(0, (Array.isArray(raw) ? raw.length : 0) - list.length);
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const date = typeof r.date === 'string' ? r.date.trim() : '';
    const duty = cleanDuty(r.duty);
    const highlight = r.highlight === 'pink' ? 'pink' : undefined;
    if (isoToDay(date) === null || duty === undefined || (duty === '' && !highlight)) {
      dropped++;
      continue;
    }
    const row: ParsedRow = { date, duty };
    const flight = cleanFlight(r.flight);
    const sector = cleanSector(r.sector);
    const rpt = cleanTime(r.rpt);
    const std = cleanTime(r.std);
    const sta = cleanTime(r.sta);
    if (flight) row.flight = flight;
    if (sector) row.sector = sector;
    if (rpt) row.rpt = rpt;
    if (std) row.std = std;
    if (sta) row.sta = sta;
    if (highlight) row.highlight = highlight;
    // Screenshots overlap when a long list is split in several, so the same row can come twice.
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      dropped++;
      continue;
    }
    seen.add(key);
    rows.push(row);
  }

  if (rows.length === 0) return { rows, dropped };
  const days = rows.map((r) => isoToDay(r.date)!).sort((a, b) => a - b);
  const middle = days[Math.floor(days.length / 2)]!;
  const kept = rows.filter((r) => Math.abs(isoToDay(r.date)! - middle) <= MAX_DAYS_FROM_MIDDLE);
  return { rows: kept, dropped: dropped + (rows.length - kept.length) };
}
