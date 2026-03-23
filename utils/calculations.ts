import type { Movement } from "@/types/models";
import {
  isBuyMovement,
  isDepositMovement,
  isDividendMovement,
  isSellMovement,
  isWithdrawalMovement,
} from "@/types/models";

/**
 * Computes the weighted average cost per share from buy movements only.
 * Formula: sum(execution_price * shares) / sum(shares) for type === 'buy'
 */
export function computeAvgCost(movements: Movement[]): number {
  const buys = movements.filter(isBuyMovement);
  if (buys.length === 0) return 0;

  let totalCost = 0;
  let totalShares = 0;

  for (const m of buys) {
    totalCost += m.execution_price * m.shares;
    totalShares += m.shares;
  }

  if (totalShares === 0) return 0;

  const result = totalCost / totalShares;
  return Math.round(result * 100) / 100;
}

/**
 * Computes the unrealized profit or loss for a position.
 * Formula: (currentPrice - avgCost) * shares
 */
export function computeUnrealizedPnL(
  avgCost: number,
  currentPrice: number,
  shares: number,
): number {
  const result = (currentPrice - avgCost) * shares;
  return Math.round(result * 100) / 100;
}

/**
 * Sums fees across ALL movements, per subtype:
 * - BuyMovement: fee
 * - SellMovement: fee + regulatory_fees
 * - DepositMovement: transfer_fee
 * - WithdrawalMovement: fee
 * - DividendMovement: no fee (skipped)
 */
export function computeTotalFees(movements: Movement[]): number {
  let total = 0;

  for (const m of movements) {
    if (isBuyMovement(m)) total += m.fee;
    else if (isSellMovement(m)) {
      total += m.fee;
      total += m.regulatory_fees;
    } else if (isDepositMovement(m)) total += m.transfer_fee;
    else if (isWithdrawalMovement(m)) total += m.fee;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Sums net dividends from dividend-type movements only.
 * Formula: sum(gross_amount - tax) for type === 'dividend'
 */
export function computeNetDividends(movements: Movement[]): number {
  const dividends = movements.filter(isDividendMovement);

  let total = 0;

  for (const m of dividends) {
    total += m.gross_amount - m.tax;
  }

  return Math.round(total * 100) / 100;
}
