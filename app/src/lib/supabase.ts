// Supabase client. Only created when app/.env.local has the project URL and anon key;
// without them the app runs in demo mode (see backend.ts).
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config, hasSupabaseConfig } from '@/lib/config';

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // PKCE: the Google sign-in redirect carries a one-time code, never the tokens themselves.
        flowType: 'pkce',
      },
    })
  : null;

// Refresh the session only while the app is in the foreground (Supabase's React Native guidance).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
