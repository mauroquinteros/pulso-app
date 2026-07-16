# Stock detail view-model + tests

**Type:** AFK
**Source:** `.scratch/stock-detail-ux/PRD.md` · `.scratch/stock-detail-ux/UX.md`

## What to build

The pure **stock detail view-model** — the single deep module of the feature,
mirroring the movement-detail pattern. One function,
`buildStockDetailView(ticker, holding | undefined, price, movements)`, turns
the ticker's `ValuedHolding`, its current price, and its movements into a
display-ready view. It encapsulates ALL policy: found/not-found states, the
glossary labels, the no-price collapse, the per-buy color signal with its ±1%
neutral band, and every formatted string. The screen and components render it
verbatim and hold no derivation or formatting. No UI in this slice.

Key policies (from the PRD):

- **Labels**: "Costo promedio" (**Average Cost**), "Costo total" (**Cost
  Basis**), "Valor de mercado" (**Market Value**), "P&L no realizada"
  (**Net P&L**). "Invertido" and "Valor actual" are banned by the glossary.
- **The only `%` on screen** is the Net P&L percent. No other emitted figure
  contains `%` — there is no per-stock total return.
- **Buy signal**: compares each buy's execution price against the CURRENT
  price (not the average cost — circular):
  `signal = (current − buyPrice) / buyPrice`. `> +1%` → `"up"` (bought
  cheap), `< −1%` → `"down"` (bought expensive), `|signal| <= 1%` →
  `"neutral"`. It is a price-vs-price percentage, never a dollar amount per
  lot (moving average cost dilutes lots — ADR-0001). The general sign
  threshold (−0.005) does NOT apply here.
- **No price** → `price`, `marketValue`, `netPnl*` are `null`; `shares`,
  `avgCost`, `costBasis` survive; every buy gets `buyTone === null`. Never a
  partial or fabricated figure.
- **`shares === 0` or unknown ticker** → `state: "not-found"`.
- **Rows**: the ticker's movements only (buys, sells, dividends — deposits
  and withdrawals have no ticker), newest first (same chronological-desc
  order as the Movimientos tab). Titles WITHOUT the ticker ("Compra",
  "Venta", "Dividendo"). Buys and sells carry a `sharesLabel` next to the
  date ("0.5 acc"); dividends don't. Amounts keep the tab's convention: no
  sign, no color.
- **Formats**: existing helpers for currency, percent, shares, and dates;
  ASCII hyphen in negatives (never U+2212); execution date (ADR-0004);
  Spanish UI text, tickers untranslated.

Indicative shape (from the PRD; naming free, camelCase):

```ts
type BuyTone = "up" | "down" | "neutral";

interface StockDetailView {
  state: "found" | "not-found";
  ticker: string;
  badge: number;                  // index into the badge palette
  price: string | null;           // null => "Sin precio"
  position: {
    shares: string;
    avgCost: string;
    costBasis: string;
    marketValue: string | null;   // null without price => cell drops
    netPnl: string | null;        // null without price => block drops
    netPnlPercent: string | null;
    netPnlTone: Tone;
  } | null;                       // null only when not-found
  rows: StockMovementRow[];
}

interface StockMovementRow extends MovementRow {
  sharesLabel: string | null;     // "0.5 acc" on buy/sell; null on dividend
  buyTone: BuyTone | null;        // only buys with a price; null otherwise
}
```

Tests are vitest over the view-model only, with fixtures (the mock data has
no unpriced holding — the "Sin precio" state lives in fixtures by decision).

## Acceptance criteria

- [ ] `buyTone` only on buys — sells and dividends are always `null`.
- [ ] The ±1% band holds: a buy 5% below current → `"up"`; 5% above →
      `"down"`; within ±1% → `"neutral"`; the exact 1.0% edge falls in
      neutral.
- [ ] Without a price: `price`, `marketValue`, `netPnl`, `netPnlPercent` are
      `null`; `shares`, `avgCost`, `costBasis` survive; every buy has
      `buyTone === null`.
- [ ] `shares === 0` or unknown ticker → `state: "not-found"`.
- [ ] The only emitted string containing `%` is the Net P&L percent.
- [ ] Row titles do not contain the ticker; buy/sell rows carry
      `sharesLabel`, dividend rows don't; rows are newest-first.
- [ ] Negative amounts use the ASCII hyphen — a test asserts the absence of
      U+2212 written as a unicode escape (`not.toContain("\u2212")`, never
      the pasted glyph), per `CLAUDE.md`.
- [ ] No changes to the portfolio engine, the store, or the mock data.
- [ ] All tests pass.

## Blocked by

None - can start immediately
