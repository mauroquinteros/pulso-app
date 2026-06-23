# PRD: Portfolio Derivation Engine

> Domain language follows [`CONTEXT.md`](../../CONTEXT.md). Decisions governed by
> [`docs/adr/0001-moving-average-cost-method.md`](../../docs/adr/0001-moving-average-cost-method.md)
> and [`docs/adr/0002-scope-boundaries-v1.md`](../../docs/adr/0002-scope-boundaries-v1.md).

## Problem Statement

I record every **Movement** in my account — buys, sells, dividends, deposits,
withdrawals — but I can't see the numbers that actually tell me how I'm doing.
Hapi hides my real profit/loss, my fees, and my dividend income, and lumps cash
and holdings together. I need my recorded movements turned into trustworthy,
reconciling figures: what my portfolio is worth, how much uninvested cash I have,
how my current holdings are performing, and how much I've truly made all-in —
with the components broken out so I can see _where_ the gain came from.

## Solution

A single derivation engine that takes my movement history (plus current share prices) and produces every portfolio figure deterministically:

- **Total Portfolio Value** = **Cash** + **Market Value**.
- **Cash (Buying Power)** = all deposits/withdrawals/proceeds/dividends, every fee subtracted.
- Per-ticker **Holding** — shares held, **Average Cost** (moving-average, reset on full exit), **Cost Basis**, **Realized P&L**, net dividends, fees.
- **Net P&L** — unrealized only, on current holdings.
- **Total Return** — all-in (unrealized + realized + net dividends − fees), with components.

The numbers always reconcile: `Total Portfolio Value = Cash + Market Value = (total deposits − total withdrawals) + Total Return`. The engine is pure and
isolated — no UI, no network, no database — so every figure is testable against fixed movement fixtures.

## User Stories

1. As an investor, I want my **Total Portfolio Value** = **Cash** + **Market Value**, with Cash/Buying Power shown as its own figure, so that the headline reflects everything I own and I know how much I can still invest.
2. As an investor, I want **Cash** to reflect deposits, withdrawals, buy cost, sell proceeds, and net dividends with **every fee subtracted**, so that my buying power is accurate and never overstated.
3. As an investor, I want **Net P&L** = `Market Value − Cost Basis` on current holdings (as a % of Cost Basis), with the per-holding figures summing to it, so that I know how my open positions are doing and the numbers stay consistent.
4. As an investor, I want **Average Cost** as a moving weighted average of my buys — **unchanged by partial sells** and **reset on full exit** — so that it matches my Hapi account.
5. As an investor, I want **Cost Basis** to exclude commissions (fees tracked separately), so that it equals what I actually paid for the shares.
6. As an investor, I want gross **Realized P&L** from shares I've sold — still counting for tickers I've **fully exited** — so that locked-in profit is visible and never disappears.
7. As an investor, I want **Total Return** = unrealized + realized + net dividends − fees, broken into those **four components** and shown as a % of **net contributed capital**, so that I see my true all-in performance and where it came from.
8. As an investor, I want the figures to **reconcile** (`Cash + Market Value` = `net contributed capital + Total Return`), so that I can trust they tie out.
9. As an investor, I want **per-ticker trade fees** and **net dividends**, plus total fees that include **account-level** deposit/withdrawal fees (not attributed to any ticker), so that costs and income are transparent and honestly attributed.
10. As an investor, I want each **Holding** to expose shares (accurate to **fractional** amounts), Average Cost, Cost Basis, Market Value, Net P&L, net dividends, and fees, so that the holdings and stock-detail screens render without re-deriving anything.
11. As a developer, I want the engine to be a **pure, deterministic function** of movements plus an explicit **current-price map**, with **movement facts separated from price-applied facts**, so that I can unit-test every figure and swap the price source without touching it.
12. As an investor, when a current price is missing for a ticker I hold, I want its Market Value/Net P&L shown as **unavailable** (never faked) and the holding flagged, so that I'm never misled by a fabricated or silently incomplete total.

## Implementation Decisions

**Three deep modules behind simple interfaces:**

1. **Per-ticker reducer.** Consumes one ticker's movements **in chronological order** (sort key: `executedAt`, then `createdAt`) and produces `{ sharesHeld, avgCost, costBasis, realizedPnL, netDividends, tradeFees }`.
   - **Average Cost is a moving weighted average of buys**: updated on each buy, **unchanged by sells** (a sell reduces quantity only), and **reset to zero on
     full exit** (shares reach 0). Per ADR-0001. This **replaces** the current overall-average behavior — a behavior change that only differs on buy-after-partial-sale sequences.
   - **Realized P&L is gross**: `(sale price − avgCost at time of sale) × shares sold`, before sell fees. Sell commissions are **not** netted here.
   - **Cost Basis** = `avgCost × sharesHeld`; commissions excluded.

