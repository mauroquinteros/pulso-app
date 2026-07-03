# PRD — Portfolio View (tab Portafolio)

> Fuente: `.scratch/portfolio-ux/UX.md` (spec settled, actualizada contra el
> prototipo `.scratch/portfolio-ux/portfolio-design-prototype/`). El prototipo
> es la referencia visual pixel-perfect; este PRD fija los contratos de módulos
> y las políticas que el prototipo no muestra. Términos en negrita = glosario
> (`CONTEXT.md`).

## Problem Statement

El usuario ya registra todos sus movimientos (compras, ventas, dividendos,
depósitos, retiros) y el Home le dice cuánto tiene y cuánto va ganando. Pero no
tiene forma de ver **cómo está compuesto** su portafolio: qué peso ocupa cada
acción y el efectivo dentro del **Total Portfolio Value**, ni de recorrer esa
composición de forma visual. El tab Portafolio existe pero es un stub.

## Solution

Una vista de portafolio en el tab **Portafolio** con dos cards:

1. **Distribución**: un donut interactivo de **Allocation** — cada posición y
   el **Efectivo** como porcentaje del **Total Portfolio Value** — con el total
   al centro, exploración por tap (ticker + monto al centro) y una leyenda
   colapsable con el % exacto de cada segmento.
2. **Mis Activos**: la lista de posiciones ordenada por **Market Value**
   descendente, cada fila con su valor y su **Net P&L** en $ y % (tono
   positivo/negativo), navegando al detalle del stock.

Toda la UI en español (tickers sin traducir), estilo visual del Home (dark
navy, cards surface, Manrope, tabular-nums).

## User Stories

1. As a Pulso user, I want a donut chart of my portfolio distribution, so that I can see at a glance how my money is split across positions and cash.
2. As a Pulso user, I want the **Total Portfolio Value** displayed in the donut's center, so that the headline number anchors the composition view.
3. As a Pulso user, I want each donut segment colored consistently with the asset's badge in the list, so that I can connect chart and list without reading labels.
4. As a Pulso user, I want **Efectivo** to appear as its own segment (always last, with its own reserved color), so that uninvested cash is visible as part of my allocation.
5. As a Pulso user, I want to tap a donut segment and see its name and amount in the center, so that I can explore each slice's value without leaving the chart.
6. As a Pulso user, I want to tap the selected segment again (or see a hint telling me to) and return to the total, so that exploration is reversible and predictable.
7. As a Pulso user, I want a hint line under the donut ("Toca un segmento para ver su monto" / "Toca de nuevo para volver al total"), so that the interaction is discoverable without a tutorial.
8. As a Pulso user, I want a legend listing every segment with its exact **Allocation** percentage, so that I get precise numbers, not just visual proportions.
9. As a Pulso user, I want to tap a legend row to select/deselect its segment, so that small slices are selectable without precision-tapping thin arcs.
10. As a Pulso user, I want to collapse and expand the legend ("Ocultar leyenda" / "Ver leyenda"), so that I can trade detail for a compact view.
11. As a Pulso user, I want the selected segment highlighted (thicker ring, others dimmed) and its legend row subtly highlighted, so that selection state is unambiguous.
12. As a Pulso user, I want at most 6 donut segments with the smallest holdings grouped as "Otros", so that the chart stays readable as my portfolio grows.
13. As a Pulso user, I want a "Mis Activos" list ordered by **Market Value** descending, so that my largest positions come first.
14. As a Pulso user, I want each asset row to show ticker, shares held, **Market Value**, and **Net P&L** in both $ and % with an up/down arrow and color tone, so that I can judge each position's performance instantly.
15. As a Pulso user, I want to tap an asset row and navigate to that stock's detail screen, so that I can drill into a position.
16. As a Pulso user, I want holdings without a current price to be flagged ("Sin precio") in the list and excluded from the donut and legend, so that the chart never fabricates data.
17. As a Pulso user, I want a compact note when some holdings lack prices, so that I know the distribution is partial.
18. As a Pulso user with no movements, I want an empty state with a CTA to add my first movement, so that the screen guides me instead of showing an empty chart.
19. As a Pulso user holding only cash, I want a single-segment donut (Efectivo 100%) and no asset list, so that the view degrades gracefully.
20. As a Pulso user whose cash went negative (degenerate data), I want the donut to show only my holdings proportionally and the legend to show the negative cash amount in red without a percentage, so that the view stays honest instead of faking a 100% split.
21. As a Pulso user, I want all percentages, amounts, and share counts in consistent formats (Allocation 1 decimal, P&L % 2 decimals, currency with thousands separators, tabular numerals), so that numbers align and compare cleanly.
22. As a Pulso user, I want every UI text in Spanish (tickers untranslated), so that the app speaks one language.
23. As a Pulso user with reduced-motion enabled, I want the donut to render without animations, so that the view respects my accessibility settings.
24. As a Pulso user, I want segment tap targets to be effectively ≥44pt (expanded hit areas on thin arcs), so that selection works reliably on small slices.
25. As a Pulso user, I want the screen title, cards, and spacing to match the Home's visual language, so that the app feels like one product.
26. As a Pulso user, I want the content to scroll and respect safe areas (nothing hidden behind the tab bar), so that the whole view is reachable on any device.

## Implementation Decisions

### Domain & engine (already done)

- Todo deriva de `usePortfolio(): Portfolio` — el engine (`utils/portfolio/`)
  **no se toca**. El donut/leyenda consumen `cash`, `totalPortfolioValue`,
  `holdings[].marketValue`, `holdings[].priceAvailable`; la lista consume
  `holdings[]` (`ValuedHolding`) completo.
