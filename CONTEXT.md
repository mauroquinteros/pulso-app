# Pulso

A personal portfolio tracker. The user records **movements** (buys, sells, dividends, deposits, withdrawals) and the app derives their current holdings, cash, and performance.

## Language

**Movement**:
A single recorded event in the account: a buy, sell, dividend, deposit, or withdrawal. The user's whole history is a list of movements; everything else is derived from them.

**Total Portfolio Value**:
What the account is worth right now: **Market Value** of all holdings plus **Cash**. This is the headline number on the home screen.
_Avoid_: balance, net worth, total amount

**Cash** (a.k.a. **Buying Power**):
Uninvested money available to trade. It is `deposits − withdrawals − buy cost + sell proceeds + net dividends`, with every **Fee** subtracted as it occurs. Realized gains and dividends flow into Cash and are not re-counted as profit.
_Avoid_: balance, funds

**Market Value**:
The current worth of a holding: `current share price × shares held`. The sum across all holdings is the holdings portion of **Total Portfolio Value**.
_Avoid_: current invested amount, current value

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
The complete, all-in gain or loss: `Net P&L (unrealized) + Realized P&L + Net Dividends − Fees`. Equivalently `Total Portfolio Value − (total deposits − total withdrawals)`. As a percentage: `Total Return ÷ net contributions (total deposits − total withdrawals)`. The app's headline transparency figure, shown with its four components broken out — the number Hapi obscures.
_Avoid_: real P&L (informal; pending UI-label decision), total gain, profit

**Net Contributions** (a.k.a. **Aportado**):
What the user has actually put in: `total deposits − total withdrawals`, using the **gross** amounts — **Fees are excluded** (they erode **Total Return**, not what was contributed). It is the base the **Total Return** percentage is taken over, and the "Aportado" in the home screen's "Aportado → Vale hoy" bridge.
_Avoid_: principal, capital invested, net deposited

**Net Dividends**:
Dividend income actually received, after withholding tax: `gross amount − tax`. Shown as its own figure so the user can see dividend earnings separately from **Net P&L**.
_Avoid_: dividends (unqualified — always specify gross or net)

**Fee**:
Any cost charged on a movement — transfer fee on deposits, commission on buys/withdrawals, commission plus regulatory fees on sells. Every fee reduces **Cash**.
_Avoid_: commission (unqualified), charge

## Flagged ambiguities

- **"Invested amount" is banned as a standalone term** — it was used for both **Cost Basis** (what you paid) and **Market Value** (what it's worth now). Always use one of those two precise terms.
- **A deposit's net (`amount − transferFee`) is Cash/Efectivo, not Aportado.** **Net Contributions** uses the gross `amount`; the transfer fee reduces **Cash** and **Total Return**, never what was contributed.
