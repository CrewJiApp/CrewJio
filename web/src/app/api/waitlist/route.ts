import { z } from "zod";
import { sendConfirmation } from "@/lib/send-confirmation";
import { EMAIL_FROM, EMAIL_REPLY_TO, serverEnv } from "@/lib/server/env";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { SITE_URL } from "@/lib/site";
import { waitlistSchema, type WaitlistInput, type WaitlistResponse } from "@/lib/waitlist";

function reply(body: WaitlistResponse, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (isRateLimited(clientIp(request))) return reply({ status: "rate_limited" }, 429);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return reply({ status: "invalid", fieldErrors: {} }, 400);
  }

  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    const fieldErrors: Partial<Record<keyof WaitlistInput, string>> = {};
    for (const [key, messages] of Object.entries(flat)) {
      if (messages?.[0]) fieldErrors[key as keyof WaitlistInput] = messages[0];
    }
    return reply({ status: "invalid", fieldErrors }, 400);
  }
  const data = parsed.data;

  // Honeypot filled in: a bot. Look successful, store and send nothing.
  if (data.company) return reply({ status: "joined" });

  try {
    const db = supabaseAdmin();
    const { error } = await db.from("waitlist").insert({
      first_name: data.firstName,
      email: data.email,
      instagram: data.instagram ?? null,
      role: data.role,
      airline: data.airline,
      pain_point: data.painPoint ?? null,
      wants_beta: data.wantsBeta,
      consent_at: new Date().toISOString(),
      source: "site",
    });

    if (error?.code === "23505") return reply({ status: "already_joined" });
    if (error) throw new Error(`Supabase insert: ${error.code} ${error.message}`);

    try {
      await sendConfirmation({
        to: data.email,
        firstName: data.firstName,
        resendApiKey: serverEnv.resendApiKey(),
        unsubscribeSecret: serverEnv.unsubscribeSecret(),
        siteUrl: SITE_URL,
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
      });
      await db.from("waitlist").update({ confirmation_sent_at: new Date().toISOString() }).eq("email", data.email);
    } catch (emailError) {
      // They're on the list either way. confirmation_sent_at stays null so we can resend later.
      console.error("[waitlist] confirmation email failed", emailError);
    }

    return reply({ status: "joined" });
  } catch (err) {
    console.error("[waitlist] sign-up failed", err);
    return reply({ status: "error" }, 500);
  }
}
