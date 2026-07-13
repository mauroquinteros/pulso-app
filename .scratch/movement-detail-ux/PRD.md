# PRD — Movement Detail (`/movement/[id]`)

> Fuente: `.scratch/movement-detail-ux/UX.md` (design brief settled) + el prototipo
> `.scratch/movement-detail-ux/stock-portfolio-design-prototype/` (verdad visual
> pixel-perfect). El prototipo **confirma** cada decisión del grilling — trae ya
> escrito `buildMovementDetailView(movement | undefined)` con la forma exacta que
> especificamos — y **refina tres decisiones visuales** que el UX.md había asumido
> mal (ver Further Notes). Donde el prototipo contradice al UX.md, **manda el
> prototipo**. Términos en negrita = glosario (`CONTEXT.md`).

## Problem Statement

El usuario ya ve su historial completo en el tab **Movimientos**: cada fila le
dice qué hizo, cuándo, y cuánto movió su efectivo (el **Cash Impact**).

Pero la fila deja una pregunta abierta: ***"¿de dónde sale ese número?"***. Una
compra dice `$447.86` — ¿cuánto fue el precio, cuántas acciones, cuánto se llevó
la comisión? Un dividendo dice `$12.95` — ¿cuánto fue el bruto y cuánto retuvo
el impuesto? Un depósito dice `$3,000.00` — ¿cuánto salió realmente de mi banco?

Hoy no hay forma de saberlo: las filas ni siquiera son tocables, y
`app/movement/[id].tsx` es un stub. Los **Fees** que erosionan el **Total
Return** existen en el modelo, pero el usuario **nunca los ve**.

## Solution

Tocar una fila abre el **recibo** de ese movimiento: un desglose de solo lectura
que descompone la cifra de la fila en sus partes.

Un solo patrón para los cinco tipos: **base → ajustes firmados → total**. El
recibo **termina exactamente en el número que tocaste** en la lista: descompone
esa cifra en sus partes y vuelve a ella. El detalle nunca contradice a la lista.

Los operadores `+` / `−` son explícitos, porque la misma "Comisión" **suma** en
una compra y **resta** en una venta.

## User Stories

