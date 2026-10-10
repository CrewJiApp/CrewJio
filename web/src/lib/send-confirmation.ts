import { render } from "@react-email/render";
import { Resend } from "resend";
import WaitlistConfirmation from "../../emails/WaitlistConfirmation";
import { createUnsubscribeToken } from "@/lib/unsubscribe-token";

// Used by the waitlist route and scripts/import-tally.ts. Keys are passed in,
// never read from a NEXT_PUBLIC_ variable, so nothing here can reach the browser.
// Every email uses emails/components/CrewJioLayout.tsx (see CLAUDE.md "Waitlist").

export const CONFIRMATION_SUBJECT = "You're on the CrewJio list ✈️";
export const DEFAULT_EMAIL_FROM = "CrewJio <hello@mail.crewjio.com>";
export const EMAIL_REPLY_TO = "hello@crewjio.com";

/** The From address: EMAIL_FROM when set (e.g. "CrewJio <hello@crewjio.com>"), otherwise the default. */
export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}

interface SendConfirmationOptions {
  to: string;
  firstName: string;
  resendApiKey: string;
  unsubscribeSecret: string;
  siteUrl: string;
  from?: string;
  replyTo?: string;
}

export async function sendConfirmation(opts: SendConfirmationOptions): Promise<void> {
  const token = createUnsubscribeToken(opts.to, opts.unsubscribeSecret);
  const unsubscribeUrl = `${opts.siteUrl}/unsubscribe?t=${encodeURIComponent(token)}`;
  const oneClickUrl = `${opts.siteUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;
  const replyTo = opts.replyTo ?? EMAIL_REPLY_TO;

  const email = WaitlistConfirmation({ firstName: opts.firstName, unsubscribeUrl });
  const [html, text] = await Promise.all([render(email), render(email, { plainText: true })]);

  const resend = new Resend(opts.resendApiKey);
  const { error } = await resend.emails.send({
    from: opts.from ?? emailFrom(),
    to: opts.to,
    replyTo,
    subject: CONFIRMATION_SUBJECT,
    html,
    text,
    headers: {
      // RFC 8058 one-click unsubscribe, shown by Gmail and Apple Mail next to the sender.
      "List-Unsubscribe": `<${oneClickUrl}>, <mailto:${replyTo}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
}
