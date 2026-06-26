# Interactive date picker + validation polish

## Parent

`.scratch/add-movement-ux/PRD.md` — Add Movement: Deposit (tracer bullet)

## What to build

Enrich the Depósito form from a minimal happy path into the fully-specified screen: an editable
native date control and the remaining validation rules.

- **Fecha becomes editable** via `@react-native-community/datetimepicker` (a new dependency —
  the Expo-supported native control). Tapping the field opens the native picker; the selection
  displays `DD/MM/AAAA` and is stored as `executedAt` in `YYYY-MM-DD`. `maximumDate = today`
  blocks future dates; default selection stays today.
- **Validation polish** — extend the pure view-model's `summarizeDeposit` and surface errors in
  the form:
  - **Comisión** must be **≥ 0** and **< Monto** (a fee ≥ the deposit ⇒ `Efectivo ≤ 0`, a
    nonsense deposit). Reflected in `saveEnabled`.
  - Inline error under a field appears only **after** it is **touched-then-invalid** — no error
    spam while typing.

This slice does not change the save loop or the happy path from slice 02; it layers the
interactive date and the guards on top.

## Acceptance criteria

- [ ] `@react-native-community/datetimepicker` is added and the **Fecha** field opens the native
      picker on tap.
- [ ] Selecting a date updates the display (`DD/MM/AAAA`) and the stored `executedAt`
      (`YYYY-MM-DD`).
- [ ] Future dates are blocked (`maximumDate = today`); default remains today.
- [ ] **Comisión** validates as **≥ 0** and **< Monto**; an out-of-range fee disables
      **Guardar movimiento**.
- [ ] Inline field errors render only after a field is touched-then-invalid (no errors while
      first typing).
- [ ] The view-model tests are extended to cover the `Comisión < Monto` guard and the updated
      `saveEnabled` logic.
- [ ] `tsc` is clean.

## Blocked by

- `.scratch/add-movement-ux/issues/02-deposit-form-minimal-loop.md`
