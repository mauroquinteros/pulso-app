import type { Movement } from "@/types/models";
import {
  isBuyMovement,
  isDepositMovement,
  isDividendMovement,
  isSellMovement,
  isWithdrawalMovement,
} from "@/types/models";

/**
 * Sums fees across ALL movements, per subtype:
 * - BuyMovement: fee
 * - SellMovement: fee + regulatoryFees
 * - DepositMovement: transferFee
 * - WithdrawalMovement: fee
 * - DividendMovement: no fee (skipped)
 */
export function computeTotalFees(movements: Movement[]): number {
  let total = 0;

  for (const m of movements) {
    if (isBuyMovement(m)) total += m.fee;
    else if (isSellMovement(m)) {
      total += m.fee;
      total += m.regulatoryFees;
    } else if (isDepositMovement(m)) total += m.transferFee;
    else if (isWithdrawalMovement(m)) total += m.fee;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Sums net dividends from dividend-type movements only.
 * Formula: sum(grossAmount - tax) for type === 'dividend'
 */
export function computeNetDividends(movements: Movement[]): number {
  const dividends = movements.filter(isDividendMovement);

  let total = 0;

  for (const m of dividends) {
    total += m.grossAmount - m.tax;
  }

  return Math.round(total * 100) / 100;
}