1. As a Pulso user, I want to tap a movement in my history, so that I can see what it was made of.
2. As a Pulso user, I want the row to respond to my tap, so that I know it is interactive.
3. As a Pulso user, I want a back button that returns me to the list, so that browsing my history is reversible.
4. As a Pulso user, I want the detail screen to look like the rest of the app, so that it feels like one product.
5. As a Pulso user, I want the detail's header to show the movement's badge, type and ticker, so that I can tell at a glance which movement I opened.
6. As a Pulso user, I want the header's badge to match the icon and colour of the row I tapped, so that the row and its detail read as the same thing.
7. As a Pulso user, I want the header to show the date the movement was executed, so that I can place it in time.
8. As a Pulso user, I want cash movements to show just their type (no phantom ticker), so that nothing implies a position that does not exist.
9. As a Pulso user opening a buy, I want to see how many shares I bought and at what price, so that I can verify the trade I recorded.
10. As a Pulso user opening a buy, I want to see the **Gross Amount** before the commission, so that I know what the shares themselves cost.
11. As a Pulso user opening a buy, I want to see the commission that was added, so that I know what the trade really cost me.
12. As a Pulso user opening a buy, I want a "Total pagado" that closes the receipt, so that I know the final figure that left my **Cash**.
13. As a Pulso user opening a sell, I want to see shares, price and **Gross Amount**, so that I can verify the trade.
14. As a Pulso user opening a sell, I want to see the commission *and* the regulatory fees deducted separately, so that no cost is hidden inside another.
15. As a Pulso user opening a sell, I want a "Total recibido" that closes the receipt, so that I know what actually reached my **Cash**.
16. As a Pulso user opening a dividend, I want to see the **Gross Amount** declared and the tax withheld, so that I understand why I received less than the headline.
17. As a Pulso user opening a dividend, I want a "Total recibido" equal to my **Net Dividends**, so that the figure matches what hit my account.
18. As a Pulso user opening a deposit, I want to see the "Total transferido" that actually left my bank, so that I know my true out-of-pocket for funding the account.
19. As a Pulso user opening a deposit, I want to see the transfer fee deducted from it, so that I can see the cost of funding my account.
20. As a Pulso user opening a deposit, I want the receipt to close on the cash that landed in my account, so that the total matches the amount I tapped in the list.
21. As a Pulso user opening a withdrawal, I want to see the "Recibido en banco" that actually reached me, so that I can reconcile it against my bank statement.
22. As a Pulso user opening a withdrawal, I want the receipt to close on the cash that left my account, so that the total matches the amount I tapped in the list.
23. As a Pulso user, I want every movement's total to be the same figure I tapped in the list, so that the two screens never contradict each other.
24. As a Pulso user, I want every deduction line to carry a `−` and every addition line a `+`, so that I never have to guess whether a line adds to or subtracts from the total.
25. As a Pulso user, I want the base line and the total to carry no sign, so that only the adjustments draw my attention.
26. As a Pulso user, I want the lines I see to add up exactly to the total I see, so that I can check the arithmetic myself and trust it.
27. As a Pulso user, I want amounts in a consistent currency format with thousands separators and tabular numerals, so that the column aligns and compares cleanly.
28. As a Pulso user, I want share counts shown as a plain number, so that the row does not repeat the word "Acciones" that already labels it.
29. As a Pulso user, I want the minus sign to be a proper minus, not a hyphen, so that the numbers look typeset rather than typed.
30. As a Pulso user, I want no green or red on this screen, so that colour keeps meaning gain and loss — a purchase is neither.
31. As a Pulso user, I want no giant amount at the top, so that the total I tapped is shown once, as the receipt's conclusion, rather than twice.
32. As a Pulso user, I want the total anchored at the bottom of the screen, so that the receipt's conclusion is unmistakable.
33. As a Pulso user, I want the date shown to be exactly the day I selected when recording the movement, so that no timezone conversion shifts it.
34. As a Pulso user, I never want to see when the record was created, so that the screen tells me about the movement, not about the database.
35. As a Pulso user who somehow opens a movement that does not exist, I want a plain message rather than a blank or broken screen, so that the app never looks broken.
36. As a Pulso user, I want every UI text in Spanish (tickers untranslated), so that the app speaks one language.
37. As a Pulso developer, I want the back button and title of this screen to be the same component the add-movement forms use, so that headers cannot drift apart across the app.
38. As a Pulso developer, I want the detail's total to reuse the engine's Cash Impact rather than reimplement it, so that the list and the detail cannot drift apart.
39. As a Pulso developer, I want the receipt's arithmetic to be provably self-consistent, so that a rounding edge case can never show a total that contradicts the lines above it.

## Implementation Decisions

### Data source

El movimiento se busca por `id` en el store de movimientos. **No se toca el
motor** (`utils/portfolio/`) ni el store — ver la decisión de redondeo, que es
donde eso se pone interesante.

### Movement detail view-model (módulo profundo, el único con lógica)

Función pura `buildMovementDetailView(movement | undefined)`. Encapsula toda la
política — qué líneas lleva cada tipo, sus labels, los operadores, la derivación
del bruto, y el estado `not-found` — detrás de una interfaz estable. Los
componentes la renderizan verbatim.

**Reusa `cashImpact` del motor** para el total: no reimplementa esa fórmula, la
importa. Es lo que hace imposible que la lista y el detalle divergan.

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

El view-model **no emite colores ni iconos**: emite el `type`, y el componente
resuelve la identidad visual desde la fuente única creada en la feature de
movimientos.

### El recibo, por tipo

Un solo patrón: **base → ajustes firmados → total**. Y en los cinco tipos, **el
total ES el Cash Impact** — el mismo número que muestra la fila de la lista. El
detalle **nunca** puede contradecir a la lista. Cifras reales del mock:

| Tipo | `facts` | `money` | `total` (= Cash Impact) |
| --- | --- | --- | --- |
| Compra | Acciones `2.45321`, Precio de ejecución `$182.50` | Monto bruto `$447.71`, Comisión `+$0.15` | **Total pagado** `$447.86` |
| Venta | Acciones `3`, Precio de ejecución `$195.50` | Monto bruto `$586.50`, Comisión `−$0.15`, Tarifas regulatorias `−$0.03` | **Total recibido** `$586.32` |
| Dividendo | — | Monto bruto `$18.50`, Impuesto `−$5.55` | **Total recibido** `$12.95` |
| Depósito | — | Total transferido `$3,003.99`, Comisión de transferencia `−$3.99` | **Efectivo agregado** `$3,000.00` |
| Retiro | — | Recibido en banco `$499.00`, Comisión `+$1.00` | **Efectivo retirado** `$500.00` |

