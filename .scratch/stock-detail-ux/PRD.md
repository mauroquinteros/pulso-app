# PRD — Stock Detail (`/stock/[ticker]`)

> Fuente: `.scratch/stock-detail-ux/UX.md` (spec settled — **Pantalla A**, sesión
> 2026-07-15) y el prototipo
> `.scratch/stock-detail-ux/stock-portfolio-design-prototype/` como referencia
> visual. Este PRD fija los contratos de módulos y las políticas que el
> prototipo no muestra. Términos en negrita = glosario (`CONTEXT.md`).
>
> **Update post-feedback (2026-07-16):** tras ver la Pantalla A construida, el
> usuario definió que el diseño final SÍ incluye la vida entera del ticker: la
> tarjeta suma **Dividendos** (**Net Dividends**, magnitud sin signo),
> **Realizado** (**Realized P&L**, con signo y tono, oculto si es 0),
> **Comisiones** (**Fees**, magnitud sin signo) y el **Retorno total** (**Total
> Return of a stock**, con signo y tono, **nunca con %** — glosario). Sin
> precio cae el bloque de retorno ENTERO (nunca un retorno parcial). Esto
> reincorpora lo que la sección "Out of Scope" cortaba de la Pantalla B; el
> resto del PRD sigue vigente.

## Problem Statement

El usuario ya puede tocar una acción desde Home o desde Portafolio, pero la
pantalla de destino es un stub que solo imprime el ticker. No hay forma de ver
la posición desglosada: cuántas acciones tiene, a qué costo promedio, cuánto
pagó en total, cuánto vale hoy y cuánto va ganando sin vender. Tampoco puede
ver el historial de movimientos de esa acción en un solo lugar.

Y hay un problema más puntual, en palabras del usuario: *"a veces no sé si es
buena idea vender una acción porque no sé si la compré a un precio caro o no"*.
Hoy no hay ninguna vista que le diga, compra por compra, si entró caro o barato
respecto del precio actual.

## Solution

El detalle de una acción responde ***"¿cómo va mi posición en esta acción?"***
— la posición de **hoy**, desglosada, más el historial del ticker:

1. **Identidad + hero**: badge del ticker (el mismo de la fila que tocó) y el
   **precio actual** como cifra protagonista.
2. **Tarjeta "Tu posición"**: Acciones, **Costo promedio** (**Average Cost**),
   **Costo total** (**Cost Basis**), **Valor de mercado** (**Market Value**) y
   la **P&L no realizada** (**Net P&L**) en $ y % — el único porcentaje de la
   pantalla.
3. **Lista de movimientos del ticker** (compras, ventas, dividendos, más nuevo
   primero), con el mismo lenguaje visual del tab Movimientos, y la función
   nueva: **cada compra lleva una línea de color + flecha** que dice de un
   vistazo si fue cara (rojo, ↓) o barata (verde, ↑) contra el precio actual,
   con banda neutral ±1%.

Solo lectura: no se compra, ni se vende, ni se edita desde acá. Sin precio
disponible, la pantalla colapsa con gracia (cae el hero, el valor de mercado y
la P&L; sobreviven las cifras de costo). Posiciones cerradas (`shares === 0`)
muestran not-found. Toda la UI en español, tickers sin traducir.

## User Stories

