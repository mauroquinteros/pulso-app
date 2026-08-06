# Pulso

A personal portfolio tracker. The user records **movements** (buys, sells, dividends, deposits, withdrawals) and the app derives their current holdings, cash, and performance.

## Language

**Movement**:
A single recorded event in the account: a buy, sell, dividend, deposit, or withdrawal. The user's whole history is a list of movements; everything else is derived from them.

**Total Portfolio Value**:
What the account is worth right now: **Market Value** of all holdings plus **Cash**. This is the headline number on the home screen.
_Avoid_: balance, net worth, total amount

**Cash** (a.k.a. **Buying Power**):
Uninvested money available to trade. It is `deposit amounts − withdrawal amounts − buy cost + sell proceeds + net dividends`, where each deposit/withdrawal **amount** is the cash-side figure (what lands in or leaves Buying Power). Trading **Fees** (buy/sell commissions) are subtracted as they occur; transfer fees on deposits/withdrawals do _not_ touch Cash — they live in the gap between Cash and **Net Contributions** (see `docs/adr/0003-cash-side-movement-amounts.md`). Realized gains and dividends flow into Cash and are not re-counted as profit.
_Avoid_: balance, funds

**Cash Impact**:
The change a single **Movement** makes to **Cash**, net of trading **Fees**. By type: deposit `+amount`, withdrawal `−amount` (cash-side; transfer fees excluded), buy `−(executionPrice × shares + fee)`, sell `+(gross − fee − regulatoryFees)`, dividend `+`**Net Dividends** `(gross − tax)`. It answers "how did this movement change my Buying Power," and reconciles: the running sum of every movement's Cash Impact equals **Cash**. Its direction is fully determined by the movement's type — deposits, sells and dividends always add; buys and withdrawals always subtract.
_Avoid_: amount (unqualified — the typed `amount` field is only the deposit/withdrawal cash-side figure), monto (unqualified), total

**Gross Amount** (UI: "Monto bruto"):
What a **Movement** is worth _before_ its **Fees** and taxes are applied — the figure every deduction is taken from. For a buy or sell it is the trade principal, `executionPrice × shares`; for a dividend it is the declared gross, before withholding tax. Deposits and withdrawals have no Gross Amount: their headline is the cash-side `amount` itself, and the transfer fee sits _outside_ it (see `docs/adr/0003-cash-side-movement-amounts.md`). Adjusting a Gross Amount by the fees that touch **Cash** yields the movement's **Cash Impact**.
_Avoid_: subtotal, principal, monto (unqualified — always say which one)

**Market Value**:
The current worth of a holding: `current share price × shares held`. The sum across all holdings is the holdings portion of **Total Portfolio Value**.
_Avoid_: current invested amount, current value

**Stale Price**:
A share price older than the last moment the market could have moved it. Staleness is measured against **market activity, never against the clock**: a Friday-close price read on Sunday morning is _not_ stale — the market was shut the whole time, so it is exactly right — while a price from twenty minutes ago during trading hours is. A stale price is **not** a _missing_ price, and the two must never be spoken of as one: a missing price announces itself, while a stale price looks exactly like a good one. That is the whole reason the distinction has a name.
_Avoid_: old price, outdated price, precio desactualizado (unqualified — always say stale or missing)

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
The complete, all-in gain or loss: `Net P&L (unrealized) + Realized P&L + Net Dividends − Fees`. Equivalently `Total Portfolio Value − Net Contributions`. As a percentage: `Total Return ÷ Peak Contributions` — the base is **Peak Contributions**, _not_ **Net Contributions**. Once a realized gain lets the user withdraw more than they deposited, Net Contributions shrinks (and can go negative), which would inflate or invert the percentage; Peak stays fixed at the capital actually put at risk. The app's headline transparency figure, shown with its four components broken out — the number Hapi obscures.
_Avoid_: real P&L (informal; pending UI-label decision), total gain, profit

**Total Return of a stock** (UI: "Retorno total"):
The same four-component formula scoped to one ticker: `Net P&L + Realized P&L + Net Dividends − Fees`, counting every movement ever recorded for that ticker. It answers "how has this stock done for me", as opposed to **Net P&L**, which only answers "how is the position I still hold doing". **It is a dollar figure and carries no percentage** — deliberately. There is no denominator to divide it by: **Net Contributions** is a bank-boundary concept and does not scope to a ticker, and **Cost Basis** only counts the shares still held, so a lifetime numerator over a current-position denominator inflates without bound as the user sells (sell half a doubled position and the ratio prints roughly double the true return; exit fully and the denominator is zero). The only percentage that belongs beside it is **Net P&L**'s, whose numerator and denominator are both current-position figures.
_Avoid_: stock return %, per-stock ROI (there is no such ratio)

**Net Contributions** (a.k.a. **Aportado**):
What the user has actually put in, measured at the **bank boundary** (out of pocket): a deposit contributes `amount + transferFee` (the money that left your bank to fund the account); a withdrawal removes `amount − fee` (the money that actually reached your bank). So `Aportado = Σ(deposit amount + transferFee) − Σ(withdrawal amount − fee)`. The transfer fee is therefore _part_ of what you contributed — it is the friction between **Cash** and Aportado, which is exactly what makes a fee erode **Total Return**. It is the base of the _dollar_ **Total Return** (`Total Portfolio Value − Net Contributions`) and the "Aportado" in the home screen's "Aportado → Vale hoy" bridge — but **not** the base of the Total Return _percentage_, which is taken over **Peak Contributions** (a withdrawal can pull Net Contributions below an earlier peak, or negative).
_Avoid_: principal, capital invested, net deposited

