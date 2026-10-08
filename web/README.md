# CrewJio web

crewjio.com: landing page and waitlist. Next.js (App Router) on Vercel.

## Run locally

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` while testing, so links in emails point to your machine.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (what Vercel runs) |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run email:dev` | Preview the confirmation email at http://localhost:3001 |
| `npm run import:tally -- export.csv` | Dry run of a Tally CSV import |
| `npm run import:tally -- export.csv --write` | Import new rows, no emails |
| `npm run import:tally -- export.csv --write --send-emails` | Import and email the new rows only |

## How sign-up works

`src/components/WaitlistForm.tsx` → `POST /api/waitlist` (`src/app/api/waitlist/route.ts`):

1. Rate limit per IP (in memory, 10 per 10 minutes), honeypot check, validation with the same zod schema the form uses (`src/lib/waitlist.ts`).
2. Insert into Supabase `waitlist` with the service role key. A duplicate email returns `already_joined` and sends nothing.
3. Send the confirmation email (`src/emails/WaitlistConfirmation.tsx`) through Resend, with one-click unsubscribe headers.

Unsubscribe links are signed with `UNSUBSCRIBE_SECRET` and handled by `POST /api/unsubscribe`. A plain GET never unsubscribes, so email link scanners can't remove anyone by accident.

The database table lives in `../supabase/migrations/`.
