# Cash Impact: módulo profundo + invariante

**Type:** AFK
**Source:** `.scratch/movements-ux/PRD.md` · `.scratch/movements-ux/UX.md`

## What to build

El **Cash Impact** de un **Movement** — el cambio que produce en **Cash**, neto
de **Fees** de trading — ya se calcula hoy, movimiento por movimiento, dentro
del `for` del motor de efectivo. Solo que se suma y los intermedios se tiran.

Este slice le da un nombre y lo expone como **función pura**, y convierte el
cómputo de **Cash** en su reducción. Es un **refactor sin cambio de
comportamiento**: se suma sin redondear y se redondea una sola vez al final,
exactamente como hoy.

```
deposit    →  +amount
withdrawal →  −amount
buy        →  −(executionPrice × shares + fee)
sell       →  +(executionPrice × shares − fee − regulatoryFees)
dividend   →  +(grossAmount − tax)          = Net Dividends
```

Los **transfer fees** de depósito y retiro **no** entran (ver
`docs/adr/0003-cash-side-movement-amounts.md`): el Cash Impact de un depósito de
`amount 3000.00` con `transferFee 3.99` es `3000.00`. Los **trading fees** sí.

El valor de este slice está en el **invariante**: la suma de los Cash Impact de
todos los movimientos **es** el Cash. Hoy esa frase del glosario se sostiene por
disciplina; al terminar, se sostiene por construcción. La vista de movimientos
importará esta misma función, así que la lista y el motor no podrán divergir.

## Acceptance criteria

- [ ] El motor de efectivo exporta `cashImpact(movement)`, función pura que devuelve un número **con signo**
- [ ] El cómputo de **Cash** pasa a ser la reducción de `cashImpact` sobre los movimientos, redondeando **una sola vez** al final
- [ ] Depósito devuelve `+amount` y retiro `−amount`; el **transfer fee nunca** afecta el Cash Impact
- [ ] Compra devuelve `−(executionPrice × shares + fee)`; venta `+(gross − fee − regulatoryFees)`; dividendo `+(grossAmount − tax)`
- [ ] Tests: un caso por tipo con las cifras del mock — depósito `3000.00`, retiro `500.00`, compra `447.86`, venta `586.32`, dividendo `12.95` — verificando también el signo
- [ ] Test del **invariante**: `Σ cashImpact(m) === computeCash(movements)` sobre el set completo de movimientos mock
- [ ] Los tests existentes del cómputo de Cash pasan **sin tocarlos** (son la red de seguridad del refactor)
- [ ] Ningún número derivado del portafolio cambia; `npm test` y `tsc` limpios

## Blocked by

None - can start immediately
