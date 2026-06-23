import { describe, it, expect } from "vitest";
import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { computeCash } from "./cash";

let seq = 0;
const base = (executedAt: string) => ({
  id: `m${seq++}`,
  userId: "u",
  executedAt,
  createdAt: `${executedAt}T00:00:00Z`,
});
const deposit = (amount: number, transferFee: number): DepositMovement => ({
  ...base("2025-01-01"),
  type: "deposit",
  amount,
  transferFee,
});
const withdrawal = (amount: number, fee: number): WithdrawalMovement => ({
  ...base("2025-01-01"),
  type: "withdrawal",
  amount,
  fee,
});
const buy = (
  executionPrice: number,
  shares: number,
  fee: number,
  ticker = "AAPL",
): BuyMovement => ({
  ...base("2025-01-01"),
  type: "buy",
  ticker,
  executionPrice,
  shares,
  fee,
});
const sell = (
  executionPrice: number,
  shares: number,
  fee: number,
  regulatoryFees: number,
): SellMovement => ({
  ...base("2025-01-01"),
  type: "sell",
  ticker: "AAPL",
  executionPrice,
  shares,
  fee,
  regulatoryFees,
});
const dividend = (grossAmount: number, tax: number): DividendMovement => ({
  ...base("2025-01-01"),
  type: "dividend",
  ticker: "AAPL",
  grossAmount,
  tax,
});

describe("computeCash", () => {
  it("adds a deposit net of its transfer fee", () => {
    expect(computeCash([deposit(3000, 3.99)])).toBe(2996.01);
  });

  it("subtracts a withdrawal plus its fee", () => {
    expect(computeCash([withdrawal(200, 1)])).toBe(-201);
  });

  it("subtracts buy cost plus the buy fee", () => {
    expect(computeCash([buy(100, 10, 0.15)])).toBe(-1000.15);
  });

  it("adds sell proceeds net of fee and regulatory fees", () => {
    expect(computeCash([sell(120, 10, 0.15, 0.03)])).toBe(1199.82);
  });

  it("adds dividends net of tax, never treating tax as a fee", () => {
    expect(computeCash([dividend(20, 6)])).toBe(14);
  });

  it("computes a full mixed history with every fee subtracted", () => {
    const movements: Movement[] = [
      deposit(5000, 3.99),
      buy(180, 10, 0.15),
      buy(400, 5, 0.1, "VOO"),
      sell(190, 4, 0.15, 0.03),
      dividend(20, 6),
      withdrawal(200, 1),
    ];
    expect(computeCash(movements)).toBe(1768.58);
  });
});
