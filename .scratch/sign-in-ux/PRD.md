# PRD - Sign-in with Google (`app/(auth)/sign-in.tsx`)

> Sources: `.scratch/sign-in-ux/DESIGN-BRIEF.md` (settled brief) and
> `.scratch/sign-in-ux/sign-in-prototype/` (pixel-perfect visual truth). Brand
> assets are `assets/brand/`. Bold terms are glossary terms from `CONTEXT.md`.
>
> **Scope:** the first real authentication in the repo. Today there is no
> Supabase client, no session, no route guard - `@supabase/supabase-js` sits in
> `package.json` unused. This PRD delivers a **real JWT** and the plumbing that
> keeps it alive, plus the one screen that produces it.

## Problem Statement

Pulso has four populated tabs, a derivation engine with ~175 green tests, and a
**Perfil** shown in two places - and every bit of it is a lie. The Perfil is
`MOCK_PROFILE` in `lib/mock-data.ts`. The **Movements** are `MOCK_MOVEMENTS`,
seeded into an in-memory store that resets on every restart. There is no way to
be *anyone* in this app.

That blocks everything downstream. The friends this app was built for cannot try
it, because there is nothing to try - no identity means no rows they own, and
RLS (already specified, already migrated) has no `auth.uid()` to enforce against.
The Ajustes screen has a "Cerrar sesion" button that confirms with a native
alert and then does nothing, because there is no session to close and no screen
to land on.

## Solution

One screen with one button.

A human opens Pulso, is not signed in, and lands on **"Entra a Pulso"**: the
Latido mark, a title, one supporting line, and **"Continuar con Google"**. They
tap it, the native Google sheet appears, they pick an account, and they are in.
Their **Perfil** - real name, real email - now comes from the JWT, and both
places that show it stop lying.

Behind it, the session survives: written to disk, refreshed automatically,
restored on cold start without a network call. Signing out inverts the route
guard and drops them back here, with every Perfil-scoped store emptied on the
way out.

The screen cannot tell a first sign-in from a thousandth, and does not try. There
is no "Crear cuenta" anywhere, because under OAuth the first successful sign-in
*is* the registration.

## User Stories

**Signing in**

1. As a friend who was sent Pulso, I want a single button that signs me in with Google, so that I can get into the app without inventing a password.
2. As a friend who was sent Pulso, I want the button to say "Continuar con Google", so that I know exactly which account I am about to use.
3. As a friend who was sent Pulso, I want the native Google account sheet, so that I recognise the flow and do not have to type my email.
4. As a first-time user, I want the app to never ask me whether I am new or returning, so that I do not have to answer a question the app could answer itself.
5. As a first-time user, I want no "Crear cuenta" link anywhere, so that I am not sent looking for a screen that does not exist.
6. As a returning user, I want the same one button I used the first time, so that signing back in is not a different flow to learn.
7. As a user, I want to see what Pulso is in one line above the button, so that I know what I am signing into before I do it.
8. As a user, I want the app's mark on the screen, so that I can tell I opened Pulso and not something else.

**While it is happening**

9. As a user who just tapped the button, I want the button to show it is working, so that I do not think the tap was missed.
10. As a user who just tapped the button, I want the button to stop accepting taps, so that I do not fire two sign-ins at once.
11. As a user who just tapped the button, I want the loading state to occupy exactly the same space as the idle one, so that nothing jumps under my finger.
12. As a user, I want visual feedback within a tenth of a second of pressing, so that the screen feels alive.

**When it does not work**

13. As a user who backed out of the Google sheet, I want the screen to go quietly back to how it was, so that I am not told off for changing my mind.
14. As a user with no connection, I want to be told it is my connection, so that I stop retrying and go find signal.
15. As a user hitting any other failure, I want a plain message that I can try again, so that I am not left staring at a screen that did nothing.
16. As a user reading an error, I want the button right there and enabled, so that retrying is one tap and not a hunt.
17. As a user, I want the error text to appear without moving the button, so that I do not tap the wrong thing as the layout settles.
18. As a user with VoiceOver, I want the error announced when it appears, so that I learn about it without re-reading the screen.

