import type { BuyMovement, Movement, SellMovement } from "@/types/models";
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
 * processed chronologically (executionDate, then createdAt).
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
      // Never sell more than is held at this point of the replay. An
      // incoherent history (a sell backdated before its backing buy) must not
      // fabricate realized P&L out of a $0 average cost, nor leave negative
      // shares for the full-exit reset to swallow. The sell form prevents
      // these from being created (maxSellableAsOf); this is the engine's own
      // guarantee that it never invents figures.
      const sold = Math.min(m.shares, shares);
      const avgCostAtSale = shares > 0 ? costTotal / shares : 0;
      realizedPnl += (m.executionPrice - avgCostAtSale) * sold;
      shares -= sold;
      costTotal -= avgCostAtSale * sold;
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

/**
 * The most shares of `ticker` a sell dated `date` could take without driving
 * the position negative anywhere in the replay: the minimum of the shares
 * held as of `date` and the shares held after every later movement. This is
 * the sell form's gate for backdated sells — "what you hold today" is not
 * enough when the sale lands in the past: shares held then may already be
 * spent by a sell that comes after the chosen date.
 *
 * A sell dated the same day as an existing movement sorts after it (its
 * `createdAt` is newest), so same-day buys count as held.
 */
export function maxSellableAsOf(
  movements: Movement[],
  ticker: string,
  date: string,
): number {
  const ordered = movements
    .filter(
      (m): m is BuyMovement | SellMovement =>
        (isBuyMovement(m) || isSellMovement(m)) && m.ticker === ticker,
    )
    .sort(compareChronological);

  let held = 0;
  let sellable = Infinity;
  let pastDate = false;
  for (const m of ordered) {
    if (!pastDate && m.executionDate > date) {
      pastDate = true;
      sellable = held;
    }
    held += isBuyMovement(m) ? m.shares : -m.shares;
    if (pastDate) sellable = Math.min(sellable, held);
  }
  if (!pastDate) sellable = held; // the date is at/after the last movement
  return Math.max(0, round8(sellable));
}

function compareChronological(a: Movement, b: Movement): number {
  if (a.executionDate !== b.executionDate) {
    return a.executionDate < b.executionDate ? -1 : 1;
  }
  if (a.createdAt === b.createdAt) return 0;
  return a.createdAt < b.createdAt ? -1 : 1;
}
