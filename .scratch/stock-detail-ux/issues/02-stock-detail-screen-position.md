# Stock detail screen: identity + position card

**Type:** AFK
**Source:** `.scratch/stock-detail-ux/PRD.md` · `.scratch/stock-detail-ux/UX.md`
**Visual reference:** `.scratch/stock-detail-ux/stock-portfolio-design-prototype/`

## What to build

Replace the `/stock/[ticker]` stub with the real detail screen, rendering the
view-model from issue 01 verbatim: identity block and "Tu posición" card. The
movements list is NOT in this slice (issue 03). Demoable on its own: tap AAPL
in Home or Portafolio and see the full position.

- **Header**: the shared screen header (back + title = ticker), same as
  add-movement and movement detail. The route stops declaring a native
  header (today it says "Stock Detail" in English) — the layout entry moves
  to `headerShown: false`.
- **Identity**: ticker badge (same badge-palette color as the row the user
  tapped — AAPL teal, VOO blue) + "PRECIO ACTUAL" hero figure, same
  [badge][text] shape as the movement-detail identity. No company name, no
  "CORE ASSET" badge — the data doesn't exist.
- **"Tu posición" card** (surface + border + radius, app card language):
  Acciones, Costo promedio, Costo total, Valor de mercado in a 2×2 grid,
  then a divider and the P&L no realizada block ($ + %, green/red tone).
  Green/red ONLY on the P&L figure — the other four are neutral facts.
- **No-price collapse**: hero replaced by a small "Sin precio" in secondary
  text (not styled as an error); the Valor de mercado cell and the whole
  P&L block drop; Acciones / Costo promedio / Costo total remain. Never an
  empty shell.
- **Not-found**: `shares === 0` or unknown ticker → dry not-found, same
  pattern as the movement receipt. Unreachable by tapping (Home and
  Portafolio only list open positions) but the route is deep-linkable.
- **Presentational components only** — identity and position card render
  view-model strings verbatim, no derivation, no formatting, no logic. The
  screen wires the portfolio hook, the price map, and the movements store
  into `buildStockDetailView`.
- Read-only screen: no buy/sell/edit actions.
- Scroll + safe areas respected; `tabular-nums` on every figure; UI text in
  Spanish, ticker untranslated.

## Acceptance criteria

- [ ] Tapping an asset row in Home or Portafolio opens the detail with the
      tapped ticker as header title and matching badge color.
- [ ] The position card shows Acciones, Costo promedio, Costo total, Valor
      de mercado, and P&L no realizada ($ and %) for a priced holding, with
      green/red tone only on the P&L.
- [ ] The labels are exactly "Costo promedio", "Costo total", "Valor de
      mercado", "P&L no realizada" — never "Invertido" / "Valor actual".
- [ ] Without a price: "Sin precio" replaces the hero, the market-value cell
      and the P&L block are absent, and the three cost figures remain
      (verifiable via a temporary price-map tweak or the view-model tests).
- [ ] Deep-linking to a fully-sold (MSFT) or unknown ticker renders the
      not-found state.
- [ ] The native header for the route is gone (`headerShown: false`); the
      shared header's back button returns to the originating tab.
- [ ] No changes to the portfolio engine, stores, mock data, or the
      Movimientos tab.
- [ ] Existing tests still pass.

## Blocked by

- `01-stock-detail-view-model.md`
