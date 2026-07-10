# PRD — Movements View (tab Movimientos)

> Fuente: `.scratch/movements-ux/UX.md` (design brief settled) + el prototipo
> `.scratch/movements-ux/movement-list-design-prototype/` (verdad visual
> pixel-perfect). El prototipo **confirma** cada decisión del grilling; no
> contradice ninguna. Este PRD fija los contratos de módulos y las políticas que
> el prototipo no muestra. Términos en negrita = glosario (`CONTEXT.md`).

## Problem Statement

El usuario registra todos sus movimientos (compras, ventas, dividendos,
depósitos, retiros), y la app deriva de ellos su portafolio, su efectivo y su
rendimiento. Pero **no tiene forma de ver los movimientos que registró**. El tab
Movimientos existe y es un stub.

Sin esa vista no puede responder preguntas básicas: *"¿ya registré el dividendo
de AAPL de noviembre?"*, *"¿cuánto me costó realmente esa compra, con comisión?"*,
*"¿cuántas veces deposité este año?"*. Tampoco puede auditar de dónde sale su
**Cash**: la cifra existe, pero los hechos que la producen son invisibles.

## Solution

El tab **Movimientos** muestra el **libro mayor** de la cuenta: la lista plana
de todos los movimientos, del más reciente al más antiguo, con **chips de filtro
por tipo** arriba.

Cada fila responde una sola pregunta, idéntica para los cinco tipos: **¿cuánto
movió mi efectivo este movimiento?** Esa cifra es el **Cash Impact**, y la suma
de todos los Cash Impact **es** el **Cash**. Esa reconciliación es la razón de
ser de la pantalla.

La lista es de **solo lectura**: las filas no navegan a ningún lado (el detalle
por movimiento queda fuera de este PRD).

## User Stories

