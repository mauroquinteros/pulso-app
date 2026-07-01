# Dividend form screen + picker wiring

**Type:** AFK
**Source:** `.scratch/dividend-ux/PRD.md` · `.scratch/dividend-ux/UX.md`

## What to build

The **Dividendo** form screen, a mirror of the Venta form (simpler — two input rows), wired
end-to-end. From the type picker: tap **Dividendo** → type **Símbolo** / **Monto bruto** /
**Impuestos** / **Fecha** → see the live breakdown (**Monto bruto**, **Impuestos** −, **Total a
recibir** = `Monto bruto − Impuestos`) → **Guardar movimiento** → the movement is appended to
the store, a success haptic fires, the modal dismisses, and Home re-derives (Efectivo rises by
the net, Net Dividends / Total Return grow) — no manual refresh.

The user records dividend income as a **gross cash amount** (amount-first — no shares, no price).
Unlike Venta, the screen reads **nothing** from `usePortfolio` — there is **no held-shares
gate**: a dividend can be recorded on any ticker, including one no longer held. The **Símbolo**
field is free text, force-uppercase (`[A-Z]` only), no search.

Layout — two input rows (mirror of Venta, no orphan field): **Símbolo · Fecha**, **Monto bruto ·
Impuestos**. Then the **breakdown** above the sticky button. Reuses the existing theme tokens.
**Impuestos starts empty** (placeholder "0.00"). Save feedback is **haptic + dismiss only — no
toast**, consistent with the other forms.

## Acceptance criteria

- [ ] The **Dividendo** row in the OPERACIONES group is active (no "Pronto"); tapping it opens the form
- [ ] **Símbolo** is free text, forces uppercase (`[A-Z]` only), no search; paired with **Fecha** on the first row
- [ ] **Monto bruto** (`$` prefix) and **Impuestos** (`$` prefix, optional, default `0`, **empty by default**) are side-by-side
- [ ] Live breakdown shows **Monto bruto**, **Impuestos** `−`, and **Total a recibir** (`Monto bruto − Impuestos`); updates live; reads `$0.00` when Monto bruto is blank; the Total turns teal when saveable, red when over-taxed
- [ ] Errors are touch-gated: empty Símbolo ("Ingresa un símbolo."), zero Monto bruto ("Ingresa un monto mayor a $0."), over-tax ("El impuesto no puede superar el monto bruto.")
- [ ] **Guardar movimiento** is disabled until all gates pass (consumes the `summarizeDividend` flags)
- [ ] On save: a `DividendMovement` is appended via the movements store, a success haptic fires, and the modal dismisses to Home; Home shows the updated Valor total / Efectivo / Net Dividends with no manual refresh
- [ ] No success toast/overlay — haptic + dismiss only, like the other forms
- [ ] **Fecha** defaults to today, blocks future dates, and displays `DD/MM/AAAA`
- [ ] The screen visually mirrors the Venta form and uses the existing theme tokens

## Blocked by

- `01-dividend-view-model.md` (the form consumes `summarizeDividend` / `buildDividendMovement`)
