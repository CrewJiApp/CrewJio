// Sign-in state and the signed-in user's profile.
// Real mode: Supabase Auth (Apple, Google, phone code, email code). Demo mode (no Supabase keys):
// any sign-in button signs in a local demo user so the app can be tried without a backend.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '@crewjio/shared';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { backend, clearDemoData } from '@/lib/backend';
import { clearDemoSocial } from '@/lib/social';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

export interface AuthUser {
  id: string;
  /** Name from Apple or Google, used to prefill onboarding. */
  suggestedName: string;
}

export type OtpChannel = { phone: string } | { email: string };

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Null until onboarding is finished. */
  profile: Profile | null;
  demo: boolean;
  signInWithApple(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  sendCode(to: OtpChannel): Promise<void>;
  verifyCode(to: OtpChannel, code: string): Promise<void>;
  /** Demo mode only: sign in as the local demo user. */
  signInDemo(): Promise<void>;
  signOut(): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
}

const DEMO_USER_KEY = 'crewjio.demo.user';
const DEMO_USER: AuthUser = { id: '00000000-0000-4000-8000-00000000d3a0', suggestedName: '' };

/** Thrown when the user backs out of a sign-in sheet. Callers ignore it. */
export class SignInCancelled extends Error {}

const AuthContext = createContext<AuthState | null>(null);

function nameFromMetadata(meta: Record<string, unknown> | undefined): string {
  const v = meta?.full_name ?? meta?.name ?? meta?.given_name;
  return typeof v === 'string' ? v.trim().slice(0, 40) : '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Apple only shares the name on the very first sign-in, so keep it until onboarding uses it.
  const [appleName, setAppleName] = useState('');

  const enter = useCallback(async (next: AuthUser | null) => {
    if (!next) {
      setUser(null);
      setProfile(null);
      setStatus('signed_out');
      return;
    }
    const loaded = await backend.loadProfile(next.id).catch(() => null);
    setUser(next);
    setProfile(loaded);
    setStatus('signed_in');
  }, []);

  useEffect(() => {
    if (!supabase) {
      AsyncStorage.getItem(DEMO_USER_KEY)
        .then((v) => enter(v ? DEMO_USER : null))
        .catch(() => enter(null));
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      return enter(u ? { id: u.id, suggestedName: nameFromMetadata(u.user_metadata) } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') void enter(null);
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        void enter({ id: u.id, suggestedName: nameFromMetadata(u.user_metadata) });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [enter]);

  const value = useMemo<AuthState>(() => {
    const db = supabase;
    const signInDemo = async () => {
      await AsyncStorage.setItem(DEMO_USER_KEY, '1');
      await enter(DEMO_USER);
    };
    return {
      status,
      user: user && appleName && !user.suggestedName ? { ...user, suggestedName: appleName } : user,
      profile,
      demo: !db,

      async signInWithApple() {
        if (!db) return signInDemo();
        // Apple gets a hashed nonce; Supabase gets the raw one and checks they match.
        const rawNonce = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            nonce: hashed,
          });
        } catch (e) {
          if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new SignInCancelled();
          throw e;
        }
        if (!credential.identityToken) throw new Error('Apple did not return a sign-in token. Please try again.');
        const given = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
        if (given) setAppleName(given.slice(0, 40));
        const { error } = await db.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
        if (error) throw error;
      },

      async signInWithGoogle() {
        if (!db) return signInDemo();
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
        if (error) throw error;
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') throw new SignInCancelled();
        const url = new URL(result.url);
        const problem = url.searchParams.get('error_description');
        if (problem) throw new Error(problem);
        const code = url.searchParams.get('code');
        if (!code) throw new Error('Google sign-in did not finish. Please try again.');
        const { error: exchangeError } = await db.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      },

      async sendCode(to) {
        if (!db) return;
        const { error } = await db.auth.signInWithOtp('phone' in to ? { phone: to.phone } : { email: to.email, options: { shouldCreateUser: true } });
        if (error) throw error;
      },

      async verifyCode(to, code) {
        if (!db) return signInDemo();
        const { error } =
          'phone' in to
            ? await db.auth.verifyOtp({ phone: to.phone, token: code, type: 'sms' })
            : await db.auth.verifyOtp({ email: to.email, token: code, type: 'email' });
        if (error) throw error;
      },

      signInDemo,

      async signOut() {
        if (db) {
          await db.auth.signOut();
        } else {
          await AsyncStorage.removeItem(DEMO_USER_KEY);
          await clearDemoData();
          await clearDemoSocial();
          await enter(null);
        }
      },

      async saveProfile(next) {
        await backend.saveProfile(next);
        setProfile(next);
      },
    };
  }, [status, user, profile, appleName, enter]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** A friendly message for a sign-in error, or null when the user simply cancelled. */
export function signInErrorMessage(e: unknown): string | null {
  if (e instanceof SignInCancelled) return null;
  const msg = e instanceof Error ? e.message : String(e);
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return 'This sign-in option is not switched on yet.';
  if (/rate limit|too many/i.test(msg)) return 'Too many tries. Please wait a minute and try again.';
  if (/expired|invalid.*(otp|token)|token has expired/i.test(msg)) return 'That code did not work. Check it or ask for a new one.';
  if (/network|fetch/i.test(msg)) return 'Can’t reach the server. Check your internet, and that app/.env.local has your real Supabase URL.';
  return msg;
}
