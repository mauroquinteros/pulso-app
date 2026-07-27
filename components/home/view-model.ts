import type { Portfolio } from "@/types/models";
import {
  formatSharesLabel,
  formatSignedPercent,
  formatSignedUSD,
  formatUSD,
} from "@/utils/format";

export type Tone = "positive" | "negative";

export interface HomeView {
  worth: {
    total: string;
    invested: { label: string; pct: string; amount: string; flex: number };
    cash: { label: string; pct: string; amount: string; flex: number };
  };
  return: {
    total: string;
    tone: Tone;
    percent: string;
    // Set only when Peak Contributions exceeds current Net Contributions (a
    // withdrawal has lowered the running total below its high-water mark), so
    // the percentage divides by a base that is not the shown Aportado. null
    // otherwise, when the two coincide and no explanation is needed.
    percentTooltip: string | null;
    aportado: string;
    valeHoy: string;
    components: {
      label: string;
      sub?: string;
      value: string;
      tone: Tone;
      fill: number;
    }[];
  };
  assets: {
    netPnl: string;
    netPnlTone: Tone;
    holdings: {
      ticker: string;
      shares: string;
      priceAvailable: boolean;
      value: string | null;
      pnl: string | null;
      pnlTone: Tone;
    }[];
  };
}

/** A signed figure is negative only past the ±0.005 rounding threshold. */
const toneOf = (amount: number): Tone =>
  amount < -0.005 ? "negative" : "positive";

/** One-decimal share-of-total percent, e.g. "94.7%". Guards a zero total. */
const compositionPct = (part: number, total: number): string =>
  `${total !== 0 ? ((part / total) * 100).toFixed(1) : "0.0"}%`;

/**
 * Pure view-model for the Home screen: turns the derived Portfolio into
 * display-ready strings, bar ratios, and a tone per signed figure. The Home
 * components render this verbatim and hold no derivation or formatting.
 */
export function buildHomeView(portfolio: Portfolio): HomeView {
  const { totalReturn, holdings } = portfolio;

  // Worth — composition of Total Portfolio Value into Market Value vs Cash.
  const total = portfolio.totalPortfolioValue;
  const worth: HomeView["worth"] = {
    total: formatUSD(total),
    invested: {
      label: "En activos",
      pct: compositionPct(portfolio.marketValue, total),
      amount: formatUSD(portfolio.marketValue),
      flex: Math.max(portfolio.marketValue, 0.0001),
    },
    cash: {
      label: "Efectivo",
      pct: compositionPct(portfolio.cash, total),
      amount: formatUSD(portfolio.cash),
      flex: Math.max(portfolio.cash, 0.0001),
    },
  };

  // Return — Total Return + the four proportional components.
  const componentAmounts = [
    {
      label: "No realizado",
      sub: "· Net P&L",
      amount: totalReturn.unrealizedPnl,
    },
    { label: "Realizado", amount: totalReturn.realizedPnl },
    { label: "Dividendos netos", amount: totalReturn.netDividends },
    { label: "Comisiones", amount: -totalReturn.totalFees },
  ];
  const maxAbs = Math.max(
    ...componentAmounts.map((c) => Math.abs(c.amount)),
    0.0001,
  );
  const peakExceedsNet =
    portfolio.peakContributions > portfolio.netContributions;
  const returnView: HomeView["return"] = {
    total: formatSignedUSD(totalReturn.total),
    tone: toneOf(totalReturn.total),
    percent: formatSignedPercent(totalReturn.percent),
    percentTooltip: peakExceedsNet
      ? `Calculado sobre tu aportado máximo (${formatUSD(portfolio.peakContributions)}), no el actual, para que un retiro no infle tu rendimiento.`
      : null,
    aportado: formatUSD(portfolio.netContributions),
    valeHoy: formatUSD(total),
    components: componentAmounts.map((c) => ({
      label: c.label,
      ...(c.sub ? { sub: c.sub } : {}),
      value: formatSignedUSD(c.amount),
      tone: toneOf(c.amount),
      fill: Math.abs(c.amount) / maxAbs,
    })),
  };

  // Assets — aggregate Net P&L over Cost Basis, plus per-holding rows.
  const netPnl = totalReturn.unrealizedPnl;
  const netPnlPercent =
    portfolio.costBasis !== 0 ? (netPnl / portfolio.costBasis) * 100 : 0;
  const assets: HomeView["assets"] = {
    netPnl: `${formatSignedUSD(netPnl)} · ${formatSignedPercent(netPnlPercent)}`,
    netPnlTone: toneOf(netPnl),
    holdings: holdings.map((h) => ({
      ticker: h.ticker,
      shares: formatSharesLabel(h.shares),
      priceAvailable: h.priceAvailable,
      value:
        h.priceAvailable && h.marketValue !== null
          ? formatUSD(h.marketValue)
          : null,
      pnl:
        h.priceAvailable && h.netPnl !== null
          ? `${formatSignedUSD(h.netPnl)} · ${formatSignedPercent(h.netPnlPercent ?? 0)}`
          : null,
      pnlTone: toneOf(h.netPnl ?? 0),
    })),
  };

  return { worth, return: returnView, assets };
}
