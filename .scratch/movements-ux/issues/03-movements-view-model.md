# Movements view-model + tests

**Type:** AFK
**Source:** `.scratch/movements-ux/PRD.md` · `.scratch/movements-ux/UX.md`

## What to build

El **view-model puro** de la vista de Movimientos — el único módulo con lógica
de la feature, espejo del patrón de Home y Portafolio. Una función,
`buildMovementsView(movements, selectedType)`, que toma los `Movement[]` crudos
del store y devuelve una vista lista para pintar: ordena, filtra, calcula el
**Cash Impact** de cada movimiento, formatea, y emite los estados degenerados
como **datos declarativos**. Los componentes la renderizan verbatim y no
contienen derivación ni formateo.

Forma indicativa (naming libre, camelCase):

```ts
interface MovementsView {
  state: "empty" | "filtered-empty" | "ready";
  chips: { type: MovementType; label: string; selected: boolean }[]; // [] cuando state === "empty"
  filteredEmptyMessage: string | null;   // "No tienes retiros"
  rows: {
    id: string;
    title: string;        // "Compra AAPL" | "Depósito"
    dateLabel: string;    // "15 ene 2025"
    amount: string;       // "$447.86" — magnitud, SIN signo
    type: MovementType;   // el componente resuelve icono/colores desde el módulo de identidad
  }[];
}
```

Política que este módulo posee (toda testeada acá):

- **Orden:** `executionDate` descendente, con `createdAt` descendente como
  desempate. Es el criterio cronológico del reducer, invertido — no se inventa
  uno nuevo. Un movimiento backdateado aparece donde ocurrió, no arriba.
- **Filtro:** `selectedType: MovementType | null`; **`null` = sin filtro = todos**.
- **Estados:** `empty` (no existe **ningún** movimiento) es distinto de
  `filtered-empty` (hay movimientos, ninguno del tipo elegido). Confundirlos es
  el error clásico: ofrecer "agrega tu primer movimiento" a quien tiene 13 y
  solo filtró mal.
- **Monto:** la **magnitud** del **Cash Impact** (issue 01), formateada como
  moneda. **Sin signo**: el signo es 100% derivable del tipo, y el color
  verde/rojo en Pulso significa ganancia/pérdida — una compra no es una pérdida.
- **Título:** `label + ticker` para compra, venta y dividendo; **solo el label**
  para depósito y retiro, que no tienen ticker.
- **Fecha:** `executionDate`, nunca `createdAt`. Formato español compacto y
  **siempre con año** (`15 ene 2025`), porque no hay agrupado por mes y los
  datos cruzan años. Es una **fecha de calendario**: no se convierte de zona
  horaria (ver `docs/adr/0004-execution-date-is-a-calendar-date.md`).
- El módulo **no emite colores ni iconos**: emite el `type` y el componente
  resuelve la identidad visual.

El helper de fecha existente no tiene ningún consumidor (código muerto, formato
inglés). Se **repurposea** al formato español en vez de agregar un segundo
formateador: al no tener callers, el cambio no tiene ripple.

## Acceptance criteria

- [ ] Módulo puro (sin imports de React ni React Native); `buildMovementsView` es lo único que la UI necesita
- [ ] Filas ordenadas por `executionDate` desc, con desempate por `createdAt` desc cuando dos comparten fecha de ejecución
- [ ] `selectedType: null` devuelve todos los movimientos; un tipo devuelve solo los de ese tipo
- [ ] Los tres estados se discriminan correctamente: `empty` (sin movimientos, `chips` vacío), `filtered-empty` (hay movimientos, ninguno del tipo), `ready`
- [ ] `filteredEmptyMessage` nombra el tipo en plural minúscula ("No tienes retiros"); es `null` fuera de ese estado
- [ ] `chips` lista los cinco tipos en el orden de la taxonomía (compra, venta, dividendo, depósito, retiro) con `selected` correcto
- [ ] Título: `Compra AAPL` con ticker; `Depósito` sin ticker
- [ ] Monto: magnitud del Cash Impact, **sin signo** (una compra formatea `$447.86`, nunca `−$447.86`)
- [ ] Fecha: `15 ene 2025` — español, siempre con año; una fecha nunca se corre de día
- [ ] Suite vitest cubre cada criterio anterior (estilo tabla de casos, como los view-models de Home y Portafolio); `npm test` y `tsc` limpios

## Blocked by

- `01-cash-impact-module.md`
