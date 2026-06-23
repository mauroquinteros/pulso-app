import type {
  BuyMovement,
  DividendMovement,
  SellMovement,
} from "@/types/models";
import { describe, expect, it } from "vitest";
import { deriveHoldingFacts } from "./reducer";

let seq = 0;
const buy = (
  executionPrice: number,
  shares: number,
  executedAt: string,
  fee = 0,
): BuyMovement => ({
  id: `b${seq++}`,
  userId: "u",
  type: "buy",
  ticker: "AAPL",
  executionPrice,
  shares,
  fee,
  executedAt,
  createdAt: `${executedAt}T00:00:00Z`,
});
const sell = (
  executionPrice: number,
  shares: number,
  executedAt: string,
  fee = 0,
  regulatoryFees = 0,
): SellMovement => ({
  id: `s${seq++}`,
  userId: "u",
  type: "sell",
  ticker: "AAPL",
  executionPrice,
  shares,
  fee,
  regulatoryFees,
  executedAt,
  createdAt: `${executedAt}T00:00:00Z`,
});
const dividend = (
  grossAmount: number,
  tax: number,
  executedAt: string,
): DividendMovement => ({
  id: `d${seq++}`,
  userId: "u",
  type: "dividend",
  ticker: "AAPL",
  grossAmount,
  tax,
  executedAt,
  createdAt: `${executedAt}T00:00:00Z`,
});

describe("deriveHoldingFacts", () => {
  it("computes a weighted average over multiple buys", () => {
    const facts = deriveHoldingFacts([
      buy(100, 10, "2025-01-01"),
      buy(200, 10, "2025-02-01"),
    ]);
    expect(facts.shares).toBe(20);
    expect(facts.avgCost).toBe(150);
    expect(facts.costBasis).toBe(3000);
    expect(facts.realizedPnl).toBe(0);
  });

  it("leaves average cost unchanged after a partial sell (only shares drop)", () => {
    const facts = deriveHoldingFacts([
      buy(100, 10, "2025-01-01"),
      sell(120, 4, "2025-02-01"),
    ]);
    expect(facts.shares).toBe(6);
    expect(facts.avgCost).toBe(100);
    expect(facts.costBasis).toBe(600);
    expect(facts.realizedPnl).toBe(80); // (120 - 100) * 4
  });

  it("uses moving-average (not overall-average) on buy-after-partial-sale", () => {
    const facts = deriveHoldingFacts([
      buy(100, 10, "2025-01-01"),
      sell(250, 4, "2025-02-01"),
      buy(200, 10, "2025-03-01"),
    ]);
    expect(facts.shares).toBe(16);
    expect(facts.avgCost).toBe(162.5); // (6*100 + 10*200) / 16 — NOT 150
    expect(facts.costBasis).toBe(2600);
    expect(facts.realizedPnl).toBe(600); // (250 - 100) * 4
  });

  it("resets average cost on full exit, accumulating realized P&L across rounds", () => {
    const facts = deriveHoldingFacts([
      buy(100, 10, "2025-01-01"),
      sell(120, 10, "2025-02-01"), // full exit
      buy(200, 5, "2025-03-01"), // fresh round
    ]);
    expect(facts.shares).toBe(5);
    expect(facts.avgCost).toBe(200); // reset — not blended with the old $100
    expect(facts.costBasis).toBe(1000);
    expect(facts.realizedPnl).toBe(200); // (120 - 100) * 10
  });

  it("handles fractional shares accurately", () => {
    const facts = deriveHoldingFacts([
      buy(100, 2.45321, "2025-01-01", 0.15),
      buy(200, 1.5, "2025-02-01", 0.1),
    ]);
    expect(facts.shares).toBeCloseTo(3.95321, 8);
    expect(facts.costBasis).toBeCloseTo(545.321, 2); // 2.45321*100 + 1.5*200
    expect(facts.totalFees).toBe(0.25);
  });

  it("still counts realized P&L, dividends, and fees for a fully-closed position", () => {
    const facts = deriveHoldingFacts([
      buy(100, 10, "2025-01-01", 0.15),
      dividend(20, 6, "2025-02-01"),
      sell(120, 10, "2025-03-01", 0.15, 0.03), // full exit
    ]);
    expect(facts.shares).toBe(0);
    expect(facts.avgCost).toBe(0);
    expect(facts.costBasis).toBe(0);
    expect(facts.realizedPnl).toBe(200);
    expect(facts.totalDividends).toBe(14); // 20 - 6
    expect(facts.totalFees).toBe(0.33); // 0.15 + 0.15 + 0.03
  });

  it("is order-independent (sorts movements chronologically)", () => {
    const ordered = deriveHoldingFacts([
      buy(100, 10, "2025-01-01"),
      sell(250, 4, "2025-02-01"),
      buy(200, 10, "2025-03-01"),
    ]);
    const shuffled = deriveHoldingFacts([
      buy(200, 10, "2025-03-01"),
      buy(100, 10, "2025-01-01"),
      sell(250, 4, "2025-02-01"),
    ]);
    expect(shuffled).toEqual(ordered);
  });
});
