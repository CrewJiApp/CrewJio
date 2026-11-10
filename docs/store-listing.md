# Store listing: text, answers and review notes

Copy and paste from here into App Store Connect and Google Play Console. Every limit below is the store's own.
The screenshots and graphics are in the zip I sent you (`store/`).

**A note on airline names.** Apple and Google can reject listings that look like they speak for an airline.
Keep SIA, Scoot, Singapore Airlines and airline logos out of the app name, subtitle, description, keywords and
screenshots' captions. The description below says what CrewJio is for without naming an airline, and says it is
not affiliated with any. (The app screens show ordinary flight numbers such as SQ 33, which is how a roster looks.)

---

## Basics

| Field | Value |
|---|---|
| App name (both stores) | CrewJio |
| Bundle ID (iOS) / package (Android) | `com.crewjio.app` |
| Subtitle (iOS, max 30) | Find the days you're all home |
| Primary category | Productivity (iOS) · Productivity (Google Play) |
| Secondary category (iOS) | Lifestyle |
| Support URL | https://crewjio.com/support |
| Marketing URL | https://crewjio.com |
| Privacy policy URL | https://crewjio.com/privacy |
| Terms URL (Play and Apple EULA field, optional) | https://crewjio.com/terms |
| Account deletion URL (Play requires it) | https://crewjio.com/delete-account |
| Contact email | hello@crewjio.com |
| Price | Free |
| Copyright (iOS) | 2026 Your Name or Company (put your legal name) |

## Short description (Google Play, max 80)
Share your roster with friends and partner. Find the days you're all home.

## Promotional text (iOS, max 170, can change any time without a review)
Screenshot your roster and CrewJio fills in your month. Make private groups, then see the best days everyone is free and rested.

## Full description (iOS max 4000, Google Play max 4000)
```
CrewJio helps cabin crew, pilots and the people who plan around them find the days everyone is actually home.

No more group-chat date juggling. Add your roster, invite your people, and CrewJio shows the best days to meet, ranked by rest, so nobody gets invited to dinner straight after a long-haul flight.

YOUR ROSTER, YOUR WAY
• Screenshot your roster app and CrewJio reads the month for you. You check it before anything is saved.
• Or type a roster code and CrewJio tells you what it means and what your friends will see.
• Turnarounds, trips, layovers, standby (even while you are away), training, leave and days off.

PRIVATE BY DESIGN
• Groups are private. Each group only sees its own members, and nobody can search for you.
• You choose what each group sees: off days only, where you are flying, or your full roster.
• Show any one person less without them being told.
• Leave and busy days only ever show as "Away". Private codes only ever show as "Unavailable".
• Screenshots are read once and never stored. Staff numbers and aircraft details are removed.

FIND THE BEST DAY
• See which days everyone is off, who is free from the evening, and who has just landed.
• Crew Match lets you pick friends from any group and see the next two weeks at a glance.

PARTNERS AND FAMILY
• Connect with your partner to see their roster next to yours and the days you are both home.
• Copy your phone calendar (only the times, never event names) so we skip your busy times. Not crew? Add your own work or busy time too, and see when you are both free.

CrewJio is independent and is not affiliated with any airline. It never changes your roster and never swaps duties for you.
```

## Keywords (iOS, max 100 characters, comma separated, no spaces after commas)
```
roster,crew,cabin crew,pilot,flight attendant,schedule,calendar,days off,layover,standby,partner
```

## What's new (version 1.0.0)
```
First release. Welcome to CrewJio.
```

## Age rating
- **Apple:** answer "None" to every sensitive-content question. Result should be **4+**. Tell it: no user-generated content that is public (groups are private invite-only), no ads, no in-app purchases, no web browsing beyond opening our own pages.
- **Google Play (IARC questionnaire):** category "Utility, productivity, communication or other". No violence, sexual content, language, gambling or controlled substances. "Do users interact or exchange content? Yes, in private invite-only groups" (this adds a "Users interact" note, which is fine). Expect **Everyone**.

## Privacy: Apple "App Privacy" answers
Data collected, all **linked to the user**, **not used for tracking**, purpose **App Functionality**:
- Contact Info: **Email Address**, **Phone Number**
- Contact Info: **Name** (the display name they choose)
- Identifiers: **User ID**
- User Content: **Other User Content** (roster, leave and busy times)

Not collected: location, health and fitness, financial info, contacts, browsing history, search history,
purchases, sensitive info, diagnostics, advertising data. "Do you or your partners use data for tracking?" **No.**
(Roster screenshots are read in real time and never stored, so they are not "collected" under Apple's definition.)
The same list is built into the app's privacy manifest (`app.json`).

## Privacy: Google Play "Data safety" answers
- Does the app collect or share data? **Collects, does not share** (providers that process data for us, such as Supabase and Resend, are not "sharing").
- Collected data types:
  - Personal info: **Name**, **Email address**, **Phone number**, **User IDs**
  - Calendar: **Calendar events** (only when someone taps "Copy your phone calendar": busy times, no titles)
  - App activity: **Other user-generated content** (roster)
- Photos: processed ephemerally (roster screenshots are read and discarded), so they are **not** collected.
- All data is **encrypted in transit**: Yes.
- Can users request deletion? **Yes.** In the app (Me, Delete my account) and at https://crewjio.com/delete-account
- Purposes for all of it: **App functionality** (and **Account management** for the sign-in details).

## Export compliance (iOS)
The app only uses standard HTTPS. It is already set to "no non-exempt encryption" in `app.json`, so you answer **No** to the encryption question and are not asked for documents.

## Notes for App Review and Google Play review
Paste into the "Notes" field (Apple) and the "App access" section (Play). Replace the phone number and code with the test number you create (see the launch checklist, step 1.4).

```
CrewJio lets cabin crew, pilots and their partners share rosters in private invite-only groups.

SIGN IN
• Apple reviewers: tap "Sign in with Apple".
• Or tap "Use email", then "App reviewer sign-in (test number)", and enter +65 9123 4567. The verification code is 123456.
After signing in, choose "Cabin crew", pick a rank and any fleet, and you are in.

WHAT TO TRY
• Roster tab: tap + then "Code", type STBY, and pick it. Or use Flight, Training, Standby and Off / Leave.
• Crew tab: New group creates a private group with an invite code. Groups only show members' rosters at the level each member chooses.
• Partner tab: connects two people with a one-time code.
• Me tab: Privacy policy, Terms, Help, Sign out and Delete my account (this permanently deletes the account and its data).

NOTES
• "Import whole month" reads screenshots of an airline's crew roster app, which reviewers will not have. Everything else works without it, and manual entry is on the + button. Screenshots are processed by an AI service to read the rows and are not stored.
• Phone calendar access is only used when a user taps "Copy your phone calendar" (crew and non-crew alike). It copies busy times only (no event names).
• CrewJio is independent and not affiliated with any airline.
```