**Depósito y retiro llevan la aritmética invertida.** En los otros tres la base es
el bruto y el total es lo que tocó el efectivo; acá la base es la cifra de la
**frontera del banco** y el total es el efectivo. Se lee natural: *"transferí
$3,003.99 desde mi banco, $3.99 se lo llevó la comisión, y me quedaron $3,000 de
efectivo."*

Esa inversión es lo que permite que el total sea el **Cash Impact** *sin*
degenerar el recibo. La alternativa —cerrar en el Cash Impact y mandar la comisión
a una nota al pie— dejaría un recibo de **una sola línea**: si el total es
`$3,000.00`, una comisión de `$3.99` no suma a nada, y una línea con operador que
no afecta al total es peor que no tenerla. Así, los cinco tipos conservan el mismo
patrón, la comisión sigue siendo una línea real con su operador, y la cifra del
banco queda **visible y etiquetada** en vez de escondida.

### Operadores `+` / `−` en las líneas de ajuste

La misma "Comisión" **suma** en Compra y Depósito, y **resta** en Venta, Retiro y
Dividendo. La dirección **no es derivable del label** — depende de si el total es
*lo que pagas* o *lo que recibes*. Por eso el operador es explícito.

**Esto no contradice la decisión de la lista** (donde el monto va sin signo).
Allá el signo era 100% derivable del tipo → redundante → ruido. Acá **no es
derivable** → es la información que falta → señal. Mismo principio, conclusión
opuesta.

- Solo las **líneas de ajuste** llevan operador. La **base y el total van sin
  signo**, como en la lista.
- Las **líneas de datos** (acciones, precio) nunca llevan operador: no son
  aritmética.
- El menos es **U+2212** (`−`), la convención de la app, nunca un guion ASCII.
- **Sin color.** Nada acá es ganancia ni pérdida.

### Redondeo: el total ES el Cash Impact; el "Monto bruto" se DERIVA de él

**La decisión menos obvia del PRD. Está medida, no supuesta.**

El recibo debe cumplir **dos cosas a la vez** — las dos que el usuario puede
verificar por su cuenta:

1. **El total = el número de la fila** (el **Cash Impact**), o el detalle
   contradice a la lista.
2. **Las líneas suman el total**, o el usuario suma con el dedo y no le da.

El obstáculo: existen **dos brutos** — el que el motor usa (`executionPrice ×
shares`, crudo: `8,821.705`) y el que `round2` daría (`8,821.71`). Mostrar
`round2(precio × acciones)` **y** un total salido del Cash Impact **no cuadra**:

```
Compra: 10.975 acciones × $803.80, comisión $0.88
  Monto bruto     $8,821.71     ← round2(precio × acciones)
  Comisión           +$0.88
  ─────────────────────────
  Total pagado    $8,822.58     ← del Cash Impact... pero 8,821.71 + 0.88 = 8,822.59  ✗
```

**Frecuencia medida por fuzzing: 10 de 500,000 (0.002%).** Raro, pero el fallo es
visible **dentro de una misma pantalla**.

**Decisión: el total es `cashImpact` siempre, y el "Monto bruto" mostrado se
deriva de él** — no se calcula como `precio × acciones`:

```
Compra:  bruto mostrado = total − comisión
Venta:   bruto mostrado = total + comisión + tarifas regulatorias

  Monto bruto     $8,821.70     ← derivado: 8,822.58 − 0.88
  Comisión           +$0.88
  ─────────────────────────
  Total pagado    $8,822.58     ✓ cuadra, y es el mismo número de la lista
```

Se cumplen **las dos** condiciones, por construcción. El centavo inevitable cae en
el lugar **más difícil de ver**: en ese 0.002%, el "Monto bruto" queda 1¢ debajo
de `precio × acciones`. Notarlo exige multiplicar `10.975 × $803.80` a mano —
mucho más rebuscado que sumar dos números en pantalla.

**Solo aplica a compra y venta**, los únicos tipos donde el bruto se *calcula*. En
dividendo, depósito y retiro los campos ya vienen exactos a 2 decimales.

**Por qué NO se arregla en el motor.** La alternativa "de raíz" era redondear el
bruto una vez al nacer el movimiento (*"liquidar en centavos"*, como hace un
bróker real). Se descartó: exigiría cambiar `cashImpact` **y** el reducer a la
vez. Se probó cambiar solo `cashImpact`, y **el invariante de reconciliación se
rompe** — medido:

