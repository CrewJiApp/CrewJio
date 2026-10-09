# CrewJio app (Expo)

Expo SDK 57, TypeScript, expo-router. Screens live in `src/app/`.

## Run it on your phone (Expo Go)
1. Install **Expo Go** from the App Store or Play Store.
2. In the repo root (not in `app/`): `npm install`
3. Start the app: `npm run app -- --tunnel` (sign in to Expo once with `npx expo login`, and in Expo Go with the same account)
4. Scan the QR code: iPhone camera, or the scanner inside Expo Go on Android. Phone and Mac must be on the same Wi-Fi. If it won't connect, stop it and run `npm run app -- --tunnel`.

## Keys and sign-in
Without keys the app runs in preview mode (everything stays on the phone). To make it real, follow
`docs/setup-sign-in.md`: copy `.env.example` to `.env.local` with the Supabase URL and anon key,
push the database tables, then switch on email codes, Google, Apple and SMS as you go.
Everything in the app is public: never put a secret key here.

## Checks
From the repo root: `npm test` (shared logic + database rules) and `npm run typecheck`. In `app/`: `npx expo lint`.
