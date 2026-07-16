# Pulso — Stock Detail UX Spec (`/stock/[ticker]`)

> Sesion grill-with-docs. La pantalla vive en `app/stock/[ticker].tsx` (hoy stub
> de 23 lineas con `ThemedView`/`ThemedText`) y **la navegacion ya existe**: tanto
> Home (`app/(tabs)/index.tsx:27`) como Portafolio (`app/(tabs)/holdings.tsx:33`)
> ya hacen `router.push('/stock/${ticker}')`.
>
> **Nota de historial:** una sesion previa (2026-07-13) dejo en este mismo archivo
> un spec de la **Pantalla B** (la version de "toda la vida del ticker", con
> Realizado + Dividendos + Comisiones + Retorno total). En esta sesion el usuario
> **pivoteo a la Pantalla A** ("empezar simple, y si recibo feedback agrego") y
> agrego una funcion nueva: **marcar cada compra con color segun si fue cara o
> barata vs. el precio de hoy**. Este doc reemplaza aquel. El spec B queda en el
> historial de git.
>
> El mockup a mano del usuario acerto la **estructura** (hero de precio -> tarjeta
> de posicion -> lista de movimientos) y se conserva. Lo que cambio esta marcado
> **"(cambio vs mockup)"**, siempre por una razon trazable al glosario o al motor.
>
> Esta sesion **no toca `CONTEXT.md`**: no se resolvio ningun termino de dominio
> nuevo (la funcion de color usa conceptos que ya existen: **Average Cost**,
> **Market Value**, precio actual). La Pantalla A **no** muestra un "retorno total
> por accion", asi que el termino "Total Return of a stock" que el spec B decia
> haber agregado (y que igual nunca quedo en `CONTEXT.md`) **no hace falta**.
>
> Regla de idioma: **todos los textos de UI en espanol**, excepto los tickers.

## 1. How to use this doc

Design brief settled del detalle de una accion. De aca sale el mockup final
(Claude Design), y despues el PRD y los issues. Los terminos en negrita son del
glosario (`CONTEXT.md`).

## 2. Product thesis

La **fila** (en Home y en Portafolio) responde de un vistazo *"cuanto vale esto
y como va?"* — valor de mercado y **Net P&L** en una linea.

El **detalle** abre esa fila y responde ***"como va mi posicion en esta accion?"***
— la posicion que tengo **hoy**, desglosada: cuantas acciones, a que costo
promedio, cuanto pague, cuanto vale, cuanto gano/pierdo sin vender. Mas la lista
de cada movimiento del ticker.

Solo lectura. No se compra, ni se vende, ni se edita desde aca.

### La decision que define la pantalla

Habia dos pantallas coherentes posibles, y se eligio **A**:

| | **A — "como va mi posicion?"** | **B — "como me ha ido con esta accion?"** |
| --- | --- | --- |
| Muestra | acciones, costo promedio, costo total, valor de mercado, **Net P&L** | todo lo de A **+ Realizado, Dividendos, Comisiones, Retorno total** |
| Alcance | la posicion **de hoy** | la **vida entera** del ticker |

