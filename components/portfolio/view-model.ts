import { Colors, HoldingBadgePalette } from "@/constants/theme";
import type { Portfolio, ValuedHolding } from "@/types/models";
import {
  formatShares,
  formatSignedPercent,
  formatSignedUSD,
  formatUSD,
} from "@/utils/format";

export type Tone = "positive" | "negative";

/** Links a segment to its legend row by color: a segment's position index into
 * the palette, or one of the two reserved colors. */
export type ColorIndex = number | "cash" | "others";

/** Resolves a segment's colorIndex to its stroke/swatch color: a palette entry,
 * or one of the two reserved colors (Efectivo, Otros). Pure, and shared by the
 * donut and its legend so a slice and its row can never disagree. The wrap is a
 * guard, not a feature — MAX_HOLDING_SEGMENTS is capped to the palette length
 * precisely so no two drawn segments resolve to the same color. */
export function segmentColor(colorIndex: ColorIndex): string {
  if (colorIndex === "cash") return Colors.investedBar;
  if (colorIndex === "others") return Colors.textMuted;
  return HoldingBadgePalette[colorIndex % HoldingBadgePalette.length].color;
}

export interface DonutSegment {
  key: string; // ticker | "cash" | "others"
  label: string; // "AAPL" | "Efectivo" | "Otros"
  fraction: number; // 0..1, geometry-free (arc math lives in the donut)
  amount: string; // shown in the center when the segment is selected
  colorIndex: ColorIndex;
}

export interface LegendRow {
  key: string;
  label: string;
  colorIndex: ColorIndex;
  pct: string | null; // "61.6%" (1 decimal) | null when cash < 0
  amount: string; // center readout when selected via the legend
  negative: boolean; // red treatment for a negative-cash row
}

export interface HoldingRow {
  ticker: string;
  sharesLabel: string; // plain number, max 5 decimals, no suffix
  priceAvailable: boolean;
  value: string | null; // "$2,991.21"
  pnl: string | null; // "+$240.18" / "-$12.40"
  pnlPct: string | null; // "+8.73%" / "-1.20%" (2 decimals, signed like Home)
  pnlTone: Tone; // threshold ±0.005
}

export interface PortfolioView {
  state: "empty" | "ready"; // empty → CTA screen, no cards
  distribution: {
    centerTotal: string; // Total Portfolio Value, donut center default
    segments: DonutSegment[]; // donut only — ordered, max 6 holdings + Efectivo
    legend: LegendRow[]; // exact record — includes a negative-cash row
    missingPriceCount: number; // "N sin precio" note when > 0
  };
  holdings: HoldingRow[]; // "Mis Activos", Market Value desc, unpriced last
}

/** A signed figure is negative only past the ±0.005 rounding threshold. */
const toneOf = (amount: number): Tone =>
  amount < -0.005 ? "negative" : "positive";

/** One-decimal share-of-total, e.g. "61.6%". */
const allocationPct = (fraction: number): string =>
  `${(fraction * 100).toFixed(1)}%`;

// Beyond this many priced holdings, the tail collapses into a single "Otros"
// segment: the top TOP_WHEN_GROUPED plus "Otros". Efectivo is never grouped.
const MAX_HOLDING_SEGMENTS = 5;
const TOP_WHEN_GROUPED = 5;

const marketValueOf = (h: ValuedHolding): number =>
  h.priceAvailable && h.marketValue !== null ? h.marketValue : -Infinity;

/** Market Value descending; unpriced holdings (no market value) sort last. */
const byMarketValueDesc = (a: ValuedHolding, b: ValuedHolding): number =>
  marketValueOf(b) - marketValueOf(a);

/**
 * Pure view-model for the Portfolio screen: turns the derived Portfolio into a
 * display-ready view — donut segments as fractions (no SVG geometry), legend
 * rows, "Mis Activos" list rows, and every degenerate state as declarative
 * data. The screen and components render this verbatim and hold no derivation
 * or formatting.
 */
