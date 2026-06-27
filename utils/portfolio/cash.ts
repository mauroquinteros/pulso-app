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
 *   deposit amounts − withdrawal amounts − buy cost + sell proceeds + net dividends.
 * A deposit/withdrawal `amount` is the cash-side figure (what lands in or leaves
 * Buying Power), so transfer fees are NOT subtracted here — they live in Net
 * Contributions (see computeNetContributions). Trading fees still reduce cash:
 * buy fee, sell fee + regulatoryFees. Dividend tax is netted into dividends
 * (gross − tax) and is never treated as a fee. Order-independent.
 */
export function computeCash(movements: Movement[]): number {
  let cash = 0;

  for (const m of movements) {
    if (isDepositMovement(m)) {
      cash += m.amount;
    } else if (isWithdrawalMovement(m)) {
      cash -= m.amount;
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
