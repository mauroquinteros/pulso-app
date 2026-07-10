import type { Movement } from "@/types/models";
import {
  isBuyMovement,
  isDepositMovement,
  isSellMovement,
  isWithdrawalMovement,
} from "@/types/models";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The signed change a single movement makes to Cash / Buying Power, net of
 * trading fees.
 *
 * A deposit/withdrawal `amount` is the cash-side figure (what lands in or leaves
 * Buying Power), so transfer fees are NOT subtracted here — they live in Net
 * Contributions (see computeNetContributions). Trading fees still reduce cash:
 * buy fee, sell fee + regulatoryFees. Dividend tax is netted into the dividend
 * (gross − tax) and is never treated as a fee.
 *
 * Its direction is fully determined by the movement's type: deposits, sells and
 * dividends always add; buys and withdrawals always subtract. Returned unrounded
 * so callers can sum many impacts and round once.
 */
export function cashImpact(movement: Movement): number {
  if (isDepositMovement(movement)) return movement.amount;
  if (isWithdrawalMovement(movement)) return -movement.amount;
  if (isBuyMovement(movement))
    return -(movement.executionPrice * movement.shares + movement.fee);
  if (isSellMovement(movement))
    return (
      movement.executionPrice * movement.shares -
      movement.fee -
      movement.regulatoryFees
    );
  return movement.grossAmount - movement.tax; // dividend — the only variant left
}

/**
 * Computes Cash / Buying Power from all movements: the sum of every movement's
 * Cash Impact. This makes the reconciliation invariant true by construction —
 * the movements list renders `cashImpact` per row, so the list and the balance
 * it explains can never drift apart. Order-independent.
 */
export function computeCash(movements: Movement[]): number {
  return round2(movements.reduce((sum, m) => sum + cashImpact(m), 0));
}
