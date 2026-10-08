import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

let client: SupabaseClient | undefined;

/** Service-role client. Bypasses RLS, so it must only ever run on the server. */
export function supabaseAdmin(): SupabaseClient {
  client ??= createClient(serverEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
