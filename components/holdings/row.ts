/**
 * What "Mis Activos" shows, and how a Holding becomes one of its rows. Inicio
 * and Portafolio list the same positions in the same order with the same
 * formatting, so both build their rows here instead of each running its own
 * copy - a drifted accessibility label in particular is invisible until someone
 * turns VoiceOver on.
 */

import type { ValuedHolding } from "@/types/models";
import { formatShares, formatSignedPercent, formatSignedUSD, formatUSD } from "@/utils/format";

export type Tone = "positive" | "negative";

/** A signed figure is negative only past the ±0.005 rounding threshold. */
export const toneOf = (amount: number): Tone => (amount < -0.005 ? "negative" : "positive");

export interface HoldingRow {
  ticker: string;
  shares: string; // plain count, max 5 decimals, no suffix
  value: string | null; // Market Value; null when the ticker has no price
  pnl: string | null; // "+$240.18"
  pnlPct: string | null; // "+8.73%"
  pnlTone: Tone;
  /** What VoiceOver reads for the whole row, spelling out the units the layout
   * lets the screen drop. */
  a11yLabel: string;
}

const marketValueOf = (h: ValuedHolding): number =>
  h.priceAvailable && h.marketValue !== null ? h.marketValue : -Infinity;

/** Market Value descending; unpriced holdings sort last. The `-Infinity` is
 * load-bearing rather than a stand-in for zero: an unpriced holding has no
 * Market Value at all, so it sorts last outright instead of tying with a
 * position that is genuinely worth nothing. */
export const byMarketValueDesc = (a: ValuedHolding, b: ValuedHolding): number =>
  marketValueOf(b) - marketValueOf(a);

export function buildHoldingRow(h: ValuedHolding): HoldingRow {
  const priced = h.priceAvailable && h.netPnl !== null;
  const shares = formatShares(h.shares);
  const value = h.priceAvailable && h.marketValue !== null ? formatUSD(h.marketValue) : null;
  const pnl = priced ? formatSignedUSD(h.netPnl ?? 0) : null;
  const pnlPct = priced ? formatSignedPercent(h.netPnlPercent ?? 0) : null;
  return {
    ticker: h.ticker,
    shares,
    value,
    pnl,
    pnlPct,
    pnlTone: toneOf(h.netPnl ?? 0),
    // "acciones" is spelled out here and nowhere on screen: the row drops the
    // unit because the ticker beside the number makes it unambiguous, which is
    // a fact about the layout that a screen reader cannot use.
    a11yLabel:
      value === null
        ? `${h.ticker}, sin precio, ${shares} acciones`
        : `${h.ticker}, ${value}, ${shares} acciones, rendimiento ${pnl} ${pnlPct}`,
  };
}
