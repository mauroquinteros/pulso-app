# PRD — Add Movement: Withdrawal (Retiro)

**Feature:** `withdrawal-ux`
**Companion to:** `.scratch/add-movement-ux/PRD.md` (the Deposit slice — same patterns, mirrored direction).
**Depends on:** the cash-side amount convention, now live in the engine (`docs/adr/0003-cash-side-movement-amounts.md`).
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

---

## Problem Statement

A Pulso user can now put money in (Depósito), but cannot take it out. The picker
shows **Retiro** as "Pronto" — tapping it does nothing. A real investor moves cash
both ways: they fund the account, and eventually they pull money back to their bank.
Until withdrawals exist, the cash side of the account is one-directional and the
user cannot record the full life of their money.

The Retiro is also the cash sibling of the Depósito: it is the second-thinnest
movement type and the natural next slice after the deposit tracer bullet, reusing
every pattern the deposit established (number inputs, optional fee, date picker,
live summary, save → store → Home loop).

## Solution

Ship the **Retiro** form — a focused, native-feeling Spanish form that mirrors the
Depósito with the direction reversed. The user taps `+` → **Retiro** → types the
**Monto** of cash to pull, an optional **Comisión**, and a **Fecha**, and sees live
exactly **what will reach their bank** (Monto − Comisión). On save, the movement is
recorded, the modal dismisses with a confirming haptic, and Home re-derives: **Cash**
drops by the Monto and **Aportado** adjusts — no manual refresh.

Because a withdrawal removes real cash, the form guards against pulling more than the
user has: if the Monto exceeds the current **Cash / Buying Power**, the save is
blocked and the shortfall is surfaced. This is the one capability the deposit form did
not need — the withdrawal form reads the derived Cash to gate the action.

From the user's perspective:

> tap `+` → pick **"Retiro"** → fill Monto / Comisión / Fecha → see **"Recibirás en tu
> banco · $X"** update live → **Guardar movimiento** → modal dismisses → Home's **Valor
> total** / **Efectivo** (and **Aportado**) update.

## User Stories

