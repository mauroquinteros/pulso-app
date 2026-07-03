# Pulso — Portfolio View UX Spec (tab Portafolio)

> Sesión grill-with-docs del 2026-07-02, **actualizada contra el prototipo de
> diseño** `.scratch/portfolio-ux/portfolio-design-prototype/project/Pulso
> Portafolio.dc.html` (Claude Design handoff). Donde el prototipo contradice una
> decisión de la sesión de grilling, **el prototipo manda**; los cambios están
> marcados "(cambió vs grill)". La vista vive en el tab **Portafolio**
> (`app/(tabs)/holdings.tsx`, hoy stub; el tab bar ya lo etiqueta "Portafolio").
>
> Regla de idioma: **todos los textos de UI en español**, excepto los tickers.

## 1. How to use this doc

Design brief settled de la vista de portafolio: card **Distribución** (donut de
**Allocation** + leyenda colapsable) arriba y card de assets abajo. El prototipo
HTML es la referencia visual pixel-perfect; este doc captura la semántica, los
estados y las reglas que el prototipo no muestra (sin precio, cash negativo,
vacío). De acá salen el PRD y los issues. Los términos en negrita son del
glosario (`CONTEXT.md`) — **Allocation** se agregó en esta sesión.

## 2. Product thesis

El **Home responde "¿cuánto tengo y cuánto voy ganando?"** (resumen). El
**Portafolio responde "¿cómo está compuesto mi portafolio?"** (composición). La
misma historia contada dos veces: el donut la cuenta visual, la **leyenda** la
cuenta exacta (% por segmento como texto) — esa pareja es el fallback de
accesibilidad exigido para un pie/donut: nunca se depende solo del color ni de
la geometría.

Diferencia vs la card "Activos" del Home: esta vista agrega el donut de
**Allocation** con leyenda (% por posición y Efectivo), la exploración por tap
(monto por segmento) y el **Net P&L %** por fila. (Cambió vs grill: la línea
"precio actual · prom." por fila se retiró del diseño final; el detalle de
precios queda para `stock/[ticker]`.)

## 3. Data source (sin tocar el engine)

Todo sale de `usePortfolio(): Portfolio` — no se toca `utils/portfolio/`:

- Donut/leyenda: `cash`, `totalPortfolioValue`, `holdings[].marketValue`,
  `holdings[].priceAvailable`.
- Lista: `holdings[]` (`ValuedHolding`: `shares`, `marketValue`, `netPnl`,
  `netPnlPercent`, `priceAvailable`).

**Dependencia nueva (settled)**: `react-native-svg` para el donut. Única
dependencia agregada; sin librería de charts. El donut se dibuja como en el
prototipo: círculos con `strokeDasharray`/`strokeDashoffset` sobre un viewBox,
rotados −90° para arrancar a las 12.

## 4. Card "Distribución" (settled, según prototipo)

