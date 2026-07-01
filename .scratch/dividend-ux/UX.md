# Pulso — Add Movement UX Spec (Dividendo / Dividend)

**Status:** design brief — converged in a grill-with-docs session. Decisions below are **settled**;
this doc prescribes, it doesn't ask for options.
**Scope:** the **Dividendo** form only — the third and final **OPERACIONES** slice (Compra and
Venta already shipped).
**Companion to:** `.scratch/buy-ux/` (Compra) and `.scratch/sell-ux/` (Venta) — mirrors their
patterns; shared infra is referenced, not repeated.
**Depends on:** the engine's existing `dividend` support and the cash-side convention
(`docs/adr/0003-cash-side-movement-amounts.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## 1. How to use this doc

This describes **what the screen produces**, **how it reconciles with the engine**, and
**how it differs from Compra/Venta**. All math below is the **real behavior** of the engine
(`computeCash`, `deriveHoldingFacts`), so any mockup using it will reconcile.

Where the screen is identical to Venta (store, tokens, date picker, save loop, decimal
sanitizing, error-on-touch, the bottom breakdown), this doc references it. The **differences**
are the point: an **amount-first input** (no shares, no price), a **single deduction**
(Impuestos only), and **no held-shares gate** (a dividend doesn't consume a position).

---

## 2. Product thesis

The user can buy, sell, and move cash, but can't yet record **income from holdings**.
**Dividendo** completes the OPERACIONES group: record a dividend payment, and watch Home
re-derive — Efectivo rises by the net, and **Net Dividends** (a component of **Total Return**)
grows, separately from price gains.

> tap `+` → pick "Dividendo" → type **Símbolo / Monto bruto / Impuestos / Fecha** →
> see **"Total a recibir"** update live → **Guardar** → Home re-derives: **Efectivo** rises,
> **Net Dividends** / **Total Return** update.

### Dividendo is amount-first

The three OPERACIONES forms each follow how the user *thinks* in that direction:

| | User enters | Form derives |
|---|---|---|
| **Compra** | **Monto** (the money put in) | Acciones (`Monto / Precio`) |
| **Venta** | **Acciones** (the quantity sold) | Total a recibir (`Acciones × Precio − fees`) |
| **Dividendo** | **Monto bruto** (the cash paid) | **Total a recibir** (`Monto bruto − Impuestos`) |

A dividend is **pure cash income** on shares you held — there is **no quantity and no price** to
enter. You record the gross paid and the tax withheld; the net is the consequence. This matches
the model (`DividendMovement` has no `shares`/`executionPrice`).

### Flow / entry (context)

Same two-step modal flow as the other forms. **Screen 1** is the type picker (grouped:
**OPERACIONES** = Compra / Venta / **Dividendo**). The **Dividendo** row — previously "Pronto" —
is now enabled and opens **this** screen. This doc covers only the Dividendo screen.

---

## 3. The data you're producing — `DividendMovement`

The screen builds **one** `DividendMovement` (`types/models.ts`) and appends it to the store.

| Field | Source | Meaning | Example |
|---|---|---|---|
| `ticker` | user — **"Símbolo"** | the symbol that paid the dividend (uppercase) | `AAPL` |
| `grossAmount` | user — **"Monto bruto"** | dividend paid before tax | `130.00` |
| `tax` | user — **"Impuestos"** | withholding tax; reduces the cash received | `5.50` |
| `executedAt` | user — **"Fecha"** | date the dividend was paid (`YYYY-MM-DD`) | `2026-01-08` |
| `type` | fixed | `'dividend'` | `dividend` |
| `id` / `userId` / `createdAt` | system — **placeholder** | as in the other forms | _(generated)_ |

> **One deduction, not two.** A dividend has **`tax` only** — there is **no `fee`** and **no
> `regulatoryFees`** on a `DividendMovement` (verified against `types/models.ts`). The fee field
> was deliberately removed in the fee-structure refactor because a dividend always had `fee: 0`.
> If a future broker statement genuinely shows a separate fee line on top of tax, that is a
> model change (re-introducing `fee`) and would warrant its own ADR — out of scope here.

> **Símbolo is free text** (uppercase, `[A-Z]` only, no search) — same as Compra/Venta. Unlike
> Venta, the screen does **not** look the ticker up in holdings and does **not** gate on held
> shares: a dividend doesn't consume a position, and you can legitimately receive a dividend on
> a ticker you have since sold. The engine accumulates `totalDividends` for the ticker group
> regardless of current shares held.

---

## 4. The dividend's numbers (the domain truth)

A dividend of gross **G** with withholding tax **T** produces:

| Number | Formula | What it is | Where it shows | Example (G=130.00, T=5.50) |
|---|---|---|---|---|
| **Monto bruto** | `G` | gross dividend before tax | breakdown | $130.00 |
| **Impuestos** | `T` | withholding tax | breakdown | −$5.50 |
| **Total a recibir** | `G − T` | what lands in Cash (= **Net Dividends**) | this form (live summary) | **$124.50** |

The tax **subtracts** from the gross. `computeCash` does `cash += grossAmount − tax`, so **Total
a recibir** is the exact cash credit, and `deriveHoldingFacts` does `totalDividends +=
grossAmount − tax`. This is precisely **Net Dividends** in `CONTEXT.md` (`gross − tax`).

> **Reconciliation stays intact.** After this dividend:
> `cash += (G − T)`, `marketValue` unchanged, `netContributions` unchanged,
> `totalReturn += (G − T)` (Net Dividends is a Total Return component).
> The invariant `Cash + Market Value == Net Contributions + Total Return` still holds.
> Check: Δ(Cash+MV) = `(G − T)`; Δ(NetContrib+TotalReturn) = `0 + (G − T)` ✓.

**Coherence rule:** the form shows **Total a recibir** only. The dividend's effect on **Total
Return** is deferred — it belongs on Home, not competing in the capture form. Each term lives in
one place.

---

## 5. Layout (settled)

Two input rows (no orphan half-field), then the breakdown:

```
┌────────────────────────────┐
│ ‹   Dividendo              │   header: back → picker
│                            │
│ Símbolo            Fecha   │   row 1: identity + when
│ ┌──────────┐  ┌───────────┐│
│ │ AAPL     │  │08/01/2026 │ │
│ └──────────┘  └───────────┘│
│                            │
│ Monto bruto      Impuestos │   row 2: gross + the one deduction
│ ┌──────────┐  ┌───────────┐│
│ │ $ 130.00 │  │ $ 5.50    │ │
│ └──────────┘  └───────────┘│
│                            │
│            … (espacio) …    │
│                            │
│ ───────── desglose ─────── │
│ Monto bruto         $130.00 │
│ Impuestos            −$5.50 │
│ ──────────────────────────  │
│ Total a recibir     $124.50 │   bold
│ ┌────────────────────────┐ │
│ │    Guardar movimiento   │ │   sticky primary button
│ └────────────────────────┘ │
└────────────────────────────┘
```

Notes:
- **Two semantic pairs:** Símbolo·Fecha (metadata), Monto bruto·Impuestos (gross + deduction).
  No lonely half-field (the lesson from Compra).
- **No "Disponible" helper** — there is no held-shares constraint on a dividend.
- **Over-tax state:** when `Impuestos > Monto bruto`, the **Total a recibir** turns red and the
  inline error replaces nothing (the error sits under Impuestos); save is blocked (§8).

---

## 6. Fields spec

| Field | Label (ES) | Input | Keyboard | Default | Stored as |
|---|---|---|---|---|---|
| ticker | **Símbolo** | text, force-UPPERCASE, `[A-Z]` only | `default` | empty | `string` |
| grossAmount | **Monto bruto** | text, `$` prefix | `decimal-pad` | empty | `number` |
| tax | **Impuestos** | text, `$` prefix | `decimal-pad` | empty → `0` | `number` |
| executedAt | **Fecha** | native date picker | — | **today** | `YYYY-MM-DD` string |

> **"Impuestos" maps to the real `tax` field** here — unlike Venta, where "Impuestos" mapped to
> `regulatoryFees`. On a dividend, "Impuestos" is genuinely the withholding `tax`.

> **Monto bruto starts empty** (manual). **Impuestos starts empty** (→ 0), like the optional fee
> fields on Compra/Venta — a tax-free dividend is valid (`Total a recibir = Monto bruto`).

---

## 7. Live summary (breakdown)

A small breakdown above the button (mirrors Venta's, with a single deduction):

> **Monto bruto** `G` · **Impuestos** `−T` · **Total a recibir** `G − T`

- Display-only — it previews the Cash credit; it does **not** re-implement engine math.
- Updates live as Monto bruto / Impuestos change.
- With Monto bruto blank/0, the figures read `$0.00`.
- **Total a recibir** turns **teal** when saveable, **muted grey** while inputs are missing,
  **red** when `Impuestos > Monto bruto` (over-tax).

---

## 8. Validation & save-gate (settled — strict)

| Field | Rule |
|---|---|
| **Símbolo** | required, non-empty (after uppercase/trim) |
| **Monto bruto** | required, decimal **> 0** |
| **Impuestos** | optional, empty → `0`; **≥ 0**, and **≤ Monto bruto** (strict) |
| **Fecha** | default **today**; **future dates blocked** |

All gates must pass for **Guardar movimiento** to enable:

1. `Símbolo ≠ ""`
2. `Monto bruto > 0`
3. `Impuestos ≥ 0`
4. `Impuestos ≤ Monto bruto`  → otherwise `taxExceedsGross`

- Inline error under a field only **after it's touched-then-invalid**; no error spam while typing.
- **Over-tax** (`Impuestos > Monto bruto`): error **"El impuesto no puede superar el monto bruto."**
  The Total a recibir turns red and save is blocked — a negative net dividend is never a real
  event and must not reach the engine.
- **No held-shares gate** (the key contrast with Venta): a dividend isn't bounded by a position.

---

## 9. Save behavior (settled)

On **Guardar movimiento**:
1. Build the `DividendMovement` (user fields + system placeholders, §3).
2. `useMovementsStore.addMovement(movement)`.
3. Success **haptic** (`expo-haptics`).
4. **Dismiss** the modal (back to Home).
5. Home re-derives via `usePortfolio()` — **Efectivo** rises by `G − T`, **Net Dividends** and
   **Total Return** grow — no manual refresh.

No confirmation screen, no toast — haptic + dismiss only.

---

## 10. State & data source (reused, no new read)

Unchanged from the other forms: the dumb `useMovementsStore` holds raw `Movement[]` +
`addMovement`; derivation stays in the memoized `usePortfolio` seam. Unlike Venta, Dividendo
adds **no** holdings read — there is no held-shares gate, so the form needs nothing from the
derived portfolio. `usePortfolio` stays the single mock→Supabase swap-point.

---

## 11. Tests (settled — view-model only)

Mirror Venta's pure-view-model approach (`components/add-movement/sell-view-model.test.ts`):

- `summarizeDividend(input)` — the `gross`/`total` figures and the save-gate flags
  (`saveEnabled`, `tickerInvalid`, `grossInvalid`, `taxExceedsGross`). Unit-tested across:
  blank ticker, blank/zero gross, blank tax → 0, `total = G − T`, and `tax >` / `≤ G`.
- `buildDividendMovement(input, deps)` — maps Símbolo/Monto bruto/Impuestos/Fecha → the typed
  movement (system fields via injected generators); empty Impuestos → `0`; ticker stored uppercase.
- **Not tested:** the form component (no RNTL installed). Engine behavior is already covered by
  `cash.test.ts` / `reducer.test.ts`.

---

## 12. Number, sign & format conventions

- **Currency:** `formatUSD` → `$124.50`. Inputs accept plain decimals; the breakdown uses `formatUSD`.
- A dividend's inputs are **positive** magnitudes; the deduction renders with a leading `−` in the
  breakdown only (the engine applies the cash credit). No P&L colors on this screen.
- **Date:** displayed `DD/MM/AAAA`, stored `YYYY-MM-DD`.

---

## 13. Label glossary — EN canonical ↔ Spanish UI

| EN (CONTEXT.md / model) | Spanish UI label |
|---|---|
| Dividend (movement type) | **Dividendo** |
| `ticker` | **Símbolo** |
| `grossAmount` | **Monto bruto** |
| `tax` (withholding) | **Impuestos** |
| `executedAt` | **Fecha** |
| Cash credit / Net Dividends (`G − T`) | **"Total a recibir"** |
| Save | **Guardar movimiento** |

> **Note:** "Impuestos" here is the real `tax` field (withholding tax), unlike Venta where the
> same label mapped to `regulatoryFees`. The canonical concept is **Net Dividends** (`CONTEXT.md`);
> the form's bottom label is **"Total a recibir"** for family consistency with Venta.

---

## 14. Settled decisions (recap)

1. **Input model** → **amount-first** (Monto bruto + Impuestos → Total a recibir); no shares, no price.
2. **Símbolo** → **free text, force-uppercase, no search**; **no held-shares lookup or gate**.
3. **One deduction** → **Impuestos (`tax`) only**; empty → 0; it subtracts. **No `fee`** on dividends.
4. **Over-tax gate** → **strict block** when `Impuestos > Monto bruto`; red total + inline error.
5. **Total a recibir** → the live net (`G − T`), the family-consistent bottom label.
6. **Structure** → separate screen mirroring Venta (own file/route; `dividend-view-model.ts`).
7. **Tests** → view-model only.
8. **No engine change** — `dividend` is already supported (`computeCash`, `deriveHoldingFacts`).

---

## 15. Out of scope (this spec)

- **A separate dividend fee** (`fee` on `DividendMovement`) — the model is tax-only by deliberate
  decision; re-introducing a fee would be its own model change + ADR.
- A **holdings selector / held-shares gate** for the symbol (free text, ungated, chosen instead).
- **Per-share dividend × shares** entry (record the gross cash directly; no quantity).
- Edit / delete of movements (create-only).
- Persistence of the store (in-memory; Supabase later).
- Auth / real `userId`, UUID strategy (placeholders for now).
- Any **engine change** — `dividend` is already supported.
- DRIP (dividend reinvestment), qualified-vs-ordinary classification, ex-date/record-date
  tracking, FX on foreign dividends (`docs/adr/0002-scope-boundaries-v1.md`).
