// Public app config from app/.env.local (see app/.env.example).
// Only EXPO_PUBLIC_ variables reach the app, and everything in the app is public: never put a
// secret key here. The Supabase anon key is safe because row-level security protects the data.
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

// The placeholders from .env.example count as "no keys", so a half-filled file stays in preview mode.
const isPlaceholder = (v: string) => /your-project-ref|your-anon|publishable-key/i.test(v);

/**
 * Preview mode (no backend, data kept on the phone, fake friends) is for development and Expo Go
 * only. A store build without its Supabase keys must never quietly run as a preview, so there it is
 * off unless EXPO_PUBLIC_ALLOW_PREVIEW=1 is set on purpose.
 */
export const allowPreview = __DEV__ || process.env.EXPO_PUBLIC_ALLOW_PREVIEW === '1';

export const NOT_SET_UP_MESSAGE = 'This version of CrewJio is not set up correctly. Please update the app, or email hello@crewjio.com.';

export const hasSupabaseConfig =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl.trim()) &&
  config.supabaseAnonKey.trim().length > 20 &&
  !isPlaceholder(config.supabaseUrl) &&
  !isPlaceholder(config.supabaseAnonKey);
