# Pulso — Add Movement UX Spec (Deposit tracer)

**Status:** design brief — converged layout, some rules still *proposed (confirm)*
**Scope:** the **Deposit** form only — the tracer-bullet slice of Add Movement.
The other four types (Compra, Venta, Dividendo, Retiro) follow in later PRDs.
**Language:** UI is **Spanish**; canonical concepts are defined in English in `CONTEXT.md`.
**Currency:** USD only (see `docs/adr/0002-scope-boundaries-v1.md`).

---

## 1. How to use this doc

This describes **what the screen produces**, **how it must reconcile with the engine**,
and **what's still open**. Unlike the Home spec, this screen has already converged on a
layout (§6) — it prescribes, it doesn't ask for options. Items marked _(proposed, confirm)_
are recommendations not yet signed off.

All math below is the **real behavior** of the engine (`computeCash`, `assemblePortfolio`)
so any mockup using it will reconcile.

---

## 2. Product thesis

Pulso's whole purpose is that the user **records movements** and the app derives everything
(`CONTEXT.md`). Until now the app only *reads* frozen mock data; this is the first screen that
lets the user **write** a movement and watch the Home numbers move. The Deposit form is the
**tracer bullet** that proves the full loop end-to-end:

> tap `+` → pick "Depósito" → fill it → Guardar → the Home re-derives and updates.

Deposit is the thinnest type (`amount`, `transferFee`, `executedAt`) and the first thing a real
user does (you deposit before you buy). The patterns it establishes — number inputs, the fee
field, the date picker, validation, the live summary, the save→store→home loop — transfer to the
other four forms.

### Flow / entry (context)

Two-step flow. **Screen 1** is the type picker (a grouped list: **OPERACIONES** = Compra/Venta/
Dividendo, **EFECTIVO** = Depósito/Retiro). Tapping **Depósito** opens **this** screen. The whole
flow is a modal (`app/add-movement`, `presentation: 'modal'`). This doc covers only the Deposit
screen.

---

## 3. The data you're producing — `DepositMovement`

The screen builds **one** `DepositMovement` (`types/models.ts`) and appends it to the store.

| Field | Source | Meaning | Example |
|---|---|---|---|
| `amount` | user — **"Monto"** | the **gross** deposit (= the Aportado contribution) | `1250.00` |
| `transferFee` | user — **"Comisión de transferencia"** | fee on the deposit; reduces Efectivo & Total Return | `5.00` |
| `executedAt` | user — **"Fecha"** | date the deposit happened (`YYYY-MM-DD`) | `2023-10-24` |
| `type` | fixed | `'deposit'` (set by the flow) | `deposit` |
| `id` | system — **placeholder** | unique id | _(generated)_ |
| `userId` | system — **placeholder** | owner (constant for now, = mock user) | `mock-user-001` |
| `createdAt` | system | ISO timestamp at save (`new Date().toISOString()`) | _(now)_ |

> **System fields (`id`, `userId`, `createdAt`) are placeholders** — trivial generation now,
> real decisions (UUID source, auth `userId`) deferred to the Supabase/auth phase. Not a design
> decision; just an implementation note.

---

## 4. The deposit's three numbers (the domain truth)

A deposit of **amount A** with **fee F** produces three distinct numbers. Getting these right is
the whole point of this screen:

| Number | Formula | What it is | Where it shows | Example (A=1250, F=5) |
|---|---|---|---|---|
| **Monto** | `A` | what the user types — the deposit | this form (input) | $1,250.00 |
| **Efectivo** | `A − F` | what enters buying power | this form (live summary) | **$1,245.00** |
| **Aportado** | `+A` | the contribution (gross) | the **Home** ("Aportado → Vale hoy") | +$1,250.00 |

The fee `F` is **not** added on top — the engine **subtracts** it (`computeCash`:
`cash += amount − transferFee`). It surfaces later as **Comisiones** in Total Return, dragging the
return by `F`.

> **Reconciliation stays intact.** After this deposit:
> `cash += A−F`, `netContributions += A`, `totalReturn −= F` (the fee).
> The invariant `Cash + Market Value == Net Contributions + Total Return` still holds.

**Coherence rule:** the form shows **Monto** and **Efectivo** only. It does **not** show a label
"Aportado" — on a single deposit, Monto and Aportado are the same number ($1,250), and "Aportado"
is an *accumulated* concept that belongs on the Home. Each term lives in exactly one place.

