/**
 * One-off: import a Tally CSV export into the Supabase `waitlist` table.
 *
 *   npm run import:tally -- path/to/tally.csv              # dry run: shows what would happen
 *   npm run import:tally -- path/to/tally.csv --write      # inserts new rows
 *   npm run import:tally -- path/to/tally.csv --write --send-emails   # also emails NEW rows only
 *
 * No emails are sent unless you pass --send-emails. Existing emails are skipped, never overwritten.
 * Reads keys from web/.env.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { sendConfirmation } from "../src/lib/send-confirmation";
import { normaliseInstagram } from "../src/lib/waitlist";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const write = args.includes("--write");
const sendEmails = args.includes("--send-emails");

if (!file) {
  console.error("Usage: npm run import:tally -- <export.csv> [--write] [--send-emails]");
  process.exit(1);
}
if (sendEmails && !write) {
  console.error("--send-emails needs --write.");
  process.exit(1);
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in web/.env.local`);
  return v;
}

type Row = Record<string, string>;
const rows = parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true, bom: true, trim: true }) as Row[];
if (rows.length === 0) {
  console.log("No rows in the file.");
  process.exit(0);
}

// Tally names columns after the question text, so match on keywords.
const headers = Object.keys(rows[0]!);
function column(...keywords: string[]): string | undefined {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}
const col = {
  firstName: column("first name", "name"),
  email: column("email"),
  instagram: column("instagram"),
  role: column("role", "you are", "i'm", "i am", "what do you"),
  airline: column("airline"),
  painPoint: column("annoying", "pain", "hardest", "frustrat"),
  beta: column("beta"),
  consent: column("consent", "pdpa", "agree"),
  submittedAt: column("submitted at", "submitted", "created"),
};

console.log("Column mapping (check this before using --write):");
for (const [field, header] of Object.entries(col)) console.log(`  ${field.padEnd(12)} <- ${header ?? "(not found)"}`);
if (!col.email || !col.firstName) {
  console.error("\nCould not find the email or first name column. Rename the headers and try again.");
  process.exit(1);
}

function mapRole(v: string): "cabin_crew" | "pilot" | "partner_or_friend" | null {
  const s = v.toLowerCase();
  if (s.includes("pilot")) return "pilot";
  if (s.includes("partner") || s.includes("friend") || s.includes("family")) return "partner_or_friend";
  if (s.includes("crew") || s.includes("cabin") || s.includes("steward")) return "cabin_crew";
  return null;
}
function mapAirline(v: string): "SIA" | "Scoot" | "other" {
  const s = v.toLowerCase();
  if (s.includes("scoot")) return "Scoot";
  if (s === "sia" || s.includes("singapore")) return "SIA";
  return "other";
}
const yes = (v: string | undefined) => !!v && /^(yes|y|true|1|checked|i agree)/i.test(v.trim());

const records: Record<string, unknown>[] = [];
const problems: string[] = [];
const seen = new Set<string>();

rows.forEach((r, i) => {
  const line = i + 2;
  const email = (r[col.email!] ?? "").trim().toLowerCase();
  const firstName = (r[col.firstName!] ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problems.push(`line ${line}: bad email "${email}"`);
  if (!firstName) return problems.push(`line ${line}: no first name`);
  if (seen.has(email)) return problems.push(`line ${line}: ${email} appears twice in the file, keeping the first`);
  if (col.consent && !yes(r[col.consent])) return problems.push(`line ${line}: ${email} did not tick consent, skipped`);
  const role = col.role ? mapRole(r[col.role] ?? "") : null;
  if (!role) return problems.push(`line ${line}: ${email} has unknown role "${col.role ? r[col.role] : ""}", skipped`);
  seen.add(email);

  const instagram = col.instagram ? normaliseInstagram(r[col.instagram] ?? "") : "";
  const submitted = col.submittedAt ? new Date(r[col.submittedAt] ?? "") : new Date();
  const when = Number.isNaN(submitted.getTime()) ? new Date() : submitted;

  records.push({
    first_name: firstName.slice(0, 60),
    email,
    instagram: /^[a-z0-9._]{1,30}$/.test(instagram) ? instagram : null,
    role,
    airline: mapAirline(col.airline ? (r[col.airline] ?? "") : ""),
    pain_point: (col.painPoint ? r[col.painPoint] : "")?.slice(0, 1000) || null,
    wants_beta: yes(col.beta ? r[col.beta] : undefined),
    // They consented in the Tally form when they submitted it.
    consent_at: when.toISOString(),
    source: "tally_import",
    created_at: when.toISOString(),
  });
});

console.log(`\n${rows.length} rows read, ${records.length} ready to import.`);
if (problems.length) console.log(`\nSkipped or flagged:\n  ${problems.join("\n  ")}`);

async function main() {
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readError } = await db
    .from("waitlist")
    .select("email")
    .in(
      "email",
      records.map((r) => r.email as string),
    );
  if (readError) throw readError;
  const already = new Set((existing ?? []).map((e) => e.email as string));
  const fresh = records.filter((r) => !already.has(r.email as string));
  console.log(`${already.size} already on the list (left untouched), ${fresh.length} new.`);

  if (!write) {
    console.log("\nDry run. Nothing written. Add --write to import.");
    return;
  }
  if (fresh.length === 0) return;

  const { error } = await db.from("waitlist").insert(fresh);
  if (error) throw error;
  console.log(`Inserted ${fresh.length} rows.`);

  if (!sendEmails) {
    console.log("No emails sent (pass --send-emails to send confirmations to the new rows).");
    return;
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crewjio.com").replace(/\/$/, "");
  let sent = 0;
  for (const r of fresh) {
    try {
      await sendConfirmation({
        to: r.email as string,
        firstName: r.first_name as string,
        resendApiKey: env("RESEND_API_KEY"),
        unsubscribeSecret: env("UNSUBSCRIBE_SECRET"),
        siteUrl,
        from: "CrewJio <hello@mail.crewjio.com>",
        replyTo: "hello@crewjio.com",
      });
      await db.from("waitlist").update({ confirmation_sent_at: new Date().toISOString() }).eq("email", r.email as string);
      sent += 1;
      await new Promise((res) => setTimeout(res, 600)); // stay under Resend's rate limit
    } catch (e) {
      console.error(`  email to ${r.email} failed:`, e);
    }
  }
  console.log(`Sent ${sent} confirmation emails.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