**Peak Contributions**:
The high-water mark of **Net Contributions**: walk deposits and withdrawals in chronological order, track the running total, and take the highest it ever reached — the most of your own money ever in at once, i.e. the capital actually put at risk. It is the base the **Total Return** _percentage_ is divided by. Unlike **Net Contributions** it never shrinks on a withdrawal: once a realized gain lets you withdraw more than you deposited, Net Contributions falls (possibly below zero) and dividing by it would invert or inflate the percentage, while Peak stays fixed at the true capital deployed. It equals **Net Contributions** whenever no withdrawal has dropped the running total below an earlier high; the two diverge only after such a withdrawal, and the home screen surfaces a tooltip on the percentage in exactly that case (the base is otherwise not shown on screen).
_Avoid_: max contributions, high-water aportado (informal), peak invested

**Net Dividends**:
Dividend income actually received, after withholding tax: `gross amount − tax`. Shown as its own figure so the user can see dividend earnings separately from **Net P&L**.
_Avoid_: dividends (unqualified — always specify gross or net)

**Fee**:
Any cost charged on a movement — transfer fee on deposits/withdrawals, commission on buys, commission plus regulatory fees on sells. **Trading fees** (buy/sell) reduce **Cash** directly. **Transfer fees** (deposit/withdrawal) do not touch Cash; they sit in the gap between **Cash** and **Net Contributions**. A transfer fee is **one concept in both directions**, not two: it is skimmed from the transfer while it is in flight — you send `amount + transferFee` and `amount` arrives, or `amount` leaves and `amount − transferFee` reaches the bank — so a deposit's and a withdrawal's are the same thing, and each raises Net Contributions by exactly the fee. Either way, every fee erodes **Total Return** by its full amount.
_Avoid_: commission (unqualified), charge

**Perfil**:
Who is using the app: a full name and an email address. It is the single source of the user's identity _within itself_ — every place that shows the user (the Home avatar disc, the Settings screen) reads the same Perfil, so a signed-in user is never spelled two ways. The full name is **one** name, not a first name and a last name held apart; initials for the avatar are derived from it at display time, never stored. Deliberately holds nothing about money — a Perfil owns **Movements**, but says nothing about them.

A Perfil is **not a person**. It is one sign-in identity, distinguished by its email address. The same human who signs in a different way arrives as a _different_ Perfil, and the two share nothing: separate **Movements**, separate holdings, separate **Total Portfolio Value**. Neither can see the other, and nothing in the app reconciles them.

A Perfil is never **registered**. There is no such act: the first time a human signs in, the Perfil begins; every later sign-in finds the one already there. The app cannot tell those two moments apart, and does not try — so it never asks a human whether they are new, and there is no "create an account" anywhere to be found.
_Avoid_: cuenta/account (taken by the Hapi brokerage account, where **Cash** lives), usuario (unqualified), person/persona (a Perfil is an identity, not a human)

## Flagged ambiguities

- **"Invested amount" is banned as a standalone term** — it was used for both **Cost Basis** (what you paid) and **Market Value** (what it's worth now). Always use one of those two precise terms.
- **A deposit's typed `amount` is the Cash/Efectivo added, not Aportado.** **Aportado** is `amount + transferFee` (the full out-of-pocket); the transfer fee is the gap between Cash and Aportado, and _is_ part of what was contributed. Symmetrically, a withdrawal's `amount` is the Cash removed, and the user receives `amount − transferFee` at their bank. See `docs/adr/0003-cash-side-movement-amounts.md`.
- **"Cuenta" is banned as a standalone term** — it reads as both the **Perfil** (who logs in) and the Hapi brokerage account (where **Cash** and the holdings live). Say which one.
- **A **Perfil** is an identity, not a human.** One person can own several Perfiles — one per email they sign in with — and the app treats them as unrelated strangers. Say "Perfil" when you mean the identity whose Movements are on screen; say "the human" when you mean the person holding the phone. Never assume the two are one-to-one.
- **A **Movement** carries no owner.** A Movement says nothing about whose it is. The **Perfil** is the _context_ a list of Movements is read in, never a property of any one of them: ownership is established once, when the Movement is stored, and enforced again on every read — so the app neither states it nor checks it. If a Movement seems to need an owner field, the real question is "which Perfil's history am I looking at", and that is answered by the session, not by the Movement.
- **A Movement's `executionDate` is a calendar date; its `createdAt` is an instant.** `executionDate` is the day the movement happened (`YYYY-MM-DD`, no time, no timezone — never convert it); `createdAt` is the UTC instant it was recorded, shown to no one and used only as the reducer's chronological tiebreaker. Naming convention: **`-Date` = calendar date, `-At` = instant**. See `docs/adr/0004-execution-date-is-a-calendar-date.md`.