```
tres compras de 10.975 × $803.80:
  cashImpact redondeando cada una:  round2(8821.705) × 3 = 26,465.13
  el reducer redondeando la suma:   round2(8821.705 × 3) = 26,465.12
                                                           ──────────
  delta: −0.01  →  Cash + Market Value deja de cuadrar con Aportado + Total Return
```

`Σround2(x) ≠ round2(Σx)`. Mezclar "redondea temprano" y "redondea tarde" en el
mismo motor es peor que cualquiera de los dos. El motor conserva su política de
redondear al agregar; el recibo se acomoda a ella derivando su bruto.

> **El "Monto bruto" NO es `round2(executionPrice × shares)`.** Se deriva del
> total. Si lo "arreglas" para calcularlo directo, el recibo deja de cuadrar en el
> 0.002% de los casos — **y los tests con datos limpios seguirán pasando**. Hay un
> test con el caso adversario (`10.975 × $803.80`) que es el cable trampa.

### Header compartido (extracción)

El header del prototipo — botón back circular + título — es **idéntico** al que
ya usan los cinco formularios de add-movement. Se **extrae a un componente
compartido** y lo consumen ambos: los formularios y el detalle. Una sola fuente
de verdad, igual que se hizo con la identidad del tipo de movimiento.

El `Stack` deja de dibujar su header nativo para esta ruta (hoy declara el título
en inglés, `"Movement Detail"`). El título es **"Detalle"** — corto, y no duplica
el "Compra AAPL" que ya está en el cuerpo.

### Pantalla

- **Sin monto grande arriba (sin hero numérico).** El número que tocaste en la
  lista **es el total anclado al fondo**: el recibo lo descompone y termina en él.
  Un hero solo lo mostraría dos veces en una pantalla muy corta — redundancia, no
  jerarquía.
- **Encabezado de identidad**: badge del tipo (52×52, más grande que el 40×40 de
  la lista), label + ticker, y fecha debajo.
- **Sin card.** Las líneas van sueltas sobre el fondo, separadas por hairlines de
  1px; la primera sin borde superior. `facts` y `money` se renderizan como **una
  sola lista continua** (la primera línea de `money` no lleva borde si no hubo
  `facts`).
- **El total va anclado al fondo de la pantalla**, empujado por el espacio libre,
  con su propio borde superior y tipografía más pesada.
- **`not-found`**: un mensaje seco, centrado — "No encontramos este movimiento".
  Sin ilustración y sin CTA.

### La lista se vuelve tocable (revierte una decisión previa)

La feature de movimientos hizo las filas **deliberadamente NO tocables**, y lo
dejó escrito en el código: *"a control that looks tappable but does nothing is
worse than a plain row"*. Esa razón desaparece con este PRD.

La fila pasa a ser `Pressable` y navega al detalle. **Sin chevron**, copiando el
patrón que ya usa Home: sus filas de activos navegan a `/stock/[ticker]` sin
chevron. Un chevron por fila en un historial largo es ruido visual.

### Fecha

`executionDate`, nunca `createdAt` — igual que la lista, y por lo mismo
(`ADR-0004`): es una **fecha de calendario**, no un instante, y no se convierte
de zona horaria. Reusa el formateador español que ya existe.

## Testing Decisions

- Un buen test ejercita **comportamiento externo** del módulo puro: dado un
  `Movement`, se afirma sobre el `MovementDetailView` resultante (labels,
  operadores, strings formateados, estados) — nunca sobre detalles internos ni
  sobre render de React Native.
- **Se testea únicamente el view-model** (vitest, sin React Native), igual que en
  Home, Portafolio y Movimientos. Los componentes (header, filas del recibo,
  not-found) son presentacionales y quedan sin tests. No se agrega
  `@testing-library/react-native` al repo.
- Casos:
  - **Un recibo completo por tipo** (los cinco), con las cifras del mock:
    `facts`, `money` y `total` exactos, incluyendo los labels.
  - **Operadores**: `+` en compra y retiro; `−` en venta, dividendo y depósito.
    La base y el total **sin signo**.
  - **El menos es U+2212**, nunca un guion ASCII (prior art: los tests del
    view-model de Home ya afirman esto sobre `formatSignedUSD`).
  - **Título** con ticker (`Compra AAPL`) y sin ticker (`Depósito`).
  - **`facts` vacío** para dividendo, depósito y retiro.
  - **`not-found`** cuando el movimiento es `undefined`.
  - **Fecha** en español con año (`15 ene 2025`), sin correrse de día.
