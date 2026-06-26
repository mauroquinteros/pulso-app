# Depósito form: minimal end-to-end happy path

## Parent

`.scratch/add-movement-ux/PRD.md` — Add Movement: Deposit (tracer bullet)

## What to build

The tracer bullet itself: the user records a deposit and watches Home update. This slice
delivers the complete write loop with a minimal form (today's date, single hard gate) and
includes the pure view-model that carries the logic.

End-to-end flow:

> tap `+` → type picker (**OPERACIONES** = Compra/Venta/Dividendo, **EFECTIVO** =
> Depósito/Retiro) → tap **Depósito** → modal form → fill **Monto** (and optional **Comisión**)
> → **Guardar movimiento** → success haptic → modal dismisses → Home shows updated **Valor
> total** / **Efectivo** and the increased **Aportado** in the bridge.

Form (settled layout, UX §6): **Monto** full-width with `$` prefix and decimal keypad;
**Comisión de transferencia** + **Fecha** side-by-side; the info hint ("…se descuenta del
monto"); the live summary **"Se sumará a tu efectivo · $X"**; a sticky teal **Guardar
movimiento** button. In this slice **Fecha** displays **today** formatted `DD/MM/AAAA` and is
not yet editable (the native picker arrives in slice 03).

The form is **render-only** — all parsing, the live summary, and the save-gate come from a pure
view-model module mirroring `components/home/view-model.ts`:

- `summarizeDeposit(input)` → `{ efectivo, errors, saveEnabled }` where `efectivo = amount −
  transferFee` (mirrors `computeCash`'s deposit branch — does not re-implement engine math);
  empty Comisión defaults to `0`; `saveEnabled` is true only when `Monto > 0`.
- `buildDepositMovement(input, deps)` → a typed `DepositMovement` with `type:'deposit'`, gross
  `amount`, `transferFee`, `executedAt` (`YYYY-MM-DD`), and **injected** `id` / `userId` /
  `createdAt` (`deps`) so it is deterministic and testable. System fields are placeholders
  (mock `userId`, generated `id`, `now()` ISO `createdAt`).

On save: `buildDepositMovement` → `useMovementsStore.addMovement` → `expo-haptics` success →
dismiss. No confirmation screen.

Label rules (from `CONTEXT.md`): the form shows **Monto** and **Efectivo** only — never an
"Aportado" label. Banned: "invertido" / "monto invertido" and "Total pagado" for the summary.

## Acceptance criteria

- [ ] The type picker shows the two groups and routes **Depósito** to the form; the screen is a
      modal with a back affordance to the picker.
- [ ] **Monto** is full-width with a `$` prefix and a `decimal-pad` keyboard.
- [ ] **Comisión de transferencia** is optional and defaults to `0` when empty.
- [ ] **Fecha** displays today as `DD/MM/AAAA`.
- [ ] The live summary reads **"Se sumará a tu efectivo · `formatUSD(amount − transferFee)`"**
      and updates as Monto/Comisión change; empty Monto shows `$0.00`.
- [ ] No "Aportado" label appears on the form.
- [ ] **Guardar movimiento** is disabled until **Monto > 0**.
- [ ] Saving builds a correct `DepositMovement`, calls `addMovement`, fires a success haptic,
      and dismisses to Home.
- [ ] After saving, Home reflects the new **Valor total** / **Efectivo** and an **Aportado**
      increased by the gross Monto (reconciliation holds: `cash += A−F`, `netContributions +=
      A`, `totalReturn −= F`).
- [ ] Unit tests (vitest) cover the view-model: `summarizeDeposit` (efectivo math, empty-fee
      default, empty-Monto gate) and `buildDepositMovement` (field mapping + injected system
      fields).
- [ ] `tsc` is clean.

## Blocked by

- `.scratch/add-movement-ux/issues/01-movements-store-portfolio-rewire.md`
