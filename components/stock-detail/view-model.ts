import { byChronologicalDesc, type MovementRow } from "@/components/movements/view-model";
import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import type { Movement, ValuedHolding } from "@/types/models";
import {
  formatDate,
  formatShares,
  formatSharesLabel,
  formatSignedPercent,
  formatSignedUSD,
  formatUSD,
} from "@/utils/format";
import { cashImpact } from "@/utils/portfolio/cash";

export type Tone = "positive" | "negative";

/** The cheap-or-expensive mark of a buy against TODAY's price: `"up"` = bought
 * below it (cheap, green ↑), `"down"` = bought above it (expensive, red ↓),
 * `"neutral"` = within the ±1% band — no mark at all. */
export type BuyTone = "up" | "down" | "neutral";

/** The Movimientos-tab row plus the two per-stock extras. The title carries no
 * ticker (every row here is the same stock), and the amount keeps the tab's
 * convention: a magnitude, never signed, never coloured. */
export interface StockMovementRow extends MovementRow {
  sharesLabel: string | null; // "0.5 acc" on buy/sell; null on dividend
  buyTone: BuyTone | null; // only buys with a current price; null otherwise
}

/** The ticker's lifetime return, concluded by its Total Return of a stock
 * (glossary): `Net P&L + Realized P&L + Net Dividends - Fees`. A dollar figure
 * with NO percentage, ever — there is no honest denominator for one. The only
 * % here belongs to Net P&L, whose numerator and denominator are both
 * current-position figures. Dividends and fees are magnitudes (their direction
 * is in the label, like the movement rows' amounts); realized can swing either
 * way, so it carries sign and tone, and hides entirely at zero. */
export interface StockReturnBlock {
  netPnl: string;
  netPnlPercent: string; // the only % on the screen
  netPnlTone: Tone;
  dividends: string; // "$0.85" — Net Dividends, magnitude
  realized: string | null; // "+$4.20" | null when 0 — no row for "never sold"
  realizedTone: Tone;
  fees: string; // "$0.25" — magnitude
  total: string; // "+$25.51" — Retorno total, never a %
  totalTone: Tone;
}

export interface StockDetailView {
  state: "found" | "not-found";
  ticker: string;
  price: string | null; // null => "Sin precio"
  position: {
    shares: string;
    avgCost: string;
    costBasis: string;
    marketValue: string | null; // null without a price — the cell drops
    /** null without a price — the WHOLE block drops. Dividends, realized and
     * fees are price-free facts, but without Net P&L their sum cannot be the
     * Total Return, and a partial "return" would lie by omission. */
    return: StockReturnBlock | null;
  } | null; // null only when not-found
  rows: StockMovementRow[];
}

/** A signed figure is negative only past the ±0.005 rounding threshold. */
const toneOf = (amount: number): Tone => (amount < -0.005 ? "negative" : "positive");

/** ±1% around today's price reads as "bought at today's price": neither cheap
 * nor expensive. Deliberately NOT the ±0.005 sign threshold above — that one
 * would paint a buy made exactly at today's price as a win, which it isn't. */
const NEUTRAL_BAND = 0.01;

/** Price-vs-price signal of one buy: `(today - paid) / paid`. A percentage of
 * price, never a dollar amount per lot — under moving average cost the lots
 * are diluted and a $ figure would claim something the accounting cannot
 * (ADR-0001). The exact ±1% edge falls in the neutral band. */
const buyToneOf = (executionPrice: number, currentPrice: number): BuyTone => {
  const signal = (currentPrice - executionPrice) / executionPrice;
  if (Math.abs(signal) <= NEUTRAL_BAND) return "neutral";
  return signal > 0 ? "up" : "down";
};

const notFound = (ticker: string): StockDetailView => ({
  state: "not-found",
  ticker,
  price: null,
  position: null,
  rows: [],
});

/**
 * Pure view-model for the stock detail: turns the ticker's ValuedHolding, its
 * current price, and its movements into a display-ready view. The screen and
 * components render it verbatim and hold no derivation or formatting.
 *
 * Takes the holdings array (not one holding) so the lookup and the not-found
 * state are derived here, not by the screen.
 *
 * The engine's no-price policy propagates untouched: a missing price nulls the
 * hero, the market value, and the whole Net P&L block, and strips every buy's
 * colour mark — never a partial or fabricated figure. The three cost figures
 * (shares, average cost, cost basis) survive; they don't need a price.
 *
 * Closed positions never reach the engine's holdings (`shares > 0` filter), so
 * an absent ticker IS the closed/unknown case: `not-found`.
 */
export function buildStockDetailView(
  ticker: string,
  holdings: ValuedHolding[],
  price: number | undefined,
  movements: Movement[],
): StockDetailView {
  const holding = holdings.find((h) => h.ticker === ticker);
  if (!holding || holding.shares === 0) return notFound(ticker);

  const rows: StockMovementRow[] = movements
    .filter((m) => "ticker" in m && m.ticker === ticker)
    .sort(byChronologicalDesc)
    .map((m) => ({
      id: m.id,
      title: MOVEMENT_TYPE_META[m.type].label, // "Compra" — no ticker here
      dateLabel: formatDate(m.executionDate),
      amount: formatUSD(Math.abs(cashImpact(m))),
      type: m.type,
      sharesLabel: "shares" in m ? formatSharesLabel(m.shares) : null,
      buyTone: m.type === "buy" && price !== undefined ? buyToneOf(m.executionPrice, price) : null,
    }));

  return {
    state: "found",
    ticker,
    price: price !== undefined ? formatUSD(price) : null,
    position: {
      shares: formatShares(holding.shares),
      avgCost: formatUSD(holding.avgCost),
      costBasis: formatUSD(holding.costBasis),
      marketValue: holding.marketValue !== null ? formatUSD(holding.marketValue) : null,
      return: buildReturnBlock(holding),
    },
    rows,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The lifetime return block, concluded by the Total Return of a stock:
 * `Net P&L + Realized P&L + Net Dividends - Fees` (glossary formula, scoped to
 * this ticker). Null without a price: Net P&L is unknowable, so the sum is
 * too, and a partial return is never shown. */
function buildReturnBlock(holding: ValuedHolding): StockReturnBlock | null {
  if (holding.netPnl === null || holding.netPnlPercent === null) return null;

  const total = round2(holding.netPnl + holding.realizedPnl + holding.totalDividends - holding.totalFees);
  return {
    netPnl: formatSignedUSD(holding.netPnl),
    netPnlPercent: formatSignedPercent(holding.netPnlPercent),
    netPnlTone: toneOf(holding.netPnl),
    dividends: formatUSD(holding.totalDividends),
    realized: holding.realizedPnl !== 0 ? formatSignedUSD(holding.realizedPnl) : null,
    realizedTone: toneOf(holding.realizedPnl),
    fees: formatUSD(holding.totalFees),
    total: formatSignedUSD(total),
    totalTone: toneOf(total),
  };
}
