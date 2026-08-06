# 01 - Dev build boots with Google + Supabase config in place

Type: **HITL** - the Google Cloud clients and the Supabase provider are the
developer's to create; an agent cannot do it.

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

The groundwork that every later slice needs, and nothing else. No auth code, no
screen, no session.

Pulso leaves Expo Go. The native Google Sign-In module is a config plugin, so the
app has to run as a **development build** from here on (`npx expo run:ios`, free
on the simulator). `/ios` and `/android` are gitignored - the project is on
continuous native generation - so **all native configuration goes through
`app.json`**. Never hand-edit `Info.plist`; it is regenerated and the edit
vanishes.

Two dependencies join: the AsyncStorage adapter that the session will persist
through, and the native Google Sign-In module. `@supabase/supabase-js` is already
installed and still unused.

Configuration lands in a **gitignored `.env`** with a committed `.env.example`
naming `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**The key is a publishable key (`sb_publishable_...`), not the legacy `anon`
JWT.** The dashboard offers both schemes; a new app takes the new one. No code
changes with it: `supabase-js` treats the key as an opaque string, and the
`Authorization: Bearer` restriction on publishable keys exempts the case where
the header equals `apikey` - exactly what the client sends while signed out.

**`.gitignore` needs a line added before the file is created.** It currently
ignores `.env*.local` but *not* `.env`, so a plain `.env` would be committed
today. This is the first thing to do in this slice, not the last.

Worth keeping straight: the publishable key is **not a secret** - it ships inside
the `.ipa` no matter what. It differs from a Finnhub key, which is a bearer
credential. The publishable key is a public identifier whose safety rests
entirely on RLS. The **secret key** (`sb_secret_...`) sitting beside it in the
dashboard is the opposite: it bypasses RLS and never reaches the app.

**Developer-owned prerequisites** (do these first, the rest depends on them):

1. Create the **iOS** and **Web** OAuth clients in Google Cloud. The Web client
   is the audience Supabase validates; the iOS one is what the native sheet uses.
2. Enable the **Google provider** in the Supabase dashboard and load the
   authorized client IDs.
3. Optionally authorize the Supabase MCP so RLS can be verified from here - it is
   still **unconfirmed** that RLS is actually enabled on every table in `public`.
   The migration was applied and the policies were specified, but nobody has
   checked.

## Acceptance criteria

- [ ] `.gitignore` ignores `.env`, and `git check-ignore .env` confirms it
- [ ] `.env.example` is committed and names both `EXPO_PUBLIC_` variables with placeholder values
- [ ] A local `.env` holds the real Supabase URL and publishable key, and `git status` does not list it
- [ ] `@react-native-async-storage/async-storage` and `@react-native-google-signin/google-signin` are in `package.json`
- [ ] `app.json` carries the Google Sign-In config plugin entry, including the reversed iOS client ID as a URL scheme
- [ ] No file under `/ios` is edited by hand
- [ ] `npx expo run:ios` builds and boots the app on the simulator, and every existing tab still works exactly as before
- [ ] The iOS and Web OAuth clients exist in Google Cloud
- [ ] The Google provider is enabled in Supabase with the authorized client IDs loaded
- [ ] `npm test`, `tsc` and `eslint` are still green

## Blocked by

None - can start immediately.