- **Los dos invariantes** son el corazón de esta suite. Ambos se afirman
  **parseando los strings que el view-model emite**, no recalculando por dentro:
  1. **El recibo cuadra** — la suma de las líneas mostradas es siempre igual al
     total mostrado.
  2. **El total es el Cash Impact** — el total mostrado es siempre
     `formatUSD(|cashImpact(movement)|)`, el mismo string que muestra la fila.
- **El caso adversario es obligatorio**: `10.975 × $803.80` con comisión `$0.88`.
  Es el único que distingue la implementación correcta de la ingenua — el detalle
  debe mostrar bruto `$8,821.70` y total `$8,822.58`, no el `$8,821.71` que daría
  `round2(precio × acciones)`. **Con los datos limpios del mock, la implementación
  ingenua también pasaría**; por eso este caso es el cable trampa.
- **Prior art:** los tests del view-model de Movimientos y de Portafolio (misma
  forma: función pura in/out, tabla de casos), y el test del invariante
  `Σ cashImpact === computeCash` del motor de efectivo — este PRD añade los
  invariantes hermanos, del lado de la presentación.

## Out of Scope

- **Editar y borrar** movimientos. (Al no haber borrado, el estado `not-found` es
  casi inalcanzable; existe solo porque el compilador obliga a manejar la rama.)
- **Compartir o exportar** el recibo.
- **Navegar al stock** desde el detalle de una compra/venta/dividendo — la
  pantalla `/stock/[ticker]` sigue siendo un stub.
- **Liquidar en centavos en el motor.** Queda descartado, con la medición que lo
  justifica. Si algún día se retoma, hay que cambiar `cashImpact` **y** el reducer
  a la vez, con un bruto compartido, y sería un ADR.
- **Mostrar `createdAt`** al usuario (prohibido por `ADR-0004`).
- Cambiar el motor (`utils/portfolio/`) o el store.
- Precios reales (el mock sigue siendo el swap-point).

## Further Notes

- El prototipo HTML es la **referencia visual** (dimensiones, pesos, colores,
  microcopy); este PRD no duplica esos valores.
- **El prototipo confirma cada decisión del grilling** — trae ya implementada
  `buildMovementDetailView(movement | undefined)` con la forma exacta que se
  especificó, los labels, los operadores y el `−` U+2212. Pero **refinó tres
  decisiones visuales** que el `UX.md` había asumido mal, y en las que manda el
  prototipo: (1) **header propio**, no el nativo del `Stack`; (2) **sin card** —
  filas planas con hairlines; (3) **total anclado al fondo** de la pantalla, no
  pegado a las líneas.
- **`CONTEXT.md` ya fue actualizado** en la sesión de grilling con el término
  **Gross Amount** ("Monto bruto"). Faltaba: el glosario ya *prohibía* "monto" a
  secas bajo **Cash Impact**, pero nunca definía su reemplazo — y esa laguna es la
  que llevó a proponer "Subtotal" y luego "Monto" durante el diseño.
- **El total del recibo cambió de criterio a mitad del diseño**, y vale registrar
  por qué. La primera decisión fue que cada tipo cerrara en su cifra "del mundo
  real" (depósito en `$3,003.99`), aceptando que **no** coincidiera con el Cash
  Impact de la fila (`$3,000.00`). Se revirtió: que la lista y el detalle muestren
  números distintos para el mismo movimiento erosiona la confianza más de lo que
  aporta la fidelidad de una línea. La cifra del banco **no se perdió** — pasó a
  ser la *base* del recibo en vez del *total* (la aritmética invertida), así que
  sigue visible y etiquetada.
- **No se propone ADR.** La decisión de redondeo se consideró, pero no califica:
  es una decisión de presentación dentro de un view-model, fácil de revertir. Su
  razonamiento y su medición quedan aquí y en el `UX.md`, que es donde un futuro
  lector los buscará.
- La extracción del header compartido es un **efecto colateral deliberado** de
  esta feature, no daño colateral: unifica el header de pantalla en un solo lugar,
  igual que la feature de movimientos unificó la identidad del tipo.
