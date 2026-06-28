# PRD — Add Movement: Buy (Compra)

**Feature:** `buy-ux`
**Companion to:** `.scratch/buy-ux/UX.md` (the design brief — this PRD cites it, doesn't repeat it).
**Mirrors:** `.scratch/withdrawal-ux/PRD.md` and `.scratch/add-movement-ux/PRD.md` (same patterns, new shape).
**Depends on:** the engine's existing `buy` support and the cash-side convention (`docs/adr/0003-cash-side-movement-amounts.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## Problem Statement

A Pulso user can move cash in and out (Depósito, Retiro), but cannot yet **own
anything**. The type picker shows **Compra** under OPERACIONES as "Pronto" — tapping it
does nothing. Until buys exist, the account is cash-only: there are no holdings, no Cost
Basis, no Market Value, and the home screen's whole investing story (Aportado → Vale hoy,
Total Return) has nothing to derive from.

Compra is the natural next slice after the cash forms: it is the first **OPERACIONES**
movement and the one that turns Pulso from a cash ledger into a portfolio tracker. It
reuses every pattern the cash forms established (number inputs, optional fee, date picker,
live bottom summary, strict funds gate, save → store → Home loop), and adds exactly one
genuinely new piece: a **symbol** field.

## Solution

Ship the **Compra** form — a focused, native-feeling Spanish form that records buying
shares of a symbol. The user taps `+` → **Compra** → types a **Símbolo**, the **Monto
comprado** (the amount they put into the position), the **Precio de ejecución**, an optional
**Comisión**, and a **Fecha**. Because users think in money, not share counts, the form
**derives the number of Acciones** (`Monto / Precio`) and shows it read-only, and shows live
exactly **what they will pay** (Monto + Comisión). On save, the movement is recorded, the
modal dismisses with a confirming haptic, and Home re-derives: **Efectivo** drops by the
total, a **holding** appears or grows, and **Cost Basis** rises — no manual refresh.

Because a buy spends real cash, the form guards against spending more than the user has:
if the **Total a pagar** exceeds the current **Cash / Buying Power**, the save is blocked
and the shortfall is surfaced — the same strict gate the Retiro uses, but here the binding
constraint is the whole total (the buy fee **does** drain Cash).

The one new field — **Símbolo** — is **free text, forced to uppercase**, with no symbol
search in v1. A real search against a symbol API is deferred to when a backend exists.

From the user's perspective:

> tap `+` → pick **"Compra"** → type **Símbolo / Monto / Precio / Comisión / Fecha** →
> see the derived **Acciones** and **"Total a pagar · $X"** update live → **Guardar
> movimiento** → modal dismisses → Home's **Valor total** / **Efectivo** / new **holding** update.

## User Stories

1. As a Pulso user, I want to tap `+` and choose **Compra**, so that I can record buying shares of a symbol.
2. As a Pulso user, I want the Compra row in the **OPERACIONES** group of the picker to be active (not "Pronto"), so that I can actually open the form.
3. As a Pulso user, I want the Compra form to open as a modal with a back affordance to the picker, so that recording a buy feels like a quick, self-contained task and I can correct a wrong type choice.
4. As a Pulso user, I want a full-width **Símbolo** field, so that I can type the ticker I bought.
5. As a Pulso user, I want the **Símbolo** field to force uppercase as I type, so that `aapl` and `AAPL` don't become two different holdings.
6. As a Pulso user, I want to type any symbol freely (no forced search/autocomplete), so that I can record a buy even for a symbol the app doesn't have a price for yet.
7. As a Pulso user, I want a **Monto comprado** field with a `$` prefix and a decimal keypad, so that I can record the buy the way I think about it (the amount of money I put in), not by counting shares.
8. As a Pulso user, I want a **Precio de ejecución** field and to see the **Acciones derived automatically** (`Monto / Precio`, read-only, fractional), so that I see the shares my buy produced without computing them myself.
9. As a Pulso user, I want a **Comisión** field, so that I can record the trading commission my broker charged.
10. As a Pulso user, I want the **Comisión** to be optional and default to `0`, so that I don't have to type anything when there was no fee.
11. As a Pulso user, I want the **Comisión** to be **empty by default** (not pre-filled), so that I never save a fee I didn't actually pay.
12. As a Pulso user, I want a live **"Total a pagar"** figure showing **Monto + Comisión**, so that I see exactly what this buy costs me before saving.
13. As a Pulso user, I want the **Comisión** added to the total (it spends real cash), so that the cost I see matches what leaves my Efectivo.
14. As a Pulso user, I want a **Fecha** field that defaults to today and is picked from a native control shown as **DD/MM/AAAA**, so that recording today's buy needs no interaction and past dates are fast.
15. As a Pulso user, I want **future dates blocked**, so that I can't record a buy that hasn't happened.
16. As a Pulso user, I want **Guardar movimiento** disabled until Símbolo, Monto (>0) and Precio (>0) are all valid, so that I can't save an incomplete buy.
17. As a Pulso user, I want an error on a field (once I leave it) when it's empty/zero, so that I'm told why I can't save.
18. As a Pulso user, I want the save **blocked when the Total a pagar exceeds my available Cash**, so that I can't spend more than I actually have.
19. As a Pulso user, I want to see how much Cash is available when I try to over-spend, so that I know my ceiling.
20. As a Pulso user, I want a confirming haptic on save and the modal to dismiss back to Home, so that the action feels acknowledged and I immediately see the result.
21. As a Pulso user, I want Home to re-derive automatically after I save, so that my **Efectivo**, **holdings**, and **Valor total** reflect the buy without a manual refresh.
22. As a Pulso user, I want the Compra form to look and behave like the cash forms, so that recording movements feels consistent.