**Staying signed in**

19. As a returning user, I want the app to remember me, so that opening my finances app does not start with a login every time.
20. As a returning user, I want to never be shown a flash of the login screen while the app checks, so that a cold start does not look broken.
21. As a user whose token expired while the app was closed, I want it refreshed silently, so that I never see a session error I did not cause.
22. As a user opening the app on the metro with no signal, I want to stay signed in, so that a dead network does not log me out of my own data.
23. As a user returning to the app after hours in the background, I want the session refreshed when I come back to the foreground, so that my first action does not fail with a 401.

**Being someone**

24. As a signed-in user, I want my real name in Ajustes, so that the app tells me which identity my portfolio belongs to.
25. As a signed-in user, I want my real email under my name, so that I can confirm which account I am in.
26. As a signed-in user, I want the Home avatar disc to show my own initials, so that the disc means *me*.
27. As a user whose Google account has no name on it, I want the app to keep working, so that a missing name is a blank disc and not a crash.
28. As a developer, I want the Perfil derived from the session at display time, so that there is never a second copy of the user's name to keep in sync.

**Signing out**

29. As a user, I want "Cerrar sesion" in Ajustes to actually end my session, so that the button stops being decorative.
30. As a user, I want to land back on the sign-in screen when I sign out, so that the app never leaves me nowhere.
31. As a user who lent someone my phone, I want my movements gone from the screen the moment I sign out, so that the next person cannot see my money.
32. As the friend who borrowed the phone, I want to sign in and see an empty portfolio, so that I am never shown someone else's holdings as mine.
33. As a user, I want signing out to work with no connection, so that I can hand my phone over on a plane.
34. As a user, I want signing out here to not sign me out on my other devices, so that leaving one phone does not log me out everywhere.

**Navigation**

35. As a signed-out user, I want no tab bar and no back arrow, so that the screen offers exactly one thing to do.
36. As a signed-out user, I want the tabs to be genuinely unreachable, so that I cannot land in the app without an identity.
37. As a user, I want the transition between signed-out and signed-in to clear the history, so that swiping back never returns me to a screen I already left.

**Craft**

38. As a user with the largest text size set, I want the title, the supporting line and the button label to grow without clipping, so that I can read the screen.
39. As a user with reduced motion on, I want the entrance animation skipped, so that the screen respects my setting.
40. As a user on a small phone, I want the composition to hold, so that the screen does not look like a different design on a different device.
41. As a user, I want the button in the upper-middle rather than pinned to the bottom, so that it reads as *the thing to do* and not as a form footer.

**Developer-facing**

42. As a developer, I want the Supabase client configured in exactly one place, so that no screen builds its own.
43. As a developer, I want the session to live in one read-only mirror, so that the app never becomes a competing authority on its own identity.
44. As a developer, I want the sign-in state machine to be a pure module, so that I can test cancelled/offline/generic without a phone.
45. As a developer, I want the native Google module behind a thin adapter, so that the state machine never imports it.
46. As a developer, I want every Perfil-scoped store emptied from one named teardown function, so that the next store that needs clearing has an obvious place to go.
47. As a developer, I want the publishable key and project URL read from the environment, so that they are not baked into source.
48. As a developer, I want `.env` genuinely ignored by git, so that the file this PRD introduces is not committed by accident.
49. As a developer, I want the brand mark rendered from the committed SVG, so that the sign-in screen and the app icon cannot drift.

## Implementation Decisions

### Provider and flow

**Supabase Auth, Google only, native flow.** `@react-native-google-signin/google-signin` produces an id token; `supabase.auth.signInWithIdToken({ provider: "google", token })` exchanges it for a session. The web flow (`signInWithOAuth` + browser redirect + deep link) is **rejected**: its failure surface is a runtime redirect chain across three parties, whereas the native flow's is static config that fails loudly on the first line. The native module also requires a **development build** - `npx expo run:ios`, no more Expo Go - which is needed for TestFlight regardless, and which Apple sign-in will need later too.