1. As a Pulso user, I want to see every movement I have recorded in one list, so that I can confirm what I already registered and what is missing.
2. As a Pulso user, I want my movements ordered from most recent to oldest, so that what I did last is what I see first.
3. As a Pulso user, I want movements ordered by **when they happened** (not when I typed them), so that a backdated movement lands in its real place in history.
4. As a Pulso user, I want two movements executed on the same day to keep a stable, predictable order, so that the list never shuffles between renders.
5. As a Pulso user, I want each row to show what kind of movement it was, so that I can tell a buy from a deposit at a glance.
6. As a Pulso user, I want each row's icon to identify the **type** of movement rather than hint at a direction, so that a buy and a deposit are never confused by sharing an arrow.
7. As a Pulso user, I want each type to have its own consistent color across the whole app, so that the icon I pick in the add-movement screen is the icon I see in the list.
8. As a Pulso user, I want rows with a ticker to name it (`Compra AAPL`), so that I know which position the movement touched.
9. As a Pulso user, I want cash movements to read simply as `Depósito` / `Retiro`, so that no phantom ticker is implied where none exists.
10. As a Pulso user, I want each row to show the amount of cash the movement moved (**Cash Impact**), so that the list reconciles with my **Cash**.
11. As a Pulso user, I want a buy's amount to include its commission, so that I see what actually left my **Buying Power**, not a pre-fee figure.
12. As a Pulso user, I want a sell's amount to be net of commission and regulatory fees, so that I see what actually reached my cash.
13. As a Pulso user, I want a dividend's amount to be net of withholding tax (**Net Dividends**), so that I see what I really received.
14. As a Pulso user, I want a deposit's amount to be the cash that landed in my account, not the gross transfer, so that it matches the convention used everywhere else in the app.
15. As a Pulso user, I want a withdrawal's amount to be the cash that left my account, so that the same convention holds symmetrically.
16. As a Pulso user, I want amounts shown without a `+` or `−` sign, so that the list is not cluttered by information the movement type already carries.
17. As a Pulso user, I want amounts shown in a neutral color, so that green and red keep meaning **gain and loss** — a buy is not a loss and a deposit is not a profit.
18. As a Pulso user, I want amounts in a consistent currency format with thousands separators and tabular numerals, so that the column aligns and compares cleanly.
19. As a Pulso user, I want each row to show the date the movement was executed, so that I can place it in time without month headers.
20. As a Pulso user, I want the date in Spanish and always with its year (`15 ene 2025`), so that a history spanning several years is never ambiguous.
21. As a Pulso user, I want the date to be exactly the day I selected when recording the movement, so that no timezone conversion silently shifts it to the previous day.
22. As a Pulso user, I want filter chips for each movement type at the top of the screen, so that I can narrow the list to what I am looking for.
23. As a Pulso user, I want to tap a chip to filter by that type, so that I can see only my dividends.
24. As a Pulso user, I want to tap the active chip again to clear the filter, so that returning to the full list needs no separate "All" control.
25. As a Pulso user, I want only one filter active at a time, so that the state stays simple and predictable.
26. As a Pulso user, I want the active chip to be visibly highlighted with its type's color, so that I always know what I am filtering by.
27. As a Pulso user, I want the chips in the same order as the add-movement picker, so that the app speaks one taxonomy.
28. As a Pulso user, I want the chip row to scroll horizontally, so that all five types are reachable on a small phone.
29. As a Pulso user, I want my filter to still be applied when I switch to another tab and come back, so that I do not lose my place.
30. As a Pulso user with no movements at all, I want an illustrated empty state with a clear message and an "Agregar movimiento" button, so that I know what to do next.
31. As a Pulso user with no movements at all, I want the filter chips hidden, so that I am not offered controls that filter nothing.
32. As a Pulso user who filtered to a type I have never used, I want a message naming that type ("No tienes retiros"), so that I understand the list is empty because of my filter, not because I have no history.
33. As a Pulso user in a filtered-empty state, I want a "Quitar filtro" action, so that I can escape without guessing that I must re-tap the chip.
34. As a Pulso user in a filtered-empty state, I want the chips to stay visible, so that I can switch to another type directly.
35. As a Pulso user in a filtered-empty state, I do not want an onboarding illustration or an "add movement" prompt, so that the app does not pretend I am a new user.
36. As a Pulso user, I do not want rows to look tappable, so that I am not invited to press something that does nothing.
37. As a Pulso user with hundreds of movements, I want the list to stay smooth while scrolling, so that the app does not stutter as my history grows.
38. As a Pulso user, I want the screen title and spacing to match the rest of the app, so that it feels like one product.
39. As a Pulso user, I want the content to respect safe areas and never hide behind the tab bar, so that every movement is reachable.
40. As a Pulso user with a screen reader, I want each chip to announce whether it is selected, so that the filter state is perceivable without color.
41. As a Pulso user, I want chip tap targets to be comfortably large even though the chips look compact, so that filtering never requires a precise tap.
42. As a Pulso user, I want every UI text in Spanish (tickers untranslated), so that the app speaks one language.
43. As a Pulso developer, I want the amount shown in the list to be computed by the same function the engine uses for **Cash**, so that the list can never silently drift from the balance it explains.

## Implementation Decisions

### Domain & engine

- **`cashImpact(movement)` se extrae como módulo profundo del motor de efectivo.**
  La fórmula ya existe hoy, una sola vez, dentro del `for` de `computeCash`.
  Se le da un nombre y `computeCash` pasa a ser su reducción. **Refactor sin
  cambio de comportamiento**: se suma sin redondear y se redondea una vez al
  final, igual que hoy; los tests existentes de `computeCash` son la red de
  seguridad.

  ```ts
  // Interfaz estable, encapsula la semántica de efectivo de los 5 tipos.
  export function cashImpact(m: Movement): number
  //   deposit    →  +amount
  //   withdrawal →  −amount
  //   buy        →  −(executionPrice × shares + fee)
  //   sell       →  +(executionPrice × shares − fee − regulatoryFees)
  //   dividend   →  +(grossAmount − tax)

  export function computeCash(ms: Movement[]): number  // = round2(Σ cashImpact)
  ```

  Esto convierte el invariante del glosario — *"la suma de los Cash Impact es
  **Cash**"* — de coincidencia mantenida por disciplina a **verdad por
  construcción**. La lista importa la misma función que el motor.

