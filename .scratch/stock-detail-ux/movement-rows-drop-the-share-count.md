# Movement rows no longer show a share count

**Status:** implemented, uncommitted · **Decided:** 2026-08-28

```
before   Compra
         18 mar 2024 · 0.47862 acc          $200.15 ↑

after    Compra
         18 mar 2024                        $200.15 ↑
```

The row is now title, date, amount, and the buy's cheap-vs-expensive mark. The
count lives one tap away in the movement receipt, which already prints
**Acciones** and **Precio de ejecución** (`components/movement-detail/view-model.ts`,
`tradeFacts`).

## Why

Mauro's call, twice: the row's job is *what happened, when, for how much*, and
the detail is a tap away. A derived five-decimal figure at the same size and
colour as the date claimed more attention than it earned on every row.

## The argument against, recorded because it may resurface

I pushed back and lost on the merits, but the reasoning is worth keeping for
whoever next debugs a share-count discrepancy and finds this screen empty.

**1. The share column was the only figure on the screen that reconciled
exactly.** With the two MSFT buys:

```
ACCIONES     0.82413    =  0.47862 + 0.34551        exact
COSTO TOTAL  $340.00    ≠  $200.15 + $140.15        out by the $0.30 commission
```

Cost Basis excludes **Fees**, so the amounts never sum to it. Nothing now
printed in the list adds up to a figure printed above it.

**2. Five decimals is load-bearing here, unlike anywhere else.** `CONTEXT.md`'s
**Dust** entry: the app's derived count and the broker's fill *"part company in
the fifth decimal."* Per-movement counts were the only place that divergence was
visible without opening every receipt in turn — which is exactly the operation
that catches it.

**Why that lost:** summing five-decimal numbers across rows is something nobody
does casually. It was an audit affordance wearing a reading affordance's
clothes, and audits are motivated enough to tap.

**If a Dust investigation ever needs it back**, the cheaper answer is probably a
reconciliation line under the movements list ("estos movimientos suman N
acciones") rather than restoring a per-row column.

## Also removed by this change

- `StockMovementRow.sharesLabel` and its derivation in `buildStockDetailView`.
- The `sharesLabel` prop on the shared `MovementRow` — the Movimientos tab never
  passed it, so the component now has one per-stock extra (`buyTone`) instead of
  two.
- `formatSharesLabel` had already gone in the preceding change (the `acc` suffix
  removal); `formatShares` is now the app's only shares formatter.