Card estilo Home (`Colors.surface` #111638, borde #1C224D, radius 20). Label
superior "Distribución" (13px, peso 500, `textSecondary`).

### Semántica del donut

- **Allocation** por segmento: `Market Value ÷ Total Portfolio Value`; Efectivo:
  `Cash ÷ Total Portfolio Value`. Siempre suma 100% porque los holdings **sin
  precio están excluidos del propio Total Portfolio Value** (política
  "exclude + flag" del engine y del Home).
- Segmento mayor arranca a las 12, sentido horario, orden por valor descendente;
  **Efectivo siempre último**.
- **Máx 6 segmentos**: si hay más de 6, top 5 holdings + **"Otros"** agrupando
  la cola. Efectivo nunca se agrupa en Otros.

### Geometría y colores (del prototipo)

- Donut ~184×184 (viewBox 140, r=54), grosor de anillo **22** (seleccionado:
  **+5**), gap visual entre segmentos **2.4** unidades de arco.
- Colores de segmento = color de **texto** de `HoldingBadgePalette` por posición
  (AAPL #4FE9D6, VOO #9DB8FF…), igual que los badges de las filas → vínculo
  chart↔lista. Efectivo: `Colors.investedBar` (#5B63A0). "Otros": neutro
  (`Colors.textMuted`).

### Centro

- **Sin selección**: **Total Portfolio Value** (22px, peso 800, tabular-nums,
  blanco) con sublabel "Total" (12px, `textSecondary`).
- **Con segmento seleccionado** (cambió vs grill): **ticker arriba, teñido del
  color del segmento** ("Efectivo"/"Otros" igual), y **el monto debajo**
  (Market Value del segmento; Cash para Efectivo). El % no va al centro — vive
  en la leyenda.

### Hint (microcopy, del prototipo)

Línea centrada bajo el donut (11px, `textMuted`), siempre presente (reserva su
alto para evitar saltos de layout):

- Sin selección: **"Toca un segmento para ver su monto"**
- Con selección: **"Toca de nuevo para volver al total"**

### Leyenda colapsable (nueva, del prototipo)

- Toggle alineado a la derecha: **"Ocultar leyenda" / "Ver leyenda"** con
  chevron que rota 180°. **Abierta por defecto.**
- Fila de leyenda: swatch 10×10 (radius 3, color del segmento) + label (ticker /
  "Efectivo" / "Otros") + **Allocation %** (1 decimal, tabular-nums) a la
  derecha.
- **Tap en una fila de leyenda también selecciona/des-selecciona su segmento**
  (misma acción que tocar el arco). La fila seleccionada se resalta con bg
  sutil (`rgba(255,255,255,0.05)`).
- La leyenda es el registro exacto de las Allocations — por eso las filas de
  "Mis Activos" ya no llevan % (cambió vs grill).

### Interacción (settled: tap para resaltar)

- Tap en un arco (o su fila de leyenda) selecciona: el segmento engrosa +5 y
  los demás bajan a opacidad **0.28**; el centro cambia a ticker + monto.
- Tap en el mismo segmento des-selecciona (vuelve el Total). Tap en otro
  segmento mueve la selección.
- La card "Mis Activos" **no** participa de la selección: sus filas navegan
  (§5).
- **Touch targets**: los arcos llevan hit-area expandida (stroke invisible más
  grueso para la detección) de modo que un segmento chico (p.ej. 3%) alcance
  ≥44pt. La fila de leyenda es el camino de selección accesible garantizado.
  Requisito de spec, no opcional.

### Animación

- Transición de selección **~180ms** (opacidad y grosor, como el prototipo).
  Sweep de entrada opcional ≤300ms (ease-out).
- Ambas respetan reduced-motion (`AccessibilityInfo.isReduceMotionEnabled`):
  sin animación, datos legibles de inmediato.

### Flag de precios faltantes

- Si `holdingsMissingPrice > 0`: nota compacta en la card ("N sin precio" o
  similar); las filas afectadas muestran "Sin precio" (patrón del Home). Un
  holding sin precio no aparece en donut ni leyenda.

## 5. Card "Mis Activos" (settled, según prototipo)

> El prototipo titula la card "Mis Assets"; por la regla de idioma (español
> salvo tickers) y el precedente del Home ("Activos"), la spec la normaliza a
> **"Mis Activos"**. Si se prefiere "Mis Assets" tal cual, es solo el string.

Card estilo Home, título 18px/700, filas separadas por borde superior
(#1C224D), orden por **Market Value descendente**.

Fila de holding (del prototipo — más simple que la versión grill):

```
[badge]  AAPL                        $2,991.21
         15.07666            +$240.18  ▲ 8.73%
```

- **Izquierda**: badge 40×40 (`HoldingBadgePalette[i]`, mismo índice/color que
  el donut) + ticker (15px/700) + **shares como número puro** (12px,
  `textSecondary`, tabular-nums, máx. 5 decimales, sin sufijo "acciones" —
  cambió vs grill).
- **Derecha**: **Market Value** (15px/700) y debajo **Net P&L** en $ con signo
  y **%** con flecha **▲/▼** (2 decimales), ambos teñidos por tono
  positive/negative (#00C853 / #FF5252, umbral ±0.005).
- **Sin % de Allocation ni línea de precios por fila** (cambió vs grill): el %
  vive en la leyenda; el detalle de precio actual vs Average Cost queda para
  `stock/[ticker]`.
- **Sin precio**: la fila muestra "Sin precio" a la derecha (igual al Home).
- **Tap** → `stock/[ticker]` (misma navegación que el Home).
- **No hay fila de Efectivo** (cambió vs grill): Efectivo vive solo en donut +
  leyenda.

## 6. Estados (settled)

- **Vacío** (sin movimientos, o todo en cero): estado vacío con mensaje y CTA
  "Agregar movimiento" → picker de add-movement. Sin donut ni lista.
- **Solo efectivo**: donut de un solo segmento (Efectivo 100%); card "Mis
  Activos" no se muestra (no hay holdings).
- **Cash negativo** (estado degenerado posible — el gate de Venta hoy no impide
  `fee + regulatoryFees > gross`): el donut renderiza **solo los holdings,
  proporcionales sobre la suma de Market Values** (evita segmento negativo y
  allocations >100%). En la **leyenda**, la fila Efectivo muestra el **monto
  negativo en rojo y omite su %**. Explícito y honesto; no se fabrica un 100%.

## 7. Estructura de pantalla (settled)

- Fondo `Colors.background` (#0A0E27). `ScrollView` simple (pocos holdings; sin
  FlatList).
- Título de pantalla **"Portafolio"** (28px, peso 800, blanco, tracking −0.6).
- Orden: título → card Distribución → card Mis Activos. Safe areas respetadas;
  contenido no queda bajo el tab bar.

## 8. Formato y convenciones

- Tipografía Manrope (ya cargada en la app); `fontVariant: ["tabular-nums"]` en
  todo número.
- **Allocation % (leyenda): 1 decimal.** **Net P&L %: 2 decimales** con ▲/▼.
- Moneda 2 decimales con separador de miles (helpers existentes: `formatUSD`,
  `formatSignedUSD`; signo negativo "−").
- Shares: número puro, máx. 5 decimales.
- Textos UI en español (tickers en su forma original).

## 9. Arquitectura de módulos (para el PRD)

Espejo del patrón Home: view-model puro + componentes tontos.

- `components/holdings/view-model.ts` — `buildPortfolioView(portfolio):
  PortfolioView` puro: segmentos del donut (fracción, monto display-ready,
  color-index, label), filas de leyenda (% 1 decimal), filas de lista (strings,
  tonos), estados (vacío / cash negativo / sin precio). **Toda** la lógica de
  esta spec vive acá y se testea acá (vitest, sin RN).
- `components/holdings/allocation-donut.tsx` — SVG presentacional; recibe
  segmentos + selección. El **estado de selección vive en la card** (lo
  comparten donut, centro, hint y leyenda).
- `components/holdings/allocation-legend.tsx` — leyenda colapsable
  presentacional (toggle local u hoisted a la card).
- `components/holdings/holdings-list.tsx` (o filas en la screen) —
  presentacional.
- `app/(tabs)/holdings.tsx` — compone y navega.

## 10. Settled decisions (recap)

1. Vista = tab Portafolio (`holdings.tsx`); card Distribución (donut +
   leyenda) + card Mis Activos.
2. Rendimiento por fila = **Net P&L** en $ y % (no realizado). El retorno total
   por asset y el detalle de precios (actual vs **Average Cost**) quedan para
   `stock/[ticker]`. (La línea de precios por fila se retiró vs grill.)
3. Donut con `react-native-svg` (dependencia aceptada); sin librería de charts.
4. Colores de segmentos = colores de texto de `HoldingBadgePalette`
   compartidos con los badges; Efectivo = `investedBar` #5B63A0.
5. Donut **interactivo**: tap (arco o fila de leyenda) resalta segmento
   (+5 grosor, resto a 0.28); centro pasa de Total → **ticker + monto**
   (cambió vs grill: monto, no %). Hint microcopy bajo el donut. Hit-area
   ≥44pt en arcos; la leyenda es el camino accesible.
6. **Leyenda colapsable** ("Ocultar/Ver leyenda", abierta por defecto) con
   swatch + label + Allocation % (1 decimal); tap selecciona segmento.
7. Sin fila de Efectivo en la lista; Efectivo vive en donut + leyenda.
8. Cash negativo → donut solo-holdings proporcional; leyenda muestra Efectivo
   en rojo sin %.
9. Máx 6 segmentos; top 5 + "Otros"; Efectivo nunca agrupado.
10. Estados vacío / solo-efectivo / sin-precio según §6.
11. Textos UI en español (card normalizada a "Mis Activos"); tickers sin
    traducir.
12. Nuevo término de glosario: **Allocation (Distribución)** en `CONTEXT.md`.

## 11. Out of scope (this spec)

- Pantalla `stock/[ticker]` (sigue stub; recibirá el retorno total por asset y
  el detalle precio actual vs Average Cost).
- Cambio diario / precio previo (no hay previous close en `MOCK_PRICES`).
- Fix del gate de Venta (`fee > gross`) — bug conocido, feature aparte.
- Precios reales (se mantiene `MOCK_PRICES` como swap-point).
- Export, drill-down del donut.
