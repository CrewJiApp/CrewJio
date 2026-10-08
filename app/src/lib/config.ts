// Public app config from app/.env.local (see app/.env.example).
// Only EXPO_PUBLIC_ variables reach the app, and everything in the app is public: never put a
// secret key here. The Supabase anon key is safe because row-level security protects the data.
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export const hasSupabaseConfig = config.supabaseUrl.startsWith('https://') && config.supabaseAnonKey.length > 0;
