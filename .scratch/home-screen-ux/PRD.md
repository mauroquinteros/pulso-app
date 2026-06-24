# PRD: Home Screen — Surface the Portfolio Engine Values

> Domain language follows [`CONTEXT.md`](../../CONTEXT.md). Respects
> [`docs/adr/0001-moving-average-cost-method.md`](../../docs/adr/0001-moving-average-cost-method.md)
> and [`docs/adr/0002-scope-boundaries-v1.md`](../../docs/adr/0002-scope-boundaries-v1.md).
> Design + decision context: [`UX.md`](./UX.md) and the handoff design
> `stock-portfolio-design-prototype/project/Pulso Home.dc.html`.
>
> _Note: this repo uses no triage labels (see `docs/agents/triage-labels.md`), so
> no `ready-for-agent` label / `Status:` line is applied._

## Problem Statement

The Portfolio Derivation Engine now turns my **Movements** into trustworthy,
reconciling figures — but my Home screen doesn't show them. It renders hardcoded
placeholder numbers and a card labelled "TOTAL INVERTIDO", a term `CONTEXT.md`
bans. My **Cash** is invisible even though it's part of what my account is worth.
The headline performance number is **Net P&L**, which ignores the realized gains,
dividends, and fees I actually had — so it understates the truth. I can't see my
all-in **Total Return**, and I certainly can't see _where_ it came from.

I want my Home screen to show the real, reconciling numbers the engine already
produces, with **Total Return** transparency front and center.

## Solution

A redesigned Home tab driven entirely by the derived **Portfolio** (mock data for
now), reading in Spanish with precise glossary labels:

- **Worth card** — **Total Portfolio Value** as the headline, with a composition
  bar splitting **Market Value** ("En activos") vs **Cash** ("Efectivo"), each
  with its amount and share-of-total. Cash is finally visible.
- **Return card** — **Total Return** + % as the primary performance figure, an
  always-visible "Aportado → Vale hoy" bridge (**net contributed capital** vs
  **Total Portfolio Value**), and a collapsible breakdown of the four components
  — **No realizado** (Net P&L), **Realizado**, **Dividendos netos**, **Comisiones**
  — drawn as proportional bars that sum to the total, with the % taken over net
  contributed capital.
- **Activos card** — per-holding rows (ticker badge, shares held, **Market Value**,
  **Net P&L** + %), with aggregate **Net P&L** (over **Cost Basis**) as the
  section stat.

**Net P&L** stops being a competing headline: it appears only as the holdings stat
and the breakdown's top line — which is exactly where it's true, since it equals
**Total Return**'s unrealized component and the sum of the per-holding rows.

## User Stories

1. As an investor, I want my Home screen to show real derived figures instead of placeholders, so that I can trust what I see.
2. As an investor, I want **Total Portfolio Value** as the headline worth, so that I know what my account is worth right now.
3. As an investor, I want a composition bar splitting **Market Value** vs **Cash** with their amounts and shares-of-total, so that I can see invested vs uninvested at a glance.
4. As an investor, I want **Cash** ("Efectivo") shown explicitly, so that I know my buying power — it was previously invisible.
5. As an investor, I want **Total Return** shown as the primary performance number with its %, so that I see my true all-in gain, not just paper gains.
6. As an investor, I want the **Total Return** % expressed over my **net contributed capital**, so that the percentage reflects what I actually put in.
7. As an investor, I want an always-visible "Aportado → Vale hoy" bridge, so that I can compare contributed capital with current worth without expanding anything.
8. As an investor, I want to expand the Return card to see the four components, so that I understand where my return came from.
9. As an investor, I want the four components to visibly sum to **Total Return**, with a note stating so, so that I trust the breakdown ties out.
10. As an investor, I want each component drawn with a proportional bar, so that I can compare their magnitudes at a glance.
11. As an investor, I want **Comisiones** shown as a subtraction in the negative color, so that I see fees reducing my return.
12. As an investor, I want to collapse the breakdown again, so that I can keep the Home screen compact.
13. As an investor, I want my **Activos** listed with ticker, shares held, **Market Value**, and **Net P&L** + %, so that I can see how each position is doing.
14. As an investor, I want the holdings section to show aggregate **Net P&L** and its % over **Cost Basis**, so that I see how my current bets are doing as a whole.
15. As an investor, I want **Net P&L** to appear as the holdings stat and the breakdown's top line rather than as a separate headline, so that I'm not confused by two competing performance numbers.
16. As an investor, I want each holding shown with a colored ticker badge, so that I can visually distinguish positions quickly.
17. As an investor, I want to tap a holding to open its detail, so that I can drill into a position.
18. As an investor, I want gains in green and losses in red with explicit + / − signs, so that performance direction is unmistakable.
19. As an investor, I want monetary and share figures rendered with tabular figures, so that columns line up and are easy to scan.
20. As an investor, when a holding has no current price, I want it shown without a fabricated value (a "Sin precio" state), so that missing data is never presented as real.
21. As an investor, I want the screen in Spanish with precise labels (Valor total, Rendimiento total, Efectivo, No realizado, Realizado, Dividendos netos, Comisiones), so that terminology is consistent and never uses the banned "invertido".
22. As an investor, I want the figures to reconcile (**Cash** + **Market Value** = net contributed capital + **Total Return**), so that the Home screen ties out with the engine.
23. As a developer, I want the Home screen fed by a single `usePortfolio()` seam, so that swapping mock data for a store/Supabase later touches one place.
24. As a developer, I want all display derivations in a pure, isolated view-model, so that I can unit-test the screen's math and formatting without rendering anything.

## Implementation Decisions

