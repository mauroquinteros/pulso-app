# Pulso — Home Screen UX Spec

**Status:** design brief (for testing in Claude design)
**Scope:** the Home tab only — surfacing the new portfolio-engine values.
**Language:** UI is **Spanish**; canonical concepts are defined in English in `CONTEXT.md`.
**Currency:** USD only (see `docs/adr/0002-scope-boundaries-v1.md`).

---

## 1. How to use this doc

This describes **what data exists**, **what matters most**, and **what's still open**.
Section 4 sets information *priorities* (intent, not placement). Section 5 is a brief to **generate
several distinct home-screen options** — it deliberately does **not** prescribe a layout.
All numbers below are the **real output** of the engine on the current mock data
(`assemblePortfolio(MOCK_MOVEMENTS, MOCK_PRICES)`), so any mockup using them will reconcile.

---

## 2. Product thesis

Pulso records **movements** (buys, sells, dividends, deposits, withdrawals) and derives everything
else. The differentiator vs. the user's broker (Hapi): **Total Return transparency** — the all-in
gain/loss broken into its real parts, *the number Hapi obscures*. The home screen exists to make
that number honest, glanceable, and explainable.

The redesign replaces a home screen that currently shows **hardcoded numbers** and a **banned term**
("TOTAL INVERTIDO") with one driven entirely by the engine's `Portfolio` object.

---

## 3. The data you're designing with

The whole screen consumes **one** `Portfolio` object. Field meanings (from `CONTEXT.md`) and the
**actual current values**:

### Portfolio-level

| Concept (EN canonical) | Field | Meaning | Mock value |
|---|---|---|---|
| **Total Portfolio Value** | `totalPortfolioValue` | What the account is worth now = Market Value + Cash. The worth anchor. | **$4,854.40** |
| **Market Value** | `marketValue` | Current worth of all holdings (`price × shares`, summed). | $4,596.31 |
| **Cash** / Buying Power | `cash` | Uninvested money available to trade. | $258.09 |
| **Total Return** | `totalReturn.total` | All-in gain/loss = Unrealized + Realized + Net Dividends − Fees. **The headline transparency figure.** | **+$354.40** |
| — as % | `totalReturn.percent` | Total Return ÷ **net contributed capital**. | **+7.88%** |
| ↳ Unrealized P&L (**= Net P&L**) | `totalReturn.unrealizedPnl` | Unrealized gain on currently-held shares. Equals the sum of per-holding P&L. | +$275.68 |
| ↳ Realized P&L | `totalReturn.realizedPnl` | Gross locked-in gain from shares sold (before sell fees). | +$67.29 |
| ↳ Net Dividends | `totalReturn.netDividends` | Dividend income after withholding tax. | +$21.56 |
| ↳ Fees | `totalReturn.totalFees` | All commissions/fees paid, ever. Always shown as a subtraction. | −$10.13 |
| Net contributed capital | `netContributedCapital` | Deposits − withdrawals. The base for Total Return %. | $4,500.00 |
| Cost Basis | `costBasis` | What the user paid for shares currently held (excludes fees). | $4,320.63 |
| Holdings missing a price | `holdingsMissingPrice` | Count of held tickers with no current price (excluded from value figures). | 0 |

> **Reconciliation invariant** (holds when every held ticker is priced):
> `Cash + Market Value == net contributed capital + Total Return`
> → `258.09 + 4,596.31 == 4,500 + 354.40 == 4,854.40` ✓

### Per-holding (`holdings: ValuedHolding[]`)