1. As a Pulso user, I want to tap an asset row in Home or Portafolio and land on that stock's detail screen, so that I can drill into a position I already track.
2. As a Pulso user, I want the screen header to show the ticker with a back button, so that I always know which stock I'm looking at and can return to where I came from.
3. As a Pulso user, I want the ticker badge on the detail to match the badge of the row I tapped, so that the list and its detail read as the same thing.
4. As a Pulso user, I want the current price as the hero figure of the screen, so that the most volatile number is the first thing I see.
5. As a Pulso user, I want a position card showing how many shares I hold, so that I know the size of my position.
6. As a Pulso user, I want to see my **Average Cost** labeled "Costo promedio", so that I know the average price I paid per share.
7. As a Pulso user, I want to see my **Cost Basis** labeled "Costo total", so that I know how much money I put into the shares I still hold.
8. As a Pulso user, I want to see the **Market Value** labeled "Valor de mercado" next to my cost, so that the "pagué → vale" bridge is readable at a glance.
9. As a Pulso user, I want the unrealized **Net P&L** in dollars and percent with green/red tone, so that I know how much I gain or lose if I don't sell.
10. As a Pulso user, I want the P&L percent to be the only percentage on the screen, so that no number implies a "stock return" that the accounting can't honestly compute.
11. As a Pulso user, I want green/red reserved for the P&L figure only, so that neutral facts (shares, costs, market value) don't masquerade as gains or losses.
12. As a Pulso user, I want every movement of this ticker listed below the position (buys, sells, dividends), newest first, so that I can trace how the position was built.
13. As a Pulso user, I want each movement row to omit the ticker in its title, so that a per-stock screen doesn't repeat the obvious on every row.
14. As a Pulso user, I want buys and sells to show their share count next to the date, so that I see the position building up and unwinding movement by movement.
15. As a Pulso user, I want each buy marked with a colored line and a small arrow telling me if I bought below (green ↑) or above (red ↓) today's price, so that I can judge which entries were cheap or expensive before deciding to sell.
16. As a Pulso user, I want buys made at essentially today's price (within ±1%) to carry no line and no arrow, so that a neutral entry isn't painted as a win or a loss.
17. As a color-blind Pulso user, I want the arrow to carry the same meaning as the line color, so that the feature works without depending on red vs green.
18. As a Pulso user, I want sells and dividends to carry no line and no arrow, so that the cheap/expensive question is only asked where it makes sense.
19. As a Pulso user, I want movement amounts without sign and without color, so that the rows speak the same language as the Movimientos tab.
20. As a Pulso user, I want to tap a movement row and open its receipt, so that I can see the full detail of any past movement.
21. As a Pulso user, I want the full history shown without a "View All" link, so that I never hit a dead end (there is no per-ticker destination elsewhere).
22. As a Pulso user, I want the screen to scroll as one piece with safe areas respected, so that a long history never hides content behind system UI.
23. As a Pulso user whose stock has no current price, I want a small "Sin precio" marker instead of the hero, so that I read "we don't have it" instead of "it broke".
24. As a Pulso user whose stock has no current price, I want the market value cell and the whole P&L block to disappear (never a partial or fabricated figure), so that the screen never lies.
25. As a Pulso user whose stock has no current price, I want shares, average cost, and total cost to remain visible, so that I still get the honest half of the story.
26. As a Pulso user whose stock has no current price, I want the movement list rendered in full with no buy lines, so that history stays available even when valuation isn't.
27. As a Pulso user deep-linking to a fully-sold or unknown ticker, I want a not-found screen, so that closed positions don't render as ghost holdings.
28. As a Pulso user, I want all amounts, percentages, shares, and dates in the app's standard formats (tabular numerals, ASCII hyphen for negatives, Spanish dates), so that numbers align and compare cleanly across screens.
29. As a Pulso user, I want every UI text in Spanish (tickers untranslated), so that the app speaks one language.

## Implementation Decisions

- **Pantalla A, no B**: la pantalla responde *"¿cómo va mi posición hoy?"*.
  Se cortan conscientemente Dividendos, Comisiones, Realizado y cualquier
  "retorno total por acción" (no tiene denominador honesto para un %). Entran
  en un v2 si el usuario los extraña.
- **Sin chart**: no hay serie temporal ni precios históricos en el modelo.
  Todas las cifras salen del motor (acumulados por movimiento) más el precio
  actual.
- **Labels del glosario**: "Costo total" (**Cost Basis**) y "Valor de mercado"
  (**Market Value**). "Invertido" y "Valor actual" están vetados por
  `CONTEXT.md`.
- **La pantalla es un consumidor puro**: cifras del `ValuedHolding` que ya
  expone el hook de portafolio, precio actual del mapa de precios mock,
  movimientos del store filtrados por ticker. **No se toca el motor ni el
  store.**
- **Módulo profundo: el view-model puro** `buildStockDetailView(ticker,
  holding | undefined, price, movements)`. Encapsula toda la política: estados
  found/not-found, labels, colapso sin precio, la señal de color por compra
  (banda ±1%) y el formateo. Único módulo con lógica. Forma indicativa (del
  spec; naming libre, camelCase):

  ```ts
  type BuyTone = "up" | "down" | "neutral";

  interface StockDetailView {
    state: "found" | "not-found";
    ticker: string;
    badge: number;                  // índice en la paleta de badges
    price: string | null;           // null => "Sin precio"
    position: {
      shares: string;
      avgCost: string;
      costBasis: string;
      marketValue: string | null;   // null sin precio => cae la celda
      netPnl: string | null;        // null sin precio => cae el bloque
      netPnlPercent: string | null;
      netPnlTone: Tone;
    } | null;                       // null solo en not-found
    rows: StockMovementRow[];
  }

  interface StockMovementRow extends MovementRow {
    sharesLabel: string | null;     // "0.5 acc" en compra/venta; null en dividendo
    buyTone: BuyTone | null;        // solo compras con precio; null en el resto
  }
  ```

