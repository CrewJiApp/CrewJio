// Screenshot roster import on the phone: shrink the screenshots, send them to the roster-import
// Edge Function (which reads them with Claude), and get clean roster rows back. Nothing is saved
// here: the person checks the rows first (app/import.tsx). In preview mode, with no backend,
// a built-in sample roster stands in so the screens can be tried.
import { addDays, type IsoDate, type RosterRow, todayInSingapore } from '@crewjio/shared';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { backend } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

export const MAX_SCREENSHOTS = 4;
/** Wide enough to read small roster text, small enough to upload quickly. */
const MAX_WIDTH = 1400;
/** Must match ROSTER_IMPORT_MONTHLY_LIMIT in the Edge Function (default 8). */
export const IMPORTS_PER_MONTH = 8;
/** A roster PDF is one file of at most 2.5 MB. The Edge Function enforces the same limit. */
export const MAX_PDF_BYTES = 2_500_000;

export type ImportErrorCode =
  | 'limit_reached'
  | 'daily_limit'
  | 'busy'
  | 'service_busy'
  | 'not_a_roster'
  | 'read_failed'
  | 'not_set_up'
  | 'not_signed_in'
  | 'bad_image'
  | 'bad_file'
  | 'bad_request';

export class ImportError extends Error {
  constructor(readonly code: ImportErrorCode) {
    super(code);
  }
}

const MESSAGES: Record<ImportErrorCode, string> = {
  limit_reached: 'You have used all your roster imports for this month. They reset on the 1st. You can still add duties by hand.',
  daily_limit: 'You have tried a few times today. Please try again tomorrow, or add duties by hand.',
  busy: 'Your last roster is still being read. Please wait a minute, then try again.',
  service_busy: 'Roster reading is very busy right now. Please try again later, or add duties by hand.',
  bad_file: 'Please choose a PDF of 2.5 MB or less. Photos and screenshots work too.',
  not_a_roster: 'We could not find a roster in those screenshots. Try the list or calendar view of your roster app, with the whole screen showing.',
  read_failed: 'Something went wrong while reading your roster. Nothing was saved. Please try again.',
  not_set_up: 'Roster import is not switched on yet. You can add duties by hand for now.',
  not_signed_in: 'Please sign in again, then try once more.',
  bad_image: 'One of those images could not be used. Please pick screenshots again.',
  bad_request: 'Please choose between 1 and 4 screenshots.',
};

export const importErrorMessage = (e: unknown): string => (e instanceof ImportError ? MESSAGES[e.code] : MESSAGES.read_failed);

/** A screenshot or photo (the phone turns it into a JPEG), or one roster PDF. */
export type Picked = { kind: 'image'; uri: string; width: number } | { kind: 'pdf'; uri: string; name: string; size: number };

/** Throws bad_file unless this is a PDF within the size limit. */
export function checkPdf(file: { mimeType?: string | null; name?: string; size?: number | null }): void {
  const isPdf = file.mimeType === 'application/pdf' || (!file.mimeType && /\.pdf$/i.test(file.name ?? ''));
  if (!isPdf || !file.size || file.size > MAX_PDF_BYTES) throw new ImportError('bad_file');
}

/** The PDF as base64, checked once more by size and by its first bytes. */
export async function preparePdf(uri: string): Promise<string> {
  const file = new File(uri);
  if (!file.exists || file.size > MAX_PDF_BYTES) throw new ImportError('bad_file');
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Every PDF starts with "%PDF-".
  if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw new ImportError('bad_file');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** A screenshot shrunk to JPEG and returned as base64, ready to send. */
export async function prepareImage(image: Extract<Picked, { kind: 'image' }>): Promise<string> {
  const context = ImageManipulator.manipulate(image.uri);
  if (image.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new ImportError('bad_image');
  return saved.base64;
}

export interface ReadResult {
  rows: RosterRow[];
  /** Rows the server could not use. */
  dropped: number;
}

/** Turns what was picked into base64 files for the Edge Function: JPEGs, or a single PDF. */
export async function prepareFiles(picked: Picked[]): Promise<string[]> {
  return Promise.all(picked.map((p) => (p.kind === 'pdf' ? preparePdf(p.uri) : prepareImage(p))));
}

/** Sends the prepared files to the Edge Function. */
export async function readRoster(images: string[]): Promise<ReadResult> {
  if (!supabase) throw new ImportError('not_set_up');
  const { data, error } = await supabase.functions.invoke('roster-import', { body: { images, today: todayInSingapore() } });
  if (error) {
    // The function answers with { error: "<code>" }. Anything else is a failed read.
    let code: ImportErrorCode = 'read_failed';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body && typeof body.error === 'string' && body.error in MESSAGES) code = body.error as ImportErrorCode;
    } catch {
      // Not JSON: keep read_failed.
    }
    throw new ImportError(code);
  }
  const rows = (data as { rows?: RosterRow[] } | null)?.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new ImportError('not_a_roster');
  return { rows, dropped: Number((data as { dropped?: number }).dropped) || 0 };
}

/** How many imports are left this month, or null when it cannot be told (preview mode). */
export async function importsLeft(): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('roster_imports_left', { p_limit: IMPORTS_PER_MONTH });
  return error || typeof data !== 'number' ? null : data;
}

/** Preview mode only: a made-up month for the screens to show, starting next Monday. */
export function sampleRoster(from: IsoDate = todayInSingapore()): RosterRow[] {
  const d = (n: number) => addDays(from, n);
  return [
    { date: d(1), duty: 'OFFD' },
    { date: d(2), duty: 'FLY', flight: 'SQ 978', sector: 'SIN-BKK', rpt: '0730', std: '0930', sta: '1100' },
    { date: d(2), duty: 'FLY', flight: 'SQ 979', sector: 'BKK-SIN', std: '1230', sta: '1600' },
    { date: d(3), duty: '', highlight: 'pink' },
    { date: d(4), duty: 'FLY', flight: 'SQ 34', sector: 'SIN-SFO', rpt: '1755', std: '1955', sta: '1835' },
    { date: d(5), duty: 'LO', sector: 'SFO' },
    { date: d(6), duty: 'LO', sector: 'SFO' },
    { date: d(6), duty: 'STBY', sector: 'SFO', rpt: '2005', std: '2005' },
    { date: d(7), duty: 'STBY', sector: 'SFO', sta: '0040' },
    { date: d(7), duty: 'FLY', flight: 'SQ 33', sector: 'SFO-SIN', std: '0940', sta: '1905' },
    { date: d(9), duty: 'ATDO' },
    { date: d(10), duty: 'QX7Q' },
    { date: d(12), duty: 'SS60', sector: 'SIN', rpt: '0600', sta: '2359' },
    { date: d(14), duty: 'NTSV', sector: 'SIN' },
  ];
}

export const demoMode = () => backend.mode === 'demo';
