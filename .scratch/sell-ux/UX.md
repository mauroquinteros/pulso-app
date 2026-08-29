# Pulso — Add Movement UX Spec (Venta / Sell)

**Status:** design brief — converged in a grill-with-docs session. Decisions below are **settled**;
this doc prescribes, it doesn't ask for options. One copy item is flagged for confirmation.
**Scope:** the **Venta** form only — the second **OPERACIONES** slice (Compra already shipped).
**Companion to:** `.scratch/buy-ux/` (Compra) and `.scratch/withdrawal-ux/` — mirrors their
patterns; shared infra is referenced, not repeated.
**Depends on:** the engine's existing `sell` support and the cash-side convention
(`docs/adr/0003-cash-side-movement-amounts.md`), the moving-average cost method
(`docs/adr/0001-moving-average-cost-method.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## 1. How to use this doc

This describes **what the screen produces**, **how it reconciles with the engine**, and
**how it differs from Compra** (which it inverts). All math below is the **real behavior** of
the engine (`computeCash`, `deriveHoldingFacts`), so any mockup using it will reconcile.

Where the screen is identical to Compra (store, tokens, date picker, save loop, decimal
sanitizing, error-on-touch, the bottom breakdown), this doc references it. The **differences**
are the point: a **shares-first input** (the inverse of Compra's monto-first), a **held-shares
gate** (you can only sell what you own), and **two deductions** (Comisión + Impuestos).

---

## 2. Product thesis

The user can buy and move cash, but can't yet **close a position**. **Venta** completes the
investing loop: record selling shares of a holding, and watch Home re-derive — Efectivo rises,
the holding shrinks (or disappears), and the gain/loss becomes **realized**.

> tap `+` → pick "Venta" → type **Símbolo / Acciones / Precio / Comisión / Impuestos / Fecha** →
> see **"Total a recibir"** update live → **Guardar** → Home re-derives: **Efectivo** rises,
> the holding's shares drop, **Realized P&L** updates.

### Venta is the inverse of Compra

This is the key mental model. The user thinks differently in each direction, and the form
follows:

| | User enters | Form derives |
|---|---|---|
| **Compra** | **Monto** (the money put in) | Acciones (`Monto / Precio`) |
| **Venta** | **Acciones** (the quantity sold) | **Total a recibir** (`Acciones × Precio − fees`) |

You sell a **quantity** of something you already hold — not an arbitrary dollar amount — so
shares are the input and the proceeds are the consequence. This matches the real broker (input
"Shares" → "Est. amount") and the v1 mockup.

### Flow / entry (context)

Same two-step modal flow as the other forms. **Screen 1** is the type picker (grouped:
**OPERACIONES** = Compra/**Venta**/Dividendo). The **Venta** row — previously "Pronto" — is now
enabled and opens **this** screen. This doc covers only the Venta screen.

---

## 3. The data you're producing — `SellMovement`

The screen builds **one** `SellMovement` (`types/models.ts`) and appends it to the store.

| Field | Source | Meaning | Example |
|---|---|---|---|
| `ticker` | user — **"Símbolo"** | the symbol sold (uppercase) | `GOOG` |
| `shares` | user — **"Acciones"** | shares sold (fractional ok) | `2` |
| `executionPrice` | user — **"Precio de ejecución"** | price sold per share | `349.60` |
| `fee` | user — **"Comisión"** | clearing/broker commission; reduces proceeds | `0.10` |
| `regulatoryFees` | user — **"Impuestos"** | regulatory fees; reduces proceeds | `0.02` |
| `executedAt` | user — **"Fecha"** | date the sale happened (`YYYY-MM-DD`) | `2026-01-08` |
| `type` | fixed | `'sell'` | `sell` |
| `id` / `userId` / `createdAt` | system — **placeholder** | as in the other forms | _(generated)_ |

> **Two deductions, not one.** Unlike Compra (single `fee`), Venta has `fee` **and**
> `regulatoryFees` — matching the model and the real broker ("Clearing fee" + "Regulatory
> fees"). There is **no `tax`** on a sell (`tax` is a Dividend concept). The v1 mockup's "Tax"
> label maps to **`regulatoryFees`**.

> **Symbol is free text** (uppercase, `[A-Z]` only, no search) — same as Compra. But because
> you can only sell what you hold, the screen looks the typed ticker up in the derived holdings
> to drive the **Disponible** display and the gate (§10).

---

## 4. The sell's numbers (the domain truth)

A sell of **S** shares at **price P** with fees **F** (Comisión) and **R** (Impuestos) produces:

| Number | Formula | What it is | Where it shows | Example (S=2, P=349.60, F=0.10, R=0.02) |
|---|---|---|---|---|
| **Monto bruto** | `P × S` | gross proceeds before fees | breakdown | $699.20 |
| **Total a recibir** | `P × S − F − R` | what lands in Cash | this form (live summary) | **$699.08** |
| **Realized P&L** | `(P − avgCost) × S` | gross gain/loss locked in | **Home** (not this form) | _(derived)_ |

The two fees **subtract** from the proceeds (the inverse of Compra, where the fee added).
`computeCash` does `cash += executionPrice × shares − fee − regulatoryFees`, so **Total a
recibir** is the exact cash credit. Realized P&L is gross (before F and R), per
`docs/adr/0001`; the fees still erode **Total Return** by `F + R`.

> **Reconciliation stays intact.** Right after this sell (execution price = current price):
> `cash += (P×S − F − R)`, `marketValue −= P×S`, `realizedPnl += (P − avgCost)×S`,
> `netContributions` unchanged, `totalReturn −= (F + R)`.
> The invariant `Cash + Market Value == Net Contributions + Total Return` still holds.
> Check: Δ(Cash+MV) = `(P×S − F − R) − P×S = −(F+R)`;
> Δ(NetContrib+TotalReturn) = `0 + (−(F+R)) = −(F+R)` ✓.

**Coherence rule:** the form shows **Total a recibir** only. **Realized P&L is deferred** — it
belongs on the Home / movement detail, not competing in the capture form (settled: minimalist,
matching v1). Each term lives in one place.

---

## 5. Layout (settled)

Three input rows (no orphan half-field), then the breakdown:

```
┌────────────────────────────┐
│ ‹   Venta                  │   header: back → picker
│                            │
│ Símbolo            Fecha   │   row 1: identity + when
│ ┌──────────┐  ┌───────────┐│
│ │ GOOG     │  │08/01/2026 │ │
│ └──────────┘  └───────────┘│
│                            │
│ Acciones      Precio ejec. │   row 2: the multiplicands
│ ┌──────────┐  ┌───────────┐│
│ │ 2        │  │ $ 349.60  │ │
│ └──────────┘  └───────────┘│
│ Disponible 6.08298         │   muted helper under Acciones
│                            │
│ Comisión          Impuestos │   row 3: the two deductions
│ ┌──────────┐  ┌───────────┐│
│ │ $ 0.10   │  │ $ 0.02    │ │
│ └──────────┘  └───────────┘│
│                            │
│            … (espacio) …    │
│                            │
│ ───────── desglose ─────── │
│ Monto bruto         $699.20 │
│ Comisión            −$0.10  │
│ Impuestos           −$0.02  │
│ ──────────────────────────  │
│ Total a recibir     $699.08 │   bold
│ ┌────────────────────────┐ │
│ │    Guardar movimiento   │ │   sticky primary button
│ └────────────────────────┘ │
└────────────────────────────┘
```

Notes:
- **Three semantic pairs:** Símbolo·Fecha (metadata), Acciones·Precio (multiply to gross),
  Comisión·Impuestos (deductions). No lonely half-field (the lesson from Compra).
- **"Disponible X acciones"** is a muted helper **under** the Acciones box (it doesn't fit on a
  half-width label row). It appears once a held ticker is typed.
- **Over-sell state:** the Acciones box border turns red and the helper is replaced by the
  inline error (§10).

---

## 6. Fields spec

| Field | Label (ES) | Input | Keyboard | Default | Stored as |
|---|---|---|---|---|---|
| ticker | **Símbolo** | text, force-UPPERCASE, `[A-Z]` only | `default` | empty | `string` |
| shares | **Acciones** | text, plain (fractional) | `decimal-pad` | empty | `number` |
| executionPrice | **Precio de ejecución** | text, `$` prefix | `decimal-pad` | empty | `number` |
| fee | **Comisión** | text, `$` prefix | `decimal-pad` | empty → `0` | `number` |
| regulatoryFees | **Impuestos** | text, `$` prefix | `decimal-pad` | empty → `0` | `number` |
| executedAt | **Fecha** | native date picker | — | **today** | `YYYY-MM-DD` string |

> **`regulatoryFees` is shown as "Impuestos"** in the UI (the user's term). The field name in
> the model stays `regulatoryFees` — the data is regulatory fees, only the label is "Impuestos".

> **Precio de ejecución starts empty** (manual) — a past sale happened at a specific price; we do
> not pre-fill the current price. **Comisión / Impuestos start empty** (→ 0), like Compra.

---

## 7. Live summary (breakdown)

A small breakdown above the button (mirrors Compra's breakdown, inverted to subtractions):

> **Monto bruto** `P×S` · **Comisión** `−F` · **Impuestos** `−R` · **Total a recibir** `P×S − F − R`

- Display-only — it previews the Cash credit; it does **not** re-implement engine math.
- Updates live as Acciones/Precio/Comisión/Impuestos change.
- With Acciones or Precio blank/0, the figures read `$0.00`.
- **Total a recibir** turns **teal** when saveable, **muted grey** while inputs are missing,
  **red** when the sell is over-held (insufficient shares).

---

## 8. Validation & save-gate (settled — strict)

The screen looks the typed ticker up in `usePortfolio().holdings` and passes the **available
shares** for that ticker to the view-model (0 if not held).

| Field | Rule |
|---|---|
| **Símbolo** | required, non-empty (after uppercase/trim) |
| **Acciones** | required, decimal **> 0**, and **≤ available shares** for the ticker (strict) |
| **Precio de ejecución** | required, decimal **> 0** |
| **Comisión** | optional, empty → `0`; **≥ 0** |
| **Impuestos** | optional, empty → `0`; **≥ 0** |
| **Fecha** | default **today**; **future dates blocked** |

All gates must pass for **Guardar movimiento** to enable:

1. `Símbolo ≠ ""`
2. `Acciones > 0`
3. `Acciones ≤ available shares`  → otherwise `insufficientShares`
4. `Precio > 0`
5. `Comisión ≥ 0` and `Impuestos ≥ 0`

- Inline error under a field only **after it's touched-then-invalid**; no error spam while typing.
- **Over-sell** (`Acciones > available`): error **"Solo tienes X acciones."** (shows the held count).
- **Not held** (`available === 0` for the typed ticker): error **"No tienes acciones de XXX."**
- The gate is **strict** (mirrors Compra/Retiro). The binding constraint is the held shares of
  the **selected ticker**, derived from the store — never fabricated.

---

## 9. Save behavior (settled)

On **Guardar movimiento**:
1. Build the `SellMovement` (user fields + system placeholders, §3).
2. `useMovementsStore.addMovement(movement)`.
3. Success **haptic** (`expo-haptics`).
4. **Dismiss** the modal (back to Home).
5. Home re-derives via `usePortfolio()` — **Efectivo** rises, the holding's shares drop (or the
   holding disappears on a full exit), **Realized P&L** updates — no manual refresh.

A **full exit** (selling exactly the held shares) makes the engine reset that ticker's average
cost, so a later re-buy starts fresh (`docs/adr/0001`). No confirmation screen, no toast —
haptic + dismiss only.

---

## 10. State & data source (reused + one read)

Unchanged from the other forms: the dumb `useMovementsStore` holds raw `Movement[]` +
`addMovement`; derivation stays in the memoized `usePortfolio` seam. Venta adds **one read**:
it reads `usePortfolio().holdings`, finds the entry for the typed ticker, and uses its `shares`
as the available quantity for the gate and the "Disponible" helper. The engine never enters the
store; `usePortfolio` stays the single mock→Supabase swap-point.

---

## 11. Tests (settled — view-model only)

Mirror Compra's pure-view-model approach (`components/add-movement/buy-view-model.test.ts`):

- `summarizeSell(input, availableShares)` — the `gross`/`total` figures and the save-gate flags
  (`saveEnabled`, `tickerInvalid`, `sharesInvalid`, `priceInvalid`, `insufficientShares`).
  Unit-tested across: blank ticker, blank/zero shares, blank/zero price, blank fees → 0,
  `total = P×S − F − R`, `shares >` / `≤ availableShares`, and `availableShares === 0`.
- `buildSellMovement(input, deps)` — maps Símbolo/Acciones/Precio/Comisión/Impuestos/Fecha → the
  typed movement (system fields via injected generators); empty Comisión/Impuestos → `0`; ticker
  stored uppercase.
- **Not tested:** the form component (no RNTL installed). Engine behavior is already covered by
  `cash.test.ts` / `reducer.test.ts` / `valuation.test.ts`.

---

## 12. Number, sign & format conventions

- **Currency:** `formatUSD` → `$699.08`. Inputs accept plain decimals; the breakdown uses `formatUSD`.
- **Shares:** plain decimal, fractional allowed (e.g. `6.08298`); reuse `sanitizeDecimal`.
- A sell's inputs are **positive** magnitudes; the deductions render with a leading `−` in the
  breakdown only (the engine applies the cash credit). No P&L colors on this screen.
- **Date:** displayed `DD/MM/AAAA`, stored `YYYY-MM-DD`.

---

## 13. Label glossary — EN canonical ↔ Spanish UI

| EN (CONTEXT.md / model) | Spanish UI label |
|---|---|
| Sell (movement type) | **Venta** |
| `ticker` | **Símbolo** |
| `shares` | **Acciones** |
| `executionPrice` | **Precio de ejecución** |
| `fee` (clearing/broker commission) | **Comisión** |
| `regulatoryFees` | **Impuestos** |
| `executedAt` | **Fecha** |
| Gross proceeds (`P×S`) | **"Monto bruto"** |
| Cash credit (`P×S − F − R`) | **"Total a recibir"** |
| Held shares of the ticker | **"Disponible"** |
| Save | **Guardar movimiento** |

> **Note:** the UI label is **"Impuestos"** but the model field is `regulatoryFees` (never `tax`
> — `tax` is a Dividend concept). The label is a copy choice; the data is regulatory fees.

---

## 14. Settled decisions (recap)

1. **Input model** → **shares-first** (Acciones + Precio → Total a recibir), the **inverse of Compra**.
2. **Symbol** → **free text, force-uppercase, no search**; held shares looked up from holdings.
3. **Funds/shares gate** → **strict block** when `Acciones > available shares`; "Disponible X" shown.
4. ~~**No "Vender todo"** → it's a trading affordance; for a tracker the user knows the exact shares.~~
   **REVERSED 2026-08-24 — the app has a "Vender todo" control.** The struck-through premise is
   false, and always was: a bought position's share count is *derived* (`0012`) and is shown at full
   precision nowhere but this form's `Disponible` helper, so the user cannot know the exact shares.
   See `docs/adr/0014-a-full-exit-sells-the-apps-share-count.md` and `.scratch/full-exit/`.
5. **Two deductions** → **Comisión (`fee`) + Impuestos (`regulatoryFees`)**, both empty → 0, both subtract.
6. **Realized P&L** → **deferred** (not in the capture form); minimalist, matching v1.
7. **Precio** → empty/manual (no current-price pre-fill).
8. **Structure** → separate screen mirroring Compra (own file/route; `sell-view-model.ts`).
9. **Tests** → view-model only.

---

## 15. Out of scope (this spec)

- The other operation — Dividendo (later PRD). The picker still shows it as "Pronto".
- **Realized P&L preview** on this form (deferred to Home / movement detail).
- A **holdings selector** for the symbol (free text + lookup chosen instead).
- Edit / delete of movements (create-only).
- Persistence of the store (in-memory; Supabase later).
- Real share prices / a price source (`MOCK_PRICES`); available shares come from the derived portfolio.
- Auth / real `userId`, UUID strategy (placeholders for now).
- Any **engine change** — `sell` is already supported.
- Corporate actions, FX, lot/tax-lot selection, wash sales (`docs/adr/0002-scope-boundaries-v1.md`).
