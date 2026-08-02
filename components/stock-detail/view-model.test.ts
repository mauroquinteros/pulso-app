import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  SellMovement,
  ValuedHolding,
  WithdrawalMovement,
} from "@/types/models";
import { describe, expect, it } from "vitest";
import { buildStockDetailView } from "./view-model";

let seq = 0;
const base = (executionDate: string) => ({
  id: `m${seq++}`,
  userId: "u",
  executionDate,
  createdAt: `${executionDate}T00:00:00Z`,
});
const buy = (
  ticker: string,
  executionPrice: number,
  shares: number,
  executionDate = "2025-01-15",
): BuyMovement => ({
  ...base(executionDate),
  type: "buy",
  ticker,
  executionPrice,
  shares,
  fee: 0.5,
});
const sell = (
  ticker: string,
  executionPrice: number,
  shares: number,
  executionDate = "2025-06-10",
): SellMovement => ({
  ...base(executionDate),
  type: "sell",
  ticker,
  executionPrice,
  shares,
  fee: 0.5,
  regulatoryFees: 0.02,
});
const dividend = (
  ticker: string,
  grossAmount: number,
  executionDate = "2025-08-01",
): DividendMovement => ({
  ...base(executionDate),
  type: "dividend",
  ticker,
  grossAmount,
  tax: 0.05,
});
const deposit = (amount: number): DepositMovement => ({
  ...base("2025-01-02"),
  type: "deposit",
  amount,
  transferFee: 3,
});
const withdrawal = (amount: number): WithdrawalMovement => ({
  ...base("2025-12-20"),
  type: "withdrawal",
  amount,
  transferFee: 1,
});

/** A priced holding by default; pass overrides for the no-price variant.
 * The lifetime figures add up: 20.71 + 4.20 + 0.85 - 0.25 = 25.51. */
const valued = (
  ticker: string,
  over: Partial<ValuedHolding> = {},
): ValuedHolding => ({
  ticker,
  shares: 1.4532,
  avgCost: 175.2,
  costBasis: 254.6,
  realizedPnl: 4.2,
  totalFees: 0.25,
  totalDividends: 0.85,
  priceAvailable: true,
  marketValue: 275.31,
  netPnl: 20.71,
  netPnlPercent: 8.13,
  ...over,
});

const unpriced = (ticker: string): ValuedHolding =>
  valued(ticker, {
    priceAvailable: false,
    marketValue: null,
    netPnl: null,
    netPnlPercent: null,
  });

