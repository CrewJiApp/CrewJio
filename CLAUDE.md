# CrewJio

Roster-sharing app for Singapore cabin crew and pilots (SIA and Scoot first). Crew import their monthly roster, add friends into private groups, and the app finds the best days everyone is free, suggests duty swaps, and lets partners and family follow along.

Domain: crewjio.com · Brand: CrewJio ("jio" = Singlish for inviting someone out)

## Stack
- `app/` — Expo SDK 58 (React Native, TypeScript), iOS + Android, expo-router
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
- **Profile**: name, role (cabin crew | pilot | partner = not crew: a partner, family or friend), airline (SIA | Scoot | other), rank, fleets (A380, A350, 777, 787, 737), JCL trained (Business class qualified, crew only), open_to_swaps (bool)
- **Crew ranks** (name tag colour): Flight Steward/Stewardess (blue #1E3A8C), Leading (green #1F6B35), Chief (red #B3191F), In-flight Supervisor (plum #5C1A3C). Name tags use CrewJio's own batik-style pattern in these colours.
- **Pilot ranks**: Second Officer, First Officer, Captain (shown as stripes)
- **Duty** types: flight (turnaround or multi-day trip), standby/reserve, training (usually 09:00–17:00), sim, ground school, off, holiday, annual leave, busy-personal
- **Holiday / leave / busy** entries are always blocked in matching, even on roster off days. Groups see "Away"; partner sees details.
- **Reservist (NTSV)** days are untouchable, exactly like holidays.
- **Group**: name, members, sharing level (off days only | + destinations | full roster). If a friend is in several groups, they see the most generous level shared with any of their groups, unless a per-person override hides more.
- **Partner**: special 1-to-1 connection with full roster, live flight status and landing notifications.

## Sharing and privacy (enforced in supabase/migrations/20261010000000_core_schema.sql)
- `duties` and `holidays` are readable only by their owner at table level. Everyone else reads them through `get_shared_roster(owner, from, to)`, which redacts each day to the viewer's effective level.
- Each member sets what each group sees of them (`group_members.sharing_level`, default `off_days`). Effective level = the most generous level the owner shares with any group both people are in, capped by the owner's per-person override (`sharing_overrides`, which can also hide someone completely). The viewer never sees the override exists.
- What each level shows: `off_days` = Off / Busy / Away / Unavailable only; `destinations` = + friends label and sector; `full` = + flight number and times. Groups always see holidays, leave, busy and reservist as "Away".
- An active partner sees full detail and the holiday kind (Holiday, Annual leave, Busy, Reservist). One active partner per person; only the addressee can accept.
- Private codes always show "Unavailable" with no detail, even to the partner. Raw roster codes and notes never leave the owner.
- Groups are created with `create_group(name)` and joined with `join_group(invite_code)`; members cannot add other people directly. Only the group owner can rename or delete it.
- Profiles are visible only to yourself, people in a group with you, and your partner (or pending partner request). Nobody can search.
- **Partners connect by code** (migration `20261011000000`): `create_partner_invite()` returns a 10-character code valid for 7 days; `accept_partner_invite(code)` makes the two people active partners straight away (entering the code is the acceptance). One active partner each; either side can disconnect.
- `get_shared_roster` also returns the duty `kind`, under the same rules as the label: hidden at `off_days`, for private days, and for leave / reservist / busy days shown to groups as "Away".
- **Not-crew users** (migration `20261012000000`): `profiles.role = 'partner'` has no rank, fleets or JCL and is never open to swaps. Their work and busy time are `other` duties with category `busy` and friends label "Working" or "Busy", with optional hours. `duties.source = 'calendar'` marks busy times copied from the phone calendar: only times, never event titles, places or people. A crew partner sees them in full; groups see them as "Away" (busy is always Away to groups).
- `supabase/tests/core-schema.test.mjs` checks these rules in an in-memory Postgres (`npm run test:db`). Add a test for every new rule.

## App conventions (build step 2)
- **Sign-in**: Apple (native, iOS only), Google (browser OAuth with PKCE), phone number by SMS code, and email code. **Launch without SMS**: until an SMS provider is set up and `EXPO_PUBLIC_SMS_SIGN_IN=1` is set (`smsSignIn` in `config.ts`), the welcome and sign-in screens lead with email, and phone sign-in is only a small "App reviewer sign-in (test number)" link for the store reviewers' Supabase test number. Setup steps for Nick: `docs/setup-sign-in.md`.
- **Preview mode**: with no Supabase keys in `app/.env.local`, every sign-in button signs in a local demo user and data is stored on the phone only (AsyncStorage). `app/src/lib/backend.ts` hides which mode is in use. Keep both working. **Preview mode only runs in development** (`__DEV__`, so Expo Go) or when `EXPO_PUBLIC_ALLOW_PREVIEW=1` is set on purpose (`app/src/lib/config.ts`, `allowPreview`). A store build without its Supabase keys stays signed out and shows "not set up correctly": it must never quietly run on fake data. Expo caches `EXPO_PUBLIC_` values, so use `expo export --clear` after changing one.
- Onboarding asks for a display name (prefilled from Apple or Google) and saves the profile at the end of step 3. The Me tab reuses the same screens to edit it.
- **Manual duties** are built by `shared/src/duty-entry.ts`, never by hand in screens. Times are stored as "HHMM" in the app and `time` in Postgres. For training, sim, ground school, standby and reserve, `report_time` is the start and `arrive_time` the end. A flight with a return flight fills the days between with `layover` duties at the destination. A day off is a duty (`off`); holiday, annual leave, busy and reservist are rows in `holidays` with a date range.
- **Calendar cells** (`shared/src/calendar.ts`): leave always wins, then the airports away from base for flights and layovers (`dayAirports`: every airport the day touches in the order it happens, at most two, so a layover in JNB with a CPT shuttle shows "JNB CPT" in a smaller size; a turnaround or plain layover shows one), then a flight that lands on this day (a trip home landing in the early hours still counts as a flight day, like the airline's own roster, and shows the airport she lands at, e.g. SIN), then TRG / SIM / GND, then SBY / RSV, then off. The roster loads a day before the visible month, and the day screen lists flights that landed that day (read-only; delete them from the day they left). Colours: flight amber, training lavender, standby slate, leave teal outline.
- Tabs for everyone: Roster (Calendar for not-crew users), Crew, the + (Add duty), Partner, Me. There is no placeholder "Track" tab; do not ship "Coming soon" screens, because the stores reject them. Copy must not promise unbuilt features (polls, live flights, swap suggestions, landing alerts).
- **Account deletion** (required by both stores): Me → Delete my account calls the `delete-account` Edge Function, which deletes only the caller (the token decides, never the request body). `prepare_account_deletion` first hands any group the person started to its longest-standing other member (a group with nobody else is deleted); deleting the auth user then cascades to everything else. The website has `/delete-account` for Google Play and for people who cannot open the app.
- **Legal and support pages** live in `web/` (`/privacy`, `/terms`, `/support`, `/delete-account`, shared `LegalPage`) and are linked from the welcome screen and the Me tab (`app/src/lib/links.ts`). They are plain-language drafts: have a lawyer review them, and update the privacy policy whenever the app collects something new.
- **Store release**: permissions are kept to internet, calendar read and photo picking (`app.json` `blockedPermissions` and plugin options; re-check with `expo prebuild` in a throwaway copy after adding any package). The Apple privacy manifest and "no special encryption" flag are in `app.json`. `app/eas.json` has `preview` and `production` profiles. Listing text, privacy answers and review notes: `docs/store-listing.md`. Steps for Nick: `docs/launch-checklist.md`. Keep airline names and logos out of store metadata.
- **Groups (build step 3)**: Crew tab lists partner and groups; friends join only with the group's invite code (Crew → Join with a code). Group Plan shows best days per month, a nudge for people missing the month, the member's own sharing level for that group, members (tap to set a per-person override), invite code, leave / delete. Crew Match picks friends across groups and the partner for the next 14 days. **Time of day**: Crew Match, Group Plan and the Partner tab have an Any time / Morning / Afternoon / Evening choice (`DayPartPicker`, `DayPart` in `shared/src/ranking.ts`, `rankDays(..., part)`). Morning is before 12:00, afternoon 12:00 to 18:00, evening from 18:00. With a part chosen, only days where everyone who is free is free in that part are kept (the others become NoMatch and drop out); a shared layover and a blocked day are unaffected; the summary and the proposal text name the part ("Propose Thu 12 Nov evening"). Sharing (invites, best days, proposals) uses the system share sheet; polls and "Lock in" come later.
- In preview mode, `app/src/lib/demo-friends.ts` supplies demo crew with rotating rosters for any group you create or join, and a demo partner.
- **Typing a roster code** (Add duty → Code, the default tab; `shared/src/code-entry.ts`): the user types the code from their roster and we search `roster-codes.json` as they type (exact code, then codes starting with it, then description words). A known code shows what it means and what friends see, then asks only for what it needs: times for standby / reserve / training (prefilled from the description, e.g. SS60 = 06:00 to 23:59), a day or a range for off / leave / reservist / private / busy, and FLY goes to the Flight tab. An unknown code is never guessed: the user must switch on "Save it anyway" and it is saved as Busy. The raw code is stored for the owner only.
- **Standby on a layover**: standby and reserve have a Where choice (In Singapore / On a layover + airport). The airport goes in `sector`; at base it stays null. It ranks as away ("Standby in SFO") and can match a friend's layover in the same city.
- **Not-crew users**: onboarding has a third choice, "I'm not crew", which skips rank and aircraft. They get Calendar, Crew, + (Add), Partner and Me tabs. **Crew can copy their phone calendar too** (Add duty → Copy your phone calendar, under Import whole month; a Google Calendar shows up once the Google account is added in the iPhone's Settings → Calendar → Accounts). Work and calendar busy entries sit on top of the roster in `classifyPersonDays` (`limitByBusy`): an entry without hours makes the day Busy, and one with hours takes the parts of the day it touches (morning before 12:00, afternoon 12:00 to 18:00, evening from 18:00), and what is left decides the status (there is no afternoon-only status, so a free afternoon alone counts as Busy). Groups see calendar busy time as "Away", a partner sees it in full. Their Add sheet (`components/partner-entry.tsx`) has Copy your phone calendar (`app/calendar-sync.tsx`, `expo-calendar/legacy` because the newer API is not in Expo Go; copies the next 60 days and replaces what it copied before), Work / busy (hours, several days, weekdays only), Free day and Holiday.

## Day ranking (shared/ranking.ts)
`classifyPersonDays` is the port of `scripts/try_roster.py` and must keep reproducing `samples/nov-2026-days.json` (tested). `rowsToDuties` (shared/roster-import.ts) turns list-view rows into duties, merging overnight flights and late standbys into one duty with an arrival date. Decisions made in build step 3:
- A day with nothing on it counts as off, but only for people who have added something in that range; people with no roster for the range are left out of the ranking and shown as "Nudge".
- People are combined by the part of the day each is free (morning, afternoon, evening). Training that ends by 18:00 frees the evening. **SameLayover** (everyone on a layover in the same city) is an extra match type.
- **Almost** needs 3+ people and the busy one must not be on leave.
- Busy for part of the day (`other` duties with category `busy` and hours: work, phone calendar) leaves the rest free: ending by 18:00 is **Evening**, starting from 18:00 is **Daytime**, starting from 12:00 is **Morning**. Without hours the whole day is busy.
- **The day after counts too** (`limitByNextDay`, `EARLY_START` in `shared/src/ranking.ts`): a start before 07:00 the next morning (a report, standby, reserve, training, sim or ground school) rules out a late evening. A day free all day becomes Daytime ("Off, but reports 0600 next morning"), a day that was free from the evening alone becomes Busy, and a day after long-haul stays Tired but loses the evening (`noEvening`). Starting at 07:00 or later changes nothing. The ranking loads the day after the range for this. It needs times, so a friend shared at "off days only" can't trigger it; a partner (full detail) can.
- Friends are ranked only from what `get_shared_roster` gives the viewer (`sharedEntriesToRoster`): at "off days only" a duty is just Busy, and an unexplained Away or Unavailable counts as untouchable.

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
**How it is built (build step 5).** The app shrinks 1 to 4 screenshots (JPEG, 1400px wide) and sends them straight to the Edge Function in the request, signed in with the person's own token (`verify_jwt = true`). They are **never written to Storage**, so there is nothing to delete: this is stricter than "upload then delete". The function reserves an import with `claim_roster_import` (monthly limit per person, default 8, set by `ROSTER_IMPORT_MONTHLY_LIMIT`; refused and failed reads do not count), **Only JPEG and PDF files are read** (checked by their first bytes in `prompt.ts` `fileType`; the phone turns every screenshot into a JPEG, and one PDF of at most 2.5 MB and 6 pages goes alone, never mixed with screenshots). **Cost guards**: one import at a time per person, 8 per month (failed reads do not count), 6 tries per person per day (failed reads count), 120 tries per day across everybody (`claim_roster_import`, migration `20261015000000`; secrets `ROSTER_IMPORT_DAILY_LIMIT`, `ROSTER_IMPORT_DAILY_LIMIT_ALL`), requests over 20 MB refused unread, and `max_tokens` 8000. Nick's Anthropic spend limit is the hard stop. The function calls Claude with a tool whose schema allows only date, duty, flight, sector, rpt, std, sta and `highlight: "pink"`, and cleans the answer in `parse.ts` (drops anything else, including A/C, acting rank, staff numbers and names; fixes times, flights and sectors; removes rows repeated across overlapping screenshots and misread years). Only the monthly count is logged (`roster_imports`), never the roster. The model does not accept a forced tool choice, so the request uses `tool_choice: auto` and the prompt asks for the tool call; an answer without one is treated as a failed read. `ANTHROPIC_API_KEY` is an Edge Function secret only. The app then converts rows with `rowsToDuties`, cross-checks every code, and shows them on a review screen (`app/src/app/import.tsx`): a code not in the list is **never saved until the person taps "Save as Busy"** (or removes it), and saving over days that already have duties asks first and replaces every duty on those days (leave and holidays are untouched). A pink day with no code is training 09:00 to 17:00 for the person to edit. A standby or reserve row with no times uses the hours its code states (`hoursInDescription` in `shared/src/roster-codes.ts`: SS60 is 06:00 to 23:59; only 13 of the 29 standby/reserve codes state hours), so the next-morning rule still works when the roster view shows only the code. A code that states no hours stays without a time, never guessed. Preview mode has a built-in sample roster. Tests: `supabase/tests/roster-imports.test.mjs` (limit and RLS), `roster-import-parse.test.mjs` (cleaning and the request), `shared/test/import.test.ts` (the November sample end to end), and `npm run test:functions` (the real function in Deno with Supabase and Claude stubbed). Setup steps for Nick: `docs/setup-roster-import.md`.

Input: 1–4 screenshots of the airline roster app, either the calendar view or the **list view** (columns: Start Date, Day, Flight Number, Sector, A/C, Duty, Sector Duty, Acting Rank, Rpt, STD, STA, Flight Time, Duty Time, FDP). Send to Claude with a strict JSON schema, one object per row (see `samples/nov-2026-roster.json` for the exact shape). Rows without a date belong to the date above. A flight's STA can fall on the next row's date (overnight flights). Resize images before sending (done on the phone). Limit imports per user per month.

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
- **Sign-in and sign-up code emails** are sent by the Supabase Send Email auth hook, the Edge Function `supabase/functions/send-email` (Resend, `EMAIL_FROM`, reply-to `hello@crewjio.com`). `signup` uses `templates/crewjio-signup-code-supabase.html`, every other type `crewjio-login-code-supabase.html`; both contain `{{ .Token }}`, replaced by the real code and nothing else changed. Edit the `.html`, then run `npm run build:email-templates` to refresh the `.ts` string constants the function bundles. Subject `<code> is your CrewJio code`; plain-text part `Your CrewJio code: <code>. Never share this code.` Secrets live only in Edge Function secrets (`SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`). Tests: `supabase/tests/send-email.test.mjs`.
- **Every email uses `web/emails/components/CrewJioLayout.tsx`** (logo header, amber and teal card, footer with the reason, unsubscribe and "Not affiliated with any airline"), built from its `H1`, `P`, `CTA`, `Divider`, `SignOff` blocks. Start new email types from `web/emails/Announcement.tsx`. Preview them with `npm run email:dev` in `web/`. Email images are served from `crewjio.com/email/` (`web/public/email/`); never delete files there, since emails already sent still point at them.
- Emails are rendered to HTML and plain text with `@react-email/render`. The From address comes from the `EMAIL_FROM` env var (default `CrewJio <hello@mail.crewjio.com>`); reply-to stays `hello@crewjio.com`.
- Unsubscribe: links carry an HMAC token of the email (`UNSUBSCRIBE_SECRET`, `web/src/lib/unsubscribe-token.ts`). `/unsubscribe` asks for one tap, and `POST /api/unsubscribe` sets `unsubscribed_at`; a GET never unsubscribes, so link scanners can't. Every marketing email sends `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.

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
