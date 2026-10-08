# CrewJio

Roster-sharing app for Singapore cabin crew and pilots (SIA and Scoot first). Crew import their monthly roster, add friends into private groups, and the app finds the best days everyone is free, suggests duty swaps, and lets partners and family follow along.

Domain: crewjio.com · Brand: CrewJio ("jio" = Singlish for inviting someone out)

## Stack
- `app/` — Expo (React Native, TypeScript), iOS + Android, expo-router
- `supabase/` — Postgres, Auth (Apple, Google, phone), Storage, Edge Functions. Region: Singapore (ap-southeast-1)
- `web/` — Next.js on Vercel: landing page, waitlist, family share links (`crewjio.com/s/<handle>`)
- `shared/` — TypeScript types and pure logic shared by app and web (duty types, day ranking, swap matching)
- Roster import uses the Claude API (vision) from a Supabase Edge Function

## Hard rules
- NEVER put API keys (Claude, Supabase service role, flight data) in `app/` or `web/` client code. They live only in Edge Function secrets.
- All secrets go in `.env` / `.env.local` files, which are gitignored. Provide `.env.example` with placeholder values.
- Every table must have row-level security enabled. A user can only read another user's roster through a group or partner connection, and only at the sharing level they granted.
- Groups never see each other. Membership of one group gives no visibility into another group.
- Roster screenshots are deleted from storage immediately after parsing. Never store staff numbers, aircraft registrations or crew IDs; strip them in the import step.
- The app is not affiliated with any airline. Do not use airline logos, names in branding, or the airlines' uniform designs.
- Swap suggestions are suggestions only. The app never claims to perform a swap; swaps happen in the airline's official system.

