// Loads the signed-in user's duties and leave for the visible month plus the coming months
// (for the NEXT card). Reloads whenever the screen comes back into focus, e.g. after Add duty.
import { addDays, todayInSingapore, type IsoDate } from '@crewjio/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { backend, type Roster } from '@/lib/backend';
import { useAuth } from '@/state/auth';

export function monthBounds(year: number, month: number): { first: IsoDate; last: IsoDate } {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { first, last: addDays(next, -1) };
}

export function useRoster(from: IsoDate, to: IsoDate) {
  const { user } = useAuth();
  const [roster, setRoster] = useState<Roster>({ duties: [], holidays: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setRoster(await backend.loadRoster(user.id, from, to));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your roster.');
    } finally {
      setLoading(false);
    }
  }, [user, from, to]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { ...roster, loading, error, reload: load };
}

/** Range for the roster screen: the visible month, and today through the next four months. */
export function rosterRange(year: number, month: number, today: IsoDate = todayInSingapore()) {
  const { first, last } = monthBounds(year, month);
  const ahead = addDays(today, 120);
  return { from: first < today ? first : today, to: last > ahead ? last : ahead };
}
