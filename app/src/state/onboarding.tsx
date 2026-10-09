// Profile draft while onboarding (or editing the profile from the Me tab). Saved to the
// database by the last step through useAuth().saveProfile.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { normaliseProfile, type Airline, type Fleet, type Profile, type Rank, type Role } from '@crewjio/shared';

export type ProfileDraft = Omit<Profile, 'id'>;

const initialDraft: ProfileDraft = {
  displayName: '',
  role: 'cabin_crew',
  airline: 'SIA',
  rank: null,
  fleets: [],
  jclTrained: false,
  openToSwaps: true,
};

interface OnboardingState {
  draft: ProfileDraft;
  /** True when the user is editing an existing profile rather than signing up. */
  editing: boolean;
  setDisplayName: (name: string) => void;
  setRole: (role: Role) => void;
  setAirline: (airline: Airline) => void;
  setRank: (rank: Rank) => void;
  toggleFleet: (fleet: Fleet) => void;
  setJclTrained: (value: boolean) => void;
  setOpenToSwaps: (value: boolean) => void;
  /** Start a fresh draft, prefilled with a name from Apple or Google if there is one. */
  start: (suggestedName: string) => void;
  /** Start editing an existing profile. */
  edit: (profile: Profile) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [editing, setEditing] = useState(false);

  const value = useMemo<OnboardingState>(() => {
    // Every change goes through normaliseProfile, so switching role drops a crew rank or JCL.
    const update = (patch: Partial<ProfileDraft>) => setDraft((d) => normaliseProfile({ ...d, ...patch }));
    return {
      draft,
      editing,
      setDisplayName: (displayName) => setDraft((d) => ({ ...d, displayName: displayName.slice(0, 40) })),
      setRole: (role) => update({ role }),
      setAirline: (airline) => update({ airline }),
      setRank: (rank) => update({ rank }),
      toggleFleet: (fleet) =>
        setDraft((d) =>
          normaliseProfile({ ...d, fleets: d.fleets.includes(fleet) ? d.fleets.filter((f) => f !== fleet) : [...d.fleets, fleet] }),
        ),
      setJclTrained: (jclTrained) => update({ jclTrained }),
      setOpenToSwaps: (openToSwaps) => update({ openToSwaps }),
      start: (suggestedName) => {
        setEditing(false);
        setDraft({ ...initialDraft, displayName: suggestedName });
      },
      edit: (profile) => {
        const { id: _id, ...rest } = profile;
        setEditing(true);
        setDraft(rest);
      },
    };
  }, [draft, editing]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
