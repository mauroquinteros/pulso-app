# 02 - The símbolo field shows the check happening

Type: **HITL** - the app has no in-field icon anywhere today. This invents an
affordance, and the placement wants the developer's eyes on a simulator.

## Parent

`.scratch/resolve-stock/PRD.md` (Part 2)

## What to build

Issue 01 made the save button the only evidence that anything happened, and the save button is
at the bottom of the screen, out of eye-line. This slice puts the evidence in the field the
user is already looking at.

**While a check runs**, a spinner sits inside the **Símbolo** input, right-aligned. There is no
room to the right of the box — **Fecha** shares that row — so the spinner lives inside the
input's own bounds.

**When the symbol confirms**, the spinner is replaced *in the same spot* by a teal check mark,
so the transition reads as one thing finishing rather than two things happening.

**The teal border is retied to `confirmed`.** Today the field turns teal the moment it is
non-empty, which means `APPL` gets exactly the same encouraging border as `AAPL` — the colour
currently congratulates the user for typing. After this it reports a fact: neutral while
unchecked or checking, teal only once the symbol is real.

### The check mark is teal, not green

`positive` green means **gain** everywhere else in Pulso, and the palette file already warns
against green elsewhere for that reason. On a form surrounded by money, a green mark beside a
ticker invites the reading "AAPL is up today" — a claim this form has no business making, and
one the app could plausibly make for real once prices are read from `stocks`. Accent teal is
already this form's "this input is good" colour, so it carries the meaning with no collision.

The only loading affordance that exists in the app is the sign-in button's; there is no
precedent for an icon inside a text input, which is why this needs a look on device before it
merges.

## Acceptance criteria

- [x] A spinner appears inside **Símbolo**, right-aligned, while a check is running
- [x] On confirmation the spinner is replaced in place by a check mark
- [x] The check mark uses the accent teal, not the palette's `positive` green
- [x] The border is neutral while `unchecked` and `checking`, and teal only when `confirmed`
- [x] Typing into an empty field no longer turns the border teal on its own
- [x] Neither the spinner nor the check mark shifts the layout of the Símbolo/Fecha row
- [x] The field still accepts typing while the spinner is showing
- [x] Reviewed on the simulator before merge
- [x] `npm test` and `npm run lint` pass

## Blocked by

- `.scratch/resolve-stock/issues/01-blocked-save-until-symbol-confirms.md`

## Comments

**2026-08-13 - built and reviewed on the simulator. Closed.**

Three changes, all inside the Símbolo field in `app/add-movement/buy.tsx`:

- A 20x20 status slot rendered in **every** state, even when it holds nothing. That is what
  keeps the layout still: a slot that came and went would resize the input mid-check, so the
  spinner would announce itself by shoving the ticker sideways. Same slot trick as the sign-in
  button's glyph, and `smallBox` was already a flex row with `gap: 6`, so nothing in the shared
  form styles had to change.
- The spinner is `textSecondary` grey, not accent teal. Teal means *confirmed* here; spending it
  on *working* would contradict the neutral border this slice specifies for `checking`.
- The border moved from `ticker !== ""` to `symbolCheck.status === "confirmed"`.

On-device review: the rejected-symbol state was captured directly - `APPL` typed, every other
gate open (Disponible $267.07 against a $200.15 total), and **Guardar movimiento** still dead.
That screenshot is the clearest evidence yet that issue 01's gate holds on the symbol alone.

Known and accepted, because it is issue 03's job: a rejected symbol currently looks *identical*
to an untouched one - empty slot, neutral border, no message. `unknown` and `unavailable` are
therefore indistinguishable on screen today.
