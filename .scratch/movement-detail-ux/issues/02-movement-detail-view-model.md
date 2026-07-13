# Movement detail view-model + tests

**Type:** AFK
**Source:** `.scratch/movement-detail-ux/PRD.md` · `.scratch/movement-detail-ux/UX.md` · prototipo `stock-portfolio-design-prototype/`

## What to build

El **view-model puro** del detalle — el único módulo con lógica de la feature,
espejo del patrón de Home, Portafolio y Movimientos. Una función,
`buildMovementDetailView(movement | undefined)`, que convierte un **Movement** en
un **recibo** listo para pintar.

El prototipo ya implementó esta función; su forma es el contrato:

```ts
interface DetailLine {
  label: string;   // "Monto bruto" | "Comisión"
  amount: string;  // "$447.71" | "+$0.15" | "−$5.55"   (operador incluido)
}
interface MovementDetailView {
  state: "found" | "not-found";
  header: { title: string; dateLabel: string; type: MovementType } | null;
  facts: DetailLine[];      // acciones, precio — solo compra/venta; sin operadores
  money: DetailLine[];      // base + ajustes firmados
  total: DetailLine | null; // { label: "Total pagado", amount: "$447.86" }
}
```

Un solo patrón para los cinco tipos: **base → ajustes firmados → total**. Y en
los cinco, **el total ES el `cashImpact`** — el mismo número que muestra la fila
de la lista. El view-model **reusa `cashImpact` del motor**, no reimplementa esa
fórmula.

Cifras reales del mock:

| Tipo | `facts` | `money` | `total` (= Cash Impact) |
| --- | --- | --- | --- |
| Compra | Acciones `2.45321`, Precio de ejecución `$182.50` | Monto bruto `$447.71`, Comisión `+$0.15` | **Total pagado** `$447.86` |
| Venta | Acciones `3`, Precio de ejecución `$195.50` | Monto bruto `$586.50`, Comisión `−$0.15`, Tarifas regulatorias `−$0.03` | **Total recibido** `$586.32` |
| Dividendo | — | Monto bruto `$18.50`, Impuesto `−$5.55` | **Total recibido** `$12.95` |
| Depósito | — | Total transferido `$3,003.99`, Comisión de transferencia `−$3.99` | **Efectivo agregado** `$3,000.00` |
| Retiro | — | Recibido en banco `$499.00`, Comisión `+$1.00` | **Efectivo retirado** `$500.00` |

### Dos reglas que NO son obvias

**1. Depósito y retiro llevan la aritmética invertida.** En los otros tres la base
es el bruto y el total es lo que tocó el efectivo; acá la base es la cifra de la
**frontera del banco** y el total es el efectivo. Es lo que permite que el total
sea el **Cash Impact** sin degenerar el recibo a una sola línea (si el total fuera
`$3,000.00`, una comisión de `$3.99` no sumaría a nada).

**2. El "Monto bruto" se DERIVA del total, no de `executionPrice × shares`.**

```
Compra:  bruto = total − comisión
Venta:   bruto = total + comisión + tarifas regulatorias
```

Porque el motor calcula el **Cash Impact** con el bruto **crudo** (`8,821.705`),
y `round2(precio × acciones)` daría `8,821.71` — el recibo no cuadraría por 1¢ en
el 0.002% de los casos (medido por fuzzing). Derivándolo, el recibo **siempre**
cuadra *y* el total sigue siendo el número de la lista. Solo aplica a compra y
venta; en los otros tres los campos ya vienen exactos a 2 decimales.

### Otras políticas que este módulo posee

- **Operadores `+`/`−`** solo en las líneas de ajuste (la base y el total van sin
  signo). La dirección **no es derivable del label**: la misma "Comisión" suma en
  Compra y Retiro, y resta en Venta, Dividendo y Depósito.
- El menos es **U+2212** (`−`), nunca un guion ASCII.
- **Título**: `label + ticker` para compra/venta/dividendo; solo el label para
  depósito/retiro.
- **Fecha**: `executionDate`, nunca `createdAt` (`ADR-0004`). Formato español con
  año (`15 ene 2025`), reusando el formateador existente.
- **Acciones**: número pelado (`2.45321`), **sin el sufijo `acc`** — la etiqueta
  ya dice "Acciones".
- **`not-found`** cuando el movimiento es `undefined`.
- El módulo **no emite colores ni iconos**: emite el `type`, y el componente
  resuelve la identidad visual desde la fuente única.

## Acceptance criteria

- [ ] Módulo puro (sin imports de React/React Native); `buildMovementDetailView` es lo único que la UI necesita
- [ ] Un recibo correcto por tipo (los cinco), con `facts`, `money`, `total` y sus labels exactos según la tabla
- [ ] **El total es siempre `formatUSD(|cashImpact(movement)|)`** — la función del motor se reusa, no se reimplementa
- [ ] Depósito y retiro con la **aritmética invertida** (base = frontera del banco, total = efectivo)
- [ ] El **"Monto bruto" se deriva del total** en compra y venta, no de `executionPrice × shares`
- [ ] Operadores: `+` en compra y retiro; `−` en venta, dividendo y depósito. Base y total **sin signo**
- [ ] El menos es **U+2212**, nunca un guion ASCII
- [ ] `facts` vacío para dividendo, depósito y retiro
- [ ] Título con ticker (`Compra AAPL`) y sin ticker (`Depósito`)
- [ ] Fecha en español con año (`15 ene 2025`), sin correrse de día
- [ ] `state: "not-found"` cuando el movimiento es `undefined`
- [ ] **Invariante 1 — el recibo cuadra**: la suma de las líneas mostradas es siempre igual al total mostrado, afirmado **parseando los strings** que emite el view-model (no recalculando por dentro)
- [ ] **Invariante 2 — el total es el Cash Impact**: el total mostrado es siempre el mismo string que muestra la fila de la lista
- [ ] **Caso adversario obligatorio**: `10.975` acciones × `$803.80` con comisión `$0.88` → bruto `$8,821.70` y total `$8,822.58`. **Con los datos limpios del mock la implementación ingenua también pasaría**; este caso es el cable trampa
- [ ] Suite vitest (estilo tabla de casos, como los view-models de Movimientos y Portafolio); `npm test` y `tsc` limpios

## Blocked by

None - can start immediately
