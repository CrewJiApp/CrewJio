# CrewJio app (Expo)

Expo SDK 57, TypeScript, expo-router. Screens live in `src/app/`.

## Run it on your phone (Expo Go)
1. Install **Expo Go** from the App Store or Play Store.
2. In the repo root (not in `app/`): `npm install`
3. Start the app: `npm run app`
4. Scan the QR code: iPhone camera, or the scanner inside Expo Go on Android. Phone and Mac must be on the same Wi-Fi. If it won't connect, stop it and run `npm run app -- --tunnel`.

## Keys
Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key. Everything in the app is public: never put a secret key here.

## Checks
From the repo root: `npm test` (shared logic + database rules) and `npm run typecheck`. In `app/`: `npx expo lint`.
