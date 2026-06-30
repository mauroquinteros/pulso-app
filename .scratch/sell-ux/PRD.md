# PRD — Add Movement: Sell (Venta)

**Feature:** `sell-ux`
**Companion to:** `.scratch/sell-ux/UX.md` (the design brief — this PRD cites it, doesn't repeat it).
**Mirrors:** `.scratch/buy-ux/PRD.md` (same patterns, inverted input model).
**Depends on:** the engine's existing `sell` support, the cash-side convention
(`docs/adr/0003-cash-side-movement-amounts.md`), and the moving-average cost method
(`docs/adr/0001-moving-average-cost-method.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## Problem Statement

A Pulso user can move cash and buy shares, but cannot yet **close a position**. The type
picker shows **Venta** under OPERACIONES as "Pronto" — tapping it does nothing. Until sells
exist, holdings can only ever grow: there is no way to reduce a position, free up Cash, or
turn an unrealized gain into a **realized** one. The whole second half of the investing loop
— and **Realized P&L**, a headline component of **Total Return** — has nothing to derive from.

Venta is the natural next slice after Compra: the second **OPERACIONES** movement and the one
that closes the loop. It reuses every pattern Compra established (symbol input, number inputs,
optional fees, date picker, live bottom breakdown, strict gate, save → store → Home loop), and
adds two genuinely new pieces: a **held-shares gate** (you can only sell what you own) and a
**second deduction** (Impuestos, on top of Comisión).

## Solution

Ship the **Venta** form — a focused, native-feeling Spanish form that records selling shares of
a holding. The user taps `+` → **Venta** → types a **Símbolo**, the **Acciones** sold, the
**Precio de ejecución**, an optional **Comisión** and **Impuestos**, and a **Fecha**. Because
selling is a **quantity** of something already held — the inverse of Compra, where the user
thinks in money — the form takes **shares as the input** and **derives what lands in Cash**:
**Total a recibir** = `Acciones × Precio − Comisión − Impuestos`. On save, the movement is
recorded, the modal dismisses with a confirming haptic, and Home re-derives: **Efectivo** rises,
the holding's shares drop (or the holding disappears on a full exit), and **Realized P&L**
updates — no manual refresh.

Because you can only sell what you hold, the form guards against over-selling: the screen looks
the typed ticker up in the derived holdings, shows **"Disponible X acciones"**, and blocks the
save when **Acciones exceeds the held quantity** (or the ticker isn't held at all) — the same
strict-gate philosophy as Compra/Retiro, but the binding constraint is the **held shares of the
selected ticker**, not Cash.

The **Símbolo** field is **free text, forced to uppercase**, with no symbol search (a holdings
selector was considered and declined to keep the design simple — see UX.md §14).

From the user's perspective:

> tap `+` → pick **"Venta"** → type **Símbolo / Acciones / Precio / Comisión / Impuestos / Fecha** →
> see **"Total a recibir · $X"** update live → **Guardar movimiento** → modal dismisses → Home's
> **Valor total** / **Efectivo** / **holding** update.

## User Stories

1. As a Pulso user, I want to tap `+` and choose **Venta**, so that I can record selling shares of a holding.
2. As a Pulso user, I want the Venta row in the **OPERACIONES** group of the picker to be active (not "Pronto"), so that I can actually open the form.
3. As a Pulso user, I want the Venta form to open as a modal with a back affordance to the picker, so that recording a sale feels like a quick, self-contained task and I can correct a wrong type choice.
4. As a Pulso user, I want a **Símbolo** field, so that I can type the ticker I sold.
5. As a Pulso user, I want the **Símbolo** field to force uppercase as I type, so that `goog` and `GOOG` resolve to the same holding.
6. As a Pulso user, I want to type the symbol freely (no forced search/autocomplete), so that recording a sale stays as fast as Compra.
7. As a Pulso user, I want an **Acciones** field that accepts fractional amounts, so that I can record selling fractional shares (e.g. `6.08298`).
8. As a Pulso user, I want to record the sale by the **number of shares** I sold (not a dollar amount), so that the form matches how a sell actually works — a quantity out of a position.
9. As a Pulso user, I want to see **"Disponible X acciones"** for the ticker I typed, so that I know how many shares I currently hold and can sell.
10. As a Pulso user, I want the save **blocked when I try to sell more shares than I hold**, so that I can't record an impossible sale.
11. As a Pulso user, I want a clear message when I over-sell (**"Solo tienes X acciones."**) or when I don't hold the ticker (**"No tienes acciones de XXX."**), so that I understand why I can't save.
12. As a Pulso user, I want a **Precio de ejecución** field with a `$` prefix and a decimal keypad, so that I can enter the price I sold at.
13. As a Pulso user, I want a **Comisión** field, so that I can record the clearing/broker commission charged on the sale.
14. As a Pulso user, I want an **Impuestos** field, so that I can record the regulatory fees charged on the sale.
15. As a Pulso user, I want both **Comisión** and **Impuestos** to be optional and default to `0`, so that I don't have to type anything when a charge didn't apply.
16. As a Pulso user, I want both charges to be **empty by default** (not pre-filled), so that I never save a fee I didn't actually pay.
17. As a Pulso user, I want a live breakdown — **Monto bruto**, **Comisión** `−`, **Impuestos** `−`, and **Total a recibir** — so that I see exactly what reaches my Cash and why.
18. As a Pulso user, I want both charges **subtracted** from the proceeds, so that the total I see matches what actually lands in my Efectivo.
19. As a Pulso user, I want a **Fecha** field that defaults to today and is shown as **DD/MM/AAAA**, so that recording today's sale needs no interaction and past dates are fast.
20. As a Pulso user, I want **future dates blocked**, so that I can't record a sale that hasn't happened.
21. As a Pulso user, I want **Guardar movimiento** disabled until Símbolo, Acciones (>0, ≤ held) and Precio (>0) are all valid, so that I can't save an incomplete or impossible sale.
22. As a Pulso user, I want an error on a field (once I leave it) when it's empty/zero/over-held, so that I'm told why I can't save.
23. As a Pulso user, I want a confirming haptic on save and the modal to dismiss back to Home, so that the action feels acknowledged and I immediately see the result.
24. As a Pulso user, I want Home to re-derive automatically after I save, so that my **Efectivo**, the **holding's shares**, and **Realized P&L** reflect the sale without a manual refresh.
25. As a Pulso user, I want selling my entire position to fully close it (and reset its average cost), so that a later re-buy starts a fresh average.
26. As a Pulso user, I want the Venta form to look and behave like the Compra form, so that recording movements feels consistent.

## Implementation Decisions

### Domain & engine (already done)

- The engine already supports sells: a **Sell** movement carries `ticker`, `shares`,
  `executionPrice`, `fee`, and `regulatoryFees`. `computeCash` does
  `cash += executionPrice × shares − fee − regulatoryFees` (proceeds, net of both charges);
  `deriveHoldingFacts` reduces the holding's shares, adds `(executionPrice − avgCostAtSale) ×
  shares` to **Realized P&L** (gross, before fees, per `docs/adr/0001`), and **resets the
  average cost on a full exit**. Both charges flow into total fees and erode **Total Return**.
  No engine change is part of this PRD.
- The user sells by **Acciones** (quantity), so the form is **shares-first** — the inverse of
  Compra's monto-first. The numbers the screen must get right: **Monto bruto** = `Acciones ×
  Precio` · **Total a recibir** = `Monto bruto − Comisión − Impuestos` (the cash credit, shown
  as the live summary). Both charges subtract. **Realized P&L is not shown on this form** — it
  surfaces on Home / the movement detail (see UX.md §4, deferred per the minimalist decision).

### Modules

- **Sell view-model** — a pure, deep module mirroring the buy view-model. It owns the live
  breakdown figures and the save-gate, takes the **available shares** for the ticker as an
  argument (so it stays pure and unit-testable), and maps validated input to a typed Sell
  movement. Its summary shape encodes the validation decisions:

  ```ts
  interface SellSummary {
    gross: number;             // Acciones × Precio (0 when shares or price blank/≤0)
    total: number;             // gross − Comisión − Impuestos; cash credit (0 when gross is 0)
    saveEnabled: boolean;      // ticker≠"" && shares>0 && shares≤available && price>0 && fee≥0 && regFees≥0
    tickerInvalid: boolean;    // ticker is empty (after trim/uppercase)
    sharesInvalid: boolean;    // shares entered but ≤ 0
    priceInvalid: boolean;     // a Precio was entered but is ≤ 0
    insufficientShares: boolean; // shares > available shares for the ticker
  }
  ```

  `summarizeSell(input, availableShares)` returns the above; `buildSellMovement(input, deps)`
  maps validated input to a typed Sell movement (`{ ticker, shares, executionPrice, fee,
  regulatoryFees }`). System fields (id, userId, createdAt) are injected via generators
  (deterministic, like the other forms). Empty Comisión/Impuestos default to `0`; the ticker is
  stored **uppercase**.

- **Sell form screen** — a separate screen, mirror of the Compra form (its own file/route;
  file-based routing auto-registers it, no layout change). It reads the derived **holdings**
  from the existing `usePortfolio` hook, finds the typed ticker, and passes its **shares** as
  the available quantity to the view-model for the held-shares gate. It renders three input
  rows — Símbolo·Fecha, Acciones·Precio (with **"Disponible X"** under Acciones), Comisión·
  Impuestos — the native date picker (default today, future blocked), the live **breakdown**
  (Monto bruto / Comisión / Impuestos / **Total a recibir**), and the **Guardar movimiento**
  button. On save it appends to the movements store, fires a success haptic, and dismisses to
  Home.

- **Type picker** — enable the **Venta** row in the OPERACIONES group: remove its "Pronto" tag
  and wire its press to open the sell form (mirroring how Compra/Depósito/Retiro are wired).
  The row already has its own icon/copy ("Vender una posición"); only its disabled state and
  press handler change.

### Key interactions & contracts

- **Held-shares gate (strict).** The screen passes the available shares for the typed ticker
  (0 if not held). The gate requires `0 < Acciones ≤ availableShares`. Over-sell sets
  `insufficientShares`, disables save, and shows **"Solo tienes X acciones."**; a not-held
  ticker (available = 0) shows **"No tienes acciones de XXX."**. The available count is derived
  from the store — never fabricated.
- **Symbol is free text.** Force-uppercase, `[A-Z]` only, required non-empty. No search /
  autocomplete / holdings selector in v1 (declined to keep the design simple). The held-shares
  lookup resolves the typed ticker against the derived holdings.
- **Two deductions, both subtract.** Comisión (`fee`) and Impuestos (`regulatoryFees`) each
  only need `≥ 0` (empty → 0); both reduce the proceeds. There is **no `tax`** on a sell — the
  UI label "Impuestos" maps to the model field `regulatoryFees`.
- **Errors are touch-gated.** Field errors (empty ticker, zero/blank shares, over-sell,
  zero/blank price) surface only after the field has been touched-then-left — same pattern as
  the other forms.
- **Live breakdown.** Monto bruto / Total a recibir update on every keystroke; with Acciones or
  Precio blank they read `$0.00`. **Total a recibir** turns teal when saveable, muted grey when
  inputs are missing, red when over-held.
- **Save loop.** Save appends the Sell to the movements store; `usePortfolio` recomputes; Home
  reflects the new Efectivo / holding / Realized P&L. A full exit resets the ticker's average
  cost. No toast — haptic + dismiss only.

## Testing Decisions

- **What makes a good test here:** assert external behavior of the pure view-model — the
  `gross`/`total` figures and the save-gate flags for given inputs and available-shares values
  — not implementation details. No rendering, no store, no navigation in these tests.
- **Module under test:** the sell view-model only (per decision). Cases to cover, mirroring
  `components/add-movement/buy-view-model.test.ts`:
  - `gross` is `Acciones × Precio`, and 0 when shares or price is blank/≤0.
  - `total` is `gross − Comisión − Impuestos`; blank charges treated as 0; `total` is 0 when gross is 0.
  - `saveEnabled` requires ticker non-empty, shares > 0, shares ≤ available, Precio > 0, and both charges ≥ 0.
  - `tickerInvalid` true when ticker is empty (after trim/uppercase).
  - `sharesInvalid` / `priceInvalid` true when entered as ≤ 0 (but blank is not "invalid").
  - `insufficientShares` true when shares > available (and gates save); the not-held case is `available === 0`.
  - `buildSellMovement` maps fields to a typed Sell with injected system fields, stores the ticker uppercase, and defaults empty Comisión/Impuestos to 0.
- **Prior art:** `components/add-movement/buy-view-model.test.ts` (vitest) is the direct
  template. Engine behavior (Realized P&L, avg-cost reset, cash proceeds) is already covered by
  `utils/portfolio/reducer.test.ts` / `cash.test.ts` / `valuation.test.ts` and is not re-tested here.

## Out of Scope

- The other operation — **Dividendo** (later PRD). The picker still shows it as "Pronto".
- **Realized P&L preview** on this form (deferred to Home / movement detail).
- A **holdings selector** for the symbol (free text + held-shares lookup chosen instead).
- A **"Vender todo" / sell-all** shortcut (a trading affordance; for a tracker the user knows the exact shares).
- **Edit / delete** of movements (create-only).
- **Persistence** of the store (in-memory; Supabase later). Restart ⇒ back to seed.
- **Auth / real `userId`**, UUID strategy (placeholders for now).
- **Component / RNTL tests** (no testing-library installed; not added here).
- Any **engine change** — `sell` is already supported.

## Further Notes

- **Venta is the inverse of Compra.** Compra: user enters Monto → form derives Acciones
  (`Monto / Precio`). Venta: user enters Acciones → form derives Total a recibir
  (`Acciones × Precio − Comisión − Impuestos`). The asymmetry is intentional — it mirrors how a
  user thinks in each direction and how a real broker works. (See UX.md §2.)
- **Reconciliation stays intact.** After a sell of `S` shares at price `P` with charges `F`
  (Comisión) + `R` (Impuestos), execution price = current price: `cash += (P×S − F − R)`,
  `marketValue −= P×S`, `realizedPnl += (P − avgCost)×S`, `netContributions` unchanged,
  `totalReturn −= (F + R)`. The invariant `Cash + Market Value == Net Contributions + Total
  Return` still holds (Δ = −(F+R) on both sides). See UX.md §4.
- **"Impuestos" is a label, `regulatoryFees` is the field.** The UI shows "Impuestos" (the
  user's term) but the model field is `regulatoryFees` — never `tax` (`tax` is a Dividend
  concept).
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope font,
  teal accent on the primary button) — reuse, don't reinvent.
