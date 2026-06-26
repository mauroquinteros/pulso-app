# PRD — Add Movement: Deposit (tracer bullet)

**Feature:** `add-movement-ux`
**Scope:** the **Depósito** form only — the tracer-bullet slice of Add Movement.
**Companion design brief:** `.scratch/add-movement-ux/UX.md` (layout, labels, tokens — converged).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## Problem Statement

Pulso's whole premise is that the user **records movements** and the app derives
everything else. But today the app only *reads* frozen mock data — there is no way for a
user to write a movement and watch their numbers move. The loop that justifies the entire
product (record → derive → see it on Home) has never run end-to-end.

A user cannot do the very first thing a real investor does: put money in. They open the
app, see a portfolio that isn't theirs, and have no path to make it theirs.

## Solution

Ship the **Depósito** form — the thinnest movement type (`amount`, `transferFee`,
`executedAt`) and the first action a real user takes (you deposit before you buy). It is
the **tracer bullet** that proves the full write loop:

> tap `+` → pick **"Depósito"** → fill Monto / Comisión / Fecha → **Guardar movimiento**
> → the modal dismisses → Home re-derives and the **Valor total** / **Efectivo** (and
> **Aportado** in the bridge) update — no manual refresh.

From the user's perspective: a focused, native-feeling form in Spanish that shows them, live,
exactly **what will be added to their cash** (Monto − Comisión), saves with a confirming
haptic, and instantly reflects on Home. The patterns it establishes — number inputs, the fee
field, the date picker, validation, the live summary, the save→store→home loop — are the
template for the other four forms later.

## User Stories

1. As a Pulso user, I want to tap `+` and choose what kind of movement to add, so that I can
   start recording my account activity.
2. As a Pulso user, I want the type picker grouped into **OPERACIONES** (Compra / Venta /
   Dividendo) and **EFECTIVO** (Depósito / Retiro), so that I can find the right type quickly.
3. As a Pulso user, I want tapping **Depósito** to open the deposit form, so that I can record
   money I moved into my brokerage.
4. As a Pulso user, I want the form to open as a modal, so that recording a movement feels like
   a quick, self-contained task I can dismiss.
5. As a Pulso user, I want a back affordance in the header that returns me to the type picker,
   so that I can correct a wrong type choice.
6. As a Pulso user, I want a full-width **Monto** field with a `$` prefix and a decimal keypad,
   so that I can type the gross deposit amount naturally.
7. As a Pulso user, I want a **Comisión de transferencia** field beside the date, so that I can
   record the bank/transfer fee on this deposit.
8. As a Pulso user, I want the **Comisión** field to be optional and default to `0`, so that I
   don't have to type anything when there was no fee.
