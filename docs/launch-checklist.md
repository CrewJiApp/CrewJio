# Launching CrewJio on the App Store and Google Play

The app itself is store-ready (see "What is already done" at the bottom). What is left is mostly accounts,
settings and uploading, and most of it is clicking in other companies' websites. Do it in this order. I can walk you
through any step, one at a time, like we have been doing.

**Two things to do today, because people are already making copies:**
1. **Reserve the name.** Create the app in App Store Connect and Google Play Console as soon as your developer
   accounts are approved (step 0). Creating the app record reserves "CrewJio" for you.
2. **Don't wait for perfect.** A first version with sign-in, roster, groups, Crew Match, partner and import is a real
   product. Swap suggestions, live flight status, push notifications and family links come in updates.

**How long it takes (rough):** Apple developer approval 1 to 3 days. Apple app review 1 to 3 days. Google Play
review 1 to 7 days. **Check this one early:** if your Google Play account is a *personal* account created after
November 2023, Google currently requires a **closed test with at least 12 testers for 14 days** before you can
release publicly. That is the slowest part. Start it as soon as you can. (An organization account does not have this rule.)

---

## 0. Accounts (you, a card and about an hour)
1. **Apple Developer Program**: https://developer.apple.com/programs/enroll . US$99 a year. Needs an Apple ID with two-factor on. Approval can take a couple of days. Choose *Individual* (fast) or *Organization* (needs a D-U-N-S number, slower, shows your company name on the store).
2. **Google Play Console**: https://play.google.com/console/signup . US$25 once. You verify your identity and phone.
3. **Expo (EAS)**: https://expo.dev/signup . Free. This is the service that builds the app for you.
4. Decide the **seller name** that will show on the stores (your name or company) and put it in the copyright line in `docs/store-listing.md`.

