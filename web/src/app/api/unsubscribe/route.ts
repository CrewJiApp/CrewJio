import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/server/env";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

// POST only: mail clients send RFC 8058 one-click requests here, and the
// /unsubscribe page posts here after a tap. A GET never unsubscribes, so link
// scanners that open every URL in an email can't remove people by accident.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const email = verifyUnsubscribeToken(token, serverEnv.unsubscribeSecret());
  if (!email) return Response.json({ ok: false }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("waitlist")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email)
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[unsubscribe] update failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
