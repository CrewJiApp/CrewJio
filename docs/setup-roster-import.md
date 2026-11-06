# Setting up screenshot roster import

Roster import sends roster screenshots to Claude, so it needs an Anthropic API key. The key lives only in
Supabase (Edge Function secrets), never in the app or the website. This is a one-time setup.

What happens when someone imports: the app shrinks 1 to 4 screenshots, sends them to the `roster-import`
function, Claude reads the rows, the function cleans them (no staff numbers, names or aircraft details), and
the app shows them for the person to check. Screenshots are never stored. Each person can import 8 times a
month (you can change that).

## 1. Get an Anthropic API key
1. Go to **console.anthropic.com**, sign in, and add a few dollars of credit under **Billing**.
2. **API keys → Create key**. Name it `CrewJio`. Copy it now (it starts with `sk-ant-`); you only see it once.
3. Set a **spend limit** under Billing → Limits, so a surprise can never cost more than you chose.

## 2. Update the database (once)
In `crewjio-starter`:
```
git pull origin main
npx supabase db push --dry-run
```
It should list only `20261013000000_roster_imports.sql`. If so, run `npx supabase db push`.

## 3. Save the key
1. Run `cp supabase/functions/roster-import/.env.example supabase/functions/roster-import/.env`
2. Run `open -e supabase/functions/roster-import/.env`, replace `sk-ant-replace-me` with your key, save with
   **Cmd+S**, and close the window. This file stays on your Mac (Git ignores it).
3. Run `npx supabase secrets set --env-file supabase/functions/roster-import/.env`
   (it should say `Finished supabase secrets set.`)

## 4. Deploy the function
```
npx supabase functions deploy roster-import
```
Do not add `--no-verify-jwt`: this function must only answer signed-in people.

## 5. Try it
Update the app (`git pull origin main`, `npm install`, `npm run app -- --tunnel`), sign in with a real account
(not preview mode), then **+ → Import whole month**, choose a screenshot of your roster, and tap **Read my
roster**. Check what it found, then **Looks right**.

If it says "not switched on yet", the secrets or deploy step is missing. If something else goes wrong, open
Supabase → **Edge Functions → roster-import → Logs** and send me a screenshot. The logs never contain your
screenshots or roster.

## Costs, and what stops a surprise bill
Each import is one Claude request with up to 4 images (or one PDF). It is usually a few cents. These limits
stack, so no single account or crowd of accounts can run up a large bill:
1. **Only JPEG and PDF files are read.** The phone turns every screenshot into a JPEG first. The server
   refuses anything else (PNG, WebP, GIF, SVG, Word, zip...), a PDF over 2.5 MB or 6 pages, a PDF mixed with
   screenshots, more than 4 screenshots, and any request over 20 MB, all before Claude is called.
2. **Signed-in people only** (`verify_jwt`), one import at a time each.
3. **8 imports per person per month**, and **6 tries per person per day** (failed reads count towards the day).
4. **120 tries per day across everybody.** Raise it with `ROSTER_IMPORT_DAILY_LIMIT_ALL` when you have more users.
5. **Your Anthropic spend limit** (Billing → Limits) is the hard stop. Set it to an amount you are happy to lose,
   for example US$20 a month, and turn on the email alert at half of it.
