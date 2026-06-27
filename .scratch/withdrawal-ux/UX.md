# Pulso — Add Movement UX Spec (Withdrawal / Retiro)

**Status:** design brief — converged. Decisions below are **settled** (confirmed when the PRD was written); this doc prescribes, it doesn't ask for options.
**Scope:** the **Retiro** form only — the cash sibling of the Depósito, second cash-movement slice.
**Companion to:** `.scratch/add-movement-ux/UX.md` (the Deposit spec — this is its mirror; shared infra is referenced, not repeated).
**Depends on:** the cash-side amount convention, live in the engine (`docs/adr/0003-cash-side-movement-amounts.md`).
**Language:** UI is **Spanish**; canonical concepts are defined in English in `CONTEXT.md`.
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## 1. How to use this doc

This describes **what the screen produces**, **how it reconciles with the engine**, and
**how it differs from the Deposit** (which it mirrors). All math below is the **real
behavior** of the engine (`computeCash`, `computeNetContributions`, `assemblePortfolio`)
under the cash-side convention, so any mockup using it will reconcile.

Where the screen is identical to the Deposit (store, tokens, date picker, save loop), this
doc references the Deposit spec instead of repeating it. The **differences** are the point:
direction of the fee, the summary label, the fee ceiling, and the over-withdrawal gate.

---

## 2. Product thesis

The user can put money in (Depósito) but not take it out. **Retiro** closes the cash loop:
record money moved from the brokerage back to the bank, and watch Home re-derive.

> tap `+` → pick "Retiro" → fill it → Guardar → Home re-derives: **Cash** drops, **Aportado** adjusts.

Retiro is the cash sibling of Depósito — same thinness (`amount`, `fee`, `executedAt`), same
patterns — but the fee points the other way: on a deposit the fee shrinks what *arrives* in
cash; on a withdrawal it shrinks what *reaches your bank*.

### Flow / entry (context)