## Implementation Decisions

### Domain & engine (already done)

- The engine already supports buys: a **Buy** movement carries `ticker`, `executionPrice`,
  `shares`, and `fee`. `computeCash` does `cash -= executionPrice × shares + fee`;
  `computeAvgCost` folds the buy into **Average Cost** / **Cost Basis** (fee **excluded**, per
  `CONTEXT.md`); the fee flows into total fees and erodes **Total Return**. No engine change
  is part of this PRD.
- The user buys by **Monto** (principal), so **Acciones is derived** (`Monto / Precio`), not
  typed. The numbers the screen must get right: **Acciones** = `Monto / Precio` (derived,
  read-only) · **Total a pagar** = `Monto + Comisión` (the cash debit, shown as the live
  summary). The fee **is** part of the cash debit but is **not** part of Cost Basis. The buy
  does **not** change **Aportado** (Net Contributions) — money moves from Efectivo into a
  holding, all inside the account. (See UX.md §4.)

### Modules

- **Buy view-model** — a pure, deep module mirroring the withdrawal view-model. It owns the
  live summary and the save-gate, takes the current available Cash as an argument (so it
  stays pure and unit-testable), and maps validated input to a typed Buy movement. Its
  summary shape encodes the validation decisions:

  ```ts
  interface BuySummary {
    shares: number;           // derived: Monto / Precio (0 when Monto or Precio blank/≤0)
    total: number;            // Monto + Comisión; cash debit (0 when Monto blank/≤0)
    saveEnabled: boolean;     // ticker≠"" && amount>0 && price>0 && fee≥0 && total ≤ available Cash
    tickerInvalid: boolean;   // ticker is empty (after trim/uppercase)
    amountInvalid: boolean;   // a Monto was entered but is ≤ 0
    priceInvalid: boolean;    // a Precio was entered but is ≤ 0
    insufficientFunds: boolean; // total > available Cash
  }
  ```

  `summarizeBuy(input, availableCash)` returns the above; `buildBuyMovement(input, deps)`
  maps validated input to a typed Buy movement, deriving `shares = Monto / Precio` at full
  precision so `executionPrice × shares` reconciles to the Monto (the model still stores
  `{ ticker, executionPrice, shares, fee }` — no model/engine change). System fields (id,
  userId, createdAt) are injected via generators (deterministic, like the cash forms). An
  empty Comisión defaults to `0`; the ticker is stored **uppercase**.

- **Buy form screen** — a separate screen, mirror of the Retiro form (its own file/route;
  file-based routing auto-registers it, no layout change). It reads the derived **Cash** from
  the existing `usePortfolio` hook and passes it to the view-model for the funds gate. It
  renders: Símbolo (full-width, free text, force-uppercase), the full-width Monto comprado,
  a Precio + derived (read-only) Acciones row, a
  Comisión + Fecha row, the native date picker (default today, future blocked), the live
  **"Total a pagar"** summary, and the **Guardar movimiento** button. On save it appends to
  the movements store, fires a success haptic, and dismisses to Home.

- **Type picker** — enable the **Compra** row in the OPERACIONES group: remove its "Pronto"
  tag and wire its press to open the buy form (mirroring how Depósito/Retiro are wired). The
  row already has its own icon/copy ("Adquirir acciones o ETF"); only its disabled state and
  press handler change.