describe("buildStockDetailView", () => {
  it("renders the full position for a priced holding", () => {
    const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, []);

    expect(view.state).toBe("found");
    expect(view.ticker).toBe("AAPL");
    expect(view.price).toBe("$189.45");
    expect(view.position).toEqual({
      shares: "1.4532",
      avgCost: "$175.20",
      costBasis: "$254.60",
      marketValue: "$275.31",
      return: {
        netPnl: "+$20.71",
        netPnlPercent: "+8.13%",
        netPnlTone: "positive",
        dividends: "$0.85",
        realized: "+$4.20",
        realizedTone: "positive",
        fees: "$0.25",
        total: "+$25.51", // 20.71 + 4.20 + 0.85 - 0.25 — the glossary formula
        totalTone: "positive",
      },
    });
  });

  describe("return block — Total Return of a stock", () => {
    it("hides the Realizado row when the ticker was never sold; the total still adds up", () => {
      const neverSold = valued("AAPL", { realizedPnl: 0 });
      const view = buildStockDetailView("AAPL", [neverSold], 189.45, []);

      expect(view.position?.return?.realized).toBeNull();
      // 20.71 + 0 + 0.85 - 0.25
      expect(view.position?.return?.total).toBe("+$21.31");
    });

    it("a lifetime loss renders a negative total with tone and ASCII hyphen", () => {
      const losing = valued("AAPL", {
        netPnl: -30.5,
        netPnlPercent: -11.98,
        realizedPnl: -2.1,
      });
      const view = buildStockDetailView("AAPL", [losing], 155.2, []);

      // -30.50 - 2.10 + 0.85 - 0.25
      expect(view.position?.return?.total).toBe("-$32.00");
      expect(view.position?.return?.totalTone).toBe("negative");
      expect(view.position?.return?.realized).toBe("-$2.10");
      expect(view.position?.return?.realizedTone).toBe("negative");
      expect(view.position?.return?.total).not.toContain("\u2212");
    });

    it("dividends and fees are unsigned magnitudes — direction lives in the label", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, []);

      expect(view.position?.return?.dividends).toBe("$0.85");
      expect(view.position?.return?.fees).toBe("$0.25");
    });
  });

  it("finds the holding by ticker, whatever its position in the array", () => {
    const holdings = [valued("AAPL"), valued("VOO")];
    expect(buildStockDetailView("VOO", holdings, 458.6, []).state).toBe(
      "found",
    );
    expect(
      buildStockDetailView("VOO", [...holdings].reverse(), 458.6, []).state,
    ).toBe("found");
  });

  it("a losing position renders a negative tone and an ASCII hyphen, never U+2212", () => {
    const holding = valued("AAPL", { netPnl: -10.13, netPnlPercent: -3.98 });
    const view = buildStockDetailView("AAPL", [holding], 168.4, []);

    expect(view.position?.return?.netPnl).toBe("-$10.13");
    expect(view.position?.return?.netPnlPercent).toBe("-3.98%");
    expect(view.position?.return?.netPnlTone).toBe("negative");
    expect(view.position?.return?.netPnl).not.toContain("\u2212");
    expect(view.position?.return?.netPnlPercent).not.toContain("\u2212");
  });

  describe("not-found", () => {
    it("unknown ticker → not-found with no position and no rows", () => {
      const view = buildStockDetailView("MSFT", [valued("AAPL")], 402.1, [
        buy("MSFT", 380, 1),
      ]);
      expect(view.state).toBe("not-found");
      expect(view.position).toBeNull();
      expect(view.rows).toEqual([]);
    });

    it("a closed position (shares === 0) → not-found", () => {
      const closed = valued("MSFT", { shares: 0 });
      const view = buildStockDetailView("MSFT", [closed], 402.1, []);
      expect(view.state).toBe("not-found");
    });
  });

  describe("no-price collapse", () => {
    it("nulls the hero, market value, and the WHOLE return block; the cost figures survive", () => {
      const view = buildStockDetailView(
        "AAPL",
        [unpriced("AAPL")],
        undefined,
        [],
      );

      expect(view.state).toBe("found");
      expect(view.price).toBeNull();
      expect(view.position?.marketValue).toBeNull();
      // Dividends, realized and fees are price-free facts, but a return block
      // without Net P&L would print a partial "return" — it falls entirely.
      expect(view.position?.return).toBeNull();
      expect(view.position?.shares).toBe("1.4532");
      expect(view.position?.avgCost).toBe("$175.20");
      expect(view.position?.costBasis).toBe("$254.60");
    });

    it("strips buyTone from every buy — no current price, nothing to compare", () => {
      const view = buildStockDetailView("AAPL", [unpriced("AAPL")], undefined, [
        buy("AAPL", 85, 0.5),
        buy("AAPL", 170.15, 0.6),
      ]);
      expect(view.rows).toHaveLength(2);
      for (const row of view.rows) expect(row.buyTone).toBeNull();
    });
  });

  describe("rows", () => {
    it("lists only the ticker's buys/sells/dividends, newest first, titles without the ticker", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, [
        buy("AAPL", 85, 0.5, "2023-10-12"),
        dividend("AAPL", 0.34, "2023-11-01"),
        sell("AAPL", 192, 0.2, "2023-08-15"),
        buy("VOO", 410, 1, "2023-09-01"), // another ticker — out
        deposit(500), // no ticker — out
        withdrawal(100), // no ticker — out
      ]);

      expect(view.rows.map((r) => r.title)).toEqual([
        "Dividendo",
        "Compra",
        "Venta",
      ]);
      expect(view.rows.map((r) => r.dateLabel)).toEqual([
        "1 nov 2023",
        "12 oct 2023",
        "15 ago 2023",
      ]);
    });

    it("buy/sell rows carry a sharesLabel next to the date; dividends don't", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, [
        buy("AAPL", 85, 0.5),
        sell("AAPL", 192, 0.2),
        dividend("AAPL", 0.34),
      ]);
      const byTitle = Object.fromEntries(view.rows.map((r) => [r.title, r]));

      expect(byTitle["Compra"].sharesLabel).toBe("0.5 acc");
      expect(byTitle["Venta"].sharesLabel).toBe("0.2 acc");
      expect(byTitle["Dividendo"].sharesLabel).toBeNull();
    });

    it("amounts are unsigned magnitudes, like the Movimientos tab", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, [
        buy("AAPL", 85, 0.5), // cash out — still no sign
        dividend("AAPL", 0.34),
      ]);
      for (const row of view.rows) {
        expect(row.amount).not.toContain("+");
        expect(row.amount).not.toContain("-");
        expect(row.amount).not.toContain("\u2212");
      }
    });
  });

  describe("buyTone — the per-buy colour mark vs. today's price", () => {
    it("marks only buys: sells and dividends are always null", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, [
        buy("AAPL", 85, 0.5),
        sell("AAPL", 192, 0.2),
        dividend("AAPL", 0.34),
      ]);
      const byTitle = Object.fromEntries(view.rows.map((r) => [r.title, r]));

      expect(byTitle["Compra"].buyTone).not.toBeNull();
      expect(byTitle["Venta"].buyTone).toBeNull();
      expect(byTitle["Dividendo"].buyTone).toBeNull();
    });

    it("bought 5% below today → up; 5% above → down; at today's price → neutral", () => {
      const view = buildStockDetailView("AAPL", [valued("AAPL")], 100, [
        buy("AAPL", 95, 1, "2025-01-01"), // +5.26% below today
        buy("AAPL", 105, 1, "2025-01-02"), // -4.76% above today
        buy("AAPL", 100, 1, "2025-01-03"), // exactly today's price
      ]);
      const tones = view.rows.map((r) => r.buyTone);

      // Newest first: the 100 buy, then 105, then 95.
      expect(tones).toEqual(["neutral", "down", "up"]);
    });

    it("the exact ±1.0% edge falls in the neutral band", () => {
      // (101 - 100) / 100 = +0.01 exactly; (99 - 100) / 100 = -0.01 exactly.
      const up = buildStockDetailView("AAPL", [valued("AAPL")], 101, [
        buy("AAPL", 100, 1),
      ]);
      const down = buildStockDetailView("AAPL", [valued("AAPL")], 99, [
        buy("AAPL", 100, 1),
      ]);

      expect(up.rows[0].buyTone).toBe("neutral");
      expect(down.rows[0].buyTone).toBe("neutral");
    });

    it("just past the band it tips: +1.5% → up, -1.5% → down", () => {
      const up = buildStockDetailView("AAPL", [valued("AAPL")], 101.5, [
        buy("AAPL", 100, 1),
      ]);
      const down = buildStockDetailView("AAPL", [valued("AAPL")], 98.5, [
        buy("AAPL", 100, 1),
      ]);

      expect(up.rows[0].buyTone).toBe("up");
      expect(down.rows[0].buyTone).toBe("down");
    });
  });

  it("the Net P&L percent is the only emitted string containing %", () => {
    const view = buildStockDetailView("AAPL", [valued("AAPL")], 189.45, [
      buy("AAPL", 85, 0.5),
      sell("AAPL", 192, 0.2),
      dividend("AAPL", 0.34),
    ]);

    const { return: returnBlock, ...positionRest } = view.position!;
    const { netPnlPercent, ...returnRest } = returnBlock!;
    expect(netPnlPercent).toContain("%");

    // Everything else — including the Total Return, which NEVER carries one.
    const others: (string | null)[] = [
      view.ticker,
      view.price,
      ...Object.values(positionRest).filter(
        (v): v is string => typeof v === "string",
      ),
      ...Object.values(returnRest).filter(
        (v): v is string => typeof v === "string",
      ),
      ...view.rows.flatMap((r) => [
        r.title,
        r.dateLabel,
        r.amount,
        r.sharesLabel,
      ]),
    ];
    for (const s of others) expect(s ?? "").not.toContain("%");
  });
});
