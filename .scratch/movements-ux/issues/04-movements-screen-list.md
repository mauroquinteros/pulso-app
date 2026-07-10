# Pantalla Movimientos: lista + estado vacío real

**Type:** AFK
**Source:** `.scratch/movements-ux/PRD.md` · `.scratch/movements-ux/UX.md` · prototipo `movement-list-design-prototype/`

## What to build

Reemplaza el stub del tab **Movimientos** con la pantalla real, **sin los chips
todavía** (eso es el issue 05): título, lista de movimientos, y el estado vacío
real. Demoable por sí sola — el usuario ve su historial completo.

- **Pantalla:** título "Movimientos" (28px/800, como "Portafolio"), safe areas
  respetadas, nada oculto tras el tab bar. Todo se renderiza desde
  `buildMovementsView(movements, null)` — los componentes no derivan ni formatean.
- **Lista:** `FlatList`, no `ScrollView`. Los movimientos crecen sin cota (a
  diferencia de los holdings), y la guía de performance pide virtualizar listas
  de 50+ ítems. La card del prototipo (surface, borde, radio 20) se aplica como
  contenedor del contenido; los separadores de 1px van entre filas, y la primera
  fila no lleva borde superior.
- **Fila:** badge 40×40 con el icono y los colores del tipo (del módulo de
  identidad, issue 02), título, fecha, y el **Cash Impact** a la derecha —
  `textBright`, cifras tabulares, **sin signo y sin color**.
- **Las filas NO son tocables.** Sin `Pressable`, sin chevron, sin feedback de
  press. El detalle por movimiento está fuera de este PRD, y un control que se ve
  tocable y no hace nada es un anti-patrón.
- **Estado vacío real** (no existe ningún movimiento): ilustración **vectorial
  inline** (el prototipo trae el SVG; nada de PNG ni emoji), mensaje, y CTA
  "Agregar movimiento" que navega al picker. Sin chips (aún no existen).
- Todos los textos de UI en español; **tickers sin traducir**.

## Acceptance criteria

- [ ] El tab Movimientos muestra la pantalla real; el stub desaparece
- [ ] Las filas renderizan badge, título, fecha y monto **verbatim** desde el view-model (los strings no se re-formatean en el componente)
- [ ] El badge usa el icono y los colores del módulo de identidad del tipo, no valores hardcodeados
- [ ] El monto se muestra sin signo y en color neutro para los cinco tipos
- [ ] Las filas **no** responden al tap: no hay `Pressable`, ni chevron, ni feedback de press
- [ ] La lista usa `FlatList`; las filas viven en una card con separadores de 1px y la primera sin borde superior
- [ ] Estado vacío real: ilustración vectorial + mensaje + CTA "Agregar movimiento" → picker de add-movement
- [ ] En estado vacío no se renderiza ninguna fila ni card de lista
- [ ] Layout: safe areas respetadas, nada bajo el tab bar; el estilo visual coincide con el prototipo
- [ ] Sin derivación ni formateo en los componentes; `tsc` y lint limpios

## Blocked by

- `02-movement-type-identity.md`
- `03-movements-view-model.md`