## Domain model
- **Profile**: name, role (cabin crew | pilot), airline (SIA | Scoot | other), rank, fleets (A380, A350, 777, 787, 737), JCL trained (Business class qualified, crew only), open_to_swaps (bool)
- **Crew ranks** (name tag colour): Flight Steward/Stewardess (blue #1E3A8C), Leading (green #1F6B35), Chief (red #B3191F), In-flight Supervisor (plum #5C1A3C). Name tags use CrewJio's own batik-style pattern in these colours.
- **Pilot ranks**: Second Officer, First Officer, Captain (shown as stripes)
- **Duty** types: flight (turnaround or multi-day trip), standby/reserve, training (usually 09:00–17:00), sim, ground school, off, holiday, annual leave, busy-personal
- **Holiday / leave / busy** entries are always blocked in matching, even on roster off days. Groups see "Away"; partner sees details.
- **Reservist (NTSV)** days are untouchable, exactly like holidays.
- **Group**: name, members, sharing level (off days only | + destinations | full roster). If a friend is in several groups, they see the most generous level shared with any of their groups, unless a per-person override hides more.
- **Partner**: special 1-to-1 connection with full roster, live flight status and landing notifications.

## Day ranking (shared/ranking.ts)
For a set of people and a date, classify as:
- **Great**: everyone off and rested (nobody landed from a long-haul flight in the previous ~24h)
- **Evening**: everyone free from evening (back from a turnaround, or training ends ~17:00)
- **Tired**: everyone off but someone just landed from long-haul / crossed many time zones
- **Almost**: all but one free, which triggers swap suggestions
- **Morning / Daytime**: free until a same-day afternoon report, or off but reporting just after midnight
- Blocked if anyone has holiday / leave / reservist / private

## Swap suggestions (shared/swaps.ts)
When a group date is "Almost": find friends of the busy person who are open_to_swaps, off that day, same role, compatible rank, sharing a fleet with the duty, and JCL if required. Prefer people with a duty on a day the busy person is free (easy swap back). Send the idea privately to the busy person only.

## Roster import (supabase/functions/roster-import)
Input: 1–4 screenshots of the airline roster app, either the calendar view or the **list view** (columns: Start Date, Day, Flight Number, Sector, A/C, Duty, Sector Duty, Acting Rank, Rpt, STD, STA, Flight Time, Duty Time, FDP). Send to Claude with a strict JSON schema, one object per row (see `samples/nov-2026-roster.json` for the exact shape). Rows without a date belong to the date above. A flight's STA can fall on the next row's date (overnight flights). Resize images before sending. Limit imports per user per month.

**Every Duty value is cross-checked against `shared/roster-codes.json`** (1,000+ codes built from the airline's roster code list by `scripts/build_roster_codes.py`). `FLY` = flying duty with flight number and sector on the same row. Any code or column value not in the list is flagged "needs a look" for the user to confirm; never guess. Each code has:
- `category`: off, part_off, layover, standby, reserve, training, flight, leave, national_service, private, busy
- `friendsSee`: what friends are shown (e.g. "Off", "Away", "Training")
- `blocksMatching`, `swappable`

Key rules:
- **NTSV / NR99 (national service / reservist) are untouchable**: always blocked in matching and never offered for swaps. Same for leave and private.
- **Category `private`** (medical leave, suspension, interviews, tests, swab tests, family leave, missed flight, etc.) is never revealed to friends or groups: they only ever see "Unavailable". Only the user sees the real code.
- Pink highlighted days in the SIA calendar view are training.
- `scripts/try_roster.py` runs a list-view roster through the cross-check and day ranking. Port its logic to `shared/` as TypeScript with tests, using the November 2026 sample as a fixture. Expected results are in `samples/nov-2026-days.json`.

## Flight changes (AOG, delays, cancellations)
Users can edit any imported flight after the fact: Delayed, AOG / stuck, Cancelled, Re-routed, Swapped, Other. For AOG they enter where they're stuck and the new departure. The app then:
- rewrites the affected days (e.g. an extra layover night, new landing day), keeping the original as history
- re-runs day ranking for every group they're in and notifies groups whose plans are affected
- flags the next duty as "to confirm" if the new landing leaves little rest before it (crew control may change it). Never claim the airline has changed it.
- A later roster re-import replaces manual edits for those days, after asking the user.

## Waitlist (web/)
- Supabase table `waitlist`: first_name, email (unique, stored lowercase), instagram, role (cabin_crew | pilot | partner_or_friend), airline (SIA | Scoot | other), pain_point, wants_beta, consent_at, source (site | tally_import), confirmation_sent_at, unsubscribed_at, created_at. RLS on; inserts only via the server route with the service role key. Never email rows with unsubscribed_at set.
- Confirmation email via Resend, from `CrewJio <hello@mail.crewjio.com>`, reply-to `hello@crewjio.com`. Built with React Email in the app's dark navy / amber style. Copy:
  - Subject: "You're on the CrewJio list ✈️"
  - Body: "Hi {first_name}, you're on the list. CrewJio helps SG crew and pilots find the days you're all home, without the group-chat juggling. We're opening the beta to a small group first, and we'll email you when your spot is ready. Want in faster? Jio your crew and share crewjio.com with your batch. Just reply if you have ideas or questions. We read everything. — Nick, CrewJio"
  - Footer: why they got it, a one-click unsubscribe, and "Not affiliated with any airline."
- Never put Resend or Supabase service keys in browser code.

## Design
Dark navy UI (#0E1726 background, #17233A cards), amber accent (#F5B642), teal (#4FD1C5), training lavender (#C9B6FF), partner pink (#F59BB8). Fonts: DM Sans (UI), JetBrains Mono (flight codes). Touch targets ≥ 44px. Mockups are in the CrewJio Design canvas.

## Build order
1. Auth + onboarding (welcome, role, rank/fleet/JCL profile, tour)
2. Manual duty entry + my roster calendar
3. Friends, groups, sharing levels, partner connection
4. Crew match + day ranking
5. Screenshot roster import
6. Holidays, swap suggestions, flight-change editing (AOG / delays)
7. Family share link (web), live flight status, push notifications

## Conventions
- TypeScript everywhere, strict mode
- Unit tests for everything in `shared/` (ranking and swap logic must be tested with real-looking rosters)
- Small commits with clear messages