2. **Cash computation.** Pure fold over **all** movements → `deposits − withdrawals − buy cost + sell proceeds + net dividends − all fees`, where every fee type is subtracted (deposit `transferFee`, buy `fee`, sell `fee` + `regulatoryFees`, withdrawal `fee`). Dividend `tax` is netted into dividends, **not** treated as a fee.

3. **Valuation layer.** Takes the movement-derived facts plus a **current-price map** (`ticker → price`) and produces the price-applied figures:
   - `Market Value` = `price × sharesHeld` per holding, summed.
   - `Net P&L` = `Market Value − Cost Basis`; `Net P&L % = Net P&L ÷ Cost Basis`.
   - `Total Portfolio Value` = `Cash + Market Value`.
   - `Total Return` = `Net P&L + Realized P&L + net dividends − total fees`;
     `Total Return % = Total Return ÷ (deposits − withdrawals)`.

**Inputs:** the typed `Movement[]` discriminated union (already defined) and a current-price map. **Outputs:** a per-ticker `Holding` list and a portfolio-level summary carrying both movement facts and price-applied facts.

**Terminology:** the existing `totalInvested` field is renamed to `costBasis` to match the glossary (the term "invested amount / total invested" is banned).

**Reconciliation is a guaranteed invariant**, not a coincidence — it holds for any consistent cost method because total buy cost is conserved across held + sold shares.

**Missing-price policy (LOCKED — option A, "exclude + flag"):** if the price map lacks a held ticker, that holding's Market Value and Net P&L are reported as
**unavailable** (not fabricated from Cost Basis or zero) and **excluded** from the price-applied totals (Total Portfolio Value, Total Return). The engine must
**expose the unavailability** — per-holding (a price-available flag / nullable Market Value) and at the portfolio level (e.g. a count of holdings missing a price)
— so a consuming screen can surface a clear "price unavailable" affordance. Movement facts (Cash, Cost Basis, Realized P&L, dividends, fees) are unaffected and remain available, so the engine **degrades gracefully**: only the price-applied slice of the affected holding is withheld. Rationale: showing a fabricated value would be the exact dishonesty Pulso exists to avoid; a visibly partial total is preferable to a silently wrong one. (Latent during the mock-data phase, where every held ticker has a price. A stale "last-known price" fallback may be reconsidered once prices are persisted — out of scope here.)

## Testing Decisions

A good test asserts **external behavior**: given a fixed `Movement[]` (and price
map), it asserts the engine's output figures — never internal steps or private
helpers. Tests use hand-built movement fixtures with known expected results; no
mocks or network. There is **no prior test suite** in the repo yet, so these
establish the pattern (pure-function fixture tests).

**Modules under test (per the user's selection): the per-ticker reducer, cash
computation, and the valuation layer.** Formatters are out of this PRD's testing.

Key cases to cover:

- **Per-ticker reducer:** single buy; multiple buys (weighted average); partial
  sell (avg cost unchanged, shares reduced); **buy-after-partial-sale** (asserts the
  _moving-average_ result, not the overall-average one — the case ADR-0001 turns on);
  **full exit then re-buy** (average resets, realized accumulates across both rounds);
  fractional shares (5-decimal precision); a ticker with dividends and fees.
- **Cash computation:** each movement type's effect in isolation; every fee type
  subtracted; dividend tax netted (not double-counted as a fee); a full mixed history.
- **Valuation layer:** Market Value, Net P&L (+ %), Total Portfolio Value, Total
  Return (+ components and %) for a known portfolio; a **reconciliation property
  test** asserting `Cash + Market Value == (deposits − withdrawals) + Total Return`;
  a holding with a **missing price** — assert its Market Value/Net P&L are reported
  unavailable, it's excluded from Total Portfolio Value/Total Return, the
  unavailability is exposed, and the movement facts (Cash, Cost Basis, Realized P&L,
  dividends, fees) remain correct.

## Out of Scope

- **FIFO / tax-lot accounting** and tax-accurate realized gains (ADR-0001).
- **Corporate actions / stock splits**, **account / inactivity fees**, **share
  transfers (ACATS)**, and **multi-currency / FX** (ADR-0002 — USD only).
- **Live price API** — the engine accepts a price map; sourcing prices is later.
- **Persistence / Supabase** — the engine operates on in-memory movements; the DB
  swap is a separate PRD.
- **All UI** — Home, Holdings, and Stock Detail screens are separate PRDs; this PRD
  delivers only the engine they consume.

## Further Notes

- This engine is the foundation the Home, Holdings, and Stock Detail PRDs build on;
  it should land (and be tested) first.
- It supersedes the old overall-average `computeAvgCost` and absorbs the existing
  `computeUnrealizedPnL`, `computeTotalFees`, and `computeNetDividends` into a single
  coherent derivation, plus the new Cash and Realized P&L logic.
- During the mock-data phase, prices come from a hardcoded map; the engine's shape
  doesn't change when a real price source arrives.
