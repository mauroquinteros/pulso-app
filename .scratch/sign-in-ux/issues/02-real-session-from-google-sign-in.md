# 02 - A real Google sign-in produces a real session

Type: **AFK**

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

The spine, end to end: an unauthenticated human cannot reach the app, tapping one
button signs them in with Google, and the session survives a restart.

**The screen is deliberately plain in this slice.** A working `Pressable` with a
label, on the real route, using existing tokens. No mark, no layout spec, no
error states, no animation - issue 03 makes it real. Resist building it twice.

Six pieces, all needed for the path to close:

**The Supabase client** lives in exactly one place. `createClient` with an
AsyncStorage adapter, `persistSession: true`, `autoRefreshToken: true`,
`detectSessionInUrl: false` (that flag is for web redirects). Plus the AppState
listener calling `startAutoRefresh()` on `active` and `stopAutoRefresh()` on
background, because timers do not run reliably in the background. Both halves
ship together - the listener is hardening, not a feature, and the client is
incomplete without it.

**A thin adapter over the native Google module** is the only file that imports
it. It configures the module once, calls `hasPlayServices()` (a no-op on iOS,
called unconditionally by convention) then `signIn()`, and hands back an id
token. `GoogleSignin.configure()` takes `webClientId` *and* `iosClientId` in one
call; the inapplicable one is ignored. That id token goes to
`supabase.auth.signInWithIdToken({ provider: "google", token })`.

Keeping the native module behind this seam is what lets issue 03's state machine
stay pure.

**The session store** is a zustand store holding `session: Session | null |
undefined` and **nothing else** - no `profile` field, no `isLoggedIn` flag. It is
written **only** by the `onAuthStateChange` listener; app code never sets it. The
client already owns the session and `getSession()` always tells the truth, so
anything in a store is a second copy of a fact that is not ours: it must be a
mirror or it becomes a competing authority. Same principle that removed
`Movement.userId` from the domain.

The three values are load-bearing. `undefined` means *not yet known* - the client
reads AsyncStorage asynchronously on cold start. Collapsing it into `null` would
flash the login screen on every launch for a signed-in user.

**The splash hold** extends from `if (!loaded)` to `if (!loaded ||
sessionPending)`, reusing the mechanism already there for the Manrope fonts. This
is what makes the first paint already know the answer, and it neutralises the
documented `Stack.Protected` limitation where a protected screen can flash before
the guard redirects.

**The route guard** is declarative: two protected groups driven by one boolean.
When a guard falls, Expo Router removes those screens from the tree, redirects to
the anchor, and clears the history itself - so **no navigation code is written in
either direction**. The guard is **UX, not security**; Expo documents it as
client-side only. RLS controls data access, always.

`unstable_settings = { anchor: "(tabs)" }` already exists and is correct while
signed in. Signed out, `(tabs)` leaves the tree. **Do not pre-delete that line** -
test it and adjust only if it misbehaves.

**The route** is a group with no `_layout.tsx` of its own, so it inherits the root
Stack and there is no second layout to reason about. The screen is named
`"(auth)/sign-in"`.

## The nonce, and why Skip Nonce Check is on

Google's iOS SDK puts a `nonce` claim in the id_token. Supabase sees a nonce in
the token, receives none from the app, and rejects the exchange with
`400 Passed nonce and nonce in id_token should either both exist or not` - it
cannot verify a match it was only told half of.

**No code fixes this.** The MIT build of `@react-native-google-signin/google-signin`
exposes no way to supply or read that nonce: `SignInParams` has no `nonce` field,
and the README lists custom nonce support as a paid feature. The adapter is not
at fault and neither is the client ID.

So **`Skip Nonce Check` is enabled** on the Google provider in the Supabase
dashboard. This is Supabase's own documented guidance for native iOS - *"Only
disable this if your client libraries cannot properly handle nonce
verification"* - and that precondition is met literally rather than
conveniently.

**What it costs, stated plainly:** the nonce binds an id_token to the one sign-in
request that asked for it. Without that binding, anyone holding a valid id_token
minted for this client ID could present it within its lifetime (~1 hour) and be
accepted. The token still travels from Google's SDK to Supabase over TLS and
never passes through a browser redirect, so the exposure is narrow - but it is
not zero, and it is a deliberate trade, not an oversight.

**The way back:** buying the library's premium tier restores custom nonce
support, at which point this toggle should be turned off again. Worth revisiting
if Pulso ever holds more than one person's money.

## Acceptance criteria

- [x] Launching the app signed out lands on the sign-in screen, with no tab bar, no header and no back affordance
- [x] The tabs are genuinely unreachable while signed out
- [x] Tapping the button opens the **native** Google account sheet (not a browser, not a web redirect)
- [x] Picking an account signs in and the tabs appear, with no manual navigation code involved
- [x] Killing and relaunching the app returns straight to the tabs - no second sign-in
- [x] A signed-in cold start never shows a flash of the sign-in screen; the splash holds until the session is known
- [x] The Supabase client is constructed in exactly one place
- [x] The session store holds only the session, is three-valued, and its only writer is the `onAuthStateChange` listener
- [x] The native Google module is imported by exactly one file
- [x] The `(auth)` group has no `_layout.tsx`
- [x] The consent sheet shows the app's name, not a `supabase.co` project ref
- [x] `npm test`, `tsc` and `eslint` are green; the existing ~175 tests still pass

## Done

**The nonce is the story of this slice.** Everything else went in as written; the
exchange then failed with `400 Passed nonce and nonce in id_token should either
both exist or not`, and the fix was a dashboard setting rather than code. See the
section above for what that cost.

**How the failure presented, which is worth remembering:** "I sign in and stay on
the same page." Indistinguishable from a broken guard, a null id token, or a
rejected exchange - three unrelated bugs with three unrelated fixes. The screen
swallowed the error because this slice deliberately has no error handling, so a
temporary `console.error` on the `signInWithIdToken` result had to be added
before anything could be diagnosed. **That log is still in
`app/(auth)/sign-in.tsx`** and should be replaced by issue 03's error slot, not
simply deleted - deleting it restores the silence.

**A blank frame during cold start is not the forbidden flash.** What this issue
rules out is seeing the sign-in *screen* before being moved to the tabs, which
would mean the guard ran before the session was known. A blank window while the
dev build pulls its bundle from Metro is a development artifact; a release build
embeds the bundle.

**Not verified here, and inherited by issue 05:** signing out. The handler in
`app/(tabs)/settings.tsx` is still the empty function left as a seam, so nothing
in this slice exercised the guard in the signed-out direction beyond the first
launch.

## Blocked by

- `01-dev-build-and-google-config.md`
