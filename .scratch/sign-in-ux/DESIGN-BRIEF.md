# Pulso - Sign-in screen design brief

> Input for Claude Design. This doc fixes **what the screen must contain, which
> states it has, and which constraints are non-negotiable**. Visual treatment
> (layout rhythm, illustration, motion) is Claude Design's call within these
> bounds.
>
> Route: `app/(auth)/sign-in.tsx`. Platform: **iOS only, dark only**. All UI
> copy in **Spanish**. Bold terms are glossary terms from `CONTEXT.md`.

## 1. What this screen is

One screen, one button. A human opens Pulso, is not signed in, and taps
**"Continuar con Google"**. That is the whole flow.

There is no second screen, no second field, no second outcome.

## 2. Hard constraints (do not design around these)

| # | Constraint | Why |
|---|---|---|
| 1 | **One provider: Google.** No Apple button, no email/password, no magic link. | Apple sign-in is a *release* gate (App Store guideline 4.8), not a dev gate. It will be added later and will need room, but it is out of scope now. |
| 2 | **No "Crear cuenta" / "Registrarse" anywhere.** No link, no secondary text, no toggle between sign-in and sign-up. | Under OAuth the first successful sign-in *is* the registration. `CONTEXT.md`: "A Perfil is never registered... there is no 'create an account' anywhere to be found." A sign-up affordance would promise a screen that does not exist. |
| 3 | **Say "Google", never "Gmail".** | Gmail is a mail product; the identity provider is Google. The user may have a Google account on a non-Gmail address. |
| 4 | **Dark only.** No light variant. | The app mounts `DarkTheme` and hardcodes dark tokens app-wide. A light mockup is dead work. |
| 5 | **No tab bar, no header, no back affordance.** | This screen exists only when the session is absent; the tab tree is out of the navigation tree entirely. There is nowhere to go back to. |
| 6 | **No new `fontSize` values and no new color tokens.** | Carried over from the Ajustes PRD - the type-scale debt is already logged and the palette should not gain a token used once. |
| 7 | **Reserve space for the error slot** (below the button). The error message must not move the button when it appears. | Layout shift on an async failure reads as a bug. |
| 8 | **One typeface: Manrope.** Including the Google button label. No Roboto, no second family. | Consistency with the rest of the app beats Google's label guideline - see section 6. |
| 9 | **The screen has a title, and it does not greet the user by memory.** "Entra a Pulso", never "Bienvenido de nuevo". | The screen cannot tell a first sign-in from a returning one - same reason as constraint 2. See section 4.2. |
| 10 | **The CTA sits in the upper-middle, not pinned to the bottom.** | A bottom-pinned button reads as a form footer. There is no form. See section 4.1. |

## 3. Design tokens (already locked in the repo)

From [`constants/theme.ts`](../../constants/theme.ts),
[`constants/typography.ts`](../../constants/typography.ts),
[`constants/layout.ts`](../../constants/layout.ts). Use these names, not raw hex.

**Color**

| Token | Hex | Use here |
|---|---|---|
| `background` | `#0A0E27` | Screen background |
| `surface` | `#111638` | Any raised block |
| `accent` | `#00E5CC` | Brand teal - the avatar/CTA hue |
| `avatarText` | `#04211E` | Text *on* accent (near-black teal) |
| `textPrimary` | `#FFFFFF` | Headline |
| `textSecondary` | `#8E8E93` | Supporting line |
| `textMuted` | `#5A6080` | Lowest tier, use sparingly |
| `border` | `#1C224D` | Hairlines |
| `negative` | `#FF5252` | Error text only |

`Gradients.avatar = [#00E5CC, #1C9C8F]` at 135deg is the app's CTA gradient - see
`components/movements/empty-state.tsx`, which is the closest existing analog to
this screen (centered illustration + headline + supporting line + single pill CTA).

**Type** - Manrope, weights 400/500/600/700/800 loaded. Existing scale:
`36 / 18 / 16 / 14 / 13 / 12 / 10`. Hero value is 36/700 with `letterSpacing: -0.5`.

**Spacing** - `4 / 8 / 12 / 16 / 20 / 24 / 32`. **Radius** - `8 / 12 / 16 / 9999`.
Existing CTAs use `borderRadius: 15` (`save-button.tsx`) or `9999` (pill,
`empty-state.tsx`). This screen uses the **pill** - see 4.4.

## 4. Layout

Reference: the **Mobbin sign-in screen**. Take its *distribution and styling* -
the proportions, the rhythm, the control system in 4.4. Take **none of its
content**: no "Welcome back" (4.2), no email field, no "or" divider, no legal
line (constraint 1, section 8).

### 4.1 The block

One block, inside `SafeAreaView edges={["top", "bottom"]}`:

```
+-----------------------------+
|                             |
|                             |
|            (o)              |  64pt brand disc, no glow
|                             |  40
|      Entra a Pulso          |  36 / 700, ls -0.5, textPrimary
|                             |  12
|   Tu portafolio de          |  14 / 400, lh 20, textSecondary
|   inversion, claro y al dia.|  <= 2 lines
|                             |  40
|  [ G  Continuar con Google ]|  56pt tall, gutters 24
|                             |  16
|  [ error slot - reserved ]  |  36pt, empty when idle
|                             |
|                             |
|                             |  deliberately empty
|                             |
+-----------------------------+
```

