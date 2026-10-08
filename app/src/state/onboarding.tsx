// Onboarding state. Auth is a placeholder until Prompt 2 connects Supabase Auth; the profile
// draft lives in memory and will be saved to public.profiles then.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { normaliseProfile, type Airline, type Fleet, type Profile, type Rank, type Role } from '@crewjio/shared';

export type AuthMethod = 'apple' | 'google' | 'phone';

export type ProfileDraft = Pick<Profile, 'role' | 'airline' | 'rank' | 'fleets' | 'jclTrained' | 'openToSwaps'>;

const initialDraft: ProfileDraft = {
  role: 'cabin_crew',
  airline: 'SIA',
  rank: null,
  fleets: [],
  jclTrained: false,
  openToSwaps: true,
};

interface OnboardingState {
  /** Placeholder: which button was tapped on Welcome. No real sign-in happens yet. */
  authMethod: AuthMethod | null;
  draft: ProfileDraft;
  signInPlaceholder: (method: AuthMethod) => void;
  setRole: (role: Role) => void;
  setAirline: (airline: Airline) => void;
  setRank: (rank: Rank) => void;
  toggleFleet: (fleet: Fleet) => void;
  setJclTrained: (value: boolean) => void;
  setOpenToSwaps: (value: boolean) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);

  const value = useMemo<OnboardingState>(() => {
    // Every change goes through normaliseProfile, so switching role drops a crew rank or JCL.
    const update = (patch: Partial<ProfileDraft>) => setDraft((d) => normaliseProfile({ ...d, ...patch }));
    return {
      authMethod,
      draft,
      signInPlaceholder: setAuthMethod,
      setRole: (role) => update({ role }),
      setAirline: (airline) => update({ airline }),
      setRank: (rank) => update({ rank }),
      toggleFleet: (fleet) =>
        setDraft((d) =>
          normaliseProfile({ ...d, fleets: d.fleets.includes(fleet) ? d.fleets.filter((f) => f !== fleet) : [...d.fleets, fleet] }),
        ),
      setJclTrained: (jclTrained) => update({ jclTrained }),
      setOpenToSwaps: (openToSwaps) => update({ openToSwaps }),
      reset: () => {
        setAuthMethod(null);
        setDraft(initialDraft);
      },
    };
  }, [authMethod, draft]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
