import type { DepositMovement } from "@/types/models";

export interface DepositInput {
  amount: string;
  transferFee: string;
  executedAt: string; // YYYY-MM-DD
}

export interface DepositSummary {
  /** Monto − Comisión; what the live summary shows (0 when Monto is blank). */
  efectivo: number;
  /** Save-gate. The only hard rule this slice enforces is Monto > 0. */
  saveEnabled: boolean;
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
  return { efectivo, saveEnabled: amount > 0 };
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