## 1. Switch on the backend for real users
Most of this is already done for sign-in emails and the database. Check each:
1. **Database is up to date**: in `crewjio-starter` run `git pull origin main`, then `npx supabase db push --dry-run`. It should list `20261013000000_roster_imports.sql` and `20261014000000_account_deletion.sql` (and anything else new). Then `npx supabase db push`.
2. **Deploy both new functions**: `npx supabase functions deploy roster-import` and `npx supabase functions deploy delete-account`. (Don't add `--no-verify-jwt` to either.)
3. **Roster import key**: follow `docs/setup-roster-import.md` to add your Anthropic key. Set a **spend limit** at console.anthropic.com.
4. **A test login for the reviewers**: Supabase → Authentication → Sign In / Providers → **Phone** → "Test Phone Numbers and OTPs": add `6591234567=123456`. Reviewers sign in with +65 9123 4567 and code 123456 without any SMS being sent.
5. **Sign-in methods** (see `docs/setup-sign-in.md`):
   - **Apple**: Supabase → Authentication → Providers → Apple: add the bundle ID `com.crewjio.app` to **Authorized Client IDs**.
   - **Google**: add `crewjio://auth-callback` to Authentication → URL Configuration → **Redirect URLs**.
   - **Phone codes** (not at launch: the app leads with email unless `EXPO_PUBLIC_SMS_SIGN_IN=1` is set; the test number above still works for reviewers): needs an SMS provider (for example Twilio) set under Providers → Phone. Real texts cost a little each; set a spending limit there too.
6. **Plan**: the free Supabase plan pauses a project after a week with no activity and has no backups. For real users, upgrade the project to **Pro** (about US$25 a month) in Supabase → Settings → Billing.
7. **Merge the website pages** (pull request: "Add privacy, terms, support and delete-account pages") and check these load on crewjio.com: /privacy, /terms, /support, /delete-account. The stores check them.
8. **Have a lawyer read** the privacy policy and terms before you publish (a Singapore lawyer who knows the PDPA). They are plain-language drafts, not legal advice.

## 2. Build the app (EAS)
In `crewjio-starter`, in the `app` folder:
1. `npx eas-cli login`, then `npx eas-cli init` (it creates your project id and adds it to `app.json`. Commit that: `git add -A && git commit -m "Add EAS project id" && git push origin main`).
2. **Give the build your public Supabase settings** (these are not secrets, they are the same two lines as in `app/.env.local`):
   ```
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://hbkgdboajxosbzvsorfr.supabase.co" --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR-ANON-KEY" --visibility plaintext
   ```
   Do the same with `--environment preview`. **This matters:** a store build without these two lines will not run: it shows "not set up correctly" and lets nobody in (on purpose, so it never shows fake demo data).
3. **A test build first**: `npx eas-cli build --profile preview --platform all`. It asks you to log in to your Apple and Google accounts and creates the signing keys for you. Android gives you an installable file; for iPhone, follow the prompt to register your phone (or skip iPhone for now and use TestFlight in step 3).
4. **Test it on real phones** with the checklist in step 5 below.
5. **The store build**: `npx eas-cli build --profile production --platform all`. Version numbers go up by themselves.

## 3. Set up the two store pages
**Apple (App Store Connect, https://appstoreconnect.apple.com)**
1. My Apps → **+** → New App. Platform iOS, name **CrewJio**, bundle ID `com.crewjio.app`, any SKU (for example `crewjio`). This reserves the name.
2. Fill in everything from `docs/store-listing.md`: subtitle, description, keywords, URLs, category, age rating, **App Privacy** answers, review notes.
3. Upload the **iPhone 6.9" screenshots** (`store/ios-6.9/`, 1290 × 2796). Apple scales them for smaller phones.
4. Upload the build: `npx eas-cli submit --platform ios --latest` (it also asks for your App Store Connect details). Then in **TestFlight** add yourself and a few friends and test.
5. When happy: choose the build on the version page, **Add for Review** and **Submit**.

**Google Play (Play Console, https://play.google.com/console)**
1. **Create app**: name CrewJio, free, app (not game). This reserves the name.
2. Fill the **Dashboard tasks**: privacy policy URL, App access (use the reviewer notes), Ads (none), Content rating, Target audience (18+), **Data safety** (answers in `docs/store-listing.md`), and **Delete account** URL (https://crewjio.com/delete-account).
3. **Store listing**: short and full description, the **512 × 512 icon**, the **1024 × 500 feature graphic** and the phone screenshots (`store/play/` and `store/android-phone/`).
4. The **first upload has to be done by hand**: download the `.aab` from your EAS build page and upload it under Testing → Closed testing (or Internal testing to start). After that, `npx eas-cli submit --platform android` can do it (it needs a Google service account key, which I can walk you through).
5. Run the **closed test** (12 testers for 14 days if your account needs it), then apply for production access and release.

## 4. Things to decide before you publish
- **Who can sign up?** Right now anyone can. For a quiet start, send your waitlist a **TestFlight** link (iPhone) and a Play **closed or open test** link (Android) before releasing publicly, so the first users are people you know.
- **Keep an eye on costs:** Supabase (plan), Anthropic (roster reading, a few cents each, 8 per person per month), SMS texts, Resend emails. All have spend limits you can set.
- **Support**: hello@crewjio.com is the contact in the app and on the stores. Check it every day in the first week.
- **Fake copies**: once you are live, report copycats with Apple's and Google's "Report a concern" and "Report an issue" forms. Your name, icon and "not affiliated with any airline" line are on your side.

## 5. Test on real phones before you submit (30 minutes)
- [ ] Sign in with each method: Apple (iPhone), Google, phone code, and email code
- [ ] Onboarding as cabin crew, as a pilot, and as "I'm not crew"
- [ ] Add duties: a flight with a return, a typed code (STBY), standby on a layover, leave
- [ ] **Import a real roster screenshot**, check the review screen, save
- [ ] Make a group, join it from a second phone with the invite code, add duties on both, open Group Plan and Crew Match
- [ ] Connect a partner with a code
- [ ] As a non-crew account: copy the phone calendar and check only busy times arrive
- [ ] Me tab: Privacy, Terms and Help open; **Delete my account** works and signs you out; try signing up again with the same email
- [ ] Turn the phone to airplane mode: the app shows a sensible message, not a crash
- [ ] Text is readable at larger phone font sizes

## What is already done in the app
- Real app name, icon, splash and version `1.0.0`; build numbers go up by themselves
- Only the permissions the app really uses: internet, calendar read (for non-crew users) and photo picking. No camera, microphone, contacts, location, reminders or storage access
- Apple privacy manifest and the "no special encryption" setting
- **Delete my account** inside the app (both stores require it) and the website page for it
- Privacy policy, Terms and Help pages, linked from the app
- No "Coming soon" screens: unbuilt features are not mentioned
- A store build can never quietly run with fake demo data
- Store screenshots, Play graphics, listing text and the review notes

## Not in version 1 (come in updates)
Swap suggestions · flight-change editing (delays, AOG) · live flight status and landing alerts · push notifications ·
polls and "Lock in" · the family share link.