- **Señal de color por compra**: se compara el precio de esa compra contra el
  **precio actual** (no contra el costo promedio — sería circular:
  `signal = (actual − compra) / compra`). Es un dato retrospectivo de entrada
  ("¿compré en buen momento?"), **nunca** un monto en dólares por lote: bajo
  costo promedio móvil (ADR-0001) los lotes están licuados y un $ mentiría.
  Se presenta como **color + flecha** (accesibilidad: rojo/verde solo no
  funciona para daltonismo), sin número. Banda neutral: `|signal| <= 1%` →
  sin línea y sin flecha (el umbral de signo general de la app, −0.005, NO
  aplica acá).
- **Componentes presentacionales tontos**: identidad (badge + hero), tarjeta
  de posición, lista. Sin lógica propia.
- **Se reusa la fila de movimiento existente** con dos props opcionales
  aditivas: `sharesLabel` (junto a la fecha) y `buyTone` (línea de color +
  flecha). El tab Movimientos no pasa esos props y no cambia en nada.
- **Se reusa el header de pantalla compartido** (back + título = ticker). La
  ruta deja de declarar header nativo (hoy dice "Stock Detail" en inglés).
- **Estados**: `shares === 0` o ticker inexistente → not-found seco (mismo
  patrón que el detalle de movimiento). Sin precio → colapso parcial descrito
  en Solution; **nunca** un retorno parcial.
- **Mock data intacto**: NO se agrega un cuarto ticker sin precio. El estado
  "Sin precio" queda cubierto por fixtures de tests del view-model (decisión
  de esta sesión: cambio quirúrgico; el estado es raro con feed real).
- **Formato**: moneda y porcentaje con los helpers existentes; guion ASCII en
  negativos (nunca U+2212, regla de `CLAUDE.md`); acciones sin sufijo en la
  tarjeta (el label ya dice "Acciones") y con sufijo `acc` en la fila; fecha
  siempre la **Execution Date** (ADR-0004); `tabular-nums` en todo número.

## Testing Decisions

- Un buen test fija **comportamiento externo** del view-model (qué view emite
  para qué inputs), nunca detalles de implementación ni renders.
- **Único módulo testeado: `buildStockDetailView`** (vitest), como
  movement-detail y portfolio. Componentes y pantalla sin tests.
- Prior art: los tests de view-model de movement-detail, movements y
  portfolio (`view-model.test.ts` junto a cada view-model).
- Invariantes que los tests deben fijar (del spec §11):
  1. `buyTone` solo en compras — ventas y dividendos siempre `null`.
  2. La banda ±1%: compra 5% bajo el actual → `"up"`; 5% arriba → `"down"`;
     dentro de ±1% → `"neutral"`, fijando el borde exacto (1.0% cae en
     neutral).
  3. Sin precio → `price`, `marketValue`, `netPnl*` en `null`; `shares`,
     `avgCost`, `costBasis` sobreviven; toda compra con `buyTone === null`.
  4. `shares === 0` o ticker inexistente → `state: "not-found"`.
  5. El único `%` emitido es el de P&L no realizada — ninguna otra cifra
     contiene `%`.
  6. Las filas no contienen el ticker en el título; compra/venta llevan
     `sharesLabel`, el dividendo no.
- Los asserts sobre caracteres prohibidos (p. ej. U+2212) se escriben como
  escape unicode (`not.toContain("−")`), regla de `CLAUDE.md`.

## Out of Scope

- **Pantalla B**: Dividendos, Comisiones, Realizado y retorno total por
  acción. Primer candidato a v2.
- **Chart de precio / serie temporal** — no hay precios históricos.
- **Nombre de empresa** ("Apple Inc.") y badges decorativos ("CORE ASSET") —
  el dato no existe; el nombre llega gratis con un feed real de precios.
- **Posiciones cerradas** y su puerta de entrada (sección en Portafolio o
  ticker tocable en una fila de movimiento).
- **Comprar/vender/editar** desde esta pantalla.
- **Cambios al tab Movimientos** (ni color en dividendos ni líneas en
  compras — la línea de color vive solo en el detalle).
- **Cambios al motor de portafolio, al store o al mock data.**

## Further Notes

- La navegación **ya existe**: Home y Portafolio ya hacen push a
  `/stock/{ticker}`; esta feature reemplaza el stub de destino.
- El prototipo de Claude Design es la referencia visual; donde el prototipo y
  este PRD difieran, **manda el PRD** (el prototipo puede conservar restos del
  mockup a mano: chevrons, montos con signo, "View All").
- Las cifras de cualquier diagrama o mockup son ilustrativas: **el motor
  manda**.
- MSFT no aparece en el mapa de precios porque está totalmente vendido
  (`shares = 0`), no porque le falte precio — no es un caso "Sin precio" y no
  hay que "arreglarlo".