---

## 5. Critique of the source mockup (what changes & why)

The handoff image presented the math **backwards** and in English. Verdicts:

| In the image | Verdict | Change |
|---|---|---|
| "Deposit" | change | → **Depósito** (language) |
| "**Amount Received**" $1250 | change label | "Received" implies the net; it's the **gross** deposit → **Monto** |
| "Transfer Fee" $5.00 | ok concept, change label | → **Comisión de transferencia** |
| "Date" 10/24/2023 | ok concept, fix format | → **Fecha**, `DD/MM/AAAA`, default hoy, block future |
| info hint (net value) | keep, translate | the hint was actually correct |
| "**TOTAL PAID $1,255**" | ❌ wrong (domain bug) | fee is subtracted, not added → **"Se sumará a tu efectivo · $1,245"** |
| "Save Movement" | change | → **Guardar movimiento** |

**What was right and is kept:** Monto full-width on top; **Comisión + Fecha side-by-side**; the `$`
prefix; the info hint; and the **live summary at the bottom** (great transparency touch — only the
number/label were wrong). The layout was basically correct; only labels, language, the summary
calc/label, and the date format change.

---

## 6. Layout (settled)

```
┌────────────────────────────┐
│ ‹   Depósito               │   header: back → picker
│                            │
│ Monto                      │
│ ┌────────────────────────┐ │   full-width, $ prefix, decimal keypad
│ │ $ 1,250.00             │ │
│ └────────────────────────┘ │
│                            │
│ Comisión transferencia  Fecha   side-by-side row
│ ┌──────────┐  ┌───────────┐│
│ │ $ 5.00   │  │24/10/2023 │ │
│ └──────────┘  └───────────┘│
│                            │
│ ⓘ Revisa la comisión que   │   info hint
│   aplica tu banco; se      │
│   descuenta del monto.     │
│                            │
│            … (espacio) …    │
│                            │
│     SE SUMARÁ A TU EFECTIVO │   live summary (Monto − Comisión)
│          $ 1,245.00         │
│ ┌────────────────────────┐ │
│ │    Guardar movimiento   │ │   sticky primary button
│ └────────────────────────┘ │
└────────────────────────────┘
```

---

## 7. Fields spec

| Field | Label (ES) | Input | Keyboard | Default | Stored as |
|---|---|---|---|---|---|
| amount | **Monto** | text, `$` prefix | `decimal-pad` | empty | `number` |
| transferFee | **Comisión de transferencia** | text, `$` prefix | `decimal-pad` | empty → `0` | `number` |
| executedAt | **Fecha** | native date picker | — | **today** | `YYYY-MM-DD` string |

---

## 8. Live summary

A single line above the button:

> **Se sumará a tu efectivo** · `formatUSD(amount − transferFee)`

- Display-only — it mirrors `computeCash`'s deposit branch; it does **not** re-implement engine math.
- Updates live as Monto/Comisión change.
- With empty Monto, show `$0.00` (or dim it) — see validation.

---

## 9. Validation & save-gate _(proposed, confirm)_

| Field | Rule |
|---|---|
| **Monto** | required, decimal **> 0** — the only hard gate |
| **Comisión** | optional, empty → `0`; must be **≥ 0** and **< Monto** (a fee ≥ the deposit ⇒ Efectivo ≤ 0, nonsense) |
| **Fecha** | default **today**; **future dates blocked** |

- **Guardar movimiento** is **disabled until Monto > 0** (and Comisión valid).
- Inline error under a field only **after it's touched-then-invalid**; no error spam while typing.
- _Debatable:_ the `Comisión < Monto` guard is an "impossible-ish" case; per `CLAUDE.md`
  ("no error handling for impossible scenarios") it could be dropped. Kept as a cheap guard.

---

## 10. Save behavior _(proposed, confirm)_

On **Guardar movimiento**:
1. Build the `DepositMovement` (user fields + system placeholders, §3).
2. `useMovementsStore.addMovement(movement)`.
3. Success **haptic** (`expo-haptics`, already a dep).
4. **Dismiss** the modal (back to Home).
5. The Home re-derives via `usePortfolio()` and shows the updated **Valor total / Efectivo**
   (and **Aportado** in the bridge) — no manual refresh.

No confirmation screen. Optional: a brief toast/snackbar.

---

## 11. State management — the movements store

