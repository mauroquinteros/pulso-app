# Card "Distribución": donut interactivo + leyenda colapsable

**Type:** AFK
**Source:** `.scratch/portfolio-ux/PRD.md` · `.scratch/portfolio-ux/UX.md` · prototipo `portfolio-design-prototype/project/Pulso Portafolio.dc.html`

## What to build

The Distribución card at the top of the Portafolio screen: the interactive
**Allocation** donut with its center readout, hint microcopy, and collapsible
legend. Adds the feature's one new dependency, `react-native-svg` (via expo
install). The prototype is the pixel-perfect visual reference.

- Donut (presentational, from view-model **fractions**): SVG circles with
  strokeDasharray/offset over viewBox 140 (r=54, rendered ~184px), rotated
  −90° so the largest segment starts at 12 o'clock; ring thickness 22
  (selected +5), arc gap 2.4, unselected dim to 0.28 opacity, ~180ms
  transitions. Segment colors from the badge palette text colors by index;
  Efectivo and "Otros" use their reserved colors.
- Center: no selection → Total Portfolio Value + sublabel "Total"; selected →
  segment label tinted with its color + its amount below. Never a % in the
  center.
- Hint line under the donut (fixed height, no layout jump): "Toca un segmento
  para ver su monto" ↔ "Toca de nuevo para volver al total".
- Selection state lives in the card and is shared by donut, center, hint and
  legend: tap an arc or a legend row toggles that segment; tapping another
  moves the selection; deselect restores the Total. The "Mis Activos" card
  does not participate.
- Legend (collapsible, open by default): right-aligned toggle "Ocultar
  leyenda"/"Ver leyenda" with rotating chevron; rows of swatch + label +
  Allocation % (1 decimal); selected row gets a subtle background. Negative
  cash renders its legend row with the amount in red and no % (view-model
  provides this). Legend rows are the guaranteed accessible selection path.
- Touch targets: arcs get an expanded invisible hit stroke so small segments
  reach an effective ≥44pt target.
- Reduced motion: with the system setting on, no animations — data readable
  immediately.
- Missing prices: compact note on the card when the view-model reports
  `missingPriceCount > 0`.

## Acceptance criteria

- [ ] `react-native-svg` installed via expo; donut renders arcs from view-model fractions only (no allocation math in components)
- [ ] Largest segment starts at 12, clockwise, Efectivo last; visual params match the prototype (thickness 22/+5, gap 2.4, dim 0.28, ~180ms)
- [ ] Tap arc or legend row selects: segment thickens, others dim, center shows label (tinted) + amount; same-segment tap deselects back to Total; another segment moves selection
- [ ] Hint text swaps between the two microcopy lines without layout shift
- [ ] Legend toggles open/closed ("Ocultar leyenda"/"Ver leyenda", chevron rotates), open by default; rows show swatch + label + % (1 decimal); selected row highlighted
- [ ] Negative-cash legend row: red amount, no %, not present in the donut
- [ ] Cash-only portfolio renders a single full Efectivo ring correctly
- [ ] Small segments selectable via expanded hit area (≥44pt effective) and always via their legend row
- [ ] Reduced-motion: no animations when the system setting is on
- [ ] "N sin precio" note appears when the view-model reports missing prices
- [ ] `tsc` and lint clean; screen scrolls with both cards composed

## Blocked by

- `01-portfolio-view-model.md`
- `02-portfolio-screen-assets.md`
