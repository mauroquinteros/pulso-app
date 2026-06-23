# Cash computation (Buying Power from all movements)

> Type: AFK

## Parent

[Portfolio Derivation Engine PRD](../PRD.md) — covers user stories 1 (cash side), 2.

## What to build

A pure fold over **all** movements producing **Cash / Buying Power**:
`deposits − withdrawals − buy cost + sell proceeds + net dividends`, with **every
fee subtracted** as it occurs. Fee types: deposit `transferFee`, buy `fee`, sell
`fee` + `regulatoryFees`, withdrawal `fee`. Dividend `tax` is netted into dividends
(`gross − tax`) and is **not** treated as a fee. Deterministic and independent of
the per-ticker reducer.

## Acceptance criteria

- [x] Cash reflects deposits and sell proceeds as inflows; withdrawals and buy cost as outflows.
- [x] Net dividends (`gross − tax`) are added to Cash.
- [x] Every fee type reduces Cash: deposit `transferFee`, buy `fee`, sell `fee` + `regulatoryFees`, withdrawal `fee`.
- [x] Dividend `tax` is netted into dividends and never double-counted as a fee.
- [x] Result is deterministic and order-independent.
- [x] Tests cover: each movement type's effect in isolation; every fee subtracted; dividend tax netted (not counted as a fee); a full mixed history.

## Blocked by

None - can start immediately (independent of issue 01).
