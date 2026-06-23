import type { Movement } from "@/types/models";
import {
  isBuyMovement,
  isDepositMovement,
  isDividendMovement,
  isSellMovement,
  isWithdrawalMovement,
} from "@/types/models";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes Cash / Buying Power from all movements:
 *   deposits − withdrawals − buy cost + sell proceeds + net dividends,
 * with every fee subtracted as it occurs (deposit transferFee, buy fee, sell
 * fee + regulatoryFees, withdrawal fee). Dividend tax is netted into dividends
 * (gross − tax) and is never treated as a fee. Order-independent.
 */
export function computeCash(movements: Movement[]): number {
  let cash = 0;

  for (const m of movements) {
    if (isDepositMovement(m)) {
      cash += m.amount - m.transferFee;
    } else if (isWithdrawalMovement(m)) {
      cash -= m.amount + m.fee;
    } else if (isBuyMovement(m)) {
      cash -= m.executionPrice * m.shares + m.fee;
    } else if (isSellMovement(m)) {
      cash += m.executionPrice * m.shares - m.fee - m.regulatoryFees;
    } else if (isDividendMovement(m)) {
      cash += m.grossAmount - m.tax;
    }
  }

  return round2(cash);
}