**iOS only for now.** `GoogleSignin.configure()` takes `webClientId` (the audience Supabase validates) and `iosClientId` in one call; the inapplicable one is ignored. `signIn()`, the id token, and `signInWithIdToken` are identical across platforms. Only two things differ: the config-plugin props in `app.json` (iOS needs the reversed client ID as a URL scheme; Android's requirement is the SHA-1 fingerprint, which lives entirely in Google Cloud), and one error branch, `PLAY_SERVICES_NOT_AVAILABLE`, which cannot occur on iOS. `hasPlayServices()` is called unconditionally - it is a no-op on iOS. Adding Android later is: register the client with its SHA-1, rebuild. No code rewrite.

**Continuous native generation.** `/ios` and `/android` are gitignored, so all native configuration goes through a **config plugin entry in `app.json`**. Never hand-edit `Info.plist`; it is regenerated and the edit disappears.

### Modules

**`lib/supabase.ts`** - the only place a client is constructed. `createClient` with an AsyncStorage adapter, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false` (that flag is for web redirects). Plus the AppState listener calling `startAutoRefresh()` on `active` and `stopAutoRefresh()` on background, because timers do not run reliably in the background. Both halves ship in the same commit - the listener is hardening, not a feature, and the client is incomplete without it.

**`lib/google-sign-in.ts`** - a thin adapter over the native module. Configures it once, calls `hasPlayServices()` then `signIn()`, and returns either an id token or a **typed failure**. This is the seam: it is the only file that imports the native module, which is what keeps the state machine pure.

**`components/sign-in/view-model.ts`** - the deep module. A pure state machine over `idle | signing | failed`, plus the classification of a raw failure into `cancelled | offline | generic` and the Spanish copy each one carries. Same shape as every other screen's `view-model.ts`. It imports nothing native and nothing async.

The states, from the prototype:

```
idle     --tap-->        signing
signing  --token-->      (session arrives; guard swaps the tree)
signing  --cancelled-->  idle          // silent: no message, no toast
signing  --offline-->    failed        // "Sin conexion. Revisa tu internet y vuelve a intentar."
signing  --other-->      failed        // "No pudimos iniciar sesion. Vuelve a intentar."
failed   --tap-->        signing
signing  --tap-->        signing       // ignored; no second sign-in
```

`pending` is deliberately absent: it is never rendered (see below).

**`stores/session.ts`** - a zustand store holding `session: Session | null | undefined` and **nothing else**. No `profile` field, no `isLoggedIn` flag. Written **only** by the `onAuthStateChange` listener; app code never sets it. The Supabase client already owns the session and `getSession()` always tells the truth - anything in a store is a second copy of a fact that is not ours, so it must be a mirror or it becomes a competing authority. This is the same principle that removed `Movement.userId`.

The three values are load-bearing. `undefined` means *not yet known* (the client reads AsyncStorage asynchronously on cold start); collapsing it into `null` would flash the login screen on every launch for a signed-in user.

**`utils/profile.ts`** - gains `perfilFromSession(session)`, deriving `{ name, email }` from `session.user`. Derived at display time, never stored - the same rule `initialsFrom` already follows one level down. The Perfil lives in `user_metadata`; there is **no `profiles` table and no trigger**. Note for the future: `user_metadata` is client-writable, so nothing trusted (roles, permissions, allowlists) may ever go there.

**`components/ui/pulso-mark.tsx`** - renders the Latido mark from `assets/brand/mark.svg` via `react-native-svg` (already a dependency). One construction: teal disc, ink beat, never recolored.

**`app/(auth)/sign-in.tsx`** - presentational. Reads the view-model, renders the block. The group has **no `_layout.tsx`** of its own; it inherits the root Stack, so there is no second layout to reason about. The `Stack.Screen` is named `"(auth)/sign-in"`.

**`app/_layout.tsx`** - two changes. The splash hold extends from `if (!loaded)` to `if (!loaded || sessionPending)`, so the first paint already knows the answer and the documented `Stack.Protected` flash cannot occur. And the guard itself: two protected groups, `(auth)` and `(tabs)`, driven by one boolean. When a guard falls, Expo Router removes those screens from the tree, redirects to the anchor, and clears the history by itself - so **sign-out needs zero navigation code in either direction**. `unstable_settings = { anchor: "(tabs)" }` already exists and is correct while signed in; signed out, `(tabs)` leaves the tree. It is **not** pre-deleted - it gets tested and adjusted only if it misbehaves.

The guard is **UX, not security**. Expo documents it as client-side only: it controls navigation, not data access. RLS controls data access, always.

### Sign-out

`signOut({ scope: "local" })` - closing the session on this phone should not kill it elsewhere. It must work with no connection: the network call can fail and the local session goes anyway.

The same handler runs **`clearPerfilScopedState()`**, a single named function that empties every Perfil-scoped store - today just `useMovementsStore`, reset to empty. Every future store with Perfil scope is added to that one function rather than scattered.

The scenario that forces it: you lend someone your phone, tap "Cerrar sesion", they tap "Continuar con Google" and sign in as themselves. The guard flips, `(tabs)` mounts - but `useMovementsStore` is a **module-level** store that sign-out never touched, so their first screen is *your* Total Portfolio Value and *your* holdings. `CONTEXT.md` forbids this explicitly: "separate **Movements**, separate holdings, separate **Total Portfolio Value**. Neither can see the other, and nothing in the app reconciles them."

**Registered constraint for later:** when movements are cached with zustand's `persist` middleware, a persisted store has **one storage key** shared across Perfiles on the same device. That is no longer a flash in memory - it is one Perfil's movements written to disk and rehydrated on the other's next cold start. Not a bug to fix here (the cache does not exist yet), but it must not be built naively.

### Configuration

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in a **gitignored `.env`**, with a committed `.env.example`.

**The key is a publishable key (`sb_publishable_...`), not the legacy `anon` JWT.** The project's dashboard offers both; the new scheme is the one a new app should adopt. `supabase-js` treats the key as an opaque string - it is set as the `apikey` header and, while signed out, also as `Authorization: Bearer`. Supabase forbids a publishable key in that header *except* when its value exactly equals `apikey`, which is precisely what the client does, so the swap needs no code change. That caveat about `Authorization` in the migration guide is scoped to Edge Functions, which this app does not have.

**`.gitignore` needs a line added.** It currently ignores `.env*.local` but not `.env`, so a plain `.env` would be committed today. This is a prerequisite, not a nicety.

Framing worth keeping: the publishable key is **not a secret** - it ships inside the `.ipa` no matter what you do. It differs from a Finnhub key, which is a bearer credential (whoever holds it spends your quota); the publishable key is a public identifier whose safety rests **entirely on RLS**. The dashboard says as much in its own words: safe to expose *if* RLS is enabled and policies are configured. The **secret key** (`sb_secret_...`) is the opposite - it bypasses RLS and must never reach the app.

**`Skip Nonce Check` is enabled** on the Google provider. Google's iOS SDK puts a nonce in the id_token and the MIT build of the native module exposes no way to read or supply it, so Supabase rejects the exchange outright. This is Supabase's documented path for native iOS, and the cost is real: an id_token minted for this client ID is no longer bound to the request that asked for it, so it would be accepted on replay within its ~1h lifetime. Reversible by buying the library's premium tier, which restores custom nonce support.

**Unverified:** that RLS is actually enabled on every table in `public`. The migration was applied and the policies were specified, but nobody has confirmed it. The Supabase MCP is unauthorized in this session.

### Visual

The prototype is the pixel-perfect truth. From it and the brief:

- Screen `background` `#0A0E27`, top padding 56, horizontal gutters 24.
- Fixed 84pt top offset, then the brand block; the button's centre lands at ~43% of screen height. The bottom half stays empty.
- Mark disc 64pt, **no glow**. Title 36/700, `letterSpacing: -0.5`, `textPrimary`. Supporting line 14/400, lineHeight 20, `textSecondary`, max-width 280, centred.
- Gaps: 40 above the title, 12 title-to-supporting (internal to the group), 40 to the button, 16 to the error slot.
- Button 56pt tall, full width, `borderRadius: 9999`, background `#1C224D`, label 16/700 white, the official full-colour Google "G" at 20pt with a 12pt gap. Press feedback `scale(0.97)`, 100ms.
- Signing-in: a 20pt spinner replaces the G, label becomes **"Conectando..."**, opacity 0.6, taps ignored.
- Error slot: reserved **36pt**, `negative` `#FF5252`, 13/600, centred, `role="alert"` / `accessibilityLiveRegion`.
- Entrance: 250ms ease-out fade + 10px rise, disabled under reduced motion.

**Deviation from Google's published button surfaces, deliberate:** `#1C224D` with a white label is none of Google's three (light `#FFFFFF`, neutral `#F2F2F2`, dark `#131314`). This was the developer's own call, not a prototype accident - taken with eyes open. What is not negotiable is the mark: the official full-colour **G ships unmodified**, and that is the part the guidelines actually enforce. The label is **Manrope**, not the Roboto the guidelines specify - same reasoning, because a second typeface on the app's first screen would make the one moment a new user meets Pulso the one moment Pulso is not itself.

**ASCII punctuation.** `"Conectando..."` uses three ASCII periods, never `…`. Spanish accents and `¿¡` stay - the rule is about punctuation that has an ASCII equivalent.

### Copy (Spanish, fixed)

| Slot | Text |
|---|---|
| Title | `Entra a Pulso` |
| Supporting | `Tu portafolio de inversión, claro y al día.` |
| Button, idle | `Continuar con Google` |
| Button, signing | `Conectando...` |
| Error, offline | `Sin conexión. Revisa tu internet y vuelve a intentar.` |
| Error, generic | `No pudimos iniciar sesión. Vuelve a intentar.` |

Never: `Bienvenido de nuevo`, `Crear cuenta`, `Registrarse`, or the word `Gmail`.

### Dependencies

Add `@react-native-async-storage/async-storage` (chosen over `expo-secure-store`: the latter's 2048-byte per-value limit would need a chunking adapter, and a bug there logs *everyone* out for a security gain that is marginal in this threat model) and `@react-native-google-signin/google-signin`.

`expo-web-browser` is confirmed dead - the native flow removes its last hypothetical use. `expo-secure-store` is dead too. Both are pre-existing template residue: **noted, not deleted**.

### Prerequisites (owner: the developer, not the agent)

1. Create the iOS and Web OAuth clients in Google Cloud.
2. Enable the Google provider in the Supabase dashboard and load the authorized client IDs.
3. Authorize the Supabase MCP if RLS is to be verified from here.

## Testing Decisions

**What makes a good test here:** it asserts *external behaviour* - given this input, this outcome - and never reaches into how the module got there. It does not assert that a particular internal flag was set, does not mock the module under test, and survives a rewrite of the module's internals.

**Tested: `components/sign-in/view-model.ts`, and only that.** It is the one module in this feature with real logic and no I/O. Cases worth covering:

- A tap from `idle` moves to `signing`.
- A tap while `signing` is ignored - one sign-in, not two.
- A cancellation returns to `idle` with **no error message** - the user did the dismissing.
- An offline failure and a generic failure produce `failed` with **different** copy.
- A tap from `failed` returns to `signing` and clears the previous message.
- The offline copy is the offline copy: assert the exact string, so a careless edit is caught.

**Prior art:** `components/add-movement/buy-view-model.test.ts` and the other four form view-models, plus `components/home/view-model.test.ts` and `components/movements/view-model.test.ts`. Same runner (`vitest`, `npm test`), same convention - the `.test.ts` sits beside its `view-model.ts`.

**Not tested, deliberately:** `lib/supabase.ts` and `lib/google-sign-in.ts` are configuration and a native-module seam; testing them would mean asserting that a library was called with the arguments it was just handed. `stores/session.ts` is a mirror with one writer. The screen is presentational. `perfilFromSession` was considered and left out for now - the acceptance test is visual: real name and email appear in Ajustes and on the Home disc.

**Baseline that must stay green:** the existing suite (~175 tests) and a clean `tsc` and `eslint`. This feature touches the engine not at all.

**The one acceptance test that cannot be written as code:** cold start in **airplane mode** with a saved session must stay signed in. There is a known trap where `startAutoRefresh()` failing offline can wipe the session, conflating a network failure with a revoked token. Recent `supabase-js` may already distinguish them, and this **cannot be settled by reading** - only by trying. If it survives, no code was written. If it does not, the fix gets designed against a real failure rather than a remembered one.

## Out of Scope

- **Sign in with Apple.** A release gate (App Store guideline 4.8), not a dev gate. It will need a second button of equal prominence per Apple's HIG, so the CTA area must be able to grow to two stacked controls without a redesign.
- **Android.** The SHA-1 fingerprint dance is the most opaque failure mode in the feature (`DEVELOPER_ERROR`, no detail) and varies by keystore. Not on the same day the client, the store, the guard and a dev build all go up for the first time. Unresolved tension worth naming: the market argument for Google assumed Android-heavy friends, but TestFlight is iOS-only.
- **The "¿Cómo te llamas?" screen** for providers that return no name. Deferred - `initialsFrom("")` returns `""` without exploding, so today's failure mode is a blank avatar disc, not a crash.
- **Terms / privacy links.** Nothing on this screen. Apple wants a privacy policy URL as App Store Connect metadata; Google only wants a link once the OAuth app leaves Testing status, which it will not. No terms-of-service document exists to link to.
- **Account deletion.** Required by Apple guideline 5.1.1(v) before the App Store, needs an Edge Function with the service role key, and - because Apple sign-in is offered - the Sign in with Apple REST API to revoke tokens. Its own piece of work.
- **Caching movements** with the `persist` middleware, and the real movements data layer generally. This PRD delivers identity, not data.
- **The first-run wall.** A brand-new **Perfil** has zero movements *and* zero **Cash**, and the buy form gates on `total <= Cash` - so a new friend taps "comprar" and is blocked with nobody telling them a deposit comes first. This PRD makes that reachable for the first time; it does not fix it.
- **A light theme.** The app is dark-only.

## Further Notes

**The brand mark contradicts the prototype, and the mark wins - confirmed.** `assets/brand/README.md` says "one construction - teal disc, ink beat, never recolored" and instructs rendering `mark.svg` at 64pt for the sign-in disc. The prototype instead composes a `Gradients.avatar` teal gradient disc with the naked beat laid on top. **Follow the asset instruction, not the prototype:** use `mark.svg` as committed. It keeps the sign-in disc and the app icon from drifting, since both come from that one file. If the gradient is ever wanted, it belongs in the brand system as a second sanctioned construction, not as a one-off here. `DESIGN-BRIEF.md` section 4.3 has been updated to match.

**Where the prototype is and is not the authority.** It remains the pixel-perfect truth for layout, rhythm, spacing and states. It is *not* the authority on the brand mark, which `assets/brand/README.md` owns.

**Signing out lands on an empty portfolio, and that is not a bug.** `clearPerfilScopedState()` empties `useMovementsStore`, and `MOCK_MOVEMENTS` only seeds it at creation. So sign out, sign back in, and the portfolio is empty - which walks straight into the first-run wall described above. That is the real behaviour arriving early, and the best accidental preview of the empty state this project could have asked for.

**`MOCK_PROFILE` loses both consumers** once `settings.tsx` and `home-header.tsx` read `perfilFromSession`. Since this change is what orphans it, it goes. `MOCK_MOVEMENTS` stays - it still seeds the movements store, which this PRD does not touch.

**This is the cheapest possible proof the JWT is real:** a real name and a real email appearing on two screens that already exist, with no new UI built to show them.

**Triage:** this repo uses no triage labels (`docs/agents/triage-labels.md`), so no `Status:` line is set here.
