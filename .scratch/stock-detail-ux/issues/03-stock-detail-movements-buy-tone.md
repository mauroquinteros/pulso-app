# Stock detail: movements list + per-buy color line

**Type:** AFK
**Source:** `.scratch/stock-detail-ux/PRD.md` · `.scratch/stock-detail-ux/UX.md`
**Visual reference:** `.scratch/stock-detail-ux/stock-portfolio-design-prototype/`

## What to build

The "Movimientos" section of the stock detail: the ticker's full history
below the position card, with the feature that motivated the screen — each
buy marked cheap/expensive against today's price. Demoable: open AAPL and see
every movement, with buys carrying a green ↑ or red ↓ line.

- **The rows reuse the existing movement row** with two additive optional
  props, both fed by the view-model from issue 01:
  - `sharesLabel` — rendered next to the date ("12 oct 2023 · 0.5 acc") on
    buys and sells; dividends keep the date alone.
  - `buyTone` — `"up"` | `"down"` | `"neutral"`; `"up"` renders a colored
    line at the row's left edge (positive color) plus a small ↑ arrow of the
    same color; `"down"` the same in negative color with ↓; `"neutral"` and
    `null` render nothing (the row looks like a sell or dividend).
  The Movimientos tab does not pass these props and must not change in any
  way — visually or behaviorally.
- **Row conventions preserved** (written in the row component and the tab's
  view-model): no chevron, amount without sign and without color. The color
  line is a separate mark meaning "this buy was cheap/expensive vs. today",
  never a colored amount.
- **Arrow + line together** — the arrow carries the same meaning as the
  color so the feature works under red/green color blindness.
- **Titles without the ticker** ("Compra", "Venta", "Dividendo"), newest
  first, deposits/withdrawals never appear (they have no ticker).
- **Tap → the movement's receipt** (`/movement/{id}`), the screen that
  already exists.
- **No "View All"** — the full history renders and the screen scrolls.
- **No price → no lines**: every buy renders without line and without arrow
  (the view-model already emits `buyTone: null`); the list itself renders in
  full.

## Acceptance criteria

- [ ] The stock detail lists every movement of the ticker (buys, sells,
      dividends), newest first, below the position card.
- [ ] Buys bought >1% below the current price show a positive-colored left
      line + ↑; buys >1% above show a negative-colored line + ↓; buys within
      ±1% show neither.
- [ ] Sells and dividends never show a line or arrow.
- [ ] Row titles have no ticker; buy/sell rows show "N acc" next to the
      date; dividend rows don't.
- [ ] Amounts remain unsigned and uncolored; rows have no chevron.
- [ ] Tapping a row opens that movement's receipt.
- [ ] There is no "View All" link; the screen scrolls the full history.
- [ ] The Movimientos tab renders exactly as before (no new props passed, no
      visual change).
- [ ] No changes to the portfolio engine, stores, or mock data.
- [ ] Existing tests still pass.

## Blocked by

- `01-stock-detail-view-model.md`
- `02-stock-detail-screen-position.md`
