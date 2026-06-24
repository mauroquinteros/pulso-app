# Valuation + portfolio assembly (prices applied, Total Return, reconciliation)

> Type: AFK

## Parent

[Portfolio Derivation Engine PRD](../PRD.md) — covers user stories 1, 3, 7, 8, 9, 10, 11, 12.
Missing-price behavior governed by the PRD's locked "option A" policy.

## What to build

The capstone that combines the per-ticker reducer facts (issue 01) and Cash
(issue 02) with a **current-price map** (`ticker → price`) to produce the
price-applied figures and the portfolio summary.

Per **Holding**: `Market Value = price × shares held`, `Net P&L = Market Value −
Cost Basis`, `Net P&L % = Net P&L ÷ Cost Basis`. Portfolio-level: `Total Portfolio
Value = Cash + Market Value`; `Total Return = Net P&L + Realized P&L + net dividends
− total fees` exposed with its four components; `Total Return % = Total Return ÷
(total deposits − total withdrawals)`. The output keeps **movement facts** separate
from **price-applied facts**.

Apply the **missing-price policy (option A)**: a held ticker with no price has its
Market Value/Net P&L reported unavailable (never faked), is excluded from Total
Portfolio Value/Total Return, and its unavailability is exposed (per-holding flag +
a portfolio-level count) — while movement facts remain correct.

Finally, wire `lib/mock-data.ts` to emit engine-derived `MOCK_HOLDINGS` and
`MOCK_PORTFOLIO_SUMMARY` from a hardcoded price map, replacing today's hand-computed
values.

## Acceptance criteria

- [x] Engine accepts a current-price map and computes per-holding Market Value, Net P&L, and Net P&L % (of Cost Basis).
- [x] Total Portfolio Value = `Cash + Market Value`.
- [x] Total Return = `Net P&L + Realized P&L + net dividends − total fees`, with its four components individually available, and Total Return % = `Total Return ÷ (deposits − withdrawals)`.
- [x] Total fees include account-level deposit/withdrawal fees (not attributed to any ticker).
- [x] Output separates movement facts (Cash, Cost Basis, Realized P&L, dividends, fees) from price-applied facts (Market Value, Net P&L, Total Portfolio Value, Total Return).
- [x] Missing price: holding's Market Value/Net P&L reported unavailable, excluded from price-applied totals, unavailability exposed per-holding and as a portfolio-level count; movement facts unaffected.
- [x] `lib/mock-data.ts` produces engine-derived holdings + summary from a hardcoded price map; no hand-computed values remain.
- [x] Tests cover: per-holding and portfolio valuation figures for a known portfolio; a reconciliation property test asserting `Cash + Market Value == (deposits − withdrawals) + Total Return`; the missing-price case.

## Blocked by

- `01-holding-facts-reducer.md`
- `02-cash-computation.md`