Same two-step modal flow as the Deposit. **Screen 1** is the type picker (grouped:
**OPERACIONES** = Compra/Venta/Dividendo, **EFECTIVO** = Depósito/**Retiro**). Tapping
**Retiro** opens **this** screen. This doc covers only the Retiro screen.

---

## 3. The data you're producing — `WithdrawalMovement`

The screen builds **one** `WithdrawalMovement` (`types/models.ts`) and appends it to the store.

| Field | Source | Meaning | Example |
|---|---|---|---|
| `amount` | user — **"Monto"** | the **cash-side** amount — what leaves Buying Power | `200.00` |
| `fee` | user — **"Comisión"** | withdrawal fee; subtracted from what reaches the bank | `1.00` |
| `executedAt` | user — **"Fecha"** | date the withdrawal happened (`YYYY-MM-DD`) | `2026-01-08` |
| `type` | fixed | `'withdrawal'` (set by the flow) | `withdrawal` |
| `id` | system — **placeholder** | unique id | _(generated)_ |
| `userId` | system — **placeholder** | owner (constant for now, = mock user) | `mock-user-001` |
| `createdAt` | system | ISO timestamp at save | _(now)_ |

> System fields (`id`, `userId`, `createdAt`) are placeholders — same note as the Deposit (§3 there).

> **Note the field name:** the withdrawal fee is `fee` (not `transferFee`). The Deposit uses
> `transferFee`; the Withdrawal model uses `fee`. Same concept, different field per `types/models.ts`.

---

## 4. The withdrawal's three numbers (the domain truth)

A withdrawal of **Monto A** with **fee F** produces three distinct numbers. Getting these
right is the whole point of this screen:

| Number | Formula | What it is | Where it shows | Example (A=200, F=1) |
|---|---|---|---|---|
| **Monto** | `A` | what leaves Buying Power (Cash) | this form (input) | $200.00 |
| **Recibirás** | `A − F` | what reaches your bank | this form (live summary) | **$199.00** |
| **Aportado** (impact) | `−(A − F)` | how much Net Contributions drops | the **Home** ("Aportado → Vale hoy") | −$199.00 |

The fee `F` is **subtracted** from what you receive (`Recibirás = A − F`), and it does **not**
add to the cash drain — under the cash-side convention `computeCash` does `cash -= amount`, so
**only `A` leaves Cash**. The fee surfaces later as **Comisiones** in Total Return, dragging the
return by `F`.

> **Reconciliation stays intact.** After this withdrawal:
> `cash −= A`, `netContributions −= (A − F)`, `totalReturn −= F` (the fee).
> The invariant `Cash + Market Value == Net Contributions + Total Return` still holds.
> Check: Δcash − Δaportado = `−A − (−(A−F)) = −F` ✓.

**Coherence rule:** the form shows **Monto** and **Recibirás** only. It does **not** show a
label "Aportado" — that accumulated concept lives on the Home. Each term lives in one place.

---

## 5. Mirror of the Deposit — what's reused vs flipped

There is no new handoff mockup; the Retiro reuses the Deposit layout (§6 there). What carries
over and what flips:

| Aspect | Deposit | Retiro |
|---|---|---|
| Header | `‹  Depósito` | `‹  Retiro` |
| Top field | **Monto** (cash to add) | **Monto** (cash to withdraw) |
| Side fields | Comisión transf. + Fecha | **Comisión** + Fecha |
| Info hint | "la comisión se suma a tu monto…" | "la comisión se descuenta de lo que recibes" |
| Live summary label | **APORTARÁS** | **RECIBIRÁS EN TU BANCO** |
| Live summary value | `Monto + Comisión` | `Monto − Comisión` |
| Fee direction | adds (to Aportado) | subtracts (from what you receive) |
| Fee ceiling | none (fee just adds) | **`Comisión < Monto`** (else Recibirás ≤ 0) |
| Extra gate | — | **`Monto ≤ Cash disponible`** (over-withdrawal) |
| Primary button | Guardar movimiento | Guardar movimiento |

---

## 6. Layout (settled — mirror of the Deposit)

```
┌────────────────────────────┐
│ ‹   Retiro                 │   header: back → picker
│                            │
│ Monto                      │
│ ┌────────────────────────┐ │   full-width, $ prefix, decimal keypad
│ │ $ 200.00               │ │
│ └────────────────────────┘ │
│                            │
│ Comisión           Fecha   │   side-by-side row
│ ┌──────────┐  ┌───────────┐│
│ │ $ 1.00   │  │08/01/2026 │ │
│ └──────────┘  └───────────┘│
│                            │
│ ⓘ Revisa la comisión que   │   info hint
│   aplica tu banco; se      │
│   descuenta de lo que      │
│   recibes.                 │
│                            │
│            … (espacio) …    │
│                            │
│    RECIBIRÁS EN TU BANCO    │   live summary (Monto − Comisión)
│          $ 199.00          │
│ ┌────────────────────────┐ │
│ │    Guardar movimiento   │ │   sticky primary button
│ └────────────────────────┘ │
└────────────────────────────┘
```

**Over-withdrawal state** (Monto > Cash disponible): the Monto field shows its error border,
the save button is disabled, and an inline error replaces/sits under the field:

```
│ ┌────────────────────────┐ │
│ │ $ 500.00               │ │   error border
│ └────────────────────────┘ │
│ Solo tienes $267.07 disponible. │   inline error (available Cash)
```

---

## 7. Fields spec

| Field | Label (ES) | Input | Keyboard | Default | Stored as |
|---|---|---|---|---|---|
| amount | **Monto** | text, `$` prefix | `decimal-pad` | empty | `number` |
| fee | **Comisión** | text, `$` prefix | `decimal-pad` | empty → `0` | `number` |
| executedAt | **Fecha** | native date picker | — | **today** | `YYYY-MM-DD` string |

---

## 8. Live summary

A single line above the button:

> **Recibirás en tu banco** · `formatUSD(amount − fee)`

- Display-only — it previews the bank-side figure; it does **not** re-implement engine math.
- Updates live as Monto/Comisión change.
- With empty Monto, show `$0.00`.

---

## 9. Validation & save-gate (settled)

| Field | Rule |
|---|---|
| **Monto** | required, decimal **> 0**; and **≤ Cash disponible** (over-withdrawal blocked) |
| **Comisión** | optional, empty → `0`; must be **≥ 0** and **< Monto** (a fee ≥ Monto ⇒ Recibirás ≤ 0, nonsense) |
| **Fecha** | default **today**; **future dates blocked** |

The three gates that must all pass for **Guardar movimiento** to enable:

1. `Monto > 0`
2. `Comisión < Monto`  → otherwise `feeInvalid`
3. `Monto ≤ Cash disponible`  → otherwise `insufficientFunds`

- Inline error under a field only **after it's touched-then-invalid**; no error spam while typing.
- The over-withdrawal error shows the **available Cash** so the user knows their ceiling.
- The binding constraint is `Monto ≤ Cash` (not `Monto + Comisión`): under the cash-side
  convention the fee does **not** drain Cash, so it is not part of this check.

---

## 10. Save behavior (settled)

On **Guardar movimiento**:
1. Build the `WithdrawalMovement` (user fields + system placeholders, §3).
2. `useMovementsStore.addMovement(movement)`.
3. Success **haptic** (`expo-haptics`).
4. **Dismiss** the modal (back to Home).
5. Home re-derives via `usePortfolio()` and shows the updated **Valor total / Efectivo**
   (and **Aportado** in the bridge) — no manual refresh.

No confirmation screen, no toast — haptic + dismiss only.

---

## 11. State & data source (reused — no change)

Unchanged from the Deposit (§11 there): the dumb `useMovementsStore` holds raw `Movement[]` +
`addMovement`; derivation stays in the memoized `usePortfolio` seam (derive-don't-store). The
Retiro adds **one read**: it reads `usePortfolio().cash` to feed the over-withdrawal gate.
The engine never enters the store; `usePortfolio` stays the single mock→Supabase swap-point.

---

## 12. Tests (settled — view-model only)

Mirror the Deposit's pure-view-model approach (`components/add-movement/deposit-view-model.test.ts`):

- `summarizeWithdrawal(input, availableCash)` — the live `recibiras` figure and the save-gate
  flags (`saveEnabled`, `amountInvalid`, `feeInvalid`, `insufficientFunds`). Unit-tested across:
  blank/zero Monto, blank Comisión → 0, `recibiras = Monto − Comisión`, `Comisión ≥ Monto`,
  and `Monto >` / `≤ availableCash`.
- `buildWithdrawalMovement(input, deps)` — maps Monto/Comisión/Fecha → the typed movement
  (system fields via injected generators so the test is deterministic); empty Comisión → `0`.
- **Not tested:** the form component (no `@testing-library/react-native` installed), consistent
  with the Deposit and Home decisions. Engine behavior is already covered by `cash.test.ts` /
  `valuation.test.ts`.

---

## 13. Number, sign & format conventions

- **Currency:** `formatUSD` → `$199.00`. Inputs accept plain decimals; the summary uses `formatUSD`.
- A withdrawal's inputs are **positive** magnitudes; the form shows no minus signs (the engine
  applies the negative direction). No P&L colors on this screen.
- **Date:** displayed `DD/MM/AAAA`, stored `YYYY-MM-DD`.

---

## 14. Label glossary — EN canonical ↔ Spanish UI

| EN (CONTEXT.md / model) | Spanish UI label |
|---|---|
| Withdrawal (movement type) | **Retiro** |
| `amount` | **Monto** |
| `fee` / Fee | **Comisión** |
| `executedAt` | **Fecha** |
| What reaches the bank (`amount − fee`) | **"Recibirás en tu banco"** |
| Cash / Buying Power (the ceiling) | **Efectivo / disponible** |
| Net Contributions / Aportado | **Aportado** _(shown on Home, not here)_ |
| Save | **Guardar movimiento** |

> **Banned:** "invertido" / "monto invertido" (`CONTEXT.md`). Do not show `Monto + Comisión`
> as what leaves cash — under the cash-side convention only `Monto` leaves Cash.

---

## 15. Design tokens (existing — reuse, don't reinvent)

Same as the Deposit (§15 there): `constants/theme` — dark background, surface, teal `accent`,
Manrope, the radius/type scale. The primary button uses `accent` (teal). No new tokens.

---

## 16. Open decisions

All settled for v1:

1. **Over-withdrawal** → **block the save** (read `usePortfolio().cash`; show available Cash on error).
2. **Structure** → **separate screen** mirroring the Deposit (own file/route; `withdrawal-view-model.ts`).
3. **Tests** → **view-model only** (no component/RNTL tests).
4. **Fee ceiling** → keep the `Comisión < Monto` guard (here it's a real case, not impossible-ish — it makes Recibirás ≤ 0).

---

## 17. Out of scope (this spec)

- The other three forms — Compra, Venta, Dividendo (later PRDs).
- Edit / delete of movements (create-only).
- Persistence of the store (in-memory; Supabase later).
- Real share prices / a price source (`MOCK_PRICES`); the Cash ceiling comes from the derived portfolio.
- Auth / real `userId`, UUID strategy (placeholders for now).
- Any **engine change** — the cash-side convention is already live.
- Corporate actions, FX, ACATS, account fees (`docs/adr/0002-scope-boundaries-v1.md`).
