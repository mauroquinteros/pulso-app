# A full exit sells the app's share count, not the broker's

The sell form takes **Acciones** from the user, but under `docs/adr/0012-a-buy-total-is-derived-from-its-shares.md` a bought position's share count is *derived* (`Monto / Precio`) rather than recorded from the broker's fill. The two disagree, and the user has no way to know by how much: the app's figure is shown at full precision nowhere except the `Disponible` helper on this form.

So the form carries a **Vender todo** control that fills **Acciones** with the app's own available count. Selling that figure closes the position to exactly zero. The point is not fewer keystrokes — it is that the calculation comes out right and the portfolio is left clean.

The real case that forced it: NFLX bought with two Montos of $100 and $50, stored as `1.68039 + 0.78174 = 2.46213` shares. Hapi actually filled **2.4619**. Selling Hapi's figure left **0.00023** shares — about two cents — sitting in **Mis Activos** permanently, reporting `P&L NO REALIZADA +$0.01 +100.00%`, because the percentage is **Net P&L** over a one-cent **Cost Basis**. See **Dust** in `CONTEXT.md`.

## What it costs

The stored sale says 2.46213 shares where the broker sold 2.4619, so **Cash** is credited roughly two cents that never arrived. **The disagreement is not removed, it is moved** — out of the share count, where it is permanent and on screen, into Cash, where it is invisible. That is the trade ADR 0012 already made when it rounded the buy total to the cent: a residue nobody can see beats a contradiction nobody can explain.

It is not new divergence either. Cash already disagrees with Hapi by about this much, because the Monto was recorded as $100.00 when the fill was nearer $99.99.

**Measured on the exit itself** (2026-08-24 — NFLX at $70.10, $0.15 commission, $0.02 regulatory):

| | Acciones | Monto bruto | Total recibido |
|---|---|---|---|
| Pulso | 2.46213 | $172.60 | **$172.43** |
| Hapi | 2.4619 | $172.58 | **$172.41** |

`0.00023 x $70.10 = $0.0161`, which lands on **$0.02** — and the position closed to zero rather than
keeping the fraction. So the cost above is not an estimate: two cents is the figure, and it is the
whole of what this decision trades away.

## Considered Options

- **Move share precision from 5 dp to 4 dp**, matching what Hapi stores. Analysed and set aside: it does not fix the case. The dust falls only from 0.00023 to 0.0002, because 0.00017 of the error comes from the Monto being typed as $100.00 against a ~$99.99 fill and just 0.00001 from precision — the Monto dominates twentyfold. It would also multiply ADR 0012's buy-total drift tenfold, making it visible above $100 a share instead of above $1,000.
- **Store the Monto, or let the buy form take the broker's share count directly.** Either removes the divergence at its source instead of at the exit, and one of them is the eventual answer. Both are product changes with their own slices — ADR 0012 already defers the first — and neither helps positions already recorded.
- **Do nothing; let the user type the broker's figure.** The status quo, and it guarantees Dust on every position bought by Monto. It also rests on a premise ADR 0012 makes false — `.scratch/sell-ux/UX.md` §14 refused this control because "for a tracker the user knows the exact shares", and the user cannot know a number the app derives and never displays.

## Consequences

- **The control fills; it does not commit.** The count lands in **Acciones** as ordinary editable text. No full-exit flag is stored, and nothing downstream can tell a sale made this way from one typed by hand. Change the **Fecha** afterwards and the figure goes stale: the save gate blocks the dangerous direction (an over-sell) and permits the harmless one (a sale that is no longer the whole position).
- **On a backdated sale it means "everything this date can sell", not "close the position".** It fills `maxSellableAsOf`, which caps the count so later movements still have shares behind them — so with a later buy on the books, a backdated full exit leaves a position open today. That is correct; the label is a simplification of it.
- **It is also the only way to clear Dust that already exists**, and doing so records a sale the broker never made.
- **Nothing in the engine or the view-model changes.** The control is a fill in `app/add-movement/sell.tsx`. What makes it resolve is that `roundShares` (1e5), `formatShares` (`toFixed(5)`) and the sell gate all agree at five decimals; the test `selling the full position shown as Disponible` in `components/add-movement/sell-view-model.test.ts` is what holds those three literals together, and is the first thing to fail if the precision decision above is ever revisited.
