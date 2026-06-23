import type { Movement } from "@/types/models";
import {
  isBuyMovement,
  isDividendMovement,
  isSellMovement,
} from "@/types/models";

/**
 * The movement-derived facts for a single ticker's position. Excludes anything
 * that needs a current price (Market Value, Net P&L) — those belong to the
 * valuation layer.
 */
export interface HoldingFacts {
  shares: number;
  avgCost: number;
  costBasis: number;
  realizedPnl: number;
  totalDividends: number;
  totalFees: number;
}

const SHARE_EPSILON = 1e-9;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round8 = (n: number) => Math.round(n * 1e8) / 1e8;

/**
 * Derives a single ticker's movement facts, applying the moving-average cost
 * method (see docs/adr/0001-moving-average-cost-method.md): average cost updates
 * on each buy, is unchanged by a partial sell (which only reduces quantity), and
 * resets to zero on a full exit so a later re-buy starts fresh. Commissions are
 * excluded from cost basis. Realized P&L is gross (before sell fees).
 *
 * Assumes every movement belongs to the same ticker (buy/sell/dividend); any
 * other movement type is ignored. Input order does not matter — movements are
 * processed chronologically (executedAt, then createdAt).
 */
export function deriveHoldingFacts(movements: Movement[]): HoldingFacts {
  const ordered = [...movements].sort(compareChronological);

  let shares = 0;
  let costTotal = 0; // total cost of currently-held shares
  let realizedPnl = 0;
  let totalDividends = 0;
  let totalFees = 0;

  for (const m of ordered) {
    if (isBuyMovement(m)) {
      totalFees += m.fee;
      shares += m.shares;
      costTotal += m.executionPrice * m.shares;
    } else if (isSellMovement(m)) {
      totalFees += m.fee + m.regulatoryFees;
      const avgCostAtSale = shares > 0 ? costTotal / shares : 0;
      realizedPnl += (m.executionPrice - avgCostAtSale) * m.shares;
      shares -= m.shares;
      costTotal -= avgCostAtSale * m.shares;
      if (shares < SHARE_EPSILON) {
        // Full exit: reset so a later re-buy starts a fresh average.
        shares = 0;
        costTotal = 0;
      }
    } else if (isDividendMovement(m)) {
      totalDividends += m.grossAmount - m.tax;
    }
  }

  return {
    shares: round8(shares),
    avgCost: shares > 0 ? round2(costTotal / shares) : 0,
    costBasis: round2(costTotal),
    realizedPnl: round2(realizedPnl),
    totalDividends: round2(totalDividends),
    totalFees: round2(totalFees),
  };
}

function compareChronological(a: Movement, b: Movement): number {
  if (a.executedAt !== b.executedAt) {
    return a.executedAt < b.executedAt ? -1 : 1;
  }
  if (a.createdAt === b.createdAt) return 0;
  return a.createdAt < b.createdAt ? -1 : 1;
}