- **Los transfer fees no entran** en el Cash Impact de depósito/retiro
  (`ADR-0003`): un depósito de `amount 3000.00` con `transferFee 3.99` tiene
  Cash Impact `3000.00`. El `3003.99` es **Net Contributions**, y no aparece en
  esta vista.
- **La vista no usa `usePortfolio()`** ni deriva portafolio. Consume el store
  crudo de movimientos. El resto del motor (`reducer`, `valuation`) no se toca.

### Presentación del Cash Impact

- La fila muestra la **magnitud** (`Math.abs`), **sin signo**, en color neutro
  (`textBright`), con cifras tabulares.
- Razón: el signo es 100% derivable del tipo (Depósito/Venta/Dividendo siempre
  suman; Compra/Retiro siempre restan), y verde/rojo en Pulso ya significan
  **ganancia/pérdida** — una Compra no es una pérdida. **La dirección la
  comunica el tipo.**
- El concepto de dominio sí es signado; lo que no lleva signo es su presentación.

### Identidad visual del tipo de movimiento (fuente única)

Hoy los iconos y colores por tipo están **hardcodeados** en la pantalla del
picker de add-movement. Se extraen a un **módulo compartido** que mapea cada
`MovementType` a su identidad, consumido por la lista **y** por el picker.

```ts
// Del prototipo: TYPE_META. Encoda label, copy de chip, y tokens visuales.
{
  buy:        { label:'Compra',    labelPlural:'Compras',    icon:'cart-outline',          bg:'rgba(120,160,255,0.16)', color:'#9DB8FF' },
  sell:       { label:'Venta',     labelPlural:'Ventas',     icon:'pricetag-outline',      bg:'rgba(255,140,140,0.14)', color:'#FF9D9D' },
  dividend:   { label:'Dividendo', labelPlural:'Dividendos', icon:'cash-outline',          bg:'rgba(0,229,204,0.12)',   color:'#4FE9D6' },
  deposit:    { label:'Depósito',  labelPlural:'Depósitos',  icon:'add-circle-outline',    bg:'rgba(0,200,83,0.16)',    color:'#7DE8AA' },
  withdrawal: { label:'Retiro',    labelPlural:'Retiros',    icon:'remove-circle-outline', bg:'rgba(142,142,147,0.14)', color:'#B8BCCB' },
}
```

- **Regla:** el icono **identifica el tipo**, nunca insinúa dirección de
  efectivo. Los iconos de flecha del picker **cambian**: hoy `Compra` y
  `Depósito` comparten `arrow-down` pero mueven el efectivo en direcciones
  opuestas — en una lista densa esa flecha se lee como dirección y mentiría.
- **`#7DE8AA` es un token nuevo.** Hoy `Depósito` comparte el teal de
  `Dividendo`. El verde nuevo es el **mismo matiz que el token `positive`**
  (`hsl(145°)`) llevado al registro pastel donde viven los demás badges, con
  fondo derivado del rgb de `positive` (convención existente: fondo saturado,
  texto pastel). **No** se reusa `positive` crudo: es el token de *ganancia* y
  reusarlo re-acoplaría verde↔profit.
- Trade-off aceptado: `#7DE8AA` (145°) queda a ~28° del teal de `Dividendo`
  (173°). Los **iconos ya desambiguan**, así que el color es refuerzo y nunca el
  único canal.

### Movements view-model (módulo profundo, el único con lógica)

Función pura `buildMovementsView(movements, selectedType)`. Encapsula toda la
política detrás de una interfaz estable: ordena, filtra, calcula Cash Impact,
formatea, y emite los estados degenerados como **datos declarativos**.

```ts
interface MovementsView {
  state: "empty" | "filtered-empty" | "ready";
  chips: { type: MovementType; label: string; selected: boolean }[]; // [] si state === "empty"
  filteredEmptyMessage: string | null;   // "No tienes retiros"
  rows: {
    id: string;
    title: string;        // "Compra AAPL" | "Depósito"
    dateLabel: string;    // "15 ene 2025"
    amount: string;       // "$447.86" — magnitud, sin signo
    type: MovementType;   // el componente resuelve icono/colores
  }[];
}
```

- **Orden:** `executionDate` desc, con `createdAt` desc como desempate. Es
  exactamente el criterio cronológico del reducer, invertido. No se inventa uno
  nuevo.
