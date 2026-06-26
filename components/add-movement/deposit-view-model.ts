import type { DepositMovement } from "@/types/models";

export interface DepositInput {
  amount: string;
  transferFee: string;
  executedAt: string; // YYYY-MM-DD
}

export interface DepositSummary {
  /** Monto − Comisión; what the live summary shows (0 when Monto is blank). */
  efectivo: number;
  /** Save-gate: Monto > 0 and a valid Comisión (≥ 0 and < Monto). */
  saveEnabled: boolean;
  /** Monto > 0 — drives the teal accent on the Monto field. */
  amountPositive: boolean;
  /** A Monto was entered but is ≤ 0 — drives the error once the field is touched. */
  amountInvalid: boolean;
  /** A Comisión ≥ Monto (would push Efectivo ≤ 0) — error once touched. */
  feeInvalid: boolean;
}

export interface DepositDeps {
  id: () => string;
  userId: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/** Parse a decimal string; blank/garbage → 0. */
function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Pure summary of the deposit form: the live "Se sumará a tu efectivo" figure
 * and the save-gate. The efectivo mirrors computeCash's deposit branch
 * (amount − transferFee) — it previews the engine, it does not re-implement it.
 * A blank Monto shows $0.00 regardless of any fee.
 */
export function summarizeDeposit(input: DepositInput): DepositSummary {
  const amount = parseAmount(input.amount);
  const fee = parseAmount(input.transferFee);
  const efectivo = input.amount === "" ? 0 : amount - fee;

  const amountPositive = amount > 0;
  const amountInvalid = input.amount !== "" && amount <= 0;
  // A fee ≥ the deposit makes Efectivo ≤ 0 — nonsense. Empty fee is fine (→ 0).
  const feeInvalid =
    input.transferFee !== "" && amountPositive && fee >= amount;
  const feeOk = fee >= 0 && (input.transferFee === "" || fee < amount);

  return {
    efectivo,
    saveEnabled: amountPositive && feeOk,
    amountPositive,
    amountInvalid,
    feeInvalid,
  };
}

/**
 * Maps validated form input to a typed DepositMovement. System fields
 * (id, userId, createdAt) come from injected generators so the result is
 * deterministic and unit-testable; an empty Comisión defaults to 0.
 */
export function buildDepositMovement(
  input: DepositInput,
  deps: DepositDeps,
): DepositMovement {
  return {
    id: deps.id(),
    userId: deps.userId(),
    type: "deposit",
    amount: parseAmount(input.amount),
    transferFee: input.transferFee === "" ? 0 : parseAmount(input.transferFee),
    executedAt: input.executedAt,
    createdAt: deps.now(),
  };
}