1. As a Pulso user, I want to tap `+` and choose **Retiro**, so that I can record money I moved out of my brokerage to my bank.
2. As a Pulso user, I want the Retiro row in the **EFECTIVO** group of the type picker to be active (not "Pronto"), so that I can actually open the form.
3. As a Pulso user, I want the Retiro form to open as a modal, so that recording a withdrawal feels like a quick, self-contained task I can dismiss.
4. As a Pulso user, I want a back affordance in the header that returns me to the type picker, so that I can correct a wrong type choice.
5. As a Pulso user, I want a full-width **Monto** field with a `$` prefix and a decimal keypad, so that I can type the amount of cash to withdraw naturally.
6. As a Pulso user, I want **Monto** to mean the cash that leaves my **Buying Power**, so that the number I type matches how I think about a withdrawal ("take $200 out of my account").
7. As a Pulso user, I want a **Comisión** field beside the date, so that I can record the withdrawal fee my broker charges.
8. As a Pulso user, I want the **Comisión** field to be optional and default to `0`, so that I don't have to type anything when there was no fee.
9. As a Pulso user, I want a live **"Recibirás en tu banco"** figure showing **Monto − Comisión**, so that I see exactly what will reach my bank after the fee.
10. As a Pulso user, I want the **Comisión** to be subtracted from the Monto (never added on top), so that the withdrawal fee reduces what I receive rather than what leaves my cash.
11. As a Pulso user, I want a **Fecha** field that defaults to today, so that the common case (recording today's withdrawal) needs no interaction.
12. As a Pulso user, I want to pick the date from a native date control, so that entering a past date is fast and error-free.
13. As a Pulso user, I want the date shown as **DD/MM/AAAA**, so that it reads the way I expect locally.
14. As a Pulso user, I want **future dates blocked**, so that I can't record a withdrawal that hasn't happened.
15. As a Pulso user, I want **Guardar movimiento** disabled until the Monto is greater than $0, so that I can't save an empty or zero withdrawal.
16. As a Pulso user, I want an error if I enter a Monto of $0 or less (once I leave the field), so that I'm told why I can't save.
17. As a Pulso user, I want an error if the **Comisión is greater than or equal to the Monto**, so that I can't record a withdrawal where I'd receive $0 or less at my bank.
18. As a Pulso user, I want the save **blocked when the Monto exceeds my available Cash**, so that I can't withdraw more than I actually have.
19. As a Pulso user, I want to see how much Cash is available (or the shortfall) when I try to over-withdraw, so that I know how much I can take out.
20. As a Pulso user, I want a confirming haptic when I save, so that the action feels acknowledged.
21. As a Pulso user, I want the modal to dismiss back to Home on save, so that I immediately see the result of my withdrawal.
22. As a Pulso user, I want Home to re-derive automatically after I save, so that my **Cash** and **Total Portfolio Value** reflect the withdrawal without a manual refresh.
23. As a Pulso user, I want the Retiro form to look and behave like the Depósito form, so that the cash actions feel consistent.

## Implementation Decisions

### Domain & engine (already done)

- The engine already supports withdrawals under the cash-side convention
  (`docs/adr/0003-cash-side-movement-amounts.md`): a **Withdrawal** movement carries
  `amount` (cash-side) and `fee`. `cash -= amount`; **Net Contributions** decreases by
  `amount − fee` (what reached the bank); the fee flows into total fees and erodes
  **Total Return**. No engine change is part of this PRD.
- The three numbers the screen must get right:
  **Monto** = cash that leaves Buying Power · **Recibirás** = `Monto − Comisión` (live
  summary, what reaches the bank) · the **Comisión** is subtracted, never added.

### Modules

- **Withdrawal view-model** — a pure, deep module mirroring the deposit view-model.
  It owns the live summary and the save-gate, takes the current available Cash as an
  argument (so it stays pure and unit-testable), and maps validated input to a typed
  Withdrawal movement. Its summary shape encodes the validation decisions:

  ```ts
  interface WithdrawalSummary {
    recibiras: number;        // Monto − Comisión; what reaches the bank (0 when Monto blank)
    saveEnabled: boolean;     // Monto > 0  &&  Comisión < Monto  &&  Monto ≤ available Cash
    amountPositive: boolean;  // Monto > 0 — drives the accent on the Monto field
    amountInvalid: boolean;   // a Monto was entered but is ≤ 0
    feeInvalid: boolean;      // Comisión ≥ Monto (would make Recibirás ≤ 0)
    insufficientFunds: boolean; // Monto > available Cash
  }
  ```

  `summarizeWithdrawal(input, availableCash)` returns the above; `buildWithdrawalMovement(input, deps)`
  maps the validated input to a typed Withdrawal movement, with system fields
  (id, userId, createdAt) injected via generators (deterministic, like the deposit).
  An empty Comisión defaults to `0`.

- **Withdrawal form screen** — a separate screen, mirror of the Depósito form (its own
  file/route; file-based routing auto-registers it, no layout change). It reads the
  derived **Cash** from the existing `usePortfolio` hook and passes it to the
  view-model for the over-withdrawal gate. It renders: Monto (full-width, `$`),
  Comisión + Fecha row, the native date picker (default today, future blocked), an
  info hint, the live **"Recibirás en tu banco"** summary, and the **Guardar
  movimiento** button. On save it appends to the movements store, fires a success
  haptic, and dismisses to Home.

- **Type picker** — enable the **Retiro** row in the EFECTIVO group: remove its "Pronto"
  tag and wire its press to open the withdrawal form (mirroring how Depósito is wired).

### Key interactions & contracts

- **Over-withdrawal gate.** The binding constraint is `Monto ≤ available Cash` (the fee
  does not drain Cash under the cash-side convention, so it is not part of this check).
  When `Monto > Cash`, `insufficientFunds` is true, save is disabled, and the form shows
  the available Cash / shortfall.
- **Fee ceiling.** Because Recibirás = `Monto − Comisión`, the Comisión has a ceiling:
  `Comisión < Monto`. A Comisión ≥ Monto sets `feeInvalid` and disables save. (This is
  the mirror of the original deposit constraint; the new deposit dropped it because there
  the fee only adds to Aportado.)
- **Errors are touch-gated.** Field errors (zero Monto, fee ≥ Monto) surface only after
  the field has been touched-then-left, to avoid error spam while typing — same pattern
  as the deposit.
- **Live summary.** Recibirás updates on every keystroke; a blank Monto shows `$0.00`
  regardless of any fee.
- **Save loop.** Save appends the Withdrawal to the movements store; `usePortfolio`
  recomputes; Home reflects the new Cash / Total Portfolio Value / Aportado. No toast —
  haptic + dismiss only.

## Testing Decisions

- **What makes a good test here:** assert external behavior of the pure view-model — the
  `recibiras` figure and the save-gate flags for given inputs and available-cash values —
  not implementation details. No rendering, no store, no navigation in these tests.
- **Module under test:** the withdrawal view-model only (per decision). Cases to cover,
  mirroring `components/add-movement/deposit-view-model.test.ts`:
  - `recibiras` is Monto − Comisión; blank Comisión treated as 0; `recibiras` is 0 when Monto is blank.
  - `saveEnabled` requires Monto > 0, Comisión < Monto, and Monto ≤ available Cash.
  - `amountInvalid` true when Monto entered as ≤ 0 (but blank is not invalid).
  - `feeInvalid` true when Comisión ≥ Monto.
  - `insufficientFunds` true when Monto > available Cash (and gates save).
  - `buildWithdrawalMovement` maps fields to a typed Withdrawal with injected system fields and defaults an empty Comisión to 0.
- **Prior art:** `components/add-movement/deposit-view-model.test.ts` (vitest) is the
  direct template. Engine behavior is already covered by `utils/portfolio/cash.test.ts`
  and `valuation.test.ts` and is not re-tested here.

## Out of Scope

- The other three forms — **Compra, Venta, Dividendo** (later PRDs). The picker still
  shows them as "Pronto".
- **Edit / delete** of movements (create-only).
- **Persistence** of the store (in-memory; Supabase later). Restart ⇒ back to seed.
- **Real share prices** / a price source (`MOCK_PRICES` stays); Cash for the gate comes
  from the derived portfolio, which uses the mock price map.
- **Auth / real `userId`**, UUID strategy (placeholders for now).
- **Component / RNTL tests** (no testing-library installed; not added here).
- Any **engine change** — the cash-side convention is already live.

## Further Notes

- **Reconciliation stays intact.** After a withdrawal of Monto `A` with fee `F`:
  `cash −= A`, `netContributions −= (A − F)`, `totalReturn −= F`. The invariant
  `Cash + Market Value == Net Contributions + Total Return` still holds.
- **Mirror of the Deposit, not a copy.** Same layout, tokens, date picker, and save loop;
  the differences are direction (fee subtracts), the summary label ("Recibirás en tu
  banco"), the fee ceiling, and the over-withdrawal gate.
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope
  font, teal accent on the primary button) — reuse, don't reinvent.
- The picker's Retiro row already has its own icon/copy ("Retirar efectivo de tu cuenta");
  only its disabled state and press handler change.
