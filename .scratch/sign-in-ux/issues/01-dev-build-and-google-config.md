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

- [x] `.gitignore` ignores `.env`, and `git check-ignore .env` confirms it
- [x] `.env.example` is committed and names both `EXPO_PUBLIC_` variables with placeholder values
- [x] A local `.env` holds the real Supabase URL and publishable key, and `git status` does not list it
- [x] `@react-native-async-storage/async-storage` and `@react-native-google-signin/google-signin` are in `package.json`
- [x] `app.json` carries the Google Sign-In config plugin entry, including the reversed iOS client ID as a URL scheme
- [x] No file under `/ios` is edited by hand
- [x] `npx expo run:ios` builds and boots the app on the simulator, and every existing tab still works exactly as before
- [x] The iOS and Web OAuth clients exist in Google Cloud
- [x] The Google provider is enabled in Supabase with the authorized client IDs loaded
- [x] `npm test`, `tsc` and `eslint` are still green

## Done

Closed in `169a27f`, on top of `6b32e05` which had already set the bundle
identifier and the config plugin.

**Verified, not assumed:** the Google provider was confirmed by querying
`/auth/v1/settings`, which returned `"google": true` - it is no longer resting on
anyone's recollection. The publishable key was confirmed working against that
same endpoint (HTTP 200) with the key in both the `apikey` and
`Authorization: Bearer` headers, which is the exact request shape issue 02's
`signInWithIdToken` will use.

**One deviation from this issue as written:** the environment variable is
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `..._ANON_KEY`. The project's
dashboard offers the newer publishable/secret scheme alongside the legacy
`anon`/`service_role` JWTs, and a new app should take the new one. The issue text
above was amended to match.

**Still unconfirmed, and it outlived this slice:** whether RLS is actually enabled
on the three movement tables. Prerequisite 3 was optional and remains undone. An
unauthenticated read of all three returned `[]` with HTTP 200, which proves
nothing either way - the tables are empty, so that is equally consistent with RLS
working and with RLS being off. It needs
`select tablename, rowsecurity from pg_tables where schemaname = 'public';`
in the SQL editor. This matters more than it did when the issue was written: the
publishable key now ships in the binary, and the dashboard's own wording makes
its safety conditional on RLS being enabled.

**Registered for whoever hits a slow first build:** `pod install` downloads ~191
MB of prebuilt React Native artifacts from Maven Central, which serves this
machine at ~243 KB/s against ~21 MB/s from npm. Google's mirror serves the
byte-identical artifact (SHA-1 verified) at ~18 MB/s.
`ENTERPRISE_REPOSITORY=https://maven-central.storage-download.googleapis.com/maven2`
redirects it; it is set in the developer's shell profile, not in this repo, since
it is a property of network location rather than of the project.

## Blocked by

None - can start immediately.