export function buildPortfolioView(portfolio: Portfolio): PortfolioView {
  const { cash, holdings, holdingsMissingPrice } = portfolio;

  // "Mis Activos" rows — priced first (Market Value desc), unpriced last.
  const sorted = [...holdings].sort(byMarketValueDesc);
  const holdingRows: HoldingRow[] = sorted.map((h) => ({
    ticker: h.ticker,
    sharesLabel: formatShares(h.shares),
    priceAvailable: h.priceAvailable,
    value:
      h.priceAvailable && h.marketValue !== null
        ? formatUSD(h.marketValue)
        : null,
    pnl:
      h.priceAvailable && h.netPnl !== null ? formatSignedUSD(h.netPnl) : null,
    pnlPct:
      h.priceAvailable && h.netPnl !== null
        ? formatSignedPercent(h.netPnlPercent ?? 0)
        : null,
    pnlTone: toneOf(h.netPnl ?? 0),
  }));

  // Nothing to show: no holdings and no positive cash.
  if (holdings.length === 0 && cash <= 0) {
    return {
      state: "empty",
      distribution: {
        centerTotal: formatUSD(0),
        segments: [],
        legend: [],
        missingPriceCount: 0,
      },
      holdings: [],
    };
  }

  return {
    state: "ready",
    distribution: buildDistribution(portfolio, sorted, holdingsMissingPrice),
    holdings: holdingRows,
  };
}

function buildDistribution(
  portfolio: Portfolio,
  sorted: ValuedHolding[],
  missingPriceCount: number,
): PortfolioView["distribution"] {
  const { cash, totalPortfolioValue } = portfolio;
  const priced = sorted.filter(
    (h) => h.priceAvailable && h.marketValue !== null,
  );
  const centerTotal = formatUSD(totalPortfolioValue);

  // Negative cash (degenerate, tolerated): segments proportional over the sum
  // of Market Values — never over a cash-distorted TPV — and Efectivo appears
  // in the legend only, in red and without a percentage.
  if (cash < 0) {
    const sumMarketValue = priced.reduce(
      (sum, h) => sum + (h.marketValue ?? 0),
      0,
    );
    const { segments, legend } = buildHoldingSegments(priced, sumMarketValue);
    legend.push({
      key: "cash",
      label: "Efectivo",
      colorIndex: "cash",
      pct: null,
      amount: formatSignedUSD(cash),
      negative: true,
    });
    return { centerTotal, segments, legend, missingPriceCount };
  }

  // Normal / cash-only: Allocation is over Total Portfolio Value, which already
  // excludes unpriced holdings, so fractions sum to 1.
  const { segments, legend } = buildHoldingSegments(priced, totalPortfolioValue);
  if (cash > 0) {
    const fraction = totalPortfolioValue !== 0 ? cash / totalPortfolioValue : 0;
    const amount = formatUSD(cash);
    segments.push({
      key: "cash",
      label: "Efectivo",
      fraction,
      amount,
      colorIndex: "cash",
    });
    legend.push({
      key: "cash",
      label: "Efectivo",
      colorIndex: "cash",
      pct: allocationPct(fraction),
      amount,
      negative: false,
    });
  }
  return { centerTotal, segments, legend, missingPriceCount };
}

/** Priced holdings → parallel segment and legend lists over `denom`. Past 5
 * holdings, the tail after the top 5 collapses into a single "Otros" entry, so
 * the donut never draws more than MAX_HOLDING_SEGMENTS coloured slices. */
function buildHoldingSegments(
  priced: ValuedHolding[],
  denom: number,
): { segments: DonutSegment[]; legend: LegendRow[] } {
  const segments: DonutSegment[] = [];
  const legend: LegendRow[] = [];
  const grouped = priced.length > MAX_HOLDING_SEGMENTS;
  const head = grouped ? priced.slice(0, TOP_WHEN_GROUPED) : priced;

  head.forEach((h, i) => {
    const marketValue = h.marketValue ?? 0;
    const fraction = denom !== 0 ? marketValue / denom : 0;
    const amount = formatUSD(marketValue);
    segments.push({
      key: h.ticker,
      label: h.ticker,
      fraction,
      amount,
      colorIndex: i,
    });
    legend.push({
      key: h.ticker,
      label: h.ticker,
      colorIndex: i,
      pct: allocationPct(fraction),
      amount,
      negative: false,
    });
  });

  if (grouped) {
    const tail = priced.slice(TOP_WHEN_GROUPED);
    const tailMarketValue = tail.reduce(
      (sum, h) => sum + (h.marketValue ?? 0),
      0,
    );
    const fraction = denom !== 0 ? tailMarketValue / denom : 0;
    const amount = formatUSD(tailMarketValue);
    segments.push({
      key: "others",
      label: "Otros",
      fraction,
      amount,
      colorIndex: "others",
    });
    legend.push({
      key: "others",
      label: "Otros",
      colorIndex: "others",
      pct: allocationPct(fraction),
      amount,
      negative: false,
    });
  }

  return { segments, legend };
}
