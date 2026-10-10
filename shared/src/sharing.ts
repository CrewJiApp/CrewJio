// Groups, partners and sharing levels. See CLAUDE.md "Sharing and privacy".
// The database enforces these rules (supabase/migrations/*_core_schema.sql); this mirror
// lets the app explain them and lets tests pin the behaviour down.
import type { DutyKind, IsoDate } from './duty';

/** Ordered from least to most generous. */
export const SHARING_LEVELS = ['off_days', 'destinations', 'full'] as const;
export type SharingLevel = (typeof SHARING_LEVELS)[number];

export const SHARING_LEVEL_LABELS: Record<SharingLevel, string> = {
  off_days: 'Off days only',
  destinations: 'Off days + destinations',
  full: 'Full roster',
};

/** A per-person override can also hide someone completely. */
export type OverrideLevel = SharingLevel | 'hidden';

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'owner' | 'member';
  /** What this member shares with this group. Each member sets it for themselves. */
  sharingLevel: SharingLevel;
}

export interface Partner {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'active';
}

/** What a viewer can see of someone's roster. */
export type EffectiveLevel = 'owner' | 'partner' | SharingLevel;

const rank = (l: OverrideLevel): number => (l === 'hidden' ? -1 : SHARING_LEVELS.indexOf(l));

/**
 * Effective level a viewer has on an owner's roster:
 * - the owner sees everything;
 * - an active partner sees full detail (private codes still show "Unavailable");
 * - otherwise the most generous level the owner shares with any group they have in common,
 *   capped by the owner's per-person override for this viewer;
 * - null when they share no group (or the override hides them).
 */
export function effectiveLevel(args: {
  isOwner: boolean;
  isPartner: boolean;
  /** The owner's sharing level in each group both people are in. */
  sharedGroupLevels: SharingLevel[];
  override?: OverrideLevel | null;
}): EffectiveLevel | null {
  if (args.isOwner) return 'owner';
  if (args.isPartner) return 'partner';
  if (args.sharedGroupLevels.length === 0) return null;
  let best = args.sharedGroupLevels.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  if (args.override != null) {
    if (args.override === 'hidden') return null;
    if (rank(args.override) < rank(best)) best = args.override;
  }
  return best;
}

/** One day of someone else's roster, as returned by the get_shared_roster RPC. */
export interface SharedRosterEntry {
  day: IsoDate;
  status: 'off' | 'busy' | 'away' | 'unavailable';
  /** Duty kind at "destinations" level and above; null at "off days only", for private days and leave. */
  kind: DutyKind | null;
  label: string;
  sector: string | null;
  flightNumber: string | null;
  reportTime: string | null;
  departTime: string | null;
  arriveTime: string | null;
  arriveDate: IsoDate | null;
}
