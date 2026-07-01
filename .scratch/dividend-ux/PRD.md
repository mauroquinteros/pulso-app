# PRD — Add Movement: Dividend (Dividendo)

**Feature:** `dividend-ux`
**Companion to:** `.scratch/dividend-ux/UX.md` (the design brief — this PRD cites it, doesn't repeat it).
**Mirrors:** `.scratch/sell-ux/PRD.md` (same patterns, simpler single-deduction model).
**Depends on:** the engine's existing `dividend` support and the cash-side convention
(`docs/adr/0003-cash-side-movement-amounts.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## Problem Statement

A Pulso user can move cash, buy shares, and sell shares, but cannot yet record **income from
their holdings**. The type picker shows **Dividendo** under OPERACIONES as "Pronto" — tapping it
does nothing. Until dividends exist, the only way money enters the account is a Depósito or a
Venta; **Net Dividends** — a headline component of **Total Return**, deliberately broken out so
the user can see dividend earnings separately from price gains — has nothing to derive from and
reads $0 forever. The investing loop is missing its income leg.

Dividendo is the last of the three **OPERACIONES** slices (after Compra and Venta) and the one
that closes the group. It reuses every pattern Compra/Venta established (symbol input, number
inputs, an optional deduction, date picker, live bottom breakdown, strict gate, save → store →
Home loop). It is the **simplest** form in the family: no shares, no price, a single deduction
(**Impuestos**), and — unlike Venta — **no held-shares gate**, because a dividend does not
consume a position.

## Solution

Ship the **Dividendo** form — a focused, native-feeling Spanish form that records a dividend
payment. The user taps `+` → **Dividendo** → types a **Símbolo**, the **Monto bruto** paid, an
optional **Impuestos** withheld, and a **Fecha**. A dividend is **pure cash income** — there is
no quantity and no price to enter — so the form is **amount-first**: the user records the gross
cash and the tax, and the form **derives what lands in Cash**: **Total a recibir** =
`Monto bruto − Impuestos`. On save, the movement is recorded, the modal dismisses with a
confirming haptic, and Home re-derives: **Efectivo** rises by the net and **Net Dividends** /
**Total Return** grow — no manual refresh.

Because a dividend is income (not a trade against a position), the form has **no held-shares
gate**: you can record a dividend on any ticker, including one you have since sold. The one
guard is a **domain-honesty gate** — withholding tax is a fraction of the dividend, so the form
**blocks save when Impuestos exceeds Monto bruto** (a negative net dividend is never a real
event and must not reach the engine).

The **Símbolo** field is **free text, forced to uppercase**, with no symbol search — the same
choice made for Compra/Venta, to keep the design simple and fast.

From the user's perspective:

> tap `+` → pick **"Dividendo"** → type **Símbolo / Monto bruto / Impuestos / Fecha** →
> see **"Total a recibir · $X"** update live → **Guardar movimiento** → modal dismisses → Home's
> **Valor total** / **Efectivo** / **Net Dividends** update.

## User Stories

1. As a Pulso user, I want to tap `+` and choose **Dividendo**, so that I can record a dividend paid on my holdings.
2. As a Pulso user, I want the Dividendo row in the **OPERACIONES** group of the picker to be active (not "Pronto"), so that I can actually open the form.
3. As a Pulso user, I want the Dividendo form to open as a modal with a back affordance to the picker, so that recording a dividend feels like a quick, self-contained task and I can correct a wrong type choice.
4. As a Pulso user, I want a **Símbolo** field, so that I can type the ticker that paid the dividend.
5. As a Pulso user, I want the **Símbolo** field to force uppercase as I type, so that `aapl` and `AAPL` resolve to the same symbol.
6. As a Pulso user, I want to type the symbol freely (no forced search/autocomplete), so that recording a dividend stays as fast as Compra/Venta.
7. As a Pulso user, I want to record a dividend on **any ticker** — including one I no longer hold — so that I can log a payment received after I sold, without the form blocking me.
8. As a Pulso user, I want to record the dividend as a **gross cash amount** (not per-share × shares), so that the form matches how a dividend actually lands — a lump of cash.
9. As a Pulso user, I want a **Monto bruto** field with a `$` prefix and a decimal keypad, so that I can enter the dividend paid before tax.
10. As a Pulso user, I want an **Impuestos** field, so that I can record the withholding tax deducted from the dividend.
11. As a Pulso user, I want **Impuestos** to be optional and default to `0`, so that I don't have to type anything for a tax-free dividend.
12. As a Pulso user, I want **Impuestos** to be **empty by default** (not pre-filled), so that I never save a tax I didn't actually pay.
13. As a Pulso user, I want a live breakdown — **Monto bruto**, **Impuestos** `−`, and **Total a recibir** — so that I see exactly what reaches my Cash and what the tax took.
14. As a Pulso user, I want **Impuestos subtracted** from the gross, so that the total I see matches what actually lands in my Efectivo.
15. As a Pulso user, I want the save **blocked when Impuestos exceeds Monto bruto**, so that I can't record an impossible negative dividend.
16. As a Pulso user, I want a clear message when the tax is too high (**"El impuesto no puede superar el monto bruto."**), so that I understand why I can't save.
17. As a Pulso user, I want a **Fecha** field that defaults to today and is shown as **DD/MM/AAAA**, so that recording today's dividend needs no interaction and past dates are fast.
18. As a Pulso user, I want **future dates blocked**, so that I can't record a dividend that hasn't been paid.
19. As a Pulso user, I want **Guardar movimiento** disabled until Símbolo and Monto bruto (>0) are valid and Impuestos is within range, so that I can't save an incomplete or impossible dividend.
20. As a Pulso user, I want an error on a field (once I leave it) when it's empty/zero/over-taxed, so that I'm told why I can't save.
21. As a Pulso user, I want a confirming haptic on save and the modal to dismiss back to Home, so that the action feels acknowledged and I immediately see the result.
22. As a Pulso user, I want Home to re-derive automatically after I save, so that my **Efectivo** and **Net Dividends** reflect the dividend without a manual refresh.
23. As a Pulso user, I want my dividend income shown separately from price gains (via **Net Dividends** in **Total Return**), so that I can see how much my holdings pay me.
24. As a Pulso user, I want the Dividendo form to look and behave like the Compra/Venta forms, so that recording movements feels consistent.

## Implementation Decisions

### Domain & engine (already done)

- The engine already supports dividends: a **Dividend** movement carries `ticker`,
  `grossAmount`, and `tax` — and **nothing else** (no `fee`, no `regulatoryFees`, no `shares`,
  no `executionPrice`). `computeCash` does `cash += grossAmount − tax` (the net that lands in
  Cash); `deriveHoldingFacts` does `totalDividends += grossAmount − tax`; `computeNetDividends`
  does the same `gross − tax`. This is exactly **Net Dividends** in `CONTEXT.md`. No engine
  change is part of this PRD.
- **A dividend has a single deduction — `tax` — by deliberate model decision.** The fee field
  was removed from dividends in the fee-structure refactor because a dividend always had
  `fee: 0`. The UI label **"Impuestos"** maps to the real `tax` field here (withholding tax) —
  *not* to `regulatoryFees` as it does on Venta. Re-introducing a separate dividend fee would be
  a model change and would warrant its own ADR; it is out of scope.
- The user records dividend income as a **gross cash amount**, so the form is **amount-first** —
  no shares, no price (contrast Compra's monto-first and Venta's shares-first). The numbers the
  screen must get right: **Monto bruto** = `grossAmount` · **Total a recibir** = `Monto bruto −
  Impuestos` (the cash credit, shown as the live summary). The tax subtracts.

### Modules

- **Dividend view-model** — a pure, deep module mirroring the sell view-model, but simpler (no
  `availableShares` argument, no held-shares logic). It owns the live breakdown figures and the
  save-gate, and maps validated input to a typed Dividend movement. Its summary shape encodes
  the validation decisions:

  ```ts
  interface DividendSummary {
    gross: number;            // grossAmount (0 when blank/≤0)
    total: number;            // gross − tax; cash credit (0 when gross is 0)
    saveEnabled: boolean;     // ticker≠"" && gross>0 && tax≥0 && tax≤gross
    tickerInvalid: boolean;   // ticker is empty (after trim/uppercase)
    grossInvalid: boolean;    // a Monto bruto was entered but is ≤ 0
    taxExceedsGross: boolean; // tax > gross (blocks save; negative net dividend)
  }
  ```

  `summarizeDividend(input)` returns the above; `buildDividendMovement(input, deps)` maps
  validated input to a typed Dividend movement (`{ ticker, grossAmount, tax }`). System fields
  (id, userId, createdAt) are injected via generators (deterministic, like the other forms).
  Empty Impuestos defaults to `0`; the ticker is stored **uppercase**.

- **Dividend form screen** — a separate screen, mirror of the Venta form (its own file/route;
  file-based routing auto-registers it, no layout change). Unlike Venta it reads **nothing** from
  `usePortfolio` — there is no held-shares gate, so it needs no derived-holdings lookup. It
  renders two input rows — Símbolo·Fecha, Monto bruto·Impuestos — the native date picker
  (default today, future blocked), the live **breakdown** (Monto bruto / Impuestos / **Total a
  recibir**), and the **Guardar movimiento** button. On save it appends to the movements store,
  fires a success haptic, and dismisses to Home.

- **Type picker** — enable the **Dividendo** row in the OPERACIONES group: remove its "Pronto"
  tag and wire its press to open the dividend form (mirroring how Compra/Venta/Depósito/Retiro
  are wired). The row already has its own icon/copy ("Ingreso por dividendos"); only its
  disabled state and press handler change.

### Key interactions & contracts

- **No held-shares gate.** In deliberate contrast to Venta, the dividend form does not look the
  ticker up in holdings and does not bound the amount by a position. A dividend is income, not a
  trade against shares held.
- **Over-tax gate (strict, domain honesty).** The one blocking guard: `tax ≤ grossAmount`. When
  `Impuestos > Monto bruto`, the summary sets `taxExceedsGross`, save is disabled, the **Total a
  recibir** turns red, and the inline error **"El impuesto no puede superar el monto bruto."**
  shows under Impuestos.
- **Symbol is free text.** Force-uppercase, `[A-Z]` only, required non-empty. No search /
  autocomplete / holdings selector (same choice as Compra/Venta).
- **One deduction — the real `tax`.** Impuestos only needs `≥ 0` (empty → 0) and `≤ gross`; it
  reduces the gross. The label "Impuestos" maps to the model field `tax` (withholding tax).
- **Errors are touch-gated.** Field errors (empty ticker, zero/blank gross, over-tax) surface
  only after the field has been touched-then-left — same pattern as the other forms.
- **Live breakdown.** Monto bruto / Total a recibir update on every keystroke; with Monto bruto
  blank they read `$0.00`. **Total a recibir** turns teal when saveable, muted grey when inputs
  are missing, red when over-taxed.
- **Save loop.** Save appends the Dividend to the movements store; `usePortfolio` recomputes;
  Home reflects the new Efectivo / Net Dividends / Total Return. No toast — haptic + dismiss only.

## Testing Decisions

- **What makes a good test here:** assert external behavior of the pure view-model — the
  `gross`/`total` figures and the save-gate flags for given inputs — not implementation details.
  No rendering, no store, no navigation in these tests.
- **Module under test:** the dividend view-model only (per decision). Cases to cover, mirroring
  `components/add-movement/sell-view-model.test.ts`:
  - `gross` is `grossAmount`, and 0 when Monto bruto is blank/≤0.
  - `total` is `gross − tax`; blank tax treated as 0; `total` is 0 when gross is 0.
  - `saveEnabled` requires ticker non-empty, gross > 0, tax ≥ 0, and tax ≤ gross.
  - `tickerInvalid` true when ticker is empty (after trim/uppercase).
  - `grossInvalid` true when Monto bruto is entered as ≤ 0 (but blank is not "invalid").
  - `taxExceedsGross` true when tax > gross (and gates save).
  - `buildDividendMovement` maps fields to a typed Dividend with injected system fields, stores
    the ticker uppercase, and defaults empty Impuestos to 0.
- **Prior art:** `components/add-movement/sell-view-model.test.ts` (vitest) is the direct
  template. Engine behavior (Net Dividends, cash credit) is already covered by
  `utils/portfolio/cash.test.ts` / `reducer.test.ts` and is not re-tested here.

## Out of Scope

- **A separate dividend fee** (`fee` on `DividendMovement`) — the model is tax-only by
  deliberate decision; re-introducing a fee is a model change + ADR, not this PRD.
- A **held-shares gate / holdings selector** for the symbol (free text, ungated, chosen
  instead — the deliberate contrast with Venta).
- **Per-share dividend × shares** entry (record the gross cash directly; no quantity).
- **DRIP** (dividend reinvestment), qualified-vs-ordinary classification, ex-date/record-date
  tracking, FX on foreign dividends.
- **Edit / delete** of movements (create-only).
- **Persistence** of the store (in-memory; Supabase later). Restart ⇒ back to seed.
- **Auth / real `userId`**, UUID strategy (placeholders for now).
- **Component / RNTL tests** (no testing-library installed; not added here).
- Any **engine change** — `dividend` is already supported.

## Further Notes

- **Dividendo is the amount-first member of the trio.** Compra: user enters Monto → derives
  Acciones. Venta: user enters Acciones → derives Total a recibir. Dividendo: user enters Monto
  bruto → derives Total a recibir (`Monto bruto − Impuestos`). No shares, no price — a dividend
  is pure cash income. (See UX.md §2.)
- **Reconciliation stays intact.** After a dividend of gross `G` with tax `T`: `cash += (G − T)`,
  `marketValue` unchanged, `netContributions` unchanged, `totalReturn += (G − T)` (Net Dividends
  is a Total Return component). The invariant `Cash + Market Value == Net Contributions + Total
  Return` still holds (Δ = `(G − T)` on both sides). See UX.md §4.
- **"Impuestos" is the real `tax` here.** On Venta, "Impuestos" was a label for `regulatoryFees`;
  on Dividendo it maps to the model's `tax` field (withholding tax). Same UI word, different
  underlying field — noted so the two forms aren't conflated.
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope font,
  teal accent on the primary button) — reuse, don't reinvent.
