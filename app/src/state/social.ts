// Hooks for groups, partner, and day ranking across people.
import {
  addDays,
  hasRosterIn,
  rankDays,
  sharedEntriesToRoster,
  type DayPart,
  type IsoDate,
  type PersonRoster,
  type Profile,
  type RankedDay,
} from '@crewjio/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { backend } from '@/lib/backend';
import { social, type Group, type PartnerLink } from '@/lib/social';
import { useAuth } from '@/state/auth';

export function useGroups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [partner, setPartner] = useState<PartnerLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [g, p] = await Promise.all([social.listGroups(profile), social.getPartner(profile)]);
      setGroups(g);
      setPartner(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your groups.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { groups, partner, loading, error, reload: load };
}

export interface Ranking {
  days: RankedDay[];
  /** People with roster for the range, you first. */
  included: Profile[];
  /** People who haven't added this range yet (Group Plan "Nudge"). */
  missing: Profile[];
  /** Everyone's roster as the ranking saw it, by user id (yours in full, friends redacted). */
  rosters: Record<string, PersonRoster>;
  loading: boolean;
  error: string | null;
}

/**
 * Ranks start..end for you plus `others`. Friends' rosters come through get_shared_roster, so
 * the ranking only ever uses what each person chose to share with you.
 */
export function useRanking(others: Profile[], start: IsoDate, end: IsoDate, part: DayPart = 'any'): Ranking {
  const { user, profile } = useAuth();
  // The rosters are fetched once; changing the part of the day only re-ranks them.
  const [state, setState] = useState<Omit<Ranking, 'days'> & { includedRosters: PersonRoster[] }>({ includedRosters: [], included: [], missing: [], rosters: {}, loading: true, error: null });
  const key = others.map((o) => o.id).join(',');

  useEffect(() => {
    if (!user || !profile) return;
    let live = true;
    // Load the day before (a flight landing on the first day) and the day after (an early start
    // the next morning rules out a late evening) as well.
    const from = addDays(start, -1);
    const through = addDays(end, 1);
    (async () => {
      try {
        const [mine, ...theirs] = await Promise.all([
          backend.loadRoster(user.id, from, through),
          ...others.map((o) => social.sharedRoster(o.id, from, through)),
        ]);
        const rosters: { profile: Profile; roster: PersonRoster }[] = [
          { profile, roster: { userId: profile.id, duties: mine!.duties, holidays: mine!.holidays } },
          ...others.map((o, i) => ({ profile: o, roster: sharedEntriesToRoster(o.id, theirs[i] as never) })),
        ];
        const included = rosters.filter((r) => hasRosterIn(r.roster, start, end));
        const missing = rosters.filter((r) => !hasRosterIn(r.roster, start, end)).map((r) => r.profile);
        const byId = Object.fromEntries(rosters.map((r) => [r.profile.id, r.roster]));
        if (live) setState({ includedRosters: included.map((r) => r.roster), included: included.map((r) => r.profile), missing, rosters: byId, loading: false, error: null });
      } catch (e) {
        if (live) setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Could not load rosters.' }));
      }
    })();
    return () => {
      live = false;
    };
    // `others` is keyed by ids so a new array with the same people does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, key, start, end]);

  const days = useMemo(() => (state.includedRosters.length > 0 ? rankDays(state.includedRosters, start, end, part) : []), [state.includedRosters, start, end, part]);
  return useMemo(() => ({ ...state, days }), [state, days]);
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

const firstName = (p: Profile, me: Profile) => (p.id === me.id ? 'You' : p.displayName.split(/\s+/)[0]!);

/** "You and Jia", "You, Jia and Arif". */
export function joinNames(people: Profile[], me: Profile): string {
  const names = people.map((p) => firstName(p, me));
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** One line explaining a ranked day, e.g. "Mei and Jia back from turnarounds". */
export function explainDay(day: RankedDay, people: Profile[], me: Profile): string {
  const base = explainStatus(day, people, me);
  // Someone is on standby tomorrow but has not set when it starts, so an early start can't be known.
  const untimed = day.people.filter((p) => p.note.includes('start time not set')).map((p) => p.userId);
  if (untimed.length === 0) return base;
  const names = joinNames(untimed.map((id) => people.find((p) => p.id === id)).filter((p): p is Profile => !!p), me);
  const verb = untimed.length > 1 || untimed[0] === me.id ? 'are' : 'is';
  return `${base}. ${names} ${verb} on standby tomorrow, start time not set`;
}

function explainStatus(day: RankedDay, people: Profile[], me: Profile): string {
  const named = (ids: string[]) => joinNames(ids.map((id) => people.find((p) => p.id === id)).filter((p): p is Profile => !!p), me);
  const with_ = (status: string) => day.people.filter((p) => p.status === status);
  const plural = (ids: string[]) => ids.length > 1 || ids[0] === me.id;
  switch (day.status) {
    case 'Great':
      return 'Nobody landed from long-haul in the last 24 h';
    case 'Tired': {
      const ids = with_('Tired').map((p) => p.userId);
      return `${named(ids)} just back from a long flight`;
    }
    case 'Evening': {
      const busy = with_('Evening');
      const turn = busy.filter((p) => p.note.startsWith('Turnaround')).map((p) => p.userId);
      const training = busy.filter((p) => p.note.startsWith('Training')).map((p) => p.userId);
      const landing = busy.filter((p) => p.note.startsWith('Lands')).map((p) => p.userId);
      if (turn.length) return `${named(turn)} back from ${turn.length > 1 ? 'turnarounds' : 'a turnaround'}`;
      if (training.length) return `${named(training)} in training until late afternoon`;
      if (landing.length) return `${named(landing)} ${plural(landing) ? 'land' : 'lands'} in the afternoon`;
      return 'Everyone’s free in the evening';
    }
    case 'Daytime': {
      // Someone starts early the next morning, or has plans in the evening.
      const early = day.people.filter((p) => p.note.includes('next morning')).map((p) => p.userId);
      if (early.length) return `${named(early)} ${plural(early) ? 'start' : 'starts'} early next morning`;
      const plans = with_('Daytime').filter((p) => p.note.startsWith('Free until') || p.note.includes('busy')).map((p) => p.userId);
      if (plans.length) return `${named(plans)} ${plural(plans) ? 'have' : 'has'} plans in the evening`;
      return 'Free during the day';
    }
    case 'Morning': {
      const ids = with_('Morning').map((p) => p.userId);
      return `${named(ids)} ${plural(ids) ? 'report' : 'reports'} in the afternoon`;
    }
    case 'SameLayover':
      return `Everyone’s in ${day.layover} on a layover`;
    case 'Almost':
      return `Only ${named([day.busyUserId!])} ${day.busyUserId === me.id ? 'are' : 'is'} on duty`;
    default:
      return '';
  }
}
