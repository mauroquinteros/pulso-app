import type { Movement } from "@/types/models";
import { isBuyMovement, isDepositMovement, isSellMovement, isWithdrawalMovement } from "@/types/models";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The signed change a single movement makes to Cash / Buying Power, net of
 * trading fees.
 *
 * A deposit/withdrawal `amount` is the cash-side figure (what lands in or leaves
 * Buying Power), so transfer fees are NOT subtracted here — they live in Net
 * Contributions (see computeNetContributions). Trading fees still reduce cash:
 * buy fee, sell fee + regulatoryFees. Dividend tax is netted into the dividend
 * (gross - tax) and is never treated as a fee.
 *
 * Its direction is fully determined by the movement's type: deposits, sells and
 * dividends always add; buys and withdrawals always subtract. Returned unrounded,
 * and every caller rounds it to the cent before doing anything with it - see
 * `computeCash` for why that is the total's job rather than this one's.
 */
export function cashImpact(movement: Movement): number {
  if (isDepositMovement(movement)) return movement.amount;
  if (isWithdrawalMovement(movement)) return -movement.amount;
  if (isBuyMovement(movement)) return -(movement.executionPrice * movement.shares + movement.fee);
  if (isSellMovement(movement))
    return movement.executionPrice * movement.shares - movement.fee - movement.regulatoryFees;
  return movement.grossAmount - movement.tax; // dividend — the only variant left
}

/**
 * Computes Cash / Buying Power from all movements: the sum of every movement's
 * Cash Impact, each rounded to the cent first. Order-independent.
 *
 * Rounded per movement rather than once at the end, which is what makes the
 * reconciliation invariant true rather than merely claimed: the movements list
 * renders each impact to the cent, so the total has to be the sum of those cents
 * and not of the raw figures behind them. Every other caller of `cashImpact`
 * already rounds it - the detail receipt, the movements list, the stock detail -
 * so this was the one place treating it as a raw quantity.
 *
 * Summing raw also produced a Cash of -0: a buy may overdraw by under half a cent,
 * because the buy form's gate compares cent-rounded figures (ADR 0012), and
 * `Math.round` keeps the sign of what it rounds away. Money has no signed zero.
 *
 * What this does NOT reconcile: an impact landing on an exact half-cent. `round2`
 * rounds those toward +Infinity while the display rounds them away from zero, so
 * the row and the ledger can still differ by a cent there. Pre-existing, tracked in
 * .scratch/tech-debt/backlog.md.
 */
export function computeCash(movements: Movement[]): number {
  return round2(movements.reduce((sum, m) => sum + round2(cashImpact(m)), 0));
}
