# 01 - The buy form's total is the figure that leaves Buying Power

Type: **AFK** - a derived figure and a message; no schema, no network, no new module.

## Parent

`.scratch/buy-movement/PRD.md`

## What to build

The buy form computes **Total a pagar** from the shares it derived rather than from the **Monto**
typed: `executionPrice × shares + fee`, which is the identical expression the derivation engine
uses for a buy's **Cash Impact**. The same figure drives the funds gate, so a buy whose real cost
exceeds available **Cash** cannot be saved. The insufficient-funds message becomes
**"El total a pagar supera tu efectivo."**

**Why this matters.** A buy is stored as a share count and an execution price; the Monto is not
kept. Shares round to five decimals, so the principal recovered by multiplying the two back
together drifts from the Monto by up to `0.000005 × executionPrice` - invisible on a $7 share,
three and a half cents on a $7,000 one. With **Cash** $1,000.00, **Precio** $7,000.00 and
**Monto** $1,000.00 the shares come to `0.14286` and the real cost is **$1,000.02**: the form
promises $1,000.00, the gate passes `1000 <= 1000`, and **Buying Power** lands at -$0.02. The
same movement's receipt would print $1,000.02, because the detail view already derives a buy's
**Gross Amount** from the Cash Impact - it had to, or the receipt came a cent short of adding up.
Two screens, one buy, two totals.

The **Fee** causes the same divergence far more often and always has: a Monto equal to your Cash
with any commission at all is refused by a message naming the exact figure just typed, which
reads as a defect in the app rather than as a fact about the buy.

Shares keep rounding **to nearest**. ADR 0012 records why rounding down - which would make Monto
a true ceiling and is genuinely attractive on its own - is the wrong direction to move while
storing the typed Monto remains on the table.

The new message names the relationship and repeats no figures, because both are already on
screen: available Cash sits directly above the Monto field, and the total is pinned below the
scroll area and visible with the keyboard raised.

**This lands before a buy can be saved, deliberately.** Shipping persistence first opens a window
in which a real row is written that overdraws Cash, and ADR 0007 means no later edit revalidates
it.

## Acceptance criteria

- [ ] Total a pagar is computed as `executionPrice × shares + fee`, from the same rounded share
      count the form displays
- [ ] The funds gate tests that same figure, so a buy whose real cost exceeds available **Cash**
      cannot be saved
- [ ] A named test covers Cash $1,000.00 / Precio $7,000.00 / Monto $1,000.00: total $1,000.02
      and the gate closed
- [ ] A **Comisión** that pushes the total past available Cash closes the gate
- [ ] A blank or non-positive Monto still yields a total of $0.00 whatever the fee
- [ ] The insufficient-funds message reads "El total a pagar supera tu efectivo." and names no
      figures
- [ ] Shares still round to nearest at five decimals - no rounding direction changes anywhere
- [ ] The símbolo confirmation gate is unchanged: a buy is still unsaveable until the símbolo
      confirms

## Blocked by

None - can start immediately.
