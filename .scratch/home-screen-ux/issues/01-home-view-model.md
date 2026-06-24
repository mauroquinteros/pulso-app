# Extract & test the Home view-model

## Parent

[PRD: Home Screen — Surface the Portfolio Engine Values](../PRD.md)

## What to build

Refactor the existing, working Home screen so that **all** display derivation and
formatting move into a single pure module — `buildHomeView(portfolio: Portfolio): HomeView`
— co-located with the Home feature. The four Home components (`HomeHeader`,
`WorthCard`, `ReturnCard`, `AssetsCard`) stop computing anything and render
`HomeView` verbatim; `ReturnCard` keeps only its local collapse/expand UI state.
The screen composes `buildHomeView(usePortfolio())`.

**This is a refactor, not a new build** — the screen already renders correctly and
green from inline logic. On-screen behavior against the mock data must be unchanged.

The view-model owns:
- Composition split: Market Value % and Cash % of **Total Portfolio Value**, plus the bar proportions.
- Aggregate **Net P&L** % over **Cost Basis**.
- The four **Total Return** components — No realizado = `unrealizedPnl`, Realizado = `realizedPnl`, Dividendos netos = `netDividends`, Comisiones = `−totalFees` — with `fill = |amount| / max(|amount|)`.
- Per-holding mapping: shares label ("N acc"), Market Value, Net P&L + %, badge index by position; `priceAvailable === false` ⇒ value/pnl null.
- All string formatting: signed currency (sign before symbol, unicode minus, ±0.005 threshold), signed percent, "acc" shares suffix.

`HomeView` shape (from the session's implementation — encodes the contract):

```ts
type Tone = "positive" | "negative";
interface HomeView {
  worth: {
    total: string;
    invested: { label: string; pct: string; amount: string; flex: number };
    cash:     { label: string; pct: string; amount: string; flex: number };
  };
  return: {
    total: string; tone: Tone; percent: string;
    aportado: string; valeHoy: string;
    components: { label: string; sub?: string; value: string; tone: Tone; fill: number }[];
  };
  assets: {
    netPnl: string; netPnlTone: Tone;
    holdings: {
      ticker: string; shares: string;
      priceAvailable: boolean;
      value: string | null; pnl: string | null; pnlTone: Tone;
      badge: number;
    }[];
  };
}
```

## Acceptance criteria

- [ ] A pure `buildHomeView(portfolio: Portfolio): HomeView` exists, co-located with the Home feature; it imports the engine's `Portfolio` and nothing from the UI layer.
- [ ] `HomeView` carries display-ready strings, bar ratios, and a positive/negative `tone` per signed figure.
- [ ] All four Home components render only from `HomeView` — no derivation, no `format*` calls — except `ReturnCard`'s collapse state.
- [ ] The Home screen is visually unchanged against `MOCK_PORTFOLIO_SUMMARY` (same numbers, same layout, reconciles).
- [ ] `view-model.test.ts` asserts the output against `MOCK_PORTFOLIO_SUMMARY` and covers: a holding with `priceAvailable === false` (null value/pnl), an all-cash portfolio (Market Value 0), and a negative Total Return (negative tone + unicode minus).
- [ ] The banned term "invertido" / "TOTAL INVERTIDO" appears nowhere.
- [ ] `tsc`, `vitest`, and lint all pass.

## Blocked by

None - can start immediately. (This issue's starting point is the current working tree — the as-built Home implementation.)