**Se eligio A** (*"quiero empezar simple, y si recibo feedback puedo agregar mas
info despues"*). La virtud de A: **cada cifra en pantalla responde la misma
pregunta** — todas son la posicion de hoy. B mezcla la posicion de hoy con
acumulados de por vida (dividendos, realizado), y eso obliga a mostrar los cuatro
componentes del **Total Return** para que la aritmetica no mienta. A no entra en
esa deuda.

Lo que A **corta** conscientemente:

- **Dividendos** — aunque el mensaje original los pedia ("received amount by
  dividends") y el dato existe (`totalDividends`). Entran en un v2 si se extranan.
- **Comisiones** (`totalFees`).
- **Realizado** (`realizedPnl`).
- **Un "retorno total por accion"** — no existe en A, y ademas no tendria un
  denominador honesto para un `%` (era el punto mas espinoso del spec B).

**Esto no es un chart**: no hay serie temporal ni precios historicos. Todas las
cifras salen de lo que el motor ya deriva de los movimientos, mas el precio actual.

## 3. Data source

- **Cifras**: el `ValuedHolding` del ticker, que ya sale de
  `usePortfolio().holdings` — trae `shares`, `avgCost`, `costBasis`,
  `marketValue`, `netPnl`, `netPnlPercent`, `priceAvailable`. **Ya esta todo
  calculado.** (A no usa `realizedPnl`, `totalDividends` ni `totalFees`.)
- **Precio actual**: `MOCK_PRICES[ticker]` (hoy `{ AAPL: 198.4, VOO: 458.6 }`).
  Es el unico dato que el `ValuedHolding` **no** expone, y lo necesita **dos
  veces**: para el hero, y para colorear cada compra (§7).
- **Movimientos**: `useMovementsStore().movements`, filtrados por ticker.

**No se toca el motor** (`utils/portfolio/`) ni el store. La pantalla es un
consumidor puro.

## 4. Anatomia de la pantalla

```
‹  AAPL                              <- ScreenHeader compartido (back + titulo = ticker)

  ┌────┐   PRECIO ACTUAL             <- misma forma [badge][texto] que DetailIdentity
  │AAPL│   $189.45                   <- hero, 36/800, tabular-nums
  └────┘                             <- badge = HoldingBadgePalette[badge % 4]

 ╭─ TU POSICION ───────────────────╮ <- card: surface + border + radius 20
 │                                 │
 │  ACCIONES        COSTO PROMEDIO │
 │  1.45320         $175.20        │
 │                                 │
 │  COSTO TOTAL     VALOR DE MERC. │
 │  $254.60         $275.31        │
 │  ───────────────────────────────│
 │  P&L NO REALIZADA               │
 │  +$20.71             +8.1%      │ <- verde/rojo. Unico % de la pantalla.
 ╰─────────────────────────────────╯

  Movimientos                        <- titulo de seccion

 ▎●  Compra                 $85.00  <- COMPRA: linea de color a la izquierda...
 ▎   12 oct 2023 · 0.5 acc     ↑    <- ...+ flecha. Verde: compre barato vs. hoy.
  ─────────────────────────────────
 ▎●  Compra                $170.15  <- linea roja + flecha abajo: compre caro vs. hoy.
 ▎   28 sep 2023 · 0.6 acc     ↓
  ─────────────────────────────────
    ●  Dividendo             $0.34  <- sin linea, sin flecha
       01 nov 2023
  ─────────────────────────────────
    ●  Venta                $38.40  <- sin linea, sin flecha
       15 ago 2023 · 0.2 acc
```

> Las cifras del diagrama son **ilustrativas**, no los valores reales del mock
> data. El motor manda.

**(Cambio vs mockup):**

- **Hay back button.** El mockup no tenia. Se usa el `ScreenHeader` compartido
  (`components/ui/screen-header.tsx`), el mismo de add-movement y movement detail.
  El titulo es **el ticker**, no un generico "Detalle".
- **Vuelve el badge del ticker.** El mockup lo quito. Se recupera por el mismo
  principio ya escrito en `movement-detail/receipt.tsx:8-9`: *"el badge coincide
  con la fila que el usuario toco, asi la lista y su detalle se leen como la misma
  cosa."* Es el badge del ticker (`HoldingBadgePalette[badge % 4]` — AAPL teal,
  VOO azul), el mismo de las filas de Home y Portafolio.
- **Se cae "Apple Inc."** No existe el dato. `MOCK_PRICES` es un mapa de precios y
  nada mas; no hay nombres de empresa en ninguna parte. Inventar un
  `MOCK_COMPANY_NAMES` hoy es dato especulativo para decoracion. Cuando entre un
  feed de precios real, el nombre viene gratis — **ahi se agrega, no antes.**
- **Se cae el badge "CORE ASSET".** No esta en el glosario, no esta en el motor,
  no es derivable de nada.
- **Se cae la tira de Dividendos / Comisiones / Realizado.** Es la diferencia
  entre A y B (§2).
- **Se cae "View All"** de la lista de movimientos (§8).
- **Se agrega la linea de color por compra** (§7) — no estaba en el mockup; es la
  funcion nueva de esta sesion.

## 5. El bloque de posicion

Cuatro cifras + la Net P&L, todas del `ValuedHolding`:

| Concepto | Label | Fuente |
| --- | --- | --- |
| Acciones que tengo | **Acciones** | `shares` |
| **Average Cost** | **Costo promedio** | `avgCost` |
| **Cost Basis** | **Costo total** | `costBasis` |
| **Market Value** | **Valor de mercado** | `marketValue` |
| **Net P&L** (y su %) | **P&L no realizada** | `netPnl`, `netPnlPercent` |

### Los labels del mockup estaban prohibidos por el glosario

El mockup decia **"TOTAL INVESTED"** y **"CURRENT VALUE"**. Los dos estan vetados
en `CONTEXT.md`, literalmente:

- Linea 68: *"**'Invested amount' is banned as a standalone term** — it was used
  for both **Cost Basis** and **Market Value**."* -> **nunca "Invertido"**.
- Linea 28, bajo **Market Value**: *"_Avoid_: current invested amount, **current
  value**"* -> **nunca "Valor actual"**.

Los conceptos eran correctos; los nombres, no. **"Costo total"** y **"Valor de
mercado"**.

### Si, `Costo total = Costo promedio × Acciones`

Es redundancia deliberada. El usuario ve las tres cifras y no multiplica
mentalmente; y con `Valor de mercado` al lado, el puente **"pague -> vale"** queda
legible — el mismo que Home cuenta a nivel portafolio con *"Aportado -> Vale hoy"*.
La **P&L no realizada** de abajo es exactamente esa diferencia
(`marketValue - costBasis`), y asi deja de ser magia.

### El unico % de la pantalla

`P&L no realizada` es la unica cifra con `%` (`netPnlPercent`, `= netPnl ÷
costBasis`). Numerador y denominador son **ambos de la posicion actual**, asi que
la razon significa algo. No hay ningun otro `%` en la pantalla, y no hay un
"retorno de la accion" — es justo el numero que en el spec B no tenia un
denominador honesto.

### Color

**Verde/rojo solo en `P&L no realizada`** — es la unica cifra que significa
*ganancia o perdida*. Las otras cuatro (acciones, costo promedio, costo total,
valor de mercado) son hechos neutros y van en el color de texto normal. Misma
regla que ya rige en las filas: *"green/red in Pulso mean gain/loss"*.

## 6. Estado "sin precio"

Si el ticker no tiene precio, `valueHolding` devuelve `marketValue`, `netPnl` y
`netPnlPercent` en `null` y **se niega a inventar nada** (`valuation.ts:28`:
*"never fabricated (missing-price policy 'exclude + flag')"*).

Aca el daño es mayor que en una fila, porque **el hero ES el precio**. La pantalla
**colapsa con gracia** (no muestra estructura vacia):

| Cifra | Sin precio |
| --- | --- |
| Hero (precio actual) | se reemplaza por **`Sin precio`** en `textSecondary`, mas chico que el precio — no como error |
| Valor de mercado | **se cae la celda** |
| P&L no realizada (y su %) | **se cae el bloque entero** |
| Acciones, Costo promedio, Costo total | intactas |
| Linea de color por compra (§7) | **no aparece** — sin precio actual no hay con que comparar |

La tarjeta queda con las tres cifras que **si** existen (acciones, costo promedio,
costo total): "tenes X acciones, pagaste en promedio $Y, en total $Z". Es
informacion honesta y util incluso sin precio.

> **Por que un `Sin precio` chico y no un vacio total:** quitar el hero en silencio
> se leeria como un bug — el usuario *sabe* que esa accion deberia tener precio. Un
> marcador minimo dice "no lo tenemos", no "se rompio". Es el mismo lenguaje que
> Home y Portafolio ya usan (`Sin precio` en la esquina de la fila).

La lista de movimientos se renderiza **completa**: no necesita precio (las compras
simplemente van sin linea de color).

### Nota sobre el mock data

**Hoy no hay ningun holding sin precio.** MSFT no esta en `MOCK_PRICES` pero **no**
porque le falte el precio: esta **totalmente vendido** (`lib/mock-data.ts` —
*"MSFT is absent — it was fully sold, so it holds no shares to value"*), asi que
`shares = 0` y ni siquiera es un holding (`valuation.ts:78`). Para ejercitar este
estado a mano haria falta un **cuarto ticker con acciones y sin precio** en el
mock. Queda como decision del PRD; con un feed real es raro pero posible (la API
falla, ticker nuevo), y el estado se mantiene como red de seguridad barata.

## 7. La linea de color por compra — la funcion nueva

**El problema del usuario, textual:** *"a veces no se si es buena idea vender una
accion porque no se si la compre a un precio caro o no."* La funcion marca cada
**compra** para que se vea de un vistazo cuales fueron caras y cuales baratas.

### La comparacion es contra el PRECIO ACTUAL, no contra el costo promedio

El primer impulso fue comparar cada compra contra el **costo promedio**. Se
descarto: es **circular** — el costo promedio *esta hecho de esas mismas compras*,
una compra cara empuja el promedio hacia arriba. Y no responde la pregunta, porque
no menciona el precio de hoy.

Lo que responde *"compre caro?"* es comparar la compra contra el **precio actual**:

```
signal = (precio_actual − precio_de_esa_compra) / precio_de_esa_compra
```

- `signal > 0`  -> compre **por debajo** de lo que vale hoy -> compra barata -> **verde, ↑**
- `signal < 0`  -> compre **por encima** de lo que vale hoy -> compra cara  -> **rojo, ↓**
- `|signal| <= 1%` -> compre practicamente al precio de hoy -> **neutral** (§banda)

### Es porcentaje-contra-porcentaje, NO un monto — y esto importa

Se muestra **color + flecha**, sin numero. Pero la decision de fondo es que la
señal es una comparacion de **precios**, no un monto en dolares. Razon (conecta con
`docs/adr/0001-moving-average-cost-method.md`):

- Un **`%` de precio** — "desde que compraste, la accion subio/bajo X" — es una
  afirmacion pura sobre el precio. No dice nada sobre cuantas acciones seguis
  teniendo. **Honesto siempre.**
- Un **`$`** — `(precio_actual − precio_compra) × acciones_de_esa_compra` —
  afirmaria que *esas acciones especificas siguen vivas y valen esta ganancia*.
  Pero bajo **costo promedio movil** los lotes estan licuados: cuando vendes no se
  descuenta ningun lote. La app **no sabe** si "las acciones de la compra de
  octubre" siguen ahi. Un monto mentiria sobre algo que la contabilidad no puede
  afirmar.

Por eso: la señal es "el precio de esta compra vs. el precio de hoy", y **nunca**
se presenta como "esta compra esta en ganancia". Es un dato **retrospectivo de
entrada** ("compre en buen momento?"), no un simulador de venta por lote.

### Color solo, no. Color + flecha.

El usuario propuso "una linea roja o verde". Color pelado tiene un problema
concreto: el par **rojo/verde es el peor** para el daltonismo mas comun (~8% de
los hombres) — para ellos la funcion no existe. La solucion **no** es el `%` (mas
ruido del necesario), es una **flecha** diminuta que carga el mismo significado,
redundante:

- **Linea/borde de color** al costado izquierdo de la fila (la idea original del
  usuario) — `Colors.positive` / `Colors.negative`.
- **Flecha `↑` / `↓`** chica, del mismo color, para que funcione sin depender del
  color.

### La banda neutral (±1%)

`toneOf` en la app pinta **verde** todo lo que no sea claramente negativo (umbral
`-0.005`). Eso pintaria de "compra ganadora" una compra hecha **al precio de hoy**
(0%), lo cual es falso: no fue ni cara ni barata. Para esta funcion:

- Si `|signal| <= 1%` -> **neutral**: **sin linea de color y sin flecha**. La fila
  se ve como una venta o un dividendo. "Compraste basicamente al precio de hoy" es
  su propia respuesta honesta.

### Alcance de la funcion

- **Solo filas de compra.** Ventas y dividendos no tienen "fue caro?" -> van sin
  linea y sin flecha. (Esto ademas distingue visualmente las compras.)
- **Solo con precio disponible.** Sin precio actual (§6) -> ninguna compra lleva
  linea. La funcion se degrada con el resto de la pantalla.

## 8. La lista de movimientos

Todos los movimientos del ticker (`buy`, `sell`, `dividend`), **mas nuevo
primero** — el mismo orden que el tab Movimientos (`byChronologicalDesc`:
`executionDate` desc, `createdAt` desc como desempate). Depositos y retiros no
tienen ticker y **nunca** aparecen aca.

**Mismo lenguaje visual que el tab Movimientos.** La fila es la que ya existe
(`components/movements/movement-row.tsx`), con estos ajustes:

- **El titulo pierde el ticker.** En el tab dice `"Compra AAPL"`; aca seria AAPL
  en *todas* las filas. Aca es solo **`Compra`**, **`Venta`**, **`Dividendo`**.
- **Se agrega el numero de acciones**, junto a la fecha: `12 oct 2023 · 0.5 acc`.
  En una pantalla por-accion es el dato mas valioso de la fila — es la posicion
  construyendose y deshaciendose. Solo en compra y venta; el dividendo no tiene
  acciones.
- **Las compras llevan la linea de color + flecha** (§7). Ventas y dividendos no.

**Se conservan las dos convenciones que ya estan escritas en el codigo**, y el
mockup rompia las dos:

- **Sin chevron** (`movement-row.tsx:9-11`: *"No chevron: the Home asset rows
  navigate the same way without one, and a chevron per row would be noise down a
  long history"*). El mockup tenia `›` en cada fila.
- **Monto sin signo y sin color** (`movements/view-model.ts:58-61`: *"It carries
  no sign and no colour: the sign is fully derivable from the type, and green/red
  in Pulso mean gain/loss — a buy is neither"*). El mockup pintaba el dividendo de
  verde con `+$0.34`.

> Ojo: la linea de color de §7 **no** contradice esto. El **monto** de la fila
> sigue sin signo y sin color. Lo que se colorea es una **marca aparte** (la linea
> al borde) cuyo significado es *"esta compra fue cara o barata vs. hoy"*, no el
> monto. Son dos cosas distintas en la misma fila.

**Cada fila navega a `/movement/{id}`** — el recibo que ya existe.

**Sin "View All".** El mockup lo tenia, pero no lleva a ningun lado: el tab
Movimientos filtra por **tipo**, no por ticker, asi que no existe un destino
"todos los movimientos de AAPL". Y un historial por-accion es corto. Se muestra
completo y la pantalla scrollea.

## 9. Posiciones cerradas: fuera de alcance

**El detalle es solo para acciones que tenes.** Si `shares === 0` (o el ticker no
existe), la pantalla muestra un **`not-found`** seco, igual que `movement/[id]`.

Es inalcanzable tocando (ni Home ni Portafolio listan posiciones cerradas —
`valuation.ts:78` las filtra con `if (facts.shares > 0)`), pero la ruta es
deep-linkable, asi que la rama existe.

**Consecuencia aceptada:** una accion **totalmente vendida** (MSFT, en el mock)
tiene una historia que el motor **si** calcula, y que la app **no muestra en
ninguna pantalla**. Recuperarla necesitaria **una puerta** (una seccion
"Posiciones cerradas" en Portafolio, o hacer tocable el ticker de una fila de
movimiento) — fuera de alcance de este spec.

## 10. Formato y convenciones

- Moneda: `formatUSD` / `formatSignedUSD` (`+$20.71`, `-$4.20`). **Guion ASCII**
  (`-`), nunca U+2212 — ver `CLAUDE.md`.
- Porcentaje: `formatSignedPercent` (`+8.1%`). **Solo en P&L no realizada.**
- Acciones: `formatShares` (numero pelado, `1.45320`) en la tarjeta de posicion,
  donde la etiqueta ya dice "Acciones". En la **fila de movimiento** lleva sufijo
  (`0.5 acc`, `formatSharesLabel`), porque ahi va suelto junto a la fecha.
- Fecha: `formatDate` (`15 ene 2025`), siempre `executionDate` (`ADR-0004`).
- Todo numero: `fontVariant: ["tabular-nums"]`.
- Tono de signo: la convencion repetida en los view-models — `negative` solo
  pasado `-0.005`. **Excepcion: la banda neutral de la linea de compra es ±1%**
  (§7), no el umbral de signo.
- Textos de UI en espanol; **tickers sin traducir**.

## 11. Arquitectura de modulos (para el PRD)

Espejo del patron ya establecido en `movement-detail`: **view-model puro +
componentes tontos + vitest sobre el view-model**.

- **View-model puro** — `buildStockDetailView(ticker, holding | undefined, price,
  movements)`. Encapsula toda la politica: los estados, los labels, el colapso sin
  precio, la señal de color por compra (con la banda ±1%), y el formateo. Unico
  modulo con logica y unico testeado.
- **Componentes presentacionales** — identidad (badge + hero), tarjeta de
  posicion, lista.
- **Se reusa `ScreenHeader`** y **se reusa `MovementRow`** (con dos campos
  opcionales aditivos: `sharesLabel` para la fecha, y `buyTone` para la linea de
  color; el tab Movimientos no se toca — no pasa esos campos).
- **`app/_layout.tsx`**: `stock/[ticker]` pasa a `headerShown: false` (hoy declara
  un header nativo con titulo `"Stock Detail"`, en ingles).
- **No se toca `utils/portfolio/`** ni el store.

Forma indicativa (naming libre, camelCase):

```ts
type BuyTone = "up" | "down" | "neutral"; // linea de color de la compra

interface StockDetailView {
  state: "found" | "not-found";
  ticker: string;
  badge: number;                    // indice en HoldingBadgePalette
  price: string | null;             // null => "Sin precio"
  position: {
    shares: string;                 // siempre presente
    avgCost: string;                // siempre presente
    costBasis: string;              // siempre presente
    marketValue: string | null;     // null sin precio => celda se cae
    netPnl: string | null;          // null sin precio => bloque P&L se cae
    netPnlPercent: string | null;
    netPnlTone: Tone;
  } | null;                         // null solo si state = "not-found"
  rows: StockMovementRow[];         // fila del tab, sin ticker en el titulo
}

interface StockMovementRow extends MovementRow {
  sharesLabel: string | null;       // "0.5 acc" en compra/venta; null en dividendo
  buyTone: BuyTone | null;          // solo en compras con precio; null en el resto
}
```

**Invariantes que los tests deben fijar:**

1. **`buyTone` solo en compras.** Ventas y dividendos -> `buyTone === null`
   siempre.
2. **`buyTone` respeta la banda ±1%.** `precio_compra` un 5% bajo el actual ->
   `"up"`; 5% arriba -> `"down"`; dentro de ±1% -> `"neutral"`. Fijar el borde
   exacto (1.0% cae en neutral).
3. **Sin precio** -> `price`, `marketValue`, `netPnl*` son `null`; `shares`,
   `avgCost`, `costBasis` sobreviven; **toda** compra tiene `buyTone === null`.
4. **`shares === 0` o ticker inexistente** -> `state: "not-found"`.
5. **El unico `%` es el de P&L no realizada.** Un test que asserte que ninguna
   otra cifra emitida contiene `%` (no hay "retorno total por accion").
6. Las filas **no** contienen el ticker en el titulo; compra/venta llevan
   `sharesLabel`, el dividendo no.

## 12. Settled decisions (recap)

1. **Pantalla A**: la posicion de hoy, simple. Empezar chico y agregar con
   feedback.
2. **Sin chart.** Todo sale de acumulados + precio actual, no de serie temporal.
3. Labels: **"Costo total"** y **"Valor de mercado"** — nunca "Invertido" ni
   "Valor actual" (prohibidos por el glosario).
4. **El unico `%` es el de P&L no realizada** (`÷ costBasis`). No hay retorno por
   accion — no tendria denominador honesto.
5. Verde/rojo **solo** en P&L no realizada.
6. **Se cortan Dividendos, Comisiones, Realizado y el retorno total** — son la
   diferencia con B; entran en v2 si se piden.
7. **Linea de color + flecha por compra** (§7): compara contra el **precio
   actual** (no el promedio), es **porcentaje-de-precio** (no monto, por
   ADR-0001), se muestra como **color + flecha** (no numero, por accesibilidad),
   con **banda neutral ±1%**, **solo en compras** y **solo con precio**.
8. **Sin precio** -> cae el hero (queda `Sin precio` chico), el valor de mercado y
   el bloque de P&L; sobreviven acciones/costo promedio/costo total; las compras
   van sin linea.
9. **Solo posiciones abiertas.** `shares === 0` -> `not-found`.
10. Filas de movimiento: **mismo lenguaje que el tab** (sin chevron, sin signo,
    sin color en el monto), **sin ticker en el titulo**, **con acciones** junto a
    la fecha.
11. **Sin "View All"**: la lista va completa.
12. **Sin nombre de empresa** y **sin badge "CORE ASSET"**: no existe el dato.
13. **Badge del ticker** arriba, el mismo de la fila que tocaste.

## 13. Out of scope (this spec)

- **Dividendos, Comisiones, Realizado, retorno total por accion** (la Pantalla B).
  Primer candidato a v2 si el usuario los extrana.
- **Chart de precio / serie temporal.** No hay precios historicos en el modelo.
- **Nombre de empresa.** Entra cuando entre un feed real de precios, gratis.
- **Posiciones cerradas** y su puerta de entrada (§9).
- **Comprar/vender/editar** desde esta pantalla.
- **Cambiar el tab Movimientos** para pintar dividendos de verde, o para colorear
  compras. La linea de color vive **solo** en el detalle por ahora.
- Cambiar el motor (`utils/portfolio/`) o el store.