The store is **dumb**: it holds the raw `Movement[]` and an `addMovement`. Derivation stays in the
`usePortfolio` seam, memoized. Principle: **derive-don't-store** — raw movements are the single
source of truth; the `Portfolio` is always recomputed, never stored.

```ts
// stores/movements.ts
export const useMovementsStore = create<MovementsState>((set) => ({
  movements: MOCK_MOVEMENTS,                                   // seed
  addMovement: (m) => set((s) => ({ movements: [...s.movements, m] })),
}));

// hooks/use-portfolio.ts  (rewire the seam that today returns the frozen mock)
export function usePortfolio(): Portfolio {
  const movements = useMovementsStore((s) => s.movements);
  return useMemo(() => assemblePortfolio(movements, MOCK_PRICES), [movements]);
}
```

- The engine never enters the store.
- `usePortfolio` stays the single swap-point (mock → Supabase later).
- Prices remain `MOCK_PRICES` (real prices out of scope).
- Once rewired, `MOCK_PORTFOLIO_SUMMARY` in `lib/mock-data.ts` is unused at runtime (the seeds
  `MOCK_MOVEMENTS` / `MOCK_PRICES` stay).
- **In-memory only** — no persistence yet (restart ⇒ back to seed). Persistence arrives with Supabase.

---

## 12. Tests _(proposed, confirm)_

Mirror the `buildHomeView` pattern — a **pure builder** holds the logic, tested without rendering:

- `buildDepositMovement(input): DepositMovement` — maps Monto/Comisión/Fecha → the typed movement
  (system fields via injected/placeholder generators so the test is deterministic). Unit-tested.
- `useMovementsStore.addMovement` — appends (small store test).
- The Efectivo display (`amount − transferFee`) — covered by a tiny pure helper or via the builder.
- **Not tested:** the form component (no `@testing-library/react-native` installed), consistent with
  the Home decision.

---

## 13. Number, sign & format conventions

- **Currency:** `formatUSD` → `$1,245.00`. Inputs accept plain decimals; the summary uses `formatUSD`.
- A deposit's amounts are **positive**; no sign/color gymnastics here (no P&L on this screen).
- **Date:** displayed `DD/MM/AAAA`, stored `YYYY-MM-DD` (matches existing `executedAt` in mock data).

---

## 14. Label glossary — EN canonical ↔ Spanish UI

| EN (CONTEXT.md / model) | Spanish UI label |
|---|---|
| Deposit (movement type) | **Depósito** |
| `amount` | **Monto** |
| `transferFee` / Fee | **Comisión de transferencia** |
| `executedAt` | **Fecha** |
| Cash / Buying Power (the result) | **"Se sumará a tu efectivo"** / **Efectivo** |
| Net Contributions / Aportado | **Aportado** _(shown on Home, not here)_ |
| Save | **Guardar movimiento** |

> **Banned:** "invertido" / "monto invertido" (see `CONTEXT.md`). Also avoid **"Total pagado"** for the
> summary — it implies the fee is added on top, which contradicts the engine.

---

## 15. Design tokens (existing — reuse, don't reinvent)

```
Colors    background #0A0E27 · surface #111638 · accent #00E5CC
          positive #00C853 · negative #FF5252
          textPrimary #FFFFFF · textSecondary #8E8E93 · border #1C224D
Radius    sm8 md12 lg16 full9999
Type      heroValue 36/700 · cardTitle 16/600 · body 14/400 · label 12/400
```
Dark theme, teal accent. The primary button uses `accent` (teal), matching the mockup.

---

## 16. Open decisions

1. **Validation set** (§9) — confirm, incl. the empty-fee default and the `Comisión < Monto` guard.
2. **Date control** (§7/§13) — native picker; confirm format `DD/MM/AAAA` and the future-date block.
3. **Save feedback** (§10) — haptic only, or also a toast? Confirm dismiss-to-Home.
4. **Store location/naming** — `stores/movements.ts`, `useMovementsStore` (tentatively agreed).
5. **Test surface** (§12) — confirm the pure-builder approach.

---

## 17. Out of scope (this spec)

- The other four forms — Compra, Venta, Dividendo, Retiro (later PRDs).
- Edit / delete of movements (create-only).
- Persistence of the store (in-memory; Supabase later).
- Real share prices / a price source (`MOCK_PRICES`).
- Auth / real `userId`, UUID strategy (placeholders for now).
- Corporate actions, FX, ACATS, account fees (`docs/adr/0002-scope-boundaries-v1.md`).