**Vertical placement:** center the block, biased **upward**, so the button's
center lands around **42-45% of screen height**.

This is the one place the reference is *not* followed literally: Mobbin sits
higher (its CTA is at ~27%) because it has three more elements stacked under it.
With only a button below the title, 27% would leave three quarters of the screen
empty. 42-45% is your "middle" and it is the right call here.

Not pinned to the bottom (the previous draft's mistake - a bottom-pinned CTA
reads as a form footer, and there is no form). The internal gaps above are fixed
so the composition holds on every device; only the empty space below flexes.

**The bottom half stays empty.** Nothing goes there - no legal line, no "or",
no secondary link. The emptiness is what makes the single button read as the
only thing to do.

### 4.2 The title - required, and it cannot be "Welcome back"

The previous draft had **no login title**, only the wordmark. It needs one.

But Mobbin's "Welcome back" is unavailable to Pulso: this screen cannot know
whether the human in front of it is arriving for the first time or the
thousandth. Constraint 2 and `CONTEXT.md` are explicit - "the first time a human
signs in, the **Perfil** begins; every later sign-in finds the one already there.
The app cannot tell those two moments apart, and does not try."

So the title must be **true in both moments**.

- **Use: "Entra a Pulso"** - names the action and the product, correct on day one
  and on day four hundred. It also absorbs the wordmark, so the disc no longer
  needs "Pulso" spelled out underneath it (the old draft said it twice).
- Acceptable alternative: "Ingresa a Pulso".
- **Never:** "Bienvenido de nuevo", "Hola otra vez", "Welcome back", or anything
  else that claims to recognise the user. It is a lie on the first sign-in.
- **Never:** "Crear cuenta" / "Registrate" (constraint 2).

Supporting line stays subordinate: one sentence, max two lines, `textSecondary`,
saying what the app is - it is the only thing a first-time friend has to go on.

### 4.3 Brand mark

**Resolved: the mark now exists.** `assets/brand/` holds the brand system - the
mark is **Latido**, an EKG reduced to one asymmetric beat between two flatlines.
This section previously said no vector asset existed; that is no longer true, and
`assets/brand/README.md` is the authority on it.

- Render **`mark.svg` as committed** at **64pt** - teal `#00E5CC` disc, ink
  `#04211E` beat. The README says exactly this ("render `mark.svg` at 64pt for
  the sign-in disc"), and SVG is resolution independent, so no per-size copy.
- **One construction.** Never outlined, never recolored, never the beat on its
  own. That includes **not** substituting `Gradients.avatar` for the flat teal
  disc: a gradient disc is a recolor, and it would let the sign-in disc drift
  from the app icon, which is generated from the same file. If the gradient is
  wanted it belongs in the brand system as a second sanctioned construction, not
  as a one-off on this screen.
- `beat.svg` (naked beat) and `dot.svg` (plain disc, for below 24px) are not used
  here.

**No glow, no halo, no radial bloom behind the disc.** The reference is flat and
quiet; the earlier draft's 150pt glowing disc was competing with the button for
the eye and doing the work the title should do.

### 4.4 Rhythm and control system

What is actually worth importing from the reference is its *discipline*: one
control height, one radius, one gutter, one rhythm. Apply it here.

| Property | Value | Note |
|---|---|---|
| Horizontal gutter | **24pt**, everything | `Spacing.xxl`. Button, title, supporting line all share one measure. |
| Control height | **56pt** | One height for every control on the screen. When Apple's button joins, it takes the same 56. |
| Control radius | **`BorderRadius.full`** (pill) | Matches `empty-state.tsx`. Do not use the `15` from `save-button.tsx` here - pick one, and the pill is the one the reference and the empty state agree on. |
| Gap around the title group | **40pt** above, **40pt** below | Symmetric. The title + supporting line are **one group** - the 12pt between them is internal, not a section gap. |
| Gap button to error slot | **16pt** | |
| Title | 36 / 700, `letterSpacing: -0.5` | Exactly `Typography.heroValue`. No new size, no new tracking. |
| Supporting line | 14 / 400, lineHeight 20 | Matches `empty-state.tsx` body treatment. |
| Text alignment | Centered, all of it | |

**Keep the supporting line** even though the reference has none. Mobbin's users
know what Mobbin is; a friend opening Pulso from a TestFlight link does not. It
stays subordinate - two lines maximum, `textSecondary`, never competing with the
title.

## 5. States

Five, and only one is a real error.

| State | Trigger | What the screen shows |
|---|---|---|
| **Pending** | Cold start, session still being read from storage | **Never rendered.** The splash screen is held until the session resolves, so this screen's first paint already knows the answer. Do not design a loading skeleton for it. |
| **Idle** | Signed out | Button enabled. Error slot empty. |
| **Signing in** | Button tapped, Google sheet open / token being exchanged | Button disabled, spinner in place of (or beside) the label, **same height**. The native Google sheet covers the screen anyway - this state is mostly what the user returns to. |
| **Cancelled** | User dismissed the Google sheet | **Silently back to Idle.** No error message, no toast. The user did the dismissing; telling them about it is noise. |
| **Failed** | Network down, token exchange rejected, provider misconfigured | Inline message in the error slot **below** the button, in `negative`, centered. Button returns to enabled - **the message and the button together are the retry**; do not add a separate "Reintentar" button. |

**Error copy must state cause + fix**, not "Error". Two cases worth distinct copy:

- No connection: "Sin conexion. Revisa tu internet y vuelve a intentar."
- Anything else: "No pudimos iniciar sesion. Vuelve a intentar."

Note: this screen's only button **requires the network**. That is the one place
the app strands a user offline, and it is deliberate - a *saved* session survives
offline by design, so a user who has signed in once does not come back here.

## 6. The Google button

This is the whole screen, so it carries the weight.

- **Use the official Google "G" mark**, unmodified: do not recolor it, redraw it,
  change its proportions, or substitute a generic icon. Keep its required clear
  space. Ship it as SVG.
- **Label:** "Continuar con Google". (Not "Iniciar sesion con Google" - the same
  button also creates the **Perfil** on first use, and "Continuar" is true in both
  moments, which is exactly the fiction constraint 2 protects.)
- **Treatment: `#1C224D` surface, white label** - full-width minus 24pt gutters,
  **56pt tall**, `BorderRadius.full` pill. The label is 16/700; the G mark is
  20pt with a 12pt gap.
  **This supersedes the earlier "use Google's light theme" line in this doc.**
  The user proposed the dark navy surface and it is the decision. It is none of
  Google's three published button surfaces (light `#FFFFFF`, neutral `#F2F2F2`,
  dark `#131314`) - an accepted, deliberate deviation, taken with eyes open. What
  is *not* negotiable is the mark: the official full-colour G ships unmodified,
  and that is the part the guidelines actually enforce.
  Do not tint the surface with `accent` either - a teal button under a teal disc
  would leave the screen with no figure/ground.
  (Mobbin uses a *ghost* outline for its Google button because it has a second,
  higher-priority filled CTA. Pulso has no second button, so ours takes the filled
  treatment.)
