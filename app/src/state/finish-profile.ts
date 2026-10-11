// Saves the onboarding draft and leaves onboarding: back to Me when editing, or on to the tour
// for a new user. Used by the last step (fleets for crew and pilots, the role step for partners).
import { router } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/state/auth';
import { useOnboarding } from '@/state/onboarding';

export function useFinishProfile() {
  const { draft, editing } = useOnboarding();
  const { user, saveProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await saveProfile({ ...draft, id: user.id, displayName: draft.displayName.trim() });
    } catch (e) {
      setSaving(false);
      setError(`Could not save your profile. ${e instanceof Error ? e.message : ''}`.trim());
      return;
    }
    setSaving(false);
    router.dismissAll();
    // Editing goes back to the Me tab. New users get the tour: a one-way door, so the onboarding
    // steps are dropped from history.
    router.replace(editing ? '/me' : '/tour');
  };

  return { finish, saving, error, editing };
}