### Key interactions & contracts

- **Funds gate (strict).** The binding constraint is `Total a pagar ≤ available Cash`. Unlike
  a withdrawal, the buy fee **does** drain Cash, so the gate uses the whole total (`Monto + Comisión`).
  When the total exceeds Cash, `insufficientFunds` is true, save is disabled, and the form
  shows the available Cash.
- **Symbol is free text.** Force-uppercase, `[A-Z]` only, required non-empty. No search /
  autocomplete / symbol master list in v1 (deferred to a backend). A symbol with no price in
  `MOCK_PRICES` is valid — the holding derives with `priceAvailable: false` and is flagged,
  not rejected.
- **No fee ceiling.** The Comisión only needs `≥ 0`; it has no upper bound (it simply
  increases the total) — unlike the Retiro, where the fee is capped below the Monto.
- **Errors are touch-gated.** Field errors (empty ticker, zero/blank price, zero/blank
  shares) surface only after the field has been touched-then-left, to avoid error spam while
  typing — same pattern as the cash forms.
- **Live summary.** Total a pagar updates on every keystroke; with Monto blank it shows
  `$0.00`. It turns teal when saveable, muted grey when inputs are missing, red when it
  exceeds Cash.
- **Save loop.** Save appends the Buy to the movements store; `usePortfolio` recomputes; Home
  reflects the new Efectivo / holding / Valor total. No toast — haptic + dismiss only.

## Testing Decisions

- **What makes a good test here:** assert external behavior of the pure view-model — the
  `total` figure and the save-gate flags for given inputs and available-cash values — not
  implementation details. No rendering, no store, no navigation in these tests.
- **Module under test:** the buy view-model only (per decision). Cases to cover, mirroring
  `components/add-movement/withdrawal-view-model.test.ts`:
  - `shares` is derived `Monto / Precio`, and 0 when Monto or Precio is blank/≤0.
  - `total` is `Monto + Comisión`; blank Comisión treated as 0; `total` is 0 when Monto is blank.
  - `saveEnabled` requires ticker non-empty, Monto > 0, Precio > 0, Comisión ≥ 0, and total ≤ available Cash.
  - `tickerInvalid` true when ticker is empty (after trim/uppercase).
  - `amountInvalid` / `priceInvalid` true when entered as ≤ 0 (but blank is not "invalid").
  - `insufficientFunds` true when total > available Cash (and gates save).
  - `buildBuyMovement` maps fields to a typed Buy with injected system fields, derives `shares = Monto / Precio` at full precision (so `executionPrice × shares` reconciles to the Monto), stores the ticker uppercase, and defaults an empty Comisión to 0.
- **Prior art:** `components/add-movement/withdrawal-view-model.test.ts` (vitest) is the
  direct template. Engine behavior is already covered by `utils/portfolio/cash.test.ts` and
  `valuation.test.ts` and is not re-tested here.

## Out of Scope

- The other two operations — **Venta, Dividendo** (later PRDs). The picker still shows them as "Pronto".
- **Symbol search / autocomplete / a symbol master list** — free text for now; an API search is deferred to when a backend exists.
- **Edit / delete** of movements (create-only).
- **Persistence** of the store (in-memory; Supabase later). Restart ⇒ back to seed.
- **Real share prices** / a price source (`MOCK_PRICES` stays); Cash for the gate comes from the derived portfolio.
- **Auth / real `userId`**, UUID strategy (placeholders for now).
- **Component / RNTL tests** (no testing-library installed; not added here).
- Any **engine change** — `buy` is already supported.

## Further Notes

- **Reconciliation stays intact.** After a buy of Monto `A` at price `P` with fee `F`
  (so `shares = A / P`, and execution price = current price): `cash −= (A + F)`,
  `marketValue += A`, `costBasis += A`, `netContributions` unchanged, `totalReturn −= F`.
  The invariant `Cash + Market Value == Net Contributions + Total Return` still holds
  (Δ = −F on both sides). See UX.md §4.
- **Mirror of the cash forms, not a copy.** Same layout, tokens, date picker, and save loop;
  the new parts are the **Símbolo** field, the **Monto comprado** input with **Acciones derived**
  (`Monto / Precio`), the **Total
  a pagar** summary, and a funds gate over the whole total.
- **Comisión default is empty**, not the `0.15` shown in the mockup — a silent default would
  erode Total Return without the user noticing, against the app's fee-transparency pitch.
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope font,
  teal accent on the primary button) — reuse, don't reinvent.
