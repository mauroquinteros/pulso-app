# Pulso

A personal portfolio tracker. The user records **movements** (buys, sells, dividends, deposits, withdrawals) and the app derives their current holdings, cash, and performance.

## Language

**Movement**:
A single recorded event in the account: a buy, sell, dividend, deposit, or withdrawal. The user's whole history is a list of movements; everything else is derived from them.

**Total Portfolio Value**:
What the account is worth right now: **Market Value** of all holdings plus **Cash**. This is the headline number on the home screen.
_Avoid_: balance, net worth, total amount

**Cash** (a.k.a. **Buying Power**):
Uninvested money available to trade. It is `deposit amounts − withdrawal amounts − buy cost + sell proceeds + net dividends`, where each deposit/withdrawal **amount** is the cash-side figure (what lands in or leaves Buying Power). Trading **Fees** (buy/sell commissions) are subtracted as they occur; transfer fees on deposits/withdrawals do *not* touch Cash — they live in the gap between Cash and **Net Contributions** (see `docs/adr/0003-cash-side-movement-amounts.md`). Realized gains and dividends flow into Cash and are not re-counted as profit.
_Avoid_: balance, funds

**Cash Impact**:
The change a single **Movement** makes to **Cash**, net of trading **Fees**. By type: deposit `+amount`, withdrawal `−amount` (cash-side; transfer fees excluded), buy `−(executionPrice × shares + fee)`, sell `+(gross − fee − regulatoryFees)`, dividend `+`**Net Dividends** `(gross − tax)`. It answers "how did this movement change my Buying Power," and reconciles: the running sum of every movement's Cash Impact equals **Cash**. Its direction is fully determined by the movement's type — deposits, sells and dividends always add; buys and withdrawals always subtract.
_Avoid_: amount (unqualified — the typed `amount` field is only the deposit/withdrawal cash-side figure), monto (unqualified), total

**Market Value**:
The current worth of a holding: `current share price × shares held`. The sum across all holdings is the holdings portion of **Total Portfolio Value**.
_Avoid_: current invested amount, current value

**Allocation** (a.k.a. **Distribución**):
The share of **Total Portfolio Value** that a position — or **Cash** — represents: `Market Value ÷ Total Portfolio Value` (for Cash, `Cash ÷ Total Portfolio Value`). Allocations always sum to 100% because holdings missing a price are excluded from Total Portfolio Value itself (they are flagged, never estimated). The Home's cash-vs-invested split is the coarse two-segment view of the same concept.
_Avoid_: weight, peso, composición (unqualified)

**Average Cost**:
The weighted-average price paid per share of a position currently held, used only to measure **Net P&L**. It updates on each buy, is unchanged by sells, and resets to zero when the position is fully closed. Excludes **Fees**. Mirrors how Hapi reports average cost (see `docs/adr/0001-moving-average-cost-method.md`).
_Avoid_: cost per share, basis, break-even

**Cost Basis**:
What the user paid for the shares they currently hold: `Average Cost × shares held`. Because **Average Cost** excludes commissions, so does Cost Basis — fees never enter it.
_Avoid_: invested amount, total invested

**Net P&L**:
**Unrealized** gain or loss on currently-held shares only: `Market Value − Cost Basis`. It equals the sum of the per-holding P&L rows. As a percentage: `Net P&L ÷ Cost Basis`. It deliberately excludes realized gains and dividends, so `Total Portfolio Value ≠ deposits + Net P&L` — that identity does not hold and is not expected to.
_Avoid_: profit, return, total gain

**Realized P&L**:
The **gross** locked-in gain or loss from shares the user has sold — price gain only: `(sale price − Average Cost at time of sale) × shares sold`, **before** sell fees. Sell commissions are not netted here; they live in **Fees**, and their effect is already captured in **Total Return**. Real cash, already inside **Cash**, and excluded from **Net P&L**.
_Avoid_: capital gain (a tax term), booked profit, net realized

**Total Return**:
The complete, all-in gain or loss: `Net P&L (unrealized) + Realized P&L + Net Dividends − Fees`. Equivalently `Total Portfolio Value − Net Contributions`. As a percentage: `Total Return ÷ Net Contributions`. The app's headline transparency figure, shown with its four components broken out — the number Hapi obscures.
_Avoid_: real P&L (informal; pending UI-label decision), total gain, profit

**Net Contributions** (a.k.a. **Aportado**):
What the user has actually put in, measured at the **bank boundary** (out of pocket): a deposit contributes `amount + transferFee` (the money that left your bank to fund the account); a withdrawal removes `amount − fee` (the money that actually reached your bank). So `Aportado = Σ(deposit amount + transferFee) − Σ(withdrawal amount − fee)`. The transfer fee is therefore *part* of what you contributed — it is the friction between **Cash** and Aportado, which is exactly what makes a fee erode **Total Return**. It is the base the **Total Return** percentage is taken over, and the "Aportado" in the home screen's "Aportado → Vale hoy" bridge.
_Avoid_: principal, capital invested, net deposited

**Net Dividends**:
Dividend income actually received, after withholding tax: `gross amount − tax`. Shown as its own figure so the user can see dividend earnings separately from **Net P&L**.
_Avoid_: dividends (unqualified — always specify gross or net)

**Fee**:
Any cost charged on a movement — transfer fee on deposits/withdrawals, commission on buys, commission plus regulatory fees on sells. **Trading fees** (buy/sell) reduce **Cash** directly. **Transfer fees** (deposit/withdrawal) do not touch Cash; they sit in the gap between **Cash** and **Net Contributions**. Either way, every fee erodes **Total Return** by its full amount.
_Avoid_: commission (unqualified), charge

## Flagged ambiguities

- **"Invested amount" is banned as a standalone term** — it was used for both **Cost Basis** (what you paid) and **Market Value** (what it's worth now). Always use one of those two precise terms.
- **A deposit's typed `amount` is the Cash/Efectivo added, not Aportado.** **Aportado** is `amount + transferFee` (the full out-of-pocket); the transfer fee is the gap between Cash and Aportado, and *is* part of what was contributed. Symmetrically, a withdrawal's `amount` is the Cash removed, and the user receives `amount − fee` at their bank. See `docs/adr/0003-cash-side-movement-amounts.md`.
- **A Movement's `executionDate` is a calendar date; its `createdAt` is an instant.** `executionDate` is the day the movement happened (`YYYY-MM-DD`, no time, no timezone — never convert it); `createdAt` is the UTC instant it was recorded, shown to no one and used only as the reducer's chronological tiebreaker. Naming convention: **`-Date` = calendar date, `-At` = instant**. See `docs/adr/0004-execution-date-is-a-calendar-date.md`.
