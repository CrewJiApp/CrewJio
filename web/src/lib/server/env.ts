import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See web/.env.example.`);
  return value;
}

/** Read lazily so a missing key fails the request, not the build. */
export const serverEnv = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  unsubscribeSecret: () => required("UNSUBSCRIBE_SECRET"),
};

export const EMAIL_FROM = "CrewJio <hello@mail.crewjio.com>";
export const EMAIL_REPLY_TO = "hello@crewjio.com";
