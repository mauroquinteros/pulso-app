import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  SellMovement,
} from "@/types/models";
import { describe, expect, it } from "vitest";
import { assemblePortfolio } from "./valuation";

let seq = 0;
const deposit = (amount: number, transferFee = 0): DepositMovement => ({
  id: `dep${seq++}`,
  userId: "u",
  type: "deposit",
  amount,
  transferFee,
  executedAt: "2025-01-01",
  createdAt: "2025-01-01T00:00:00Z",
});
const buy = (
  ticker: string,
  executionPrice: number,
  shares: number,
  fee = 0,
): BuyMovement => ({
  id: `b${seq++}`,
  userId: "u",
  type: "buy",
  ticker,
  executionPrice,
  shares,
  fee,
  executedAt: "2025-02-01",
  createdAt: "2025-02-01T00:00:00Z",
});
const sell = (
  ticker: string,
  executionPrice: number,
  shares: number,
  fee = 0,
  regulatoryFees = 0,
): SellMovement => ({
  id: `s${seq++}`,
  userId: "u",
  type: "sell",
  ticker,
  executionPrice,
  shares,
  fee,
  regulatoryFees,
  executedAt: "2025-03-01",
  createdAt: "2025-03-01T00:00:00Z",
});
const dividend = (
  ticker: string,
  grossAmount: number,
  tax: number,
): DividendMovement => ({
  id: `div${seq++}`,
  userId: "u",
  type: "dividend",
  ticker,
  grossAmount,
  tax,
  executedAt: "2025-04-01",
  createdAt: "2025-04-01T00:00:00Z",
});

// A single-ticker portfolio with known hand-computed expectations.
//   deposit 1000
//   buy 10 @ 100 (fee 1), buy 10 @ 120 (fee 1) -> 20 sh, avg 110, basis 2200
//   sell 5 @ 130 (fee 1)  -> realized (130-110)*5 = 100; 15 sh, basis 1650
//   dividend gross 20 / tax 5 -> net 15
//   price 140 -> MV 2100, netPnl 450, netPnl% 27.27
const knownPortfolio: Movement[] = [
  deposit(1000),
  buy("AAPL", 100, 10, 1),
  buy("AAPL", 120, 10, 1),
  sell("AAPL", 130, 5, 1),
  dividend("AAPL", 20, 5),
];

describe("assemblePortfolio", () => {
  it("computes per-holding and portfolio figures for a known portfolio", () => {
    const p = assemblePortfolio(knownPortfolio, { AAPL: 140 });

    // Movement facts
    expect(p.cash).toBe(-538);
    expect(p.costBasis).toBe(1650);
    expect(p.realizedPnl).toBe(100);
    expect(p.totalDividends).toBe(15);
    expect(p.totalFees).toBe(3);
    expect(p.netContributedCapital).toBe(1000);

    // Per-holding price-applied facts
    expect(p.holdings).toHaveLength(1);
    const aapl = p.holdings[0];
    expect(aapl.ticker).toBe("AAPL");
    expect(aapl.priceAvailable).toBe(true);
    expect(aapl.marketValue).toBe(2100);
    expect(aapl.netPnl).toBe(450);
    expect(aapl.netPnlPercent).toBe(27.27);

    // Portfolio price-applied facts
    expect(p.marketValue).toBe(2100);
    expect(p.totalPortfolioValue).toBe(1562); // -538 + 2100
    expect(p.totalReturn.unrealizedPnl).toBe(450);
    expect(p.totalReturn.realizedPnl).toBe(100);
    expect(p.totalReturn.netDividends).toBe(15);
    expect(p.totalReturn.totalFees).toBe(3);
    expect(p.totalReturn.total).toBe(562); // 450 + 100 + 15 - 3
    expect(p.totalReturn.percent).toBe(56.2); // 562 / 1000
    expect(p.holdingsMissingPrice).toBe(0);
  });

  it("reconciles Cash + Market Value with net contributed capital + Total Return", () => {
    // Multi-ticker, including a fully-exited ticker (MSFT) whose realized P&L
    // must still count even though it lists no holding.
    const movements: Movement[] = [
      ...knownPortfolio,
      buy("MSFT", 200, 2, 1),
      sell("MSFT", 250, 2, 1),
    ];
    const p = assemblePortfolio(movements, { AAPL: 140 });

    // MSFT is fully exited — not a holding, but its realized P&L is counted.
    expect(p.holdings.map((h) => h.ticker)).toEqual(["AAPL"]);
    expect(p.realizedPnl).toBe(200); // 100 AAPL + 100 MSFT

    expect(p.cash + p.marketValue).toBeCloseTo(
      p.netContributedCapital + p.totalReturn.total,
      8,
    );
  });

  it("excludes and flags a holding with a missing price; movement facts unaffected", () => {
    const p = assemblePortfolio(knownPortfolio, {}); // no price for AAPL

    const aapl = p.holdings[0];
    expect(aapl.priceAvailable).toBe(false);
    expect(aapl.marketValue).toBeNull();
    expect(aapl.netPnl).toBeNull();
    expect(aapl.netPnlPercent).toBeNull();

    // Excluded from price-applied totals, gap exposed
    expect(p.marketValue).toBe(0);
    expect(p.holdingsMissingPrice).toBe(1);
    expect(p.totalPortfolioValue).toBe(-538); // cash only
    expect(p.totalReturn.unrealizedPnl).toBe(0);
    expect(p.totalReturn.total).toBe(112); // 0 + 100 + 15 - 3

    // Movement facts remain correct
    expect(p.cash).toBe(-538);
    expect(p.costBasis).toBe(1650);
    expect(p.realizedPnl).toBe(100);
    expect(p.totalDividends).toBe(15);
    expect(p.totalFees).toBe(3);
  });
});
