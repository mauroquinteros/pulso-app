# PRD — Vender todo (the full-exit slice)

**Feature:** `full-exit`
**Companion to:** `.scratch/full-exit/UX.md` (the design brief — this PRD cites it, doesn't repeat it).
**Implements:** `docs/adr/0014-a-full-exit-sells-the-apps-share-count.md`
**Respects:** `0012` (a buy's total is derived from its shares — this slice is that decision's
sell-side consequence), `0004` (executionDate is a calendar date), `0005` (the cash gate is not
date-qualified, and the *shares* gate is), `0010` (a movement is saved only when the database
says so)
**Supersedes:** two entries in the sell UX brief, both of which refused this control:
`.scratch/sell-ux/PRD.md`'s *Out of Scope* line, and `.scratch/sell-ux/UX.md` §14 settled
decision #4 — *"No **Vender todo** → it's a trading affordance; for a tracker the user knows the
exact shares."* `0012` makes that premise false: the count is derived and displayed at full
precision nowhere but this form's `Disponible` helper. **Both entries are struck through in place
and marked reversed**, so neither can be read as a current rule; their original wording is
preserved rather than rewritten, because what was decided then is still worth knowing. The rest of both still stands: this slice does not change the sell form's
fields, copy, gate or layout above the breakdown.
**Depends on:** the sell slice (`sell-movement`), which made full exits reachable and thereby
made **Dust** observable for the first time
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`)
**Scope:** one control on the **Venta** form. No engine change, no view-model change, no schema
change, no new **Movement** field.

---

## Problem Statement

**You cannot close a position, because you cannot type a number the app never showed you.**

Under `0012` a bought position's share count is **derived** — `Monto / Precio` — and the
**Monto** is never stored. So the count Pulso holds is not the count your broker filled, and
the two part company in the fifth decimal. You have no way to know the difference: the derived
figure appears at full precision in exactly one place in the whole app, the `Disponible` helper
beside **Acciones** on this form.

So you sell what Hapi tells you you had, and Pulso keeps the remainder.

The real case: NFLX bought with two Montos of $100 and $50, stored as `1.68039 + 0.78174 =
2.46213` shares. Hapi filled **2.4619**. Selling Hapi's figure left **0.00023** shares — about
two cents — and that fraction is a **Holding** by every rule the app has. It carries a **Cost
Basis**, it takes a **Market Value**, it sits in **Mis Activos**, and it reports `P&L NO
REALIZADA +$0.01 +100.00%` forever, because the percentage is **Net P&L** over a one-cent
basis. Arithmetically correct; unreadable as anything but broken.

Nothing is miscalculated. **Realizado**, **Comisiones** and **Retorno total** all came out
right, and the reconciliation balances. The fault is upstream, in what the app believed was
held. That residue now has a name — **Dust** — and it will recur on every position bought by
**Monto** until something fills the count for the user.

## Solution

A **Vender todo** control on the **Venta** form, sitting directly above **Guardar movimiento**.
Tapping it writes the app's own available share count into **Acciones**.

It is not a keystroke-saver. It is the app answering the one question the user cannot: *how many
shares do you think I have?* Selling that figure closes the position to exactly zero and leaves
the portfolio clean.

The price is stated openly in `0014`: the recorded sale says 2.46213 shares where the broker
sold 2.4619, so **Cash** is credited about two cents that never arrived. **The disagreement is
not removed, it is moved** — out of the share count, where it is permanent and on screen, into
Cash, where it is invisible. That is the trade `0012` already made when it rounded the buy total
to the cent.

## User Stories

1. As a Pulso user, I want a **Vender todo** control on the **Venta** form, so that I can close a
   position without guessing a share count the app has never shown me.
2. As a Pulso user, I want tapping it to fill **Acciones** with the exact figure Pulso believes I
   hold, so that the sale drives the position to zero instead of leaving a fraction behind.
3. As a Pulso user, I want the position to disappear from **Mis Activos** after a full exit, so
   that my portfolio reflects what I actually own.
4. As a Pulso user, I never want to see a **Holding** worth one cent reporting `+100.00%`, so
   that my portfolio does not look broken.
5. As a Pulso user, I want the filled value to appear in **Acciones** as ordinary editable text,
   so that I can see the number the app used and change it if I disagree.
6. As a Pulso user, I want the **Monto bruto** and **Total a recibir** figures to populate the
   moment I tap, so that I can see the consequence of the action right beside the button I
   pressed.
7. As a Pulso user, I want the control to sit with **Guardar movimiento** rather than among the
   fields, so that every action on the screen is in one place and the form's grid stays intact.
8. As a Pulso user, I want the control to be present even before I have typed a **Símbolo**, so
   that I know the feature exists without having to discover it.
9. As a Pulso user, I want it visibly disabled when there is nothing to sell, so that it never
   looks tappable while doing nothing.
10. As a Pulso user, I want **Guardar movimiento** to stay exactly where it is at all times, so
    that a control appearing above it can never move the save button under my thumb.
11. As a Pulso user, I want a light haptic and a clear pressed state when I tap, so that I know
    the tap registered even though the field it fills is off-screen.
12. As a Pulso user, I want the control to be at least as tappable as every other button on the
    screen, so that I do not have to aim.
13. As a Pulso user recording a **backdated** sale, I want the control to fill the most that date
    can sell, so that a sale in the past can never outrun the buys behind it or the sales after
    it.
14. As a Pulso user recording a backdated sale, I want the figure to account for movements that
    come *after* my chosen date, so that I am given a number I could not have worked out myself.
15. As a Pulso user, I want to be able to edit the filled figure down to a partial sale, so that
    the control never traps me into selling everything.
16. As a Pulso user who changes the **Fecha** after tapping, I want the form to block the sale if
    the figure is now an over-sell, so that a stale fill cannot be saved.
17. As a Pulso user who edits the filled figure to something invalid, I want the error to appear
    at once rather than waiting for me to leave the field, so that the form tells me immediately.
18. As a Pulso user with existing **Dust**, I want the control to fill that remainder too, so that
    I can clear a position I already thought I had closed.
19. As a Pulso user relying on VoiceOver, I want the control to announce how many shares it will
    sell, so that I am not asked to approve a quantity I cannot hear.
20. As a Pulso user, I want the control's label to say what it does and nothing more, so that the
    count is not repeated in three places on one screen.
21. As a Pulso developer, I want this to change no view-model, no engine code and no schema, so
    that a correctness fix carries no correctness risk.
22. As a Pulso developer, I want the agreement between the stored share count, the displayed
    figure and the sell gate to stay under test, so that changing share precision later breaks a
    test rather than the feature.
23. As a Pulso developer, I want the reason this control exists recorded as an ADR, so that a
    reader who finds it forbidden in the sell UX spec learns why that decision was reversed.
24. As a Pulso developer, I want **Dust** defined in the glossary, so that the phenomenon this
    slice exists to prevent has a name and is not called a rounding error.

## Implementation Decisions

**There is no new module, and that is deliberate.** The control is state-setting on the **Venta**
screen: it writes `formatShares(availableShares)` into the **Acciones** field and marks that field
touched. The deep module this depends on already exists and is already tested — `maxSellableAsOf`
produces the count, `formatShares` renders it, `roundShares` and the sell gate agree with both at
five decimals. Wrapping a single `formatShares` call in a named helper for one call site would be
the single-use abstraction the repo's guidelines refuse. Nothing is extracted.

**The meaning is a claim; the mechanism is a fill.** The control asserts "this sale takes
everything it is allowed to take", and the app supplies the quantity because the user cannot know
it. But it is implemented as a plain, editable fill: no mode, no locked field, no `isFullExit`
flag on the **Movement**, nothing downstream that can distinguish a sale made this way from one
typed by hand. The claim is recorded in the ADR, not in the data.

**It fills the date-aware count, never today's holding.** The figure is the same one the save gate
compares against and the same one `Disponible` displays. Filling anything else could populate a
value the form immediately rejects, and a control that produces an invalid field is worse than no
control. On a backdated sale this means "everything this date can sell" rather than "close the
position" — with a later buy on the books, a backdated full exit correctly leaves a position open
today.

**It is always rendered, and disabled when there is nothing to sell or a save is in flight** — the
in-flight case for the same reason **Guardar movimiento** has it: a failed save undertakes to leave
every field as the user typed it, and a tap landing during the wait would break that. Otherwise:
no **Símbolo** typed, or
nothing held on the chosen date. Not conditional. The breakdown and save button live in a fixed
block outside the scrolling area, so a control that appears and vanishes there moves **Guardar
movimiento** vertically, in the one zone where a mis-tap writes a **Movement** to Postgres. A
permanently present control with a disabled state costs one dim row on an empty form and buys zero
layout shift, plus discoverability before the user has typed anything.

**Placement is directly above Guardar movimiento**, inside the fixed bottom block, grouping every
action on the screen in one place. It is styled subordinate to the save button — ghost against the
save button's filled treatment — so the screen keeps a single primary action.

**The label is `Vender todo` and carries no figure.** The count is redundant in the label because
tapping puts it in the field, and `Disponible` already states it beside **Acciones**. The
accessible label does carry it, since a VoiceOver user cannot glance at the field to see what the
control did.

**Tapping marks the shares field touched.** A filled value is always greater than zero and within
the available count, so no error can fire at the moment of the tap; the effect is only that a
subsequent bad edit reports itself immediately instead of waiting for blur.

**A stale fill is left alone.** Change the **Fecha** after tapping and the figure is not recomputed.
The gate blocks the dangerous direction — an over-sell is refused with the date-qualified message
the form already has — and permits the harmless one, a sale that is simply no longer the whole
position. Re-filling on date change would require tracking that the value came from the control,
which is the mode this design rejected.

**Visual treatment and interaction detail live in the UX brief, not here.** The control's
secondary styling against the primary save button, its three states, its copy, its haptic, its
pressed feedback and its touch target are UX.md §4–§7; its behaviour on tap is §7 and the
backdated fill table is §8.

## Testing Decisions

**A good test here asserts behaviour the user can observe** — that the figure the control writes is
accepted by the form and closes the position — not that a particular setter was called. The control
itself is screen wiring; the property worth guarding is the arithmetic agreement underneath it.

**The guard already exists.** `selling the full position shown as Disponible`, in the sell
view-model's test file, already derives a position through the buy form, takes the available count,
renders it exactly as the helper does, feeds that string back through the form's own summary, and
asserts the sale is permitted and not flagged as an over-sell. That is precisely the path the
control automates. **Its framing changes with this slice and must be updated**: the comment
describes a historical over-sell bug and calls the rendered figure "what the Acciones helper
displays"; it is now what the control *writes*, and it is the feature's only safety net. Someone
loosening or deleting it later would silently remove that net with nothing in the file to warn them.

**That test is also the tripwire for a deferred decision.** Share precision lives in three
independent literals — the rounding helper, the share formatter, and the sell field's input
sanitiser — and a proposal to move them from five decimals to four was analysed and set aside. If
any one of them moves without the others, this is the test that fails.

**One new case is worth adding: the backdated fill.** The existing test has a single buy and no
later movements, so the available count is uncapped. The control's most valuable case is the capped
one — a sale dated before a later buy or a later sale, where the figure is reduced so the movements
after it still have shares behind them. That path, from cap through rendering to the gate, is
covered nowhere today, and it is the fill no user could compute by hand.

**Prior art:** the sell view-model's own test file is the direct template — plain vitest against the
pure summary function, no rendering, no testing-library. Engine behaviour (**Realized P&L**, the
**Average Cost** reset on full exit, cash proceeds) is already covered in the portfolio reducer,
cash and valuation tests and is not re-tested here.

**Not tested:** the control's rendering, its disabled state, its haptic and its accessible label. The
repo has no component-test harness installed, and this slice does not add one.

## Out of Scope

- **Any change to share precision.** Moving from five decimals to four was analysed in full and set
  aside; `0014` records why. This slice changes no literal.
- **Storing the Monto, or capturing the broker's share count at buy time.** Either removes the
  divergence at its source rather than at the exit, and one of them is the eventual answer. Both are
  product changes with their own slices, and `0012` already defers the first.
- **Clearing existing Dust automatically.** The control makes the corrective sale easy to record; it
  does not record one for the user, and such a sale represents a trade the broker never made.
- **The fully-exited position becoming unreachable.** Closing a position drives its share count to
  zero and the ticker leaves **Mis Activos**, taking its detail screen with it. Already found,
  diagnosed and deferred in the tech-debt backlog; this slice makes clean exits routine and thereby
  sharpens it, but does not address it.
- **A "Comprar todo" counterpart**, or any equivalent on the four other movement forms. Only a sell
  consumes a quantity the app derived.
- **An edit or delete path for movements.** Still create-only.
- **Component or RNTL tests.** No harness installed; not added here.

## Further Notes

- **The reversal is evidential, not aesthetic.** `.scratch/sell-ux/UX.md` §14 refused this control as
  "a trading affordance; for a tracker the user knows the exact shares". `0012` makes that premise
  false, and always did — the user cannot know a number the app derives and displays nowhere. The
  settled decision has been flipped in place with that reason attached rather than quietly deleted,
  because a numbered decision that silently reverses is worse than one that never existed.
- **The word "shortcut" is avoided throughout on purpose.** It is the exact word the original
  rejection used, and reusing it invites a reader to conclude the reversal was a matter of taste.
- **Cash was already wrong by about this much.** The two cents `0014` accepts are not new
  divergence: the Monto was recorded as $100.00 when the fill was nearer $99.99, so Pulso's **Cash**
  and Hapi's balance had already parted company. This slice chooses where that gap is visible.
- **The registered data is test data and is resettable**, so no migration accompanies this slice and
  the existing NFLX **Dust** is not a constraint on the design.
