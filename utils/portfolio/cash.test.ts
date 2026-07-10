import { describe, it, expect } from "vitest";
import { MOCK_MOVEMENTS } from "@/lib/mock-data";
import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { cashImpact, computeCash } from "./cash";

let seq = 0;
const base = (executionDate: string) => ({
  id: `m${seq++}`,
  userId: "u",
  executionDate,
  createdAt: `${executionDate}T00:00:00Z`,
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

const round2 = (n: number) => Math.round(n * 100) / 100;

describe("cashImpact", () => {
  it("adds a deposit's cash-side amount, ignoring the transfer fee", () => {
    expect(cashImpact(deposit(3000, 3.99))).toBe(3000);
    // The transfer fee never touches Cash, so it cannot move the impact.
    expect(cashImpact(deposit(3000, 0))).toBe(cashImpact(deposit(3000, 3.99)));
  });

  it("subtracts a withdrawal's cash-side amount, ignoring its fee", () => {
    expect(cashImpact(withdrawal(500, 1))).toBe(-500);
    expect(cashImpact(withdrawal(500, 0))).toBe(cashImpact(withdrawal(500, 1)));
  });

  it("subtracts a buy's principal plus its trading fee", () => {
    // 182.50 × 2.45321 = 447.710825, plus a 0.15 fee → displays as $447.86.
    const impact = cashImpact(buy(182.5, 2.45321, 0.15));
    expect(impact).toBeCloseTo(-447.860825, 9); // returned unrounded
    expect(round2(impact)).toBe(-447.86);
  });

  it("adds a sell's proceeds net of fee and regulatory fees", () => {
    // 195.50 × 3 = 586.50, less 0.15 + 0.03 → 586.32.
    expect(round2(cashImpact(sell(195.5, 3, 0.15, 0.03)))).toBe(586.32);
  });

  it("adds a dividend net of tax, never treating tax as a fee", () => {
    expect(round2(cashImpact(dividend(18.5, 5.55)))).toBe(12.95);
  });

  it("takes its direction from the movement type alone", () => {
    // Deposits, sells and dividends always add; buys and withdrawals subtract.
    expect(cashImpact(deposit(1, 0))).toBeGreaterThan(0);
    expect(cashImpact(sell(10, 1, 0, 0))).toBeGreaterThan(0);
    expect(cashImpact(dividend(10, 1))).toBeGreaterThan(0);
    expect(cashImpact(buy(10, 1, 0))).toBeLessThan(0);
    expect(cashImpact(withdrawal(1, 0))).toBeLessThan(0);
  });

  it("reconciles: the sum of every movement's Cash Impact is Cash", () => {
    // The invariant that makes the movements list trustworthy — it renders
    // cashImpact per row, so the rows must add up to the balance they explain.
    const sum = MOCK_MOVEMENTS.reduce((total, m) => total + cashImpact(m), 0);
    expect(round2(sum)).toBe(computeCash(MOCK_MOVEMENTS));
  });

  it("reconciles over a mixed history too", () => {
    const movements: Movement[] = [
      deposit(5000, 3.99),
      buy(180, 10, 0.15),
      buy(400, 5, 0.1, "VOO"),
      sell(190, 4, 0.15, 0.03),
      dividend(20, 6),
      withdrawal(200, 1),
    ];
    const sum = movements.reduce((total, m) => total + cashImpact(m), 0);
    expect(round2(sum)).toBe(computeCash(movements));
    expect(round2(sum)).toBe(1773.57);
  });
});

describe("computeCash", () => {
  it("adds a deposit's amount (transfer fee lives in contributions, not cash)", () => {
    expect(computeCash([deposit(3000, 3.99)])).toBe(3000);
  });

  it("subtracts a withdrawal's amount (fee lives in contributions, not cash)", () => {
    expect(computeCash([withdrawal(200, 1)])).toBe(-200);
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

  it("computes a full mixed history (cash-side deposit/withdrawal amounts, trading fees subtracted)", () => {
    const movements: Movement[] = [
      deposit(5000, 3.99),
      buy(180, 10, 0.15),
      buy(400, 5, 0.1, "VOO"),
      sell(190, 4, 0.15, 0.03),
      dividend(20, 6),
      withdrawal(200, 1),
    ];
    expect(computeCash(movements)).toBe(1773.57);
  });
});
