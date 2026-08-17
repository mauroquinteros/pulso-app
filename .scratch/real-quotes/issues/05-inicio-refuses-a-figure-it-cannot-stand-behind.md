# 05 - Inicio refuses a figure it cannot stand behind

Type: **HITL** - a headline that declines to print has no precedent in this app, and the look
needs a decision before it is built.

## Parent

`.scratch/real-quotes/PRD.md`

## What to build

**Inicio** learns the difference between a number with a caveat and no number at all.

Today the derivation engine has one response to a **Holding** it cannot price: exclude it, flag
it, carry on. That is right, and `CONTEXT.md` already codifies it - **Total Portfolio Value** is
defined as the sum over priced holdings, and **Allocations** sum to 100% precisely because
unpriced holdings are excluded rather than estimated. The distribution card on **Portafolio**
already shows that flag.

**Inicio does not.** And with real prices that becomes dangerous at the limit. When *no* holding
is priced, the engine reports a **Market Value** of zero, so the home screen prints *Aportado
$5,000 → Vale hoy $50* and a **Total Return** near -100%. A dropped connection renders as a wiped
out portfolio, with nothing on the screen saying otherwise.

Two behaviours, and the distinction between them is the substance of this slice:

- **Some holdings unpriced** - a caveat on a real number. Keep printing **Vale hoy** and **Total
  Return**, and say that something is excluded, the way the distribution card does.
- **No holdings priced** - there is no number left to caveat. **Vale hoy** and **Total Return**
  decline to print.

**Efectivo stays on screen in both cases.** **Cash** derives from the **History** alone and is
still exactly right, so the app can honestly say what is held in cash while refusing to say what
it is all worth. That is the whole posture in one line: say what you know, refuse what you do not,
and never split the difference by guessing.

The decision belongs in the home view-model as a pure function of the portfolio and the read's
status - one testable place rather than branching scattered through JSX. The derivation engine is
**not** touched: it keeps its exact signature and never learns that a read exists.

**What needs a human before this is built:** what "declines to print" looks like. A dash, a muted
placeholder, a short sentence in place of the figure, or the card not rendering at all are four
different answers with four different feels, and the app has no existing example to copy.

**How to see it work.** Insert two buy rows by SQL - one for a ticker present in `stocks`, one for
a ticker that is not - to produce the partial case. Break connectivity and relaunch for the total
case.

## Acceptance criteria

- [ ] The visual treatment for a refused figure is agreed with the user before implementation
- [ ] With every **Holding** priced, **Inicio** is unchanged from today
- [ ] With some holdings unpriced, **Vale hoy** and **Total Return** still print and **Inicio**
      states that something is excluded
- [ ] With no holdings priced, **Vale hoy** and **Total Return** do not print
- [ ] **Efectivo** is shown in all three cases
- [ ] A **Perfil** with no **Movements** at all sees the existing empty state, not a refusal -
      an empty portfolio is not the same as an unpriceable one
- [ ] The decision is a pure function of the portfolio and the read status, not branching inside
      the screen
- [ ] The derivation engine's signature and behaviour are untouched
- [ ] Verified on a device for all three cases using SQL-inserted buy rows
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

- `.scratch/real-quotes/issues/02-a-holding-is-valued-from-the-stocks-table.md`

## Closed

The visual treatment was agreed before implementation, as the first criterion
required: refuse only price-dependent figures, keep every figure the History alone
decides. Refusing at card level was rejected for hiding four correct ones.

Two changes to what was originally built, both after review. The placeholder is two
words rather than one - "Sin dato" before a read has answered, "No se pudo calcular"
once one has, because a figure withheld during a load in progress is not a failure
and saying so was a claim the app had no grounds for. And the explanatory sentence
was dropped entirely: the placeholder says what happened and Mis Activos lists every
holding with "Sin precio" against it.

**Not verified on a device** - it needs Holdings, priced and unpriced, so it waits
for the Compra form with the rest.
