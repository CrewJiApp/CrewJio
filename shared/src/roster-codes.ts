// Typed access to shared/roster-codes.json. See CLAUDE.md "Roster import".
import data from '../roster-codes.json';

export const CODE_CATEGORIES = [
  'off',
  'part_off',
  'layover',
  'standby',
  'reserve',
  'training',
  'flight',
  'leave',
  'national_service',
  'private',
  'busy',
] as const;
export type CodeCategory = (typeof CODE_CATEGORIES)[number];

export interface RosterCode {
  description: string;
  category: CodeCategory;
  /** What friends are shown for this code. Private codes are always shown as "Unavailable". */
  friendsSee: string;
  blocksMatching: boolean;
  swappable: boolean;
}

const codes = data.codes as Record<string, RosterCode>;

/** What friends and groups see for any private entry, whatever the real code is. */
export const PRIVATE_LABEL = 'Unavailable';

/** Look up a roster code. Returns undefined for unknown codes: flag them "needs a look", never guess. */
export function lookupCode(code: string): RosterCode | undefined {
  return Object.prototype.hasOwnProperty.call(codes, code) ? codes[code] : undefined;
}

export function rosterCodeCount(): number {
  return Object.keys(codes).length;
}

/** Categories that always block matching and are never offered for swaps. */
export const UNTOUCHABLE_CATEGORIES: ReadonlySet<CodeCategory> = new Set(['national_service', 'leave', 'private']);

/** The label friends see for a code, applying the private rule. */
export function friendsLabel(code: RosterCode): string {
  return code.category === 'private' ? PRIVATE_LABEL : code.friendsSee;
}
