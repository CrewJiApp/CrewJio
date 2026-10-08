import { Resend } from "resend";
import WaitlistConfirmation from "@/emails/WaitlistConfirmation";
import { createUnsubscribeToken } from "@/lib/unsubscribe-token";

// Used by the waitlist route and scripts/import-tally.ts. Keys are passed in,
// never read from a NEXT_PUBLIC_ variable, so nothing here can reach the browser.

export const CONFIRMATION_SUBJECT = "You're on the CrewJio list ✈️";

interface SendConfirmationOptions {
  to: string;
  firstName: string;
  resendApiKey: string;
  unsubscribeSecret: string;
  siteUrl: string;
  from: string;
  replyTo: string;
}

export async function sendConfirmation(opts: SendConfirmationOptions): Promise<void> {
  const token = createUnsubscribeToken(opts.to, opts.unsubscribeSecret);
  const unsubscribeUrl = `${opts.siteUrl}/unsubscribe?t=${encodeURIComponent(token)}`;
  const oneClickUrl = `${opts.siteUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;

  const resend = new Resend(opts.resendApiKey);
  const { error } = await resend.emails.send({
    from: opts.from,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: CONFIRMATION_SUBJECT,
    react: WaitlistConfirmation({ firstName: opts.firstName, unsubscribeUrl, siteUrl: opts.siteUrl }),
    headers: {
      // RFC 8058 one-click unsubscribe, shown by Gmail and Apple Mail next to the sender.
      "List-Unsubscribe": `<${oneClickUrl}>, <mailto:${opts.replyTo}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
}
