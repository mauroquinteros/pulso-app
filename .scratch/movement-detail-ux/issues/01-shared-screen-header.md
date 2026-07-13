# Header de pantalla compartido (extracción)

**Type:** AFK
**Source:** `.scratch/movement-detail-ux/PRD.md` · `.scratch/movement-detail-ux/UX.md` · prototipo `stock-portfolio-design-prototype/`

## What to build

Los cinco formularios de add-movement ya comparten un header (botón back circular
+ título de pantalla), pero vive **dentro** de `components/add-movement/`. El
prototipo del detalle de movimiento dibuja **exactamente el mismo header**.

Este slice lo **extrae a un componente compartido** y migra los cinco formularios
para que lo consuman. **Sin cambio visual alguno** — es puro movimiento de código,
para que la pantalla de detalle (issue 03) pueda reusarlo en vez de duplicarlo.

Es la misma jugada que la feature de movimientos hizo con la identidad del tipo:
una sola fuente de verdad para algo que dos features necesitan.

## Acceptance criteria

- [ ] El header (back + título) vive en un módulo compartido, fuera de `components/add-movement/`
- [ ] Los cinco formularios (compra, venta, dividendo, depósito, retiro) lo consumen; **no queda ninguna copia** del header en `add-movement/`
- [ ] **Cero cambio visual**: los cinco formularios se ven exactamente igual que antes (mismo botón circular, mismo tamaño de título, mismos colores)
- [ ] El back sigue funcionando en los cinco formularios
- [ ] El componente acepta el título como prop (los formularios ya pasan "Compra", "Venta", etc.)
- [ ] `tsc` y lint limpios; `npm test` sigue en verde

## Blocked by

None - can start immediately