- **Minimum 44x44pt touch target** - 56pt clears it comfortably.
- **Press feedback within ~100ms** - opacity or scale (0.97-1.0), no layout shift.
- **`accessibilityLabel`** on the control; `accessibilityRole="button"`; disabled
  state must be announced, not just dimmed.
- **Label typeface: Manrope. Decided.** Google's branding guidelines specify
  Roboto for the label; Pulso is Manrope everywhere and stays Manrope here. The
  logo is the part that is actually enforced and it stays untouched - a second
  typeface on the app's first screen would make the one moment a new user meets
  Pulso the one moment Pulso is not itself. Do not ship Roboto anywhere in this
  screen.

## 7. Accessibility and platform

- Contrast: body text >= 4.5:1 on `background`; `textSecondary` (`#8E8E93`) on
  `#0A0E27` passes - `textMuted` (`#5A6080`) does **not**, so do not use it for
  anything a user must read.
- Support Dynamic Type at the largest setting without truncating the button label
  or clipping the supporting line. Prefer wrapping over ellipsis.
- Respect `prefers-reduced-motion`: any entrance animation must be skippable, and
  the screen must be fully readable and operable with motion off.
- Safe areas on both edges. Nothing tappable near the home indicator.
- Motion, if any: one element, 150-300ms, ease-out. This screen has one job; a
  choreographed entrance delays it.

## 8. Out of scope (named so they do not get designed by accident)

- **Sign in with Apple.** Coming later, will need a second button of *equal*
  prominence per Apple's HIG - so leave the CTA area able to grow to two stacked
  controls without a redesign.
- **The "?Como te llamas?" screen** (shown only if the provider returns no name).
  Deferred; today a missing name renders an empty avatar disc, which does not crash.
- **Terms / privacy links. Decided: none on this screen.** No slot reserved, no
  "Al continuar, aceptas..." line. Neither platform asks for one *here*: Apple
  wants a privacy policy **URL as App Store Connect metadata** (required for App
  Store submission and for external TestFlight, entered under TestFlight → Test
  Information), and Google only requires a policy link on the consent screen once
  the OAuth app leaves Testing status - which it will not, since basic sign-in
  scopes are non-sensitive and 100 test users covers the audience. There is also
  no terms-of-service document to link to. Revisit only if Pulso goes to the App
  Store.
- **First-run empty state.** A brand-new **Perfil** lands on a portfolio with zero
  movements and zero **Cash**, which blocks the buy form. Real problem, different
  screen.

## 9. Deliverable

Same shape as the other prototypes in `.scratch/*-ux/`: a `.dc.html` inside an
iOS frame, showing **Idle**, **Signing in**, and **Failed**. Cancelled is Idle;
Pending is never rendered.

Where the prototype and this doc disagree on visual treatment, the prototype wins.
Where they disagree on the constraints in section 2, this doc wins.