- **Filtro:** `selectedType: MovementType | null`; **`null` = sin filtro = todos**.
- **Discriminación de estados:** `empty` (no hay ningún movimiento) es distinto
  de `filtered-empty` (hay movimientos, ninguno del tipo elegido). Confundirlos
  es el error clásico: mostrar "agrega tu primer movimiento" cuando tienes 13 y
  solo filtraste mal.
- El view-model **no** emite geometría ni colores: emite el `type` y el
  componente resuelve la identidad visual desde el módulo compartido.

### Fecha

- La fila muestra **`executionDate`**, nunca `createdAt`.
- `executionDate` es una **fecha de calendario** (`YYYY-MM-DD`), sin hora ni zona:
  el date picker usa `mode="date"` y los cinco view-models de add-movement lo
  tipan así. **No se convierte de UTC a local** — hacerlo corre el día
  (`new Date("2025-01-15")` renderiza *14 ene* en UTC-5).
- Formato español compacto, **siempre con año**: `15 ene 2025`. La locale `es`
  de date-fns ya está disponible.
- El helper de fecha existente **no tiene ningún consumidor** (código muerto, en
  inglés). Se **repurposea** al formato español en vez de agregar un segundo
  formateador: al no tener callers, el cambio no tiene ripple.

### Pantalla y componentes

- **Estructura:** título "Movimientos" (28px/800, como "Portafolio") y chips
  **fijos**; solo la lista scrollea. Safe areas respetadas; nada bajo el tab bar.
- **`FlatList`, no `ScrollView`.** Los movimientos crecen sin cota (a diferencia
  de los holdings). La card del prototipo (surface, borde, radio 20) se aplica
  como `contentContainerStyle`; los separadores de 1px entre filas van como
  `ItemSeparatorComponent` (la primera fila sin borde superior).
- **Las filas no son interactivas:** sin `Pressable`, sin chevron, sin feedback
  de press. El detalle está fuera de este PRD y un control que se ve tocable y
  no hace nada es un anti-patrón.
- **Chips:** píldoras de 36px de alto. Activo = fondo y borde del color del
  tipo; inactivo = transparente, texto secundario, borde `border`. Como 36px <
  44pt, llevan **`hitSlop`** para alcanzar el objetivo táctil efectivo. Exponen
  `accessibilityState={{ selected }}` para que el estado sea perceptible sin
  color.
- **Estado del filtro:** `useState` local en la pantalla. **Persiste entre
  cambios de tab sin escribir código**: el navegador de tabs no desmonta la
  pantalla tras la primera visita. Resetear costaría código extra y contradiría
  la guía de preservación de estado. Se pierde al reiniciar la app, coherente
  con el store, que es in-memory y vuelve al seed.
- **Vacío real:** chips ocultos, ilustración **vectorial inline**
  (`react-native-svg`, ya instalado — nada de PNG ni emoji), mensaje, y CTA
  "Agregar movimiento" (píldora con el gradiente existente, 44px de alto) que
  navega al picker.
- **Vacío filtrado:** chips visibles, mensaje que nombra el tipo, y **"Quitar
  filtro"** como link de texto en el color de acento.

## Testing Decisions

- Un buen test ejercita **comportamiento externo** del módulo puro: dado un
  input, se afirma sobre el output observable — nunca sobre detalles internos ni
  sobre render de React Native.
