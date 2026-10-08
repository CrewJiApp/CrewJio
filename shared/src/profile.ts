// Profile, roles, ranks and fleets. See CLAUDE.md "Domain model".

export const ROLES = ['cabin_crew', 'pilot'] as const;
export type Role = (typeof ROLES)[number];

export const AIRLINES = ['SIA', 'Scoot', 'other'] as const;
export type Airline = (typeof AIRLINES)[number];

export const AIRLINE_LABELS: Record<Airline, string> = {
  SIA: 'Singapore Airlines',
  Scoot: 'Scoot',
  other: 'Other',
};

/** Cabin crew ranks, lowest first. Colour is the name-tag colour. */
export const CREW_RANKS = [
  { id: 'flight_steward', label: 'Flight Steward / Stewardess', short: 'Flight crew', color: '#1E3A8C' },
  { id: 'leading_steward', label: 'Leading Steward / Stewardess', short: 'Leading', color: '#1F6B35' },
  { id: 'chief_steward', label: 'Chief Steward / Stewardess', short: 'Chief', color: '#B3191F' },
  { id: 'inflight_supervisor', label: 'In-flight Supervisor', short: 'IFS', color: '#5C1A3C' },
] as const;
export type CrewRank = (typeof CREW_RANKS)[number]['id'];

/** Pilot ranks, lowest first. Stripes are the epaulette stripes. */
export const PILOT_RANKS = [
  { id: 'second_officer', label: 'Second Officer', short: 'SO', stripes: 2 },
  { id: 'first_officer', label: 'First Officer', short: 'FO', stripes: 3 },
  { id: 'captain', label: 'Captain', short: 'CPT', stripes: 4 },
] as const;
export type PilotRank = (typeof PILOT_RANKS)[number]['id'];

export type Rank = CrewRank | PilotRank;

export const FLEETS = ['A380', 'A350', '777', '787', '737'] as const;
export type Fleet = (typeof FLEETS)[number];

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  airline: Airline;
  rank: Rank | null;
  fleets: Fleet[];
  /** Business class qualified. Cabin crew only; always false for pilots. */
  jclTrained: boolean;
  openToSwaps: boolean;
}

export function ranksForRole(role: Role): readonly { id: Rank; label: string; short: string }[] {
  return role === 'cabin_crew' ? CREW_RANKS : PILOT_RANKS;
}

export function isRankForRole(role: Role, rank: string): rank is Rank {
  return ranksForRole(role).some((r) => r.id === rank);
}

/** 0-based seniority within the role, or -1 if the rank does not belong to the role. */
export function rankIndex(role: Role, rank: Rank): number {
  return ranksForRole(role).findIndex((r) => r.id === rank);
}

/**
 * Normalise a profile draft so it never holds a combination the database rejects:
 * rank must match the role, and JCL is cabin crew only.
 */
export function normaliseProfile<T extends Pick<Profile, 'role' | 'rank' | 'jclTrained' | 'fleets'>>(p: T): T {
  const rank = p.rank && isRankForRole(p.role, p.rank) ? p.rank : null;
  const fleets = FLEETS.filter((f) => p.fleets.includes(f));
  return { ...p, rank, fleets, jclTrained: p.role === 'cabin_crew' ? p.jclTrained : false };
}
