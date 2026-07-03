# Pantalla Portafolio: título + card "Mis Activos" + estados

**Type:** AFK
**Source:** `.scratch/portfolio-ux/PRD.md` · `.scratch/portfolio-ux/UX.md` · prototipo `portfolio-design-prototype/`

## What to build

Replace the Portafolio tab stub with the real screen, **without the donut yet**
(that's issue 03): screen title, scrolling layout, the "Mis Activos" card, and
the degenerate states. Demoable on its own — a complete portfolio list view.

- Screen: title "Portafolio" (28px/800, per prototype), simple ScrollView,
  safe areas respected, content never hidden behind the tab bar. Everything
  renders from `buildPortfolioView(usePortfolio())` — components hold no
  derivation or formatting.
- Card "Mis Activos" (Home card style: surface, border, radius 20): rows
  ordered as the view-model delivers them, each with badge (40×40, palette by
  index), ticker, shares as plain number, Market Value, and Net P&L in $ and %
  with ▲/▼ and positive/negative tone. Unpriced rows show "Sin precio" on the
  right (Home pattern). No Efectivo row (cash lives in the Distribución card,
  issue 03).
- Row tap → stock detail screen (same navigation as Home's asset rows).
- States: `empty` → empty state with message and CTA "Agregar movimiento"
  (navigates to the add-movement picker), no cards. Cash-only → "Mis Activos"
  card not shown (the screen shows title + Distribución placeholder space
  until issue 03 lands; nothing breaks with zero rows).
- All UI text in Spanish (tickers untranslated).

## Acceptance criteria

- [ ] Tab Portafolio shows the real screen; stub gone
- [ ] Rows render ticker, shares (max 5 decimals, no suffix), Market Value, Net P&L $ y % with arrow and tone, from the view-model strings verbatim
- [ ] Unpriced holding row shows "Sin precio" and no value/P&L
- [ ] Tap on a row navigates to that stock's detail screen
- [ ] Empty state: message + CTA "Agregar movimiento" → add-movement picker; no cards rendered
- [ ] Cash-only: no "Mis Activos" card, screen renders without errors
- [ ] Layout: ScrollView, safe areas, no content under the tab bar; visual style matches the prototype (spacing, sizes, colors, tabular-nums)
- [ ] No derivation/formatting in components; `tsc` and lint clean

## Blocked by

- `01-portfolio-view-model.md`
