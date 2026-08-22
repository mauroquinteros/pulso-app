# Withdrawal form screen + picker wiring

**Type:** AFK
**Source:** `.scratch/withdrawal-ux/PRD.md` · `.scratch/withdrawal-ux/UX.md` · design prototype `.scratch/withdrawal-ux/stock-portfolio-design-prototype/`


> **Superseded in part.** This issue describes the form-design slice, which was delivered: the
> screen, its view model and their tests are in the codebase. What it says about **saving** is no
> longer true - it predates persistence and describes appending to an in-memory store. The save
> loop, the picker row and the write to Postgres belong to
> `.scratch/withdrawal-movement/PRD.md`. Do not tick the boxes below against that work.

## What to build

The **Retiro** form screen, a mirror of the Deposit form, wired end-to-end. From the type
picker: tap **Retiro** → fill **Monto** / **Comisión** / **Fecha** → see **"RECIBIRÁS EN TU
BANCO" = Monto − Comisión** update live → **Guardar movimiento** → the movement is appended
to the store, a success haptic fires, the modal dismisses, and Home re-derives (Cash drops by
Monto, Aportado adjusts) — no manual refresh.

The screen reads the current **Cash** from `usePortfolio().cash` and passes it to
`summarizeWithdrawal` for the over-withdrawal gate. It shows **"Disponible $X"** next to the
Monto label (the ceiling) and the touch-gated errors. It enables the **Retiro** row in the
EFECTIVO group of the picker (removes "Pronto", wires the press to open this screen).

Visually it mirrors the Deposit form and reuses the existing theme tokens. Save feedback is
**haptic + dismiss only — no success toast/overlay** (the prototype shows a toast; it is
explicitly out of scope here, to stay consistent with the Deposit).

## Acceptance criteria

- [ ] The **Retiro** row in the EFECTIVO group is active (no "Pronto"); tapping it opens the form
- [ ] **Monto** is full-width with a `$` prefix and a decimal keypad; **"Disponible $X"** shows by the label, sourced from `usePortfolio().cash`
- [ ] **Comisión** and **Fecha** are side-by-side; Comisión is optional and defaults to `0`
- [ ] Live summary **"RECIBIRÁS EN TU BANCO"** shows `Monto − Comisión`, updates live, and shows `$0.00` when Monto is blank
- [ ] Errors are touch-gated: zero Monto ("Ingresa un monto mayor a $0."), Comisión ≥ Monto ("La comisión debe ser menor al monto."), and over-withdrawal ("Solo tienes $X disponible.")
- [ ] **Guardar movimiento** is disabled until all three gates pass (consumes the `summarizeWithdrawal` flags)
- [ ] On save: a `WithdrawalMovement` is appended via the movements store, a success haptic fires, and the modal dismisses to Home; Home shows the updated Valor total / Efectivo / Aportado with no manual refresh
- [ ] No success toast/overlay — haptic + dismiss only, like the Deposit
- [ ] **Fecha** defaults to today, blocks future dates, and displays `DD/MM/AAAA`
- [ ] The screen visually mirrors the Deposit form and uses the existing theme tokens

## Blocked by

- `01-withdrawal-view-model.md` (the form consumes `summarizeWithdrawal` / `buildWithdrawalMovement`)