**Data seam.** A `usePortfolio()` hook returns the derived **Portfolio**; today it
returns the mock `MOCK_PORTFOLIO_SUMMARY`. This is the single swap-point for a
store / Supabase source later — no screen changes when the source changes.

**View-model (deep module).** A pure `buildHomeView(portfolio: Portfolio): HomeView`
lives with the Home feature (`components/home/view-model.ts`). It imports the
engine's `Portfolio`; never the reverse. It returns **display-ready** output —
formatted strings, bar ratios, and a `tone` per figure — so the components render
it verbatim and hold **no** derivation or formatting logic. Shape (decision-encoding,
trimmed):

```ts
type Tone = "positive" | "negative";
interface HomeView {
  worth: {
    total: string;                 // Total Portfolio Value
    invested: { label: string; pct: string; amount: string; flex: number };
    cash:     { label: string; pct: string; amount: string; flex: number };
  };
  return: {
    total: string; tone: Tone; percent: string;
    aportado: string; valeHoy: string;             // bridge
    components: { label: string; sub?: string; value: string; tone: Tone; fill: number }[];
  };
  assets: {
    netPnl: string; netPnlTone: Tone;              // aggregate, over Cost Basis
    holdings: {
      ticker: string; shares: string;
      priceAvailable: boolean;
      value: string | null; pnl: string | null; pnlTone: Tone;
      badge: number;                               // palette index
    }[];
  };
}
```

**Derivations owned by the view-model:**
- Composition: Market Value % and Cash % of **Total Portfolio Value**; bar segments proportional to Market Value and Cash.
- Aggregate **Net P&L** % = unrealized ÷ **Cost Basis**.
- Four return components: No realizado = `unrealizedPnl`, Realizado = `realizedPnl`, Dividendos netos = `netDividends`, Comisiones = `−totalFees`; each bar `fill = |amount| ÷ max(|amount|)`.
- Per-holding mapping: shares label ("N acc"), Market Value, Net P&L + %, badge index by position; `priceAvailable === false` ⇒ value/pnl null.

**Formatting** is owned by the view-model via helpers: signed currency with the
sign before the symbol and a unicode minus (threshold ±0.005), signed percentage,
and a shares label with the "acc" suffix; plain `formatUSD` reused.

**Headline hierarchy.** Total Portfolio Value = worth anchor. Total Return =
primary performance (badge + breakdown). Net P&L = holdings stat + breakdown top
line — the same number as `totalReturn.unrealizedPnl`, shown at two grains, never
as an independent headline.

**Components (presentational, dumb):** `HomeHeader`, `WorthCard`, `ReturnCard`,
`AssetsCard`. `ReturnCard` owns only the collapse/expand UI state; every number it
shows comes from `HomeView`.

**Other:** holdings rows show ticker + shares (no company name). Missing price is a
minimal non-crash "Sin precio" state (no aggregate banner). Spanish labels follow
the `UX.md` glossary mapping; "invertido" / "TOTAL INVERTIDO" must not appear.
Reuse existing theme tokens; add Home-specific tokens (elevated card surface,
muted/light/bright text, invested-bar, badge palette).

## Testing Decisions

**What makes a good test:** assert external behavior — the `HomeView` produced for
a given `Portfolio` — against fixed fixtures. Never reach into helper internals or
component internals.

**Module under test: `buildHomeView` only.** Because the view-model owns both the
math and the formatting, its tests transitively cover the signed-format rules and
the composition / return / Net P&L derivations — that is the screen's full external
behavior in one pure surface. Cases:
- `MOCK_PORTFOLIO_SUMMARY` — every figure matches and reconciles (composition %s, the four components and their fills, aggregate Net P&L %, Total Return % over contributed capital).
- A holding with `priceAvailable === false` ⇒ `value`/`pnl` null, flagged for the "Sin precio" state.
- An all-cash portfolio (deposits, no holdings) ⇒ Market Value 0, composition all-cash.
- A negative **Total Return** ⇒ negative `tone` and a unicode-minus string.

**Not separately tested:** the format helpers (covered transitively through the
view-model), `usePortfolio` (a thin mock seam), and the presentational components
(would require adding `@testing-library/react-native`, not installed).

**Prior art:** `utils/portfolio/*.test.ts` — pure functions under vitest/node with
fixed fixtures; the same shape applies (`components/home/view-model.test.ts`).

## Out of Scope

- The zustand store / live data wiring — `usePortfolio()` returns mock; the store arrives with Add Movement.
- Add Movement flow, Holdings/Portafolio tab, Stock detail, Movements list, Settings (all stubs).
- Full missing-price UI (aggregate "N activos sin precio" banner, richer per-row treatment) — only the minimal "Sin precio" guard now.
- Company names / logos for holdings (design uses ticker + shares).
- Exact-fidelity polish: loading the **Manrope** font and adding a gradient library (`expo-linear-gradient`) — both approximated for now (system font; solid-color gradients).
- Real share prices / a price source (mock `PriceMap`).
- Corporate actions, FX, ACATS transfers, account fees (ADR 0002).

## Further Notes

- An initial implementation already exists from the session that produced this PRD
  (the four components, the `usePortfolio` hook, the signed-format helpers, theme
  tokens; the five old Home components removed; `tsc`, tests, and lint all green) —
  **but with the derivations and formatting inline in the components.** This PRD's
  view-model extraction is the agreed refactor of that code into a tested, isolated
  module, leaving the components as pure renderers of `HomeView`.
- The reconciliation invariant from the engine (`Cash + Market Value = net
  contributed capital + Total Return`) holds for the mock data and should remain
  visible in the numbers shown (`$258.09 + $4,596.31 = $4,500 + $354.40 = $4,854.40`).