- **Allocation** (término agregado al glosario en esta feature): `Market Value
  ÷ Total Portfolio Value`; Efectivo: `Cash ÷ Total Portfolio Value`. Suma
  100% porque los holdings sin precio ya están excluidos del propio TPV
  (política "exclude + flag" del engine).

### Modules

Espejo del patrón Home (view-model puro + componentes tontos):

- **Portfolio view-model** (deep module, el único con lógica): función pura
  `buildPortfolioView(portfolio): PortfolioView`. Encapsula TODA la política de
  esta feature detrás de una interfaz estable:
  - Segmentos del donut: orden por valor desc, Efectivo último, máx 6 con
    agrupación "Otros" (top 5 + cola; Efectivo nunca agrupado), fracción
    0..1 por segmento, color-index compartido con los badges, label y monto
    display-ready.
  - Filas de leyenda: label + Allocation % (1 decimal) + color-index +
    key de segmento.
  - Filas de lista: ticker, shares (número puro, máx 5 decimales), Market
    Value, Net P&L $ con signo y % (2 decimales) con flecha ▲/▼, tono
    positive/negative (umbral ±0.005), flag sin-precio, badge-index.
  - Estados degenerados como datos declarativos: `empty` (CTA), solo-efectivo
    (lista ausente), cash negativo (segmentos proporcionales sobre suma de
    Market Values; leyenda con monto negativo en rojo y sin %), contador de
    sin-precio.
  - El view-model emite **fracciones**, no geometría SVG: la conversión a
    arcos (dasharray/offset, rotación −90°) es presentación y vive en el
    componente donut.
- **Distribution card**: componente que posee el **estado de selección**
  (compartido por donut, centro, hint y leyenda) y el estado abierta/cerrada
  de la leyenda. Selección: tap en arco o fila de leyenda alterna; tap en otro
  segmento mueve; deselección vuelve el centro al Total.
- **Allocation donut**: SVG presentacional (`react-native-svg`) — círculos con
  strokeDasharray sobre viewBox 140/r54, grosor 22 (+5 seleccionado), gap 2.4,
  opacidad 0.28 para no seleccionados, transición ~180ms, hit-area expandida
  (stroke invisible más grueso) para ≥44pt, respeta reduced-motion.
- **Allocation legend**: leyenda colapsable presentacional (toggle
  "Ocultar/Ver leyenda" con chevron, abierta por defecto; swatch + label + %;
  fila seleccionada resaltada).
- **Holdings list**: card "Mis Activos" presentacional; filas navegan a la
  pantalla de detalle del stock. Sin fila de Efectivo (vive en donut+leyenda).
- **Screen** (tab Portafolio): compone título + cards en un ScrollView (sin
  virtualización), safe areas respetadas.

### Key interactions & contracts

- Dependencia nueva: `react-native-svg` (vía expo install). Sin librería de
  charts.
- Centro del donut: sin selección → Total Portfolio Value + "Total"; con
  selección → label del segmento teñido de su color + monto debajo. El % nunca
  va al centro (vive en la leyenda).
- Colores: segmentos = color de *texto* de la paleta de badges existente,
  asignado por posición (mismo índice que la fila); Efectivo = color
  `investedBar`; "Otros" = neutro muted.
- Formatos con los helpers existentes de `utils/format`; textos UI en español
  ("Mis Activos" — normalizado desde el "Mis Assets" del prototipo por la
  regla de idioma); signo negativo "−".
- La card de lista no participa de la selección del donut.

## Testing Decisions

- Un buen test ejercita **comportamiento externo** del módulo puro: dado un
  `Portfolio`, se afirma sobre el `PortfolioView` resultante (orden y
  fracciones de segmentos, agrupación "Otros", strings formateados, tonos,
  estados degenerados) — nunca sobre detalles internos ni sobre render RN.
- **Se testea únicamente el portfolio view-model** (vitest, sin React Native),
  igual que las features anteriores. Los componentes SVG/leyenda/lista son
  presentacionales y quedan sin tests.
- Casos mínimos: portafolio normal (fracciones suman 1, orden desc, Efectivo
  último), >6 posiciones (agrupa "Otros" correctamente y nunca agrupa
  Efectivo), holding sin precio (excluido del donut, flag en fila y contador),
  solo efectivo (1 segmento, sin lista), vacío (estado empty), cash negativo
  (proporciones sobre Market Value, leyenda sin % y tono negativo), redondeos
  (1 decimal allocation, 2 decimales P&L %, ±0.005 para tono).
- Prior art: los tests del view-model del Home y de los view-models de
  add-movement (mismo estilo: función pura in/out, tabla de casos).

## Out of Scope

- Pantalla de detalle del stock (sigue stub; recibirá el retorno total por
  asset y el detalle precio actual vs **Average Cost**).
- Cambio diario / precio previo (no hay previous close en el price map mock).
- Fix del gate de Venta (`fee + regulatoryFees > gross`) — bug conocido,
  feature aparte; esta vista solo *tolera* el cash negativo resultante.
- Precios reales (se mantiene el price map mock como swap-point).
- Export, drill-down del donut, animación de sweep de entrada (opcional, no
  requisito).

## Further Notes

- El prototipo HTML es la referencia visual (dimensiones, pesos, colores,
  microcopy); este PRD no duplica esos valores — ver
  `portfolio-design-prototype/project/Pulso Portafolio.dc.html`.
- La leyenda es el fallback de accesibilidad del donut (los pie/donut son
  grado C): el % exacto siempre existe como texto y es el camino de selección
  garantizado para segmentos chicos.
- Decisión de UX ya tomada: la línea de precios por fila (precio actual ·
  prom.) se retiró del diseño final; si se extraña, pertenece al detalle del
  stock, no a esta vista.
