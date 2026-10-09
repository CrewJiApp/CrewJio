# Setting up sign-in and the database

The app works without any of this: with no keys it runs in **preview mode**, where every sign-in
button works and your roster is saved on your phone only. Do these steps to make it real.
Start with steps 1 to 4 (about 20 minutes). Google, Apple and SMS can come later, in any order.

## 1. Put your keys in the app
1. Supabase dashboard → your CrewJio project → **Project Settings → API** (may be called **Data API**).
2. Copy the **Project URL** and the **anon / publishable** key. Never the service role key.
3. In your `crewjio-starter` folder, copy `app/.env.example` to `app/.env.local` and paste them in.
4. Stop the app (Ctrl+C) and start it again with `npm run app -- --tunnel`. The "Preview mode" line on the Welcome screen disappears.

## 2. Create the new tables
These add profiles, duties, leave, groups and partners. They do not touch the waitlist.
```
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase migration list
```
`YOUR-PROJECT-REF` is the code in your Project URL (`https://YOUR-PROJECT-REF.supabase.co`).

In the `migration list` output, look at `20261009000000` (the waitlist):
- If the **Remote** column shows it, run `npx supabase db push`.
- If **Remote** is empty for it (because you created the waitlist table by hand in the SQL editor), first run
  `npx supabase migration repair --status applied 20261009000000`, then `npx supabase db push`.

`db push` should say it is applying `20261010000000_core_schema.sql`. If it says anything about
the waitlist table already existing, stop and paste the message to Claude.

## 3. Allow the app's sign-in links
Supabase → **Authentication → URL Configuration → Redirect URLs**, add both:
```
exp://**
crewjio://**
```
The first is for testing in Expo Go, the second for the real app later.

## 4. Email codes (the quickest way to test real sign-in)
On the phone sign-in screen, tap **Use email instead**. Supabase sends a link by default; make it send a code:
1. Supabase → **Authentication → Emails → Templates**. Change **both** of these templates:
   - **Confirm signup**: the first email a new address gets.
   - **Magic link**: every sign-in after that.
2. In each, replace the body with something like this, then press **Save**:
   ```
   <h2>Your CrewJio code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   ```
3. Supabase → **Authentication → Sign In / Providers → Email**: set **Email OTP Length** to 6 (codes of 6 to 10 digits work, but 6 is easiest to type).
4. Supabase's built-in email only sends a few emails per hour, and only to your own team's addresses.
   Before inviting testers, set **Authentication → Emails → SMTP settings** to use Resend: host
   `smtp.resend.com`, port `465`, username `resend`, password = a Resend API key, sender
   `hello@mail.crewjio.com`.

## 5. Google
1. Google Cloud Console → create a project (or reuse one) → **APIs & Services → OAuth consent screen**:
   app name CrewJio, your support email, publish when ready.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorised redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy the Client ID and Client secret into Supabase → **Authentication → Sign In / Providers → Google**, and enable it.

## 6. Apple (needs the Apple Developer Program, US$99 a year)
1. Supabase → **Authentication → Sign In / Providers → Apple** → enable.
2. In **Client IDs**, add both: `host.exp.Exponent` (so it works inside Expo Go) and `com.crewjio.app` (the real app).
3. The app uses Apple's native sign-in, so the secret key fields are only needed if you later add Apple sign-in on the website.
4. When you make the real iPhone build, turn on **Sign in with Apple** for the App ID `com.crewjio.app` in your Apple Developer account. (The app's settings already ask for it.)

## 7. Phone numbers (SMS)
1. Create a Twilio account and a **Messaging Service**.
2. Supabase → **Authentication → Sign In / Providers → Phone** → enable, choose Twilio, paste the Account SID, Auth Token and Messaging Service SID.
3. Each SMS costs money, so set a spending limit in Twilio.
4. Singapore marks SMS from unregistered senders as "Likely-SCAM". Before launch, register a sender ID through Singapore's SMS Sender ID Registry (SSIR).

## Checking it worked
- Sign in, finish onboarding, add a duty.
- In Supabase → **Table Editor**, `profiles` has your row and `duties` has the duty.
- Sign out and back in on the same account: your roster is still there.
