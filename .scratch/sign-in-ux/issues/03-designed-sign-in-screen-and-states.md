# 03 - The designed sign-in screen and all its states

Type: **AFK**

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

Replace issue 02's deliberately plain button with the real screen, and give it the
three outcomes a sign-in can actually have.

**Sources.** `.scratch/sign-in-ux/DESIGN-BRIEF.md` is the settled brief;
`.scratch/sign-in-ux/sign-in-prototype/project/Pulso Sign In.dc.html` is the
pixel-perfect truth for layout, rhythm, spacing and states. The prototype is
**not** the authority on the brand mark - `assets/brand/README.md` owns that.

### The state machine

Extract it as a **pure module**, beside its own test file, the same shape as every
other screen's view-model in this repo. It imports nothing native and nothing
async - that is what issue 02's adapter seam bought.

From the prototype:

```
idle     --tap-->        signing
signing  --token-->      (session arrives; the guard swaps the tree)
signing  --cancelled-->  idle          // silent: no message, no toast
signing  --offline-->    failed        // "Sin conexion. Revisa tu internet y vuelve a intentar."
signing  --other-->      failed        // "No pudimos iniciar sesion. Vuelve a intentar."
failed   --tap-->        signing       // clears the previous message
signing  --tap-->        signing       // ignored; never two sign-ins
```

There is no `pending` state here - it is never rendered. The splash holds until
the session is known, so this screen's first paint already has the answer.

**Cancelled is not an error.** The human dismissed the sheet; telling them about
it is noise. Go quietly back to `idle`.

### The screen

- Background `background`, top padding 56, horizontal gutters 24.
- Fixed 84pt top offset, then the brand block. The button's centre lands at ~43%
  of screen height. **The bottom half stays empty** - no legal line, no "or", no
  secondary link. That emptiness is what makes one button read as the only thing
  to do.
- **The mark:** render `mark.svg` from `assets/brand/` as committed, at 64pt -
  flat teal disc, ink beat. `react-native-svg` is already a dependency. **One
  construction:** never outlined, never recolored, and specifically **not** the
  `Gradients.avatar` gradient disc the prototype improvised. Both the sign-in disc
  and the app icon come from that one file and must not drift.
- **No glow, no halo, no radial bloom** behind the disc.
- Title 36/700, `letterSpacing: -0.5`, `textPrimary`. That is exactly the existing
  hero type token - **no new `fontSize` and no new tracking value**.
- Supporting line 14/400, lineHeight 20, `textSecondary`, max-width 280, centred.
- Gaps: 40 above the title, 12 title-to-supporting (internal to the group, not a
  section gap), 40 to the button, 16 to the error slot.
- Button 56pt tall, full width, `borderRadius: 9999`, surface `#1C224D`, label
  16/700 white, the official full-colour Google G at 20pt with a 12pt gap. Press
  feedback `scale(0.97)` within ~100ms.
- Signing in: a 20pt spinner replaces the G, the label becomes `Conectando...`,
  opacity 0.6, taps ignored, **same height** so nothing moves under the finger.
- Error slot: **36pt reserved** below the button so a message never moves it.
  `negative`, 13/600, centred, announced to screen readers.
- Entrance: 250ms ease-out fade plus a 10px rise, **disabled under reduced
  motion**.

The button surface is `#1C224D` by deliberate decision. It is none of Google's
three published surfaces - an accepted deviation. What is **not** negotiable is
the mark: the official full-colour G ships unmodified. The label is Manrope, not
the Roboto the guidelines specify, for the same reason - a second typeface on the
app's first screen would make the one moment a new user meets Pulso the one
moment Pulso is not itself.

### Copy (Spanish, fixed)

| Slot | Text |
|---|---|
| Title | `Entra a Pulso` |
| Supporting | `Tu portafolio de inversión, claro y al día.` |
| Button, idle | `Continuar con Google` |
| Button, signing | `Conectando...` |
| Error, offline | `Sin conexión. Revisa tu internet y vuelve a intentar.` |
| Error, generic | `No pudimos iniciar sesión. Vuelve a intentar.` |

**Never:** `Bienvenido de nuevo` - this screen cannot tell a first sign-in from a
thousandth, so a greeting that claims to recognise the user is a lie on day one.
**Never:** `Crear cuenta` / `Registrarse` - under OAuth the first successful
sign-in *is* the registration, and a sign-up affordance promises a screen that
does not exist. **Never** the word `Gmail` - the identity provider is Google, and
the account may not be on a `@gmail` address.

**ASCII punctuation:** `Conectando...` is three ASCII periods, never `…`. Spanish
accents and `¿¡` stay - the rule is only about punctuation that has an ASCII
equivalent.

## Acceptance criteria

- [x] The state machine is a pure module with its own test file, importing nothing native
- [x] Tests cover: tap from idle starts signing; a tap while signing is ignored; cancelled returns to idle with **no** message; offline and generic produce **different** copy, asserted as exact strings; a tap from failed clears the previous message
- [x] The mark renders from `assets/brand/mark.svg` as committed - flat teal disc, no gradient, no glow
- [x] The button shows a spinner and `Conectando...` while signing, at the same height, and ignores taps
- [x] Backing out of the Google sheet returns the screen to idle silently - no message, no toast
- [ ] Airplane mode produces the offline copy; any other failure produces the generic copy
- [ ] The error message appears without moving the button
- [ ] The error is announced by VoiceOver when it appears
- [x] No new `fontSize` value and no new colour token are introduced
- [x] `Conectando...` uses three ASCII periods; no `…` anywhere in the source
- [ ] At the largest Dynamic Type setting nothing clips or truncates
- [ ] With reduced motion on, the entrance animation does not play and the screen is fully usable
- [ ] The composition holds on a small phone
- [x] `npm test`, `tsc` and `eslint` are green

## Done, with six boxes left open on purpose

Shipped. The six unticked criteria are all device checks that were not run, not
things known to be broken - they are listed rather than assumed so nobody reads
a checkmark that was never earned.

**The one most likely to actually fail is the airplane-mode copy.** Offline is
classified exactly on the Supabase side (`isAuthRetryableFetchError` plus
`status === 0`, which keeps a 503 out of it) but only heuristically on the Google
side: the native module publishes no status code for "no connection" - its
`statusCodes` cover cancellation, Play Services and sign-in-required and nothing
else - so `lib/google-sign-in.ts` matches on the error message and is biased
towards the generic copy when unsure. If the sheet fails before Supabase is ever
reached, the generic line may appear where the offline line was intended.

**"No new `fontSize`" was read as "no new *value*", not "only tokens".** The
codebase already inlines font sizes in 30 files against 1 that imports
`Typography`, and 13 and 16 both already appear there - 13 sixteen times. The
brief's stated reason is that the type scale should not grow, and reusing an
existing number does not grow it. The title does use `Typography.heroValue`,
which is already exactly 36 / 700 / -0.5.

**The Google G came from the prototype, not a download.** `Pulso Sign In.dc.html`
carries the official four-colour paths on a 48x48 viewBox, so
`components/brand/google-g.tsx` is a transcription of an asset that was already
in this repo. Two places where the prototype was deliberately *not* followed: it
improvises a gradient disc for the Pulso mark, and it writes `Conectando` with a
U+2026 ellipsis. Both are ruled out above.

**The `console.error` from issue 02 is gone**, replaced by the error slot as that
issue asked - not deleted, which would have restored the silent failure that made
the nonce bug so hard to read.

## Blocked by

- `02-real-session-from-google-sign-in.md`
