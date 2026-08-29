# 01 - A full exit leaves no Dust

Type: **AFK** - one control on a screen that already exists. No schema, no network, no engine,
no view-model, no new **Movement** field, no new module. Every decision is settled in
`docs/adr/0014-a-full-exit-sells-the-apps-share-count.md`, the PRD and the UX brief.

## Parent

`.scratch/full-exit/PRD.md` (design brief: `.scratch/full-exit/UX.md`)

## What to build

A **Vender todo** control on the **Venta** form. Tapping it writes the share count Pulso
believes is held into **Acciones**, so the sale drives the position to exactly zero instead of
leaving **Dust** behind.

**It is not a keystroke-saver, and the difference decides the design.** Under `0012` a bought
position's count is *derived* - `Monto / Precio` - and the **Monto** is never stored, so Pulso's
count is not the broker's and the user has no way to learn the gap: the derived figure is shown
at full precision in exactly one place in the app, the `Disponible` helper beside **Acciones**.
Selling the broker's figure instead is what leaves a one-cent **Holding** in **Mis Activos**
reporting `+100.00%` forever. The control answers the question the user cannot.

**The app supplies the quantity; the user keeps the decision.** The value lands as ordinary
editable text. No mode, no locked field, no confirmation step, and nothing on the stored
**SellMovement** that distinguishes a sale made this way from one typed by hand.

**Where it goes.** Inside the fixed bottom block, below the breakdown and directly above
**Guardar movimiento**, so every action on the screen is in one place and the paired-row field
grid above is untouched. Order in the block: breakdown -> **Vender todo** -> the save-failure
message -> **Guardar movimiento**, so that message stays adjacent to the button it is about.

**It is always rendered, and disabled when there is nothing to sell** - no **Símbolo** typed,
the ticker not held, or nothing sellable on the chosen **Fecha** - **and while a save is in
flight**, exactly as **Guardar movimiento** is. Never conditionally mounted.
That block sits outside the ScrollView, so a control that appears and vanishes there moves
**Guardar movimiento** vertically, in the one zone where a mis-tap writes to Postgres.

**It fills the date-aware count, never today's holding** - the same figure the save gate compares
against and the same one `Disponible` renders. Filling anything else could populate a value the
form immediately rejects. On a backdated sale this correctly means "everything this date can
sell": with a later buy on the books it fills the earlier, smaller figure and leaves a position
open today.

**Tapping also marks the shares field touched.** A filled value is always above zero and within
the available count, so no error can fire at the moment of the tap; the only effect is that a
later bad edit reports itself at once instead of waiting for blur.

**Afterwards the value is just a number.** Edit it down to a partial sale and nothing objects.
Change the **Fecha** and it is *not* recomputed - the gate refuses the dangerous direction with
the date-qualified message the form already has, and permits the harmless one.

**One trap worth naming.** The obvious move is to reuse the existing `Disponible` visibility
condition for the disabled state. **Do not** - it carries a third clause that hides the helper
while an over-sell error is showing, and borrowing it would disable the control at exactly the
moment the user most needs it: when they have typed too many shares and want the right number
put in for them. The disabled rule is only "no **Símbolo**, nothing sellable on this date, or a
save in flight".

**The tests.** The property this rests on is already under test - the case in the sell
view-model's test file that takes a position derived through the buy form, renders its available
count exactly as the helper does, feeds that string back through the form's own summary and
asserts the sale is permitted. That is precisely the path this control automates, so **its
framing must be updated**: it currently reads as a historical over-sell bug and calls the
rendered figure "what the Acciones helper displays", and it is now what the control *writes* -
the feature's only safety net, with nothing in the file to warn whoever loosens it later. Add
**one** new case: a backdated sale capped by a later movement, from cap through rendering to the
gate. That is the fill no user could compute by hand and it is covered nowhere today.

**What must NOT change.** This slice is small and its whole risk is collateral damage:

- **Every field** - **Símbolo**, **Acciones**, **Precio de ejecución**, **Comisión**,
  **Impuestos**, **Fecha** - keeps its label, keyboard, default, sanitiser and position.
- **The `Disponible` helper** stays exactly where it is with the same copy. It is the
  informational half; the control is the action half. No new copy explains the disabled state
  either - the **Acciones** messages already say why.
- **The save gate** and all of its messages, including the date-qualified variants.
- **The breakdown** and its fee-exceeds-gross error.
- **Save behaviour** - still waits for Postgres, still takes `createdAt` from the database clock,
  still leaves the form intact on failure (`0010`).
- **`summarizeSell` and `buildSellMovement`.** Untouched. So is the engine.
- **Share precision.** The 5 dp -> 4 dp proposal was analysed and set aside; `0014` records why.
  No literal moves.

