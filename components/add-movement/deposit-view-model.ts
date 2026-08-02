import type { DepositMovement } from "@/types/models";
import { parseAmount } from "@/utils/input";

export interface DepositInput {
  amount: string;
  transferFee: string;
  executionDate: string; // YYYY-MM-DD
}

export interface DepositSummary {
  /** Monto + Comisión; what you contribute / leaves your bank (0 when Monto is blank). */
  aportado: number;
  /** Save-gate: Monto > 0 (any non-negative Comisión is fine). */
  saveEnabled: boolean;
  /** Monto > 0 — drives the teal accent on the Monto field. */
  amountPositive: boolean;
  /** A Monto was entered but is ≤ 0 — drives the error once the field is touched. */
  amountInvalid: boolean;
}

export interface DepositDeps {
  id: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/**
 * Pure summary of the deposit form: the live "Aportarás" figure and the
 * save-gate. Monto is the cash-side amount that lands in Buying Power; Aportado
 * (Monto + Comisión) is what leaves your bank, mirroring computeNetContributions'
 * deposit branch — it previews the engine, it does not re-implement it. A blank
 * Monto shows $0.00 regardless of any fee.
 */
export function summarizeDeposit(input: DepositInput): DepositSummary {
  const amount = parseAmount(input.amount);
  const fee = parseAmount(input.transferFee);
  const aportado = input.amount === "" ? 0 : amount + fee;

  const amountPositive = amount > 0;
  const amountInvalid = input.amount !== "" && amount <= 0;

  return {
    aportado,
    saveEnabled: amountPositive,
    amountPositive,
    amountInvalid,
  };
}

/**
 * Maps validated form input to a typed DepositMovement. System fields
 * (id, createdAt) come from injected generators so the result is
 * deterministic and unit-testable; an empty Comisión defaults to 0.
 */
export function buildDepositMovement(
  input: DepositInput,
  deps: DepositDeps,
): DepositMovement {
  return {
    id: deps.id(),
    type: "deposit",
    amount: parseAmount(input.amount),
    transferFee: input.transferFee === "" ? 0 : parseAmount(input.transferFee),
    executionDate: input.executionDate,
    createdAt: deps.now(),
  };
}