| Field | Meaning | AAPL | VOO |
|---|---|---|---|
| `ticker` | Symbol | AAPL | VOO |
| `shares` | Shares held | 15.07666 | 3.5 |
| `avgCost` | Average Cost (excl. fees) | $182.47 | $448.46 |
| `costBasis` | Avg Cost × shares | $2,751.03 | $1,569.60 |
| `marketValue` | Current worth | $2,991.21 | $1,605.10 |
| `netPnl` | Unrealized P&L (Market Value − Cost Basis) | +$240.18 | +$35.50 |
| `netPnlPercent` | netPnl ÷ costBasis | +8.73% | +2.26% |
| `realizedPnl` | Locked-in gain from past partial sells of this ticker | +$39.09 | $0 |
| `totalDividends` | Net dividends received from this ticker | $12.95 | $8.61 |
| `totalFees` | Fees paid on this ticker | $0.58 | $0.25 |
| `priceAvailable` | `false` ⇒ `marketValue/netPnl/netPnlPercent` are **null** | true | true |

> Sum of `netPnl` across holdings = 240.18 + 35.50 = **275.68** = the Unrealized P&L line.
> This is the spine of the layout: **Net P&L is both the holdings header and the breakdown's top line.**

---

## 4. Information priorities (guidance, not a layout)

What the home screen should make easy to answer, roughly in priority order. *How* and *where* each is
expressed is for the design options to decide — this is intent, not placement.

| Priority | Question it answers | Numbers involved |
|---|---|---|
| 1 | "What's my account worth right now?" | Total Portfolio Value (= Market Value + Cash) |
| 2 | "How am I doing, all-in?" — the differentiator | Total Return + % and its four components |
| 3 | "How are my *current* holdings doing?" | Net P&L (unrealized) + % |
| 4 | "What do I actually hold?" | per-holding value & P&L |

**One truth to respect (not a layout rule):** Net P&L *is* `totalReturn.unrealizedPnl` — the first
component of Total Return and the sum of the per-holding P&L rows. So an option shouldn't present it
as a *third* independent headline competing with Total Return; it's the same money at a different grain.

---

## 5. Design brief — generate options

Produce **2–4 visually distinct home-screen directions** from your own reading of the app. Don't
converge on one prescribed layout; explore genuinely different ways to express the priorities above.

**Hard requirements (must hold in every option):**
- Drive everything from the `Portfolio` object in §3 — no invented figures.
- **Cash must appear somewhere** — today it's computed but shown nowhere, yet it's part of the worth
  and half the reconciliation identity.
- Total Return's **four components must be reachable** — always-visible, expandable, or on a detail; your call.
- Never fabricate a missing price; honor `priceAvailable` / `holdingsMissingPrice` (§6).
- Signed, colored gains/losses; correct percent bases (§7); never the banned term (§8).

**Element palette (compose freely — these are the materials, not an arrangement):**

| Element | Data | Intent |
|---|---|---|
| Worth anchor | `totalPortfolioValue` | the one big number |
| Composition | `marketValue`, `cash` | what the worth is made of |
| All-in performance | `totalReturn.total`, `.percent` | the headline differentiator |
| Return breakdown | `unrealizedPnl`, `realizedPnl`, `netDividends`, `totalFees` | the transparency story; parts that sum to the total |
| Holdings performance | aggregate Net P&L + % (`= unrealizedPnl`, over `costBasis`) | how current bets are doing |
| Holding rows | per-`ValuedHolding` `marketValue` + `netPnl` + `netPnlPercent` | per-position detail; tap → stock detail (`/stock/[ticker]`) |
| Context (optional) | `netContributedCapital`, `costBasis` | denominators / "what I put in" |

**Axes worth varying across options** (pick different points per option):
- Return breakdown always visible vs. progressively disclosed.
- One unified hero block vs. a stack of cards.
- Holdings as a flat list vs. grouped/sorted (by value, by P&L).
- Pure numbers vs. a visual (allocation donut, etc.). **Note:** the engine has **no time-series data**,
  so any "return over time" chart implies new data — flag it if an option assumes it.
- How Cash is surfaced (sub-line, card, footnote).

The header (account avatar + search + notifications) already exists and can be reused or restyled.

---

## 6. States

