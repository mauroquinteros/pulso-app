# Portfolio view-model + tests

**Type:** AFK
**Source:** `.scratch/portfolio-ux/PRD.md` · `.scratch/portfolio-ux/UX.md`

## What to build

The pure **portfolio view-model** — the single deep module of the feature,
mirroring the Home view-model pattern. One function, `buildPortfolioView(portfolio)`,
turns the derived `Portfolio` into a display-ready view: donut segments as
**fractions** (no SVG geometry — arc math is presentation), legend rows,
"Mis Activos" list rows, and every degenerate state as declarative data. The
screen and components render it verbatim and hold no derivation or formatting.

**Allocation** semantics (glossary): `Market Value ÷ Total Portfolio Value`;
Efectivo: `Cash ÷ Total Portfolio Value`. Sums to 100% because unpriced
holdings are already excluded from TPV itself (engine policy "exclude + flag").

Indicative shape (naming free, camelCase; donut segments and legend are
separate lists because negative cash appears in the legend but never as a
segment):

```ts
interface PortfolioView {
  state: "empty" | "ready";            // empty → CTA screen, no cards
  distribution: {
    centerTotal: string;               // "$4,854.40" (Total Portfolio Value)
    segments: {                        // donut only — ordered, max 6
      key: string;                     // ticker | "cash" | "others"
      label: string;                   // "AAPL" | "Efectivo" | "Otros"
      fraction: number;                // 0..1 (geometry-free)
      amount: string;                  // monto shown in center when selected
      colorIndex: number | "cash" | "others"; // badge palette linkage
    }[];
    legend: {                          // exact record — includes negative cash
      key: string; label: string;
      colorIndex: number | "cash" | "others";
      pct: string | null;              // "61.6%" (1 decimal) | null (cash < 0)
      amount: string;                  // for center on select via key lookup
      negative: boolean;               // red treatment (cash < 0)
    }[];
    missingPriceCount: number;         // "N sin precio" note when > 0
  };
  holdings: {                          // "Mis Activos" rows, Market Value desc
    ticker: string;
    sharesLabel: string;               // plain number, max 5 decimals
    priceAvailable: boolean;
    value: string | null;              // "$2,991.21"
    pnl: string | null;                // "+$240.18" (− sign U+2212)
    pnlPct: string | null;             // "▲ 8.73%" / "▼ 1.20%" (2 decimals)
    pnlTone: "positive" | "negative";  // threshold ±0.005
    badge: number;                     // palette index (same as segment)
  }[];
}
```

Policy owned by this module (all tested here):

- Ordering: segments and rows by Market Value descending; Efectivo always the
  last segment/legend row.
- Grouping: more than 6 segments → top 5 holdings + "Otros" (tail sum);
  Efectivo never grouped into Otros.
- Missing price: holding excluded from segments and legend; its row flags
  "Sin precio" (null price-applied fields); `missingPriceCount` exposed.
- Empty (no holdings and cash ≤ 0 with no movements-derived value): `state:
  "empty"`.
- Cash-only: single Efectivo segment (fraction 1), empty `holdings`.
- Negative cash (degenerate, tolerated): segments = holdings only,
  proportional over the **sum of Market Values** (not TPV); legend keeps an
  Efectivo row with the negative amount, `pct: null`, `negative: true`.
- Formats via existing format helpers: currency 2 decimals with thousands
  separators; Allocation % 1 decimal; Net P&L % 2 decimals with ▲/▼ prefix;
  shares max 5 decimals; minus sign "−".

## Acceptance criteria

- [ ] Pure module (no React/RN imports); `buildPortfolioView(portfolio)` is the only export needed by the UI
- [ ] Segments ordered by value desc, Efectivo last; fractions sum to ~1 (rounding tolerance) in the normal state
- [ ] 7+ holdings → exactly 6 segments: top 5 + "Otros" with the tail's combined fraction/amount; Efectivo never inside Otros
- [ ] Unpriced holding: absent from segments and legend, row shows the sin-precio flag, `missingPriceCount` correct
- [ ] Empty portfolio → `state: "empty"`; cash-only → single Efectivo segment and no holding rows
- [ ] Negative cash → holdings-only segments proportional over Market Value sum; legend Efectivo row with negative amount, no pct, negative flag
- [ ] Formats: Allocation 1 decimal, P&L % 2 decimals with arrow, tono threshold ±0.005, shares max 5 decimals
- [ ] Vitest suite covers every criterion above (case-table style, prior art: Home and add-movement view-model tests); `npm test` and `tsc` clean

## Blocked by

None - can start immediately