9. As a Pulso user, I want a **Fecha** field that defaults to today, so that the common case
   (recording today's deposit) needs no interaction.
10. As a Pulso user, I want to pick the date from a native date control, so that entering a past
    date is fast and error-free.
11. As a Pulso user, I want the date shown as **DD/MM/AAAA**, so that it reads the way I expect
    locally.
12. As a Pulso user, I want **future dates blocked**, so that I can't record a deposit that
    hasn't happened.
13. As a Pulso user, I want an info hint explaining the commission is **discounted from the
    amount** (not added), so that I understand why my cash goes up by less than the Monto.
14. As a Pulso user, I want a live summary line — **"Se sumará a tu efectivo · $X"** — that
    updates as I type, so that I see exactly what lands in my buying power **before** I save.
15. As a Pulso user, I want the live summary to compute **Monto − Comisión**, so that the
    preview matches what the engine will actually do to my cash.
16. As a Pulso user, I want the form to **not** show an "Aportado" label, so that I'm not
    confused by an accumulated Home concept on a single-deposit screen.
17. As a Pulso user, I want **Guardar movimiento** disabled until **Monto > 0**, so that I can't
    save an empty or meaningless deposit.
18. As a Pulso user, I want an inline error only **after** I've touched a field and left it
    invalid, so that I'm not nagged while I'm still typing.
19. As a Pulso user, I want a clear error if my **Comisión** is greater than or equal to my
    **Monto**, so that I don't record a deposit that would reduce my cash to zero or below.
20. As a Pulso user, I want a **success haptic** when I save, so that I get tactile confirmation
    the deposit was recorded.
21. As a Pulso user, I want the modal to **dismiss back to Home** after saving, so that I
    immediately see the effect without extra taps.
22. As a Pulso user, I want my **Valor total** and **Efectivo** on Home to update after saving,
    so that I can trust the app reflects reality.
23. As a Pulso user, I want my **Aportado** (in the "Aportado → Vale hoy" bridge) to increase by
    the gross Monto, so that my contributions are tracked correctly even though the fee reduced
    my cash.
24. As a Pulso user, I want the fee to surface later as **Comisiones** in Total Return, so that
    my performance honestly reflects the drag of transfer costs.
25. As a Pulso user, I want amounts formatted as `$1,245.00`, so that money reads cleanly and
    consistently with the rest of the app.
26. As a Pulso user recording several deposits in a session, I want each one appended to my
    history, so that my running totals accumulate correctly.

## Implementation Decisions

### No domain or engine changes — this slice is UI + store + seam

- `DepositMovement` already exists in `types/models.ts`
  (`{ type:'deposit', amount, transferFee }` over `BaseMovement` = `id, userId, type,
  executedAt, createdAt`). **No type changes.**
- The engine already handles deposits: `computeCash` does `amount − transferFee`;
  `assemblePortfolio`'s net-contributions sums the **gross** `amount`. **No engine changes.**
- The modal is already wired: root `app/_layout.tsx` registers `add-movement` with
  `presentation: 'modal'`; `app/add-movement/{index,form,_layout}.tsx` exist as placeholders to
  fill in.

### Module 1 — `stores/movements.ts` (new): the dumb movements store

- Zustand (already a dependency). Holds the raw `Movement[]`, seeded with `MOCK_MOVEMENTS`, plus
  a single `addMovement`.
- **Derive-don't-store:** the store never holds a `Portfolio` and the engine never enters the
  store. Raw movements are the single source of truth; the `Portfolio` is always recomputed.
- **In-memory only** — no persistence (restart ⇒ back to seed). Persistence arrives with Supabase.

```ts
// stores/movements.ts
type MovementsState = {
  movements: Movement[];
  addMovement: (m: Movement) => void;
};
export const useMovementsStore = create<MovementsState>((set) => ({
  movements: MOCK_MOVEMENTS,
  addMovement: (m) => set((s) => ({ movements: [...s.movements, m] })),
}));
```

### Module 2 — `components/add-movement/deposit-view-model.ts` (new): the deep, pure module

Mirrors `components/home/view-model.ts` (`buildHomeView`). The form component renders this
verbatim and holds **no** derivation, validation, or formatting. Two exports:

- **`summarizeDeposit(input)`** — pure. Parses the raw text fields, computes the live summary
  and the save-gate. Returns display-ready state:
  - `efectivo: number` = `amount − transferFee` (mirrors `computeCash`'s deposit branch — does
    **not** re-implement engine math).
  - per-field validation results and a single `saveEnabled` boolean.
- **`buildDepositMovement(input, deps)`** — pure. Maps validated `{ amount, transferFee,
  executedAt }` → a typed `DepositMovement`. System fields (`id`, `userId`, `createdAt`) come
  from **injected generators** (`deps`) so tests are deterministic. Defaults: empty Comisión → `0`.

```ts
// shapes (illustrative — from the agreed decomposition)
type DepositInput = { amount: string; transferFee: string; executedAt: string };
type DepositSummary = {
  efectivo: number;            // amount - transferFee
  errors: { amount?: string; transferFee?: string };
  saveEnabled: boolean;
};
type DepositDeps = { id: () => string; userId: () => string; now: () => string };

function summarizeDeposit(input: DepositInput): DepositSummary;
function buildDepositMovement(input: DepositInput, deps: DepositDeps): DepositMovement;
```

### Module 3 — `hooks/use-portfolio.ts` (modify): rewire the single seam

- Today returns the frozen `MOCK_PORTFOLIO_SUMMARY`. Rewire to read the store and derive:

```ts
export function usePortfolio(): Portfolio {
  const movements = useMovementsStore((s) => s.movements);
  return useMemo(() => assemblePortfolio(movements, MOCK_PRICES), [movements]);
}
```

- `usePortfolio` stays the **single swap-point** (mock → Supabase later); no screen changes.
- Prices remain `MOCK_PRICES` (real prices out of scope).
- Consequence: `MOCK_PORTFOLIO_SUMMARY` in `lib/mock-data.ts` becomes unused at runtime. It is
  left in place (still used by Home tests / not removed as pre-existing) — the seeds
  `MOCK_MOVEMENTS` / `MOCK_PRICES` stay.

### Module 4 — `app/add-movement/index.tsx` (modify): the type picker (Screen 1)

- Grouped list: **OPERACIONES** = Compra / Venta / Dividendo; **EFECTIVO** = Depósito / Retiro.
- Only **Depósito** is wired this slice; the other four are visible but lead nowhere yet (or are
  clearly inert) — their forms are later PRDs.

### Module 5 — `app/add-movement/form.tsx` (modify): the Deposit form (render-only)

- Renders the settled layout (UX §6): **Monto** full-width with `$` prefix; **Comisión** +
  **Fecha** side-by-side; the info hint; the live summary; the sticky **Guardar movimiento**
  button.
- Holds local input state and touched-state, but delegates all parsing/validation/formatting to
  `summarizeDeposit`. On save: calls `buildDepositMovement`, then
  `useMovementsStore.addMovement`, fires a success haptic (`expo-haptics`), and dismisses.

### Decision — date control: native picker (new dependency)

- Add **`@react-native-community/datetimepicker`** (the Expo-supported native control; not
  currently installed).
- Field **displays** `DD/MM/AAAA` (e.g. `24/10/2023`); **stores** `executedAt` as `YYYY-MM-DD`
  (matches existing `executedAt` in mock data).
- `maximumDate = today` to **block future dates**; default selection = **today**.

### Validation & save-gate

| Field | Rule |
|---|---|
| **Monto** | required, decimal **> 0** — the only hard gate |
| **Comisión** | optional, empty → `0`; must be **≥ 0** and **< Monto** |
| **Fecha** | default today; **future blocked** by the picker's `maximumDate` |

- **Guardar movimiento** disabled until **Monto > 0** (and Comisión valid).
- Inline error under a field only **after touched-then-invalid** — no error spam while typing.
- The `Comisión < Monto` guard is kept as a cheap guard against a `Efectivo ≤ 0` nonsense
  deposit (a borderline "impossible-ish" case per `CLAUDE.md`; retained deliberately).

### Save behavior

1. Build the `DepositMovement` (user fields + injected system placeholders).
2. `useMovementsStore.addMovement(movement)`.
3. Success **haptic**.
4. **Dismiss** the modal (back to Home).
5. Home re-derives via `usePortfolio()` and shows the updated numbers. No confirmation screen.

### System fields are placeholders

`id`, `userId`, `createdAt` are trivially generated now (`userId` = mock user; `createdAt` =
`new Date().toISOString()` via the injected `now`). Real decisions (UUID source, auth `userId`)
are deferred to the Supabase/auth phase — an implementation note, not a design decision.

### Language & label rules (from `CONTEXT.md` glossary)

- EN→ES: Deposit → **Depósito**; `amount` → **Monto**; `transferFee` → **Comisión de
  transferencia**; `executedAt` → **Fecha**; the cash result → **"Se sumará a tu efectivo"** /
  **Efectivo**; Save → **Guardar movimiento**.
- **Banned:** "invertido" / "monto invertido", and **"Total pagado"** for the summary (it implies
  the fee is added on top, contradicting the engine).
- The form shows **Monto** and **Efectivo** only — never **Aportado** (a Home-only accumulated
  concept). Each term lives in exactly one place.

## Testing Decisions

**What makes a good test here:** assert **external behavior** through the module's public
interface — given raw inputs, what summary / movement / store-state comes out — never internal
structure. System fields are made deterministic by **injecting** the id/userId/now generators, so
tests assert exact output without mocking clocks or randomness. This mirrors the Home decision:
the pure builder carries the logic and is tested without rendering.

**Prior art:** `components/home/view-model.test.ts` (vitest) tests `buildHomeView` as a pure
function over a `Portfolio`; the engine tests (`utils/portfolio/cash.test.ts`,
`reducer.test.ts`, `valuation.test.ts`) test pure functions over `Movement[]`.

**Modules tested:**

1. **`deposit-view-model.ts`** (`components/add-movement/deposit-view-model.test.ts`):
   - `summarizeDeposit`: `efectivo === amount − transferFee`; empty Comisión defaults to `0`;
     empty Monto yields `efectivo = 0` and `saveEnabled = false`.
   - Validation: Monto > 0 required; Comisión ≥ 0 and < Monto; `saveEnabled` reflects the gate.
   - `buildDepositMovement`: maps Monto/Comisión/Fecha → a correct `DepositMovement` with
     `type:'deposit'`, gross `amount`, `transferFee`, `executedAt` (`YYYY-MM-DD`), and the
     injected `id` / `userId` / `createdAt`.

2. **`stores/movements.ts`** (`stores/movements.test.ts`):
   - `addMovement` appends to the seeded list (length grows by one; the new movement is last;
     existing seed preserved).

**Not tested:** the form component and the type picker — no `@testing-library/react-native` is
installed, consistent with the Home decision. Adding RNTL is explicitly out of scope.

## Out of Scope

- The other four forms — **Compra, Venta, Dividendo, Retiro** (later PRDs). The picker shows
  them but only Depósito is wired.
- **Edit / delete** of movements (create-only).
- **Persistence** of the store (in-memory; Supabase later). Restart ⇒ back to seed.
- **Real share prices** / a price source (`MOCK_PRICES` stays).
- **Auth / real `userId`**, UUID strategy (placeholders for now).
- **Component / RNTL tests** (no testing-library installed; not added here).
- Corporate actions, FX, ACATS, account fees (`docs/adr/0002-scope-boundaries-v1.md`).
- A confirmation screen or toast — haptic + dismiss only (a toast remains an optional nicety, not
  required).

## Further Notes

- **Reconciliation stays intact.** After a deposit of amount `A` with fee `F`:
  `cash += A − F`, `netContributions += A`, `totalReturn −= F`. The invariant
  `Cash + Market Value == Net Contributions + Total Return` still holds.
- **The deposit's three numbers** (the domain truth this screen must get right):
  **Monto** = `A` (typed) · **Efectivo** = `A − F` (live summary, enters buying power) ·
  **Aportado** = `+A` (gross contribution, shown on Home, not here). The fee is **subtracted**,
  never added on top.
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope font,
  teal accent on the primary button) — reuse, don't reinvent (UX §15).
- **Source-mockup correction:** the handoff image's "TOTAL PAID $1,255" was a domain bug (fee
  added). This screen replaces it with **"Se sumará a tu efectivo · $1,245"** (fee subtracted).
- The five modules suggest a natural **issue breakdown** (tracer-bullet slices): (1) store +
  `usePortfolio` rewire, (2) deposit view-model + tests, (3) the Deposit form UI + picker wiring
  + date dependency. Splitting is left to `/to-issues`.