- **Se testean exactamente dos módulos**, ambos puros:

  **1. `cashImpact` (motor de efectivo).**
  - Un caso por tipo de movimiento, con las cifras del mock: depósito
    (`3000.00`), retiro (`500.00`), compra (`182.50 × 2.45321 + 0.15 = 447.86`),
    venta (`586.50 − 0.15 − 0.03 = 586.32`), dividendo (`18.50 − 5.55 = 12.95`).
  - Signo correcto por tipo (compra y retiro negativos; el resto positivos).
  - El transfer fee de un depósito/retiro **no** afecta su Cash Impact.
  - **El invariante:** `Σ cashImpact(m) === computeCash(movements)` sobre el set
    completo de movimientos mock. Este es el test que hace del refactor algo
    seguro y que impide que la lista y el motor diverjan.

  **2. `buildMovementsView` (view-model de la vista).**
  - Orden `executionDate` desc, y el desempate por `createdAt` cuando dos
    movimientos comparten fecha de ejecución.
  - Filtro: `null` devuelve todos; un tipo devuelve solo ese tipo.
  - Los tres estados: `empty` (sin movimientos, chips vacíos),
    `filtered-empty` (hay movimientos, ninguno del tipo, con el mensaje que
    nombra el tipo), `ready`.
  - Títulos: con ticker (`Compra AAPL`) y sin ticker (`Depósito`).
  - Fecha formateada en español con año (`15 ene 2025`).
  - Montos: **sin signo** (una compra formatea `$447.86`, no `−$447.86`).
  - Chips: los cinco tipos, en el orden de la taxonomía, con `selected` correcto.

- **Los componentes no se testean** (fila, chips, estados vacíos): son
  presentacionales, igual que en Home y Portafolio. No se agrega
  `@testing-library/react-native` al repo.
- **Prior art:** los tests del view-model de Home y del view-model de Portafolio
  (misma forma: función pura in/out, tabla de casos) y los tests existentes de
  `computeCash`, que quedan intactos y guardan el refactor.

## Out of Scope

- **Pantalla de detalle del movimiento.** El usuario la quiere, pero fuera de
  este PRD. Cuando llegue, hay una tensión ya identificada: en Depósito y Retiro
  el total "del mundo real" (**Net Contributions** `$3,003.99` / recibido en
  banco `$499.00`) **no coincide** con el Cash Impact de la fila (`$3,000.00` /
  `$500.00`). Propuesta pendiente: que el detalle cierre siempre en el Cash
  Impact y que el fee y el out-of-pocket vayan como líneas de contexto, para que
  fila y detalle nunca se contradigan.
- **Búsqueda.** El control (la lupa del screenshot original) ni se dibuja: no se
  muestran controles muertos.
- **Editar o borrar** movimientos.
- **Agrupar por mes** (headers tipo `NOVIEMBRE 2025`). La fecha vive en la fila.
- **Multi-selección** de filtros.
- **Persistencia del filtro entre reinicios** (requeriría AsyncStorage +
  middleware de persistencia; sería incoherente mientras los datos se resetean
  al seed).
- **Hora de ejecución.** Requeriría cambiar el modelo: picker a `datetime`,
  `executionDate` a instante ISO, y migrar los cinco view-models de add-movement,
  sus tests, el mock y el desempate del reducer.
- **Cambiar la semántica del motor.** El único cambio en `utils/portfolio/` es la
  extracción de `cashImpact`, que no altera ningún número.
- Precios reales (fuera del alcance de esta vista; el mock sigue siendo el
  swap-point).

## Further Notes

- El prototipo HTML es la **referencia visual** (dimensiones, pesos, colores,
  microcopy, ilustración del vacío); este PRD no duplica esos valores.
- El prototipo **confirma** cada decisión del grilling. Donde el screenshot
  original del usuario difería —agrupado por mes, montos brutos, verde y `+`
  solo en dividendos, chip "Todos", búsqueda— el prototipo ya refleja las
  decisiones settled, no el screenshot.
- **`ADR-0004 — Movement executionDate is a calendar date, not an instant`** quedó
  escrito, y con él el campo se **renombró de `executedAt` a `executionDate`**
  (118 usos, 23 archivos, cambio puramente mecánico verificado por `tsc` y los
  103 tests). El sufijo `-At` prometía un timestamp e invitaba a convertir a hora
  local, corriendo el historial un día hacia atrás. El ADR fija además la
  convención: **`-Date` = fecha de calendario, `-At` = instante**; y que
  `execution_date` debe ser `date` en Supabase, no `timestamptz`.
- **`CONTEXT.md` ya fue actualizado** en la sesión de grilling con el término
  **Cash Impact** (cambio sin commitear).
- El cambio de iconos del picker de add-movement es un **efecto colateral
  deliberado** de esta feature, no un daño colateral: unifica la identidad del
  tipo de movimiento en un solo lugar.