| State | Condition | Treatment |
|---|---|---|
| **Loading** | data not ready | skeletons for hero, card, rows |
| **Empty** | no movements at all | friendly empty state + CTA "Registrar movimiento" |
| **Cash-only** | deposits but no buys | hero = Cash; Market Value $0; holdings list empty-state |
| **Holding missing price** | row's `priceAvailable === false` | show ticker + shares, replace value/P&L with **"Precio no disponible"**; exclude from totals (engine already does) |
| **Portfolio missing prices** | `holdingsMissingPrice > 0` | small note near the hero: "*N activos sin precio actual — excluidos del valor*" so the totals' incompleteness is honest |

---

## 7. Number, sign & color conventions

- **Currency:** `formatUSD` → `$1,234.56`. **Percent:** `formatPercent` → `+7.88%` / `−4.10%` / `0.00%`.
- **Sign:** gains prefixed `+`, losses `−`. Always show sign on P&L and % figures.
- **Color:** gains → `positive` (#00C853); losses → `negative` (#FF5252). Fees always shown as a
  subtraction; neutral or negative color.
- **Percent bases (don't mix these up in labels):**
  - Total Return % → over **net contributed capital**.
  - Net P&L % (aggregate and per-holding) → over **Cost Basis**.

---

## 8. Label glossary — EN canonical ↔ Spanish UI (proposed, confirm)

| EN (CONTEXT.md) | Spanish UI label | Notes |
|---|---|---|
| Total Portfolio Value | **Valor total** | the worth anchor |
| Total Return | **Rendimiento total** | the all-in performance figure |
| Net P&L (unrealized) | **No realizado** | holdings aggregate / first return component |
| Realized P&L | **Realizado** | a return component |
| Net Dividends | **Dividendos netos** | a return component |
| Fees | **Comisiones** | a return component; always a subtraction |
| Cash / Buying Power | **Efectivo** | candidates: "Poder de compra", "Saldo disponible" |
| Market Value | **En activos** / **Valor de mercado** | the invested part of worth |
| Cost Basis | **Costo base** | the honest replacement for the banned term |
| Average Cost | **Costo promedio** | (stock detail) |

> **Banned:** `TOTAL INVERTIDO` / "invertido" / "monto invertido". `CONTEXT.md` forbids "invested
> amount" — it conflated Cost Basis with Market Value. Use **Costo base** or **Valor de mercado**.

---

## 9. Design tokens (existing — reuse, don't reinvent)

```
Colors    background #0A0E27 · surface #111638 · accent #00E5CC
          positive #00C853 · negative #FF5252
          textPrimary #FFFFFF · textSecondary #8E8E93 · border #1C224D
Spacing   xs4 sm8 md12 lg16 xl20 xxl24 xxxl32
Radius    sm8 md12 lg16 full9999
Type      heroValue 36/700 · sectionHeader 18/600 · cardTitle 16/600
          body 14/400 · label 12/400 · badge 12/600
```
Dark theme, teal accent. Today's code shows the positive performance figure in `accent` — decide
whether gains/losses use semantic positive/negative everywhere, or the all-in figure keeps accent-teal
branding (see §10).

---

## 10. Open decisions (the options should help us choose)

Non-layout unknowns — layout *variations* live in §5's axes; these are product/data choices:

1. **Company names + logos.** The engine only has `ticker`; rows likely want a name (and maybe a logo).
   v1 options: (a) static ticker→name map, (b) ticker only, (c) fetch metadata later. → *this blocks the
   holding-row design; pick a v1.*
2. **Performance color.** Semantic positive/negative everywhere, or accent-teal for the all-in figure?
3. **Spanish microcopy.** The §8 labels are proposals — confirm wording (esp. Cash → "Efectivo" vs.
   "Poder de compra"; Market Value → "En activos" vs. "Valor de mercado").

---

## 11. Out of scope (this spec)

- Holdings tab, Movements tab, Stock detail screen, Settings (all currently stubs).
- State wiring (`store/` is empty; zustand is available) — a separate task.
- Corporate actions, FX, ACATS transfers, account fees (see `docs/adr/0002-scope-boundaries-v1.md`).
