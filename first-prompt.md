# CrewJio — Claude Code sessions

## Before you start (one-time setup, ~30 min)
1. Install Node.js (LTS), Git and Claude Code on your computer.
2. Create accounts: GitHub, Supabase (Singapore region), Vercel, Resend, Expo, Anthropic Console (API).
3. Make an empty folder called `crewjio`, unzip the starter files into it, and open Claude Code in that folder.
4. Install the Expo Go app on your phone so you can preview the app live.

## Tonight: domain + email (no code)
1. Buy crewjio.com.
2. **Resend → Domains → Add domain.** Use the subdomain `mail.crewjio.com` so the main domain's reputation is protected. Resend shows 3–4 DNS records (MX, SPF/TXT, DKIM, optional DMARC). Add each one in GoDaddy → My Products → crewjio.com → DNS. Wait for Resend to show "Verified" (usually minutes, can take a few hours).
3. **Receiving email:** Resend only sends. Set up free email forwarding (GoDaddy's forwarding or ImprovMX) so `hello@crewjio.com` lands in your Gmail. People will reply to the confirmation email.
4. Leave the Tally form live for now. The Instagram link keeps working until the landing page replaces it.

## Prompt 0: landing page + waitlist (paste into Claude Code)

Read CLAUDE.md first. Build `web/`, the crewjio.com landing page and waitlist:

1. Next.js (App Router, TypeScript) in `web/`, deployable to Vercel. Use the CrewJio design from CLAUDE.md (dark navy, amber, teal, DM Sans, JetBrains Mono). Mobile-first, since most visitors come from Instagram on their phone.
2. Page sections: hero ("Find the days you're both home." + the two-flight-paths logo + "Get early access" button), three "how it works" steps (snap your roster, make groups, find the best day), a privacy section (nobody can search for you, private codes stay private, not affiliated with any airline), a FAQ, and the waitlist form. Footer with a privacy policy page and hello@crewjio.com.
3. Waitlist form with the same questions as the Tally form: first name, email, Instagram handle (optional), role (cabin crew / pilot / partner or friend of crew), airline (SIA / Scoot / other), "most annoying part of planning around rosters" (optional), beta tester yes/no, and a PDPA consent line.
4. The form posts to a Next.js route handler that validates the input, saves it to a Supabase `waitlist` table (RLS on, insert only from the server with the service role key, unique on email), and sends a confirmation email through Resend from `CrewJio <hello@mail.crewjio.com>` with reply-to `hello@crewjio.com`. A duplicate email returns "You're already on the list" and sends nothing.
5. Build the email with React Email, matching the confirmation copy in CLAUDE.md. Add a basic rate limit and a honeypot field against spam.
6. After sign-up, show the thank-you state with a share button ("Jio your crew") that copies the site link.
7. Add a one-off script to import a Tally CSV export into the `waitlist` table, with no emails sent by default.
8. Put all keys (Supabase service role, Resend) in `.env.local`, which is gitignored, and add `.env.example`. Never expose them to the browser.

When done, tell me how to run it locally, how to deploy it to Vercel, how to connect crewjio.com in Vercel and GoDaddy DNS, and how to send myself a test sign-up.

## Prompt 1: app skeleton

Read CLAUDE.md first. Then set up the CrewJio app skeleton in the same repo:

1. Initialise git if not already done, with a sensible .gitignore (node_modules, .env files, build outputs).
2. Create `app/` as an Expo + TypeScript + expo-router project. Add the CrewJio theme (colours and fonts from CLAUDE.md) as a shared theme file.
3. Create `shared/` as a TypeScript package with the domain types from CLAUDE.md (Profile, Duty, Group, Partner, ranks, fleets) and empty, typed stubs for `ranking.ts` and `swaps.ts`, with a test runner set up. Keep `shared/roster-codes.json` as is.
4. In `supabase/`, add a migration with tables for profiles, duties, groups, group_members, partners and holidays, with row-level security enabled on every table and policies that follow the sharing rules in CLAUDE.md.
5. Create `.env.example` files for app and supabase with placeholder values only.
6. Build the first screens in `app/` to match the mockups: Welcome/login, Role picker, Rank + fleet + JCL profile, and the 3-step tour. Use placeholder auth for now.

When you're done, tell me exactly how to run the app on my phone with Expo Go, and list anything I need to fill in (like Supabase keys) myself.

## Prompt 2
Read CLAUDE.md. Connect real Supabase auth (Apple, Google, phone), save the onboarding profile to the database, and build the My Roster calendar with manual duty entry (flight, training, standby, holiday). Then write and run tests for the duty types.

## Prompt 3
Read CLAUDE.md. Build friends, groups with sharing levels, and the partner connection. Then port `scripts/try_roster.py` to `shared/ranking.ts` with full tests using the November sample, and build the Crew Match and Group Plan screens on top of it.

## Tips
- Start each session with "Read CLAUDE.md". If you make a decision that changes the rules, ask Claude to update CLAUDE.md.
- Commit after each working step ("commit this with a clear message").
- If something breaks, paste the full error to Claude Code rather than describing it.
