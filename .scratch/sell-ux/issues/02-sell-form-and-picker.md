# Sell form screen + picker wiring

**Type:** AFK
**Source:** `.scratch/sell-ux/PRD.md` · `.scratch/sell-ux/UX.md`

## What to build

The **Venta** form screen, a mirror of the Compra form, wired end-to-end. From the type
picker: tap **Venta** → type **Símbolo** / **Acciones** / **Precio de ejecución** /
**Comisión** / **Impuestos** / **Fecha** → see the live breakdown (**Monto bruto**,
**Comisión** −, **Impuestos** −, **Total a recibir** = `Acciones × Precio − Comisión −
Impuestos`) → **Guardar movimiento** → the movement is appended to the store, a success
haptic fires, the modal dismisses, and Home re-derives (Efectivo rises, the holding's shares
drop or the holding disappears on a full exit, Realized P&L updates) — no manual refresh.

The user sells by **Acciones** (the inverse of Compra). The screen reads
`usePortfolio().holdings`, finds the entry for the typed ticker, and uses its **shares** as
the available quantity passed to `summarizeSell` for the **held-shares gate** (strict). It
shows **"Disponible X acciones"** as a muted helper **under** the Acciones box. The **Símbolo**
field is free text, force-uppercase (`[A-Z]` only), no search.

Layout — three input rows (mirror of Compra, no orphan field): **Símbolo · Fecha**, **Acciones
· Precio de ejecución**, **Comisión · Impuestos**. Then the **breakdown** above the sticky
button. Reuses the existing theme tokens. **Comisión / Impuestos start empty** (placeholder
"0.00"). Save feedback is **haptic + dismiss only — no toast**, consistent with the other forms.

## Acceptance criteria

- [ ] The **Venta** row in the OPERACIONES group is active (no "Pronto"); tapping it opens the form
- [ ] **Símbolo** is free text, forces uppercase (`[A-Z]` only), no search; paired with **Fecha** on the first row
- [ ] **Acciones** (plain, fractional) and **Precio de ejecución** (`$` prefix) are side-by-side
- [ ] **"Disponible X acciones"** shows under the Acciones box, sourced from `usePortfolio().holdings` for the typed ticker
- [ ] **Comisión** and **Impuestos** (both `$` prefix, optional, default `0`, **empty by default**) are side-by-side
- [ ] Live breakdown shows **Monto bruto** (`Acciones × Precio`), **Comisión** `−`, **Impuestos** `−`, and **Total a recibir** (`Monto bruto − Comisión − Impuestos`); updates live; reads `$0.00` when Acciones or Precio is blank; the Total turns teal when saveable, red when over-held
- [ ] Errors are touch-gated: empty Símbolo ("Ingresa un símbolo."), zero Acciones ("Ingresa una cantidad mayor a 0."), over-sell ("Solo tienes X acciones."), not-held ("No tienes acciones de XXX."), zero Precio ("Ingresa un precio mayor a $0.")
- [ ] **Guardar movimiento** is disabled until all gates pass (consumes the `summarizeSell` flags)
- [ ] On save: a `SellMovement` is appended via the movements store, a success haptic fires, and the modal dismisses to Home; Home shows the updated Valor total / Efectivo / holding with no manual refresh
- [ ] Selling exactly the held shares fully closes the position (engine resets avg cost — already handled)
- [ ] No success toast/overlay — haptic + dismiss only, like the other forms
- [ ] **Fecha** defaults to today, blocks future dates, and displays `DD/MM/AAAA`
- [ ] The screen visually mirrors the Compra form and uses the existing theme tokens

## Blocked by

- `01-sell-view-model.md` (the form consumes `summarizeSell` / `buildSellMovement`)
