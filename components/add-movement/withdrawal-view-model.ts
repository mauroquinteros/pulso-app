import type { WithdrawalMovement } from "@/types/models";
import { parseAmount } from "@/utils/input";

export interface WithdrawalInput {
  amount: string;
  fee: string;
  executionDate: string; // YYYY-MM-DD
}

export interface WithdrawalSummary {
  /** Monto − Comisión; what reaches the bank (0 when Monto is blank). */
  recibiras: number;
  /** Save-gate: Monto > 0 and Comisión < Monto and Monto ≤ available Cash. */
  saveEnabled: boolean;
  /** Monto > 0 — drives the teal accent on the Monto field. */
  amountPositive: boolean;
  /** A Monto was entered but is ≤ 0 — drives the error once the field is touched. */
  amountInvalid: boolean;
  /** A Comisión ≥ Monto (would push Recibirás ≤ 0) — error once touched. */
  feeInvalid: boolean;
  /** Monto exceeds the available Cash — over-withdrawal; blocks save. */
  insufficientFunds: boolean;
}

export interface WithdrawalDeps {
  id: () => string;
  userId: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/**
 * Pure summary of the withdrawal form: the live "Recibirás en tu banco" figure
 * and the save-gate. The recibiras is Monto − Comisión (what reaches the bank).
 * Under the cash-side convention only the Monto leaves Cash, so the over-withdrawal
 * gate compares Monto (not Monto + Comisión) against the available Cash, which the
 * caller passes in. A blank Monto shows $0.00 regardless of any fee.
 */
export function summarizeWithdrawal(
  input: WithdrawalInput,
  availableCash: number,
): WithdrawalSummary {
  const amount = parseAmount(input.amount);
  const fee = parseAmount(input.fee);
  const recibiras = input.amount === "" ? 0 : amount - fee;

  const amountPositive = amount > 0;
  const amountInvalid = input.amount !== "" && amount <= 0;
  // Recibirás must stay > 0, so the fee has a ceiling. Empty fee is fine (→ 0).
  const feeInvalid = input.fee !== "" && amountPositive && fee >= amount;
  const insufficientFunds = amountPositive && amount > availableCash;

  const feeOk = fee >= 0 && (input.fee === "" || fee < amount);
  const saveEnabled = amountPositive && feeOk && amount <= availableCash;

  return {
    recibiras,
    saveEnabled,
    amountPositive,
    amountInvalid,
    feeInvalid,
    insufficientFunds,
  };
}

/**
 * Maps validated form input to a typed WithdrawalMovement. System fields
 * (id, userId, createdAt) come from injected generators so the result is
 * deterministic and unit-testable; an empty Comisión defaults to 0.
 */
export function buildWithdrawalMovement(
  input: WithdrawalInput,
  deps: WithdrawalDeps,
): WithdrawalMovement {
  return {
    id: deps.id(),
    userId: deps.userId(),
    type: "withdrawal",
    amount: parseAmount(input.amount),
    fee: input.fee === "" ? 0 : parseAmount(input.fee),
    executionDate: input.executionDate,
    createdAt: deps.now(),
  };
}
