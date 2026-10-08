// Swap suggestions. See CLAUDE.md "Swap suggestions". Implemented in build step 6.
// Suggestions only: the app never performs a swap; swaps happen in the airline's official system.
import type { Duty, IsoDate } from './duty';
import type { Profile } from './profile';
import type { PersonRoster } from './ranking';

export interface SwapCandidate {
  profile: Profile;
  roster: PersonRoster;
}

export interface SwapSuggestion {
  /** The day the busy person wants free. */
  date: IsoDate;
  /** The busy person's duty on that day. */
  duty: Duty;
  /** Friend who is off that day and could take the duty. */
  candidateUserId: string;
  /** A day the busy person is free and the candidate has a duty: an easy swap back. */
  swapBackDate: IsoDate | null;
}

/** Ideas for freeing the busy person on an "Almost" day. Sent privately to the busy person only. */
export function suggestSwaps(
  _busy: { profile: Profile; roster: PersonRoster },
  _date: IsoDate,
  _candidates: SwapCandidate[],
): SwapSuggestion[] {
  throw new Error('suggestSwaps is not implemented yet (build step 6)');
}
