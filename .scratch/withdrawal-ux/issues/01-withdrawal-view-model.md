# Withdrawal view-model + tests

**Type:** AFK
**Source:** `.scratch/withdrawal-ux/PRD.md` · `.scratch/withdrawal-ux/UX.md`


> **Superseded in part.** This issue describes the form-design slice, which was delivered: the
> screen, its view model and their tests are in the codebase. What it says about **saving** is no
> longer true - it predates persistence and describes appending to an in-memory store. The save
> loop, the picker row and the write to Postgres belong to
> `.scratch/withdrawal-movement/PRD.md`. Do not tick the boxes below against that work.

## What to build

The pure **withdrawal view-model** — a deep module mirroring the deposit view-model
(`components/add-movement/deposit-view-model.ts`). It owns the live "Recibirás" figure
and the save-gate, and maps validated input to a typed `WithdrawalMovement`. It takes the
current available **Cash** as an argument so it stays pure and unit-testable (the form
passes `usePortfolio().cash`).

Two functions:

- `summarizeWithdrawal(input, availableCash)` → the live summary + gate flags
- `buildWithdrawalMovement(input, deps)` → the typed movement (system fields via injected
  generators, like the deposit; empty Comisión defaults to `0`)

The summary shape encodes the three validation decisions (from the prototype / PRD):

```ts
interface WithdrawalSummary {
  recibiras: number;        // Monto − Comisión; what reaches the bank (0 when Monto blank)
  saveEnabled: boolean;     // Monto > 0  &&  Comisión < Monto  &&  Monto ≤ availableCash
  amountPositive: boolean;  // Monto > 0 — drives the accent on the Monto field
  amountInvalid: boolean;   // a Monto was entered but is ≤ 0
  feeInvalid: boolean;      // Comisión ≥ Monto (would make Recibirás ≤ 0)
  insufficientFunds: boolean; // Monto > availableCash
}
```

The input is the raw string fields (`amount`, `fee`, `executedAt`), same parsing approach
as the deposit. Note the model field for the withdrawal fee is `fee` (not `transferFee`).

The engine already supports withdrawals under the cash-side convention
(`docs/adr/0003-cash-side-movement-amounts.md`) — this issue does **not** touch the engine.

## Acceptance criteria

- [ ] `summarizeWithdrawal` returns `recibiras = amount − fee`, and `0` when Monto is blank
- [ ] A blank Comisión is treated as `0`
- [ ] `saveEnabled` is true only when `amount > 0` **and** `fee < amount` **and** `amount ≤ availableCash`
- [ ] `amountInvalid` is true when a Monto is entered but is ≤ 0 (blank is not invalid)
- [ ] `feeInvalid` is true when Comisión ≥ Monto
- [ ] `insufficientFunds` is true when Monto > availableCash
- [ ] `buildWithdrawalMovement` maps Monto / Comisión / Fecha to a typed `WithdrawalMovement` with injected system fields; an empty Comisión defaults to `0`
- [ ] Vitest tests mirror `components/add-movement/deposit-view-model.test.ts` and cover all the above
- [ ] `npm test` green and `tsc --noEmit` clean

## Blocked by

None - can start immediately.
