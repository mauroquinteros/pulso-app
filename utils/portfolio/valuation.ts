import type {
  Holding,
  Movement,
  Portfolio,
  TotalReturn,
  ValuedHolding,
} from "@/types/models";
import { isDepositMovement, isWithdrawalMovement } from "@/types/models";
import { computeNetDividends, computeTotalFees } from "@/utils/calculations";
import { computeCash } from "./cash";
import { compareChronological, deriveHoldingFacts } from "./reducer";

/** Current price per ticker. A held ticker absent from the map has no price. */
export type PriceMap = Record<string, number>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Applies a current price to a holding's movement facts. When the ticker has no
 * price, the price-applied figures are reported as null and priceAvailable is
 * false — never fabricated (missing-price policy "exclude + flag").
 */
export function valueHolding(
  holding: Holding,
  prices: PriceMap,
): ValuedHolding {
  const price = prices[holding.ticker];
  if (price === undefined) {
    return {
      ...holding,
      priceAvailable: false,
      marketValue: null,
      netPnl: null,
      netPnlPercent: null,
    };
  }
  const marketValue = round2(price * holding.shares);
  const netPnl = round2(marketValue - holding.costBasis);
  const netPnlPercent =
    holding.costBasis !== 0 ? round2((netPnl / holding.costBasis) * 100) : 0;
  return {
    ...holding,
    priceAvailable: true,
    marketValue,
    netPnl,
    netPnlPercent,
  };
}

/**
 * Capstone of the derivation engine: combines per-ticker movement facts (reducer)
 * and Cash with a current-price map to produce the full portfolio. Movement facts
 * (Cash, Cost Basis, Realized P&L, dividends, fees) are always derived; the
 * price-applied facts (Market Value, Net P&L, Total Portfolio Value, Total Return)
 * exclude any held ticker missing a price and expose that gap.
 *
 * Reconciliation invariant (holds when every held ticker is priced):
 *   Cash + Market Value == net contributions + Total Return.
 */
export function assemblePortfolio(
  movements: Movement[],
  prices: PriceMap,
): Portfolio {
  const cash = computeCash(movements);
  const totalFees = computeTotalFees(movements);
  const totalDividends = computeNetDividends(movements);
  const netContributions = round2(computeNetContributions(movements));
  const peakContributions = round2(computePeakContributions(movements));

  // Derive facts per ticker. Realized P&L accumulates across every ticker —
  // including ones fully exited — while only currently-held tickers list as
  // holdings (and contribute Cost Basis / Market Value).
  let realizedPnl = 0;
  let costBasis = 0;
  const holdings: ValuedHolding[] = [];
  for (const [ticker, group] of groupByTicker(movements)) {
    const facts = deriveHoldingFacts(group);
    realizedPnl += facts.realizedPnl;
    if (facts.shares > 0) {
      costBasis += facts.costBasis;
      holdings.push(valueHolding({ ticker, ...facts }, prices));
    }
  }
  realizedPnl = round2(realizedPnl);
  costBasis = round2(costBasis);

  // Price-applied aggregates exclude holdings whose price is unavailable.
  const priced = holdings.filter((h) => h.priceAvailable);
  const marketValue = round2(
    priced.reduce((sum, h) => sum + (h.marketValue ?? 0), 0),
  );
  const unrealizedPnl = round2(
    priced.reduce((sum, h) => sum + (h.netPnl ?? 0), 0),
  );
  const holdingsMissingPrice = holdings.length - priced.length;

  const totalReturnTotal = round2(
    unrealizedPnl + realizedPnl + totalDividends - totalFees,
  );
  const totalReturn: TotalReturn = {
    total: totalReturnTotal,
    unrealizedPnl,
    realizedPnl,
    netDividends: totalDividends,
    totalFees,
    percent:
      peakContributions > 0
        ? round2((totalReturnTotal / peakContributions) * 100)
        : 0,
  };

  return {
    cash,
    costBasis,
    realizedPnl,
    totalDividends,
    totalFees,
    netContributions,
    peakContributions,
    marketValue,
    totalPortfolioValue: round2(cash + marketValue),
    totalReturn,
    holdingsMissingPrice,
    holdings,
  };
}

/** Net contributions (out of pocket, measured at the bank boundary): a deposit
 * contributes amount + transferFee (what left your bank); a withdrawal removes
 * amount - fee (what reached your bank). The transfer fee thus lives here, in the
 * gap between Cash and Net Contributions, which is what makes it erode Total Return. */
function computeNetContributions(movements: Movement[]): number {
  let total = 0;
  for (const m of movements) {
    if (isDepositMovement(m)) total += m.amount + m.transferFee;
    else if (isWithdrawalMovement(m)) total -= m.amount - m.fee;
  }
  return total;
}

/**
 * This is the base for the Total Return *percentage* (not netContributions).
 * Once a realized gain has grown Cash, the user can withdraw more than they ever deposited, driving netContributions negative — and a positive Total Return over a negative base prints an inverted sign.
 * The peak is the money actually put at risk to earn that return, so it stays positive and gives the true percentage. See docs/adr on the Total Return percentage base.
 */
function computePeakContributions(movements: Movement[]): number {
  const ordered = movements
    .filter((m) => isDepositMovement(m) || isWithdrawalMovement(m))
    .sort(compareChronological);

  let running = 0;
  let peak = 0;
  for (const m of ordered) {
    if (isDepositMovement(m)) running += m.amount + m.transferFee;
    else if (isWithdrawalMovement(m)) running -= m.amount - m.fee;
    if (running > peak) peak = running;
  }
  return peak;
}

function groupByTicker(movements: Movement[]): Map<string, Movement[]> {
  const groups = new Map<string, Movement[]>();
  for (const m of movements) {
    if (!("ticker" in m)) continue;
    const group = groups.get(m.ticker);
    if (group) group.push(m);
    else groups.set(m.ticker, [m]);
  }
  return groups;
}
