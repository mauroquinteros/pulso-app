# Holding facts reducer (moving-average cost, realized P&L, reset on exit)

> Type: AFK

## Parent

[Portfolio Derivation Engine PRD](../PRD.md) — covers user stories 4, 5, 6, 9, 10.
Decisions governed by `docs/adr/0001-moving-average-cost-method.md`.

## What to build

A pure, deterministic per-ticker reducer that turns one ticker's **Movements** —
processed in chronological order — into its movement-derived facts: shares held,
**Average Cost**, **Cost Basis**, **Realized P&L**, net dividends, and trade fees.
This is the engine's core and replaces the old overall-average `computeAvgCost`.

**Average Cost** is a moving (running) weighted average of buys: it updates on each
buy, is **unchanged by a partial sell** (a sell reduces quantity only), and **resets
to zero on full exit** (shares reach 0), so a later re-buy starts fresh. **Realized
P&L** is gross — `(sale price − Average Cost at time of sale) × shares sold`, before
sell fees. **Cost Basis** = `Average Cost × shares held`, commissions excluded.

Also rename the `Holding` field `totalInvested` → `costBasis` (and its references)
to match the glossary.

## Acceptance criteria

- [x] Movements are processed in date order (`executedAt`, then `createdAt`); input order doesn't affect results.
- [x] Average Cost is a moving weighted average of buys; a partial sell leaves it unchanged and only reduces shares held.
- [x] Average Cost (and realized accumulation state) resets to zero when shares reach 0; a re-buy afterward starts a fresh average.
- [x] A buy-after-partial-sale sequence yields the **moving-average** result, not the overall-average one.
- [x] Cost Basis = `Average Cost × shares held`; commissions are never included.
- [x] Realized P&L = `(sale price − Average Cost at sale) × shares sold`, gross of sell fees.
- [x] Per-ticker net dividends (`gross − tax`) and trade fees (`buy fee` + `sell fee` + `regulatoryFees`) are produced.
- [x] Fractional shares (up to 5 decimals) are handled accurately.
- [x] `Holding.totalInvested` is renamed to `costBasis`; no dangling references remain.
- [x] Tests cover: weighted average over multiple buys; partial sell (avg unchanged); buy-after-sell (moving-average); full exit then re-buy (reset + realized accumulates across rounds); fractional shares.

## Blocked by

None - can start immediately.
