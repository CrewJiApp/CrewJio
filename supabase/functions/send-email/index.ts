// Supabase "Send Email" auth hook: sends the sign-in and sign-up code emails through Resend, with
// CrewJio's branded templates. Supabase calls this instead of its own mailer, so the real code
// reaches the person in an email that looks like the rest of CrewJio.
//
// Secrets (Supabase Edge Function secrets, never in the app):
//   SEND_EMAIL_HOOK_SECRET  the hook secret Supabase shows when you enable the hook ("v1,whsec_...")
//   RESEND_API_KEY          a Resend API key with sending access
//   EMAIL_FROM              optional, e.g. "CrewJio <hello@crewjio.com>"
// Setup steps for Nick: docs/setup-sign-in.md.
import { Webhook } from 'npm:standardwebhooks@1.0.0';

import { messagesFor, type Message } from './render.ts';

const DEFAULT_FROM = 'CrewJio <hello@mail.crewjio.com>';
const REPLY_TO = 'hello@crewjio.com';

function failure(status: number, message: string): Response {
  // Supabase reads this shape and shows the message to whoever asked for the code.
  return Response.json({ error: { http_code: status, message } }, { status });
}

async function send(message: Message, apiKey: string, from: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [message.to],
      reply_to: REPLY_TO,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return failure(405, 'Method not allowed');

  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!hookSecret || !apiKey) {
    console.error('[send-email] SEND_EMAIL_HOOK_SECRET or RESEND_API_KEY is not set');
    return failure(500, 'Email is not set up yet');
  }

  // Only Supabase can call this: the body is signed with the hook secret.
  const body = await req.text();
  let payload: Parameters<typeof messagesFor>[0];
  try {
    payload = new Webhook(hookSecret.replace(/^v1,whsec_/, '')).verify(body, Object.fromEntries(req.headers)) as typeof payload;
  } catch {
    return failure(401, 'Invalid signature');
  }

  try {
    const from = Deno.env.get('EMAIL_FROM')?.trim() || DEFAULT_FROM;
    for (const message of messagesFor(payload)) await send(message, apiKey, from);
    return Response.json({});
  } catch (e) {
    // Never log the code or the address.
    console.error('[send-email] failed:', e instanceof Error ? e.message : e);
    return failure(500, 'Could not send the code email');
  }
});