## Acceptance criteria

- [x] **Vender todo** renders inside the fixed bottom block, below the breakdown and directly
      above **Guardar movimiento**; the save-failure message sits between them
- [x] It is **always mounted**: typing or clearing a **Símbolo**, and changing the **Fecha**,
      never move **Guardar movimiento** by a pixel
- [x] Disabled when no **Símbolo** is typed, when the ticker is not held, or when nothing is
      sellable on the chosen **Fecha**; enabled otherwise
- [x] Disabled **while a save is in flight**, like **Guardar movimiento**: a tap during the wait
      must not overwrite **Acciones**, because a failed save promises to leave every field
      exactly as the user typed it
- [x] The disabled state reuses the disabled label color **Guardar movimiento** already uses, so
      the two dim together on an empty form, and carries the disabled accessibility state
- [ ] Styled **secondary**: border only, no fill, no glow or elevation - the teal shadow stays
      the primary button's alone - at the same width and corner radius, ~48pt tall
- [ ] Pressed feedback is **opacity only**; nothing reflows or resizes under the finger
- [x] Tapping fills **Acciones** with the figure `Disponible` shows for that ticker and date
- [x] Saving that value closes the position to **exactly zero** - the ticker leaves **Mis
      Activos** and no fractional **Holding** remains
- [x] Tapping marks the shares field touched, and no error appears at the moment of the tap
- [ ] Tapping fires a light haptic impact
- [ ] The accessible label names the share count, which the visible label omits
- [x] The disabled condition is **not** borrowed from the `Disponible` helper's visibility rule:
      with an over-sell typed and its error showing, the control stays **enabled** and fixes the
      field
- [x] Backdated: with a later buy on the books, it fills the count for the **chosen date**, not
      today's holding; with a later sell, it fills the capped figure so that sale still has
      shares behind it
- [x] The filled value stays editable; editing it down to a partial sale saves normally
- [x] Changing the **Fecha** after tapping does **not** re-fill; a now-excessive figure is refused
      by the existing gate with its existing date-qualified message
- [x] `Disponible`, every field, the gate, the breakdown and the save lifecycle are unchanged
- [x] `summarizeSell`, `buildSellMovement`, the engine and the schema are untouched, and no field
      is added to a **SellMovement**
- [x] The existing full-position test is **re-framed** to say it now guards this control and is
      the tripwire for the deferred share-precision decision
- [x] **One** new test: a backdated sale capped by a later movement round-trips from the capped
      count through rendering to the gate and is permitted
- [x] `npm test` green, `tsc --noEmit` clean, `npx prettier --check` clean on every touched file

## Blocked by

None - can start immediately.

## Closing note

The re-framed test is load-bearing beyond this slice. Share precision lives in three independent
literals - the rounding helper, the share formatter and this form's input sanitiser - and they
agree at five decimals only by convention. That test is what holds them together, and the first
thing that fails if the 5 dp -> 4 dp change is ever revisited. Leave it easy to find.

## Comments

**Implemented and verified 2026-08-24** on `feat/full-exit`. `tsc --noEmit` clean, 344 tests
passing across 26 files, eslint and prettier clean on both touched files. Two files changed:
the sell screen and the sell view-model's test file. `summarizeSell`, `buildSellMovement`, the
engine and the schema are untouched, as the slice required.

**The real exit, measured.** NFLX sold at $70.10 with $0.15 commission and $0.02 regulatory
fees. Pulso held 2.46213 shares; Hapi had filled 2.4619:

| | Acciones | Monto bruto | Total recibido |
|---|---|---|---|
| Pulso | 2.46213 | $172.60 | **$172.43** |
| Hapi | 2.4619 | $172.58 | **$172.41** |

`0.00023 x $70.10 = $0.0161`, landing on exactly **$0.02** - the cost ADR `0014` accepted, now
measured rather than estimated, and recorded there. The position closed to zero and the ticker
left **Mis Activos** with no fractional **Holding** behind it, which is the whole point of the
slice.

**Four criteria are deliberately left unticked** - the secondary styling, the pressed state, the
haptic and the accessible label. Each is correct in the code but none can be confirmed without
eyes, a finger or VoiceOver on a device, and this repo has no component-test harness to stand in
for that. They are cosmetic or assistive: none can corrupt a **Movement**.

**Not a defect, and already known:** closing the position makes NFLX unreachable - it leaves
**Mis Activos**, taking its detail screen with it, and its **Realized P&L** now sits in the
portfolio total with nothing to attribute it to. That is the backlog's *"A fully exited position
disappears from the app"*, and this exit is its first real instance.
