# Mirror Hapi's moving-average cost method for unrealized P&L

Pulso models a Hapi brokerage account and shows an unrealized **Net P&L** badge that depends on each position's average cost per share. Average cost can be computed several ways, and they disagree once a ticker is bought again after a partial sale.

## Decision

Per-ticker average cost is a **moving (running) weighted average of buy orders**: it updates on each buy, is **unchanged by sells** (a sell only reduces quantity, not the per-share average), and **resets to zero when the position is fully closed**. **Commissions are excluded** from average cost — fees are tracked separately and reduce Cash. This is the broker-standard display convention (Hapi, Robinhood, etc.) — chosen for familiarity and so the user can cross-check Pulso against their real Hapi account, not because Hapi's reporting is authoritative.

## Considered options

- **Overall-average** (total spent on all buys ÷ total shares bought): simplest, and what the previous `computeAvgCost` did — but diverges from Hapi on a buy-after-partial-sale, showing a different average than the broker.
- **FIFO / tax lots**: tax-accurate realized gains, but high complexity and not what Hapi displays.

## Consequences

- FIFO / tax-lot accounting is **explicitly out of scope**; realized gains are not tax-accurate. (Brokers themselves treat displayed average cost as separate from tax cost basis, which is FIFO by default for stocks.)
- `computeAvgCost` must change from the overall-average formula to process movements in date order and reset on full exit. It only produces different numbers than before when a ticker is bought again after a partial sale.
