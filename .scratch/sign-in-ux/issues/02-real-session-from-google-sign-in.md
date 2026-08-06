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

## Acceptance criteria

- [ ] Launching the app signed out lands on the sign-in screen, with no tab bar, no header and no back affordance
- [ ] The tabs are genuinely unreachable while signed out
- [ ] Tapping the button opens the **native** Google account sheet (not a browser, not a web redirect)
- [ ] Picking an account signs in and the tabs appear, with no manual navigation code involved
- [ ] Killing and relaunching the app returns straight to the tabs - no second sign-in
- [ ] A signed-in cold start never shows a flash of the sign-in screen; the splash holds until the session is known
- [ ] The Supabase client is constructed in exactly one place
- [ ] The session store holds only the session, is three-valued, and its only writer is the `onAuthStateChange` listener
- [ ] The native Google module is imported by exactly one file
- [ ] The `(auth)` group has no `_layout.tsx`
- [ ] The consent sheet shows the app's name, not a `supabase.co` project ref
- [ ] `npm test`, `tsc` and `eslint` are green; the existing ~175 tests still pass

## Blocked by

- `01-dev-build-and-google-config.md`
