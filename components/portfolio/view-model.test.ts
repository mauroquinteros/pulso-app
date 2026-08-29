import { MOCK_PORTFOLIO_SUMMARY } from "@/fixtures/portfolio";
import type { BuyMovement, DepositMovement, Movement, Stock } from "@/types/models";
import { assemblePortfolio } from "@/utils/portfolio/valuation";
import { describe, expect, it } from "vitest";
import { buildPortfolioView, segmentColor } from "./view-model";

let seq = 0;
const deposit = (amount: number, transferFee = 0): DepositMovement => ({
  id: `dep${seq++}`,
  type: "deposit",
  amount,
  transferFee,
  executionDate: "2025-01-01",
  createdAt: "2025-01-01T00:00:00Z",
});
const buy = (ticker: string, executionPrice: number, shares: number, fee = 0): BuyMovement => ({
  id: `b${seq++}`,
  type: "buy",
  ticker,
  executionPrice,
  shares,
  fee,
  executionDate: "2025-02-01",
  createdAt: "2025-02-01T00:00:00Z",
});
/** A Stock carrying a Quote - the shape the engine takes a price in. */
const stock = (ticker: string, price: number): Stock => ({
  ticker,
  name: ticker,
  quote: { price, quotedAt: "2025-06-01T20:00:00Z" },
});

const fractionSum = (view: ReturnType<typeof buildPortfolioView>) =>
  view.distribution.segments.reduce((s, seg) => s + seg.fraction, 0);

describe("buildPortfolioView", () => {
  it("renders MOCK_PORTFOLIO_SUMMARY: ordered segments, Efectivo last, fractions sum to 1", () => {
    const view = buildPortfolioView(MOCK_PORTFOLIO_SUMMARY);

    expect(view.state).toBe("ready");
    expect(view.distribution.centerTotal).toBe("$4,863.38");
    expect(view.distribution.missingPriceCount).toBe(0);

    // Segments: AAPL, VOO, then Efectivo last. Fractions are Market Value ÷ TPV.
    expect(view.distribution.segments.map((s) => s.key)).toEqual(["AAPL", "VOO", "cash"]);
    const [aapl, voo, cash] = view.distribution.segments;
    expect(aapl).toMatchObject({
      label: "AAPL",
      amount: "$2,991.21",
      colorIndex: 0,
    });
    expect(voo).toMatchObject({
      label: "VOO",
      amount: "$1,605.10",
      colorIndex: 1,
    });
    expect(cash).toMatchObject({
      label: "Efectivo",
      amount: "$267.07",
      colorIndex: "cash",
    });
    expect(aapl.fraction).toBeCloseTo(2991.21 / 4863.38, 8);
    expect(voo.fraction).toBeCloseTo(1605.1 / 4863.38, 8);
    expect(cash.fraction).toBeCloseTo(267.07 / 4863.38, 8);
    expect(fractionSum(view)).toBeCloseTo(1, 8);

    // Legend mirrors segments with 1-decimal Allocation percentages.
    expect(view.distribution.legend.map((l) => [l.label, l.pct])).toEqual([
      ["AAPL", "61.5%"],
      ["VOO", "33.0%"],
      ["Efectivo", "5.5%"],
    ]);
    expect(view.distribution.legend.every((l) => !l.negative)).toBe(true);

    // "Mis Activos" rows, Market Value desc, with arrow-prefixed P&L percent.
    expect(view.holdings).toEqual([
      {
        ticker: "AAPL",
        shares: "15.07666",
        value: "$2,991.21",
        pnl: "+$240.18",
        pnlPct: "+8.73%",
        pnlTone: "positive",
        a11yLabel: "AAPL, $2,991.21, 15.07666 acciones, rendimiento +$240.18 +8.73%",
      },
      {
        ticker: "VOO",
        shares: "3.5",
        value: "$1,605.10",
        pnl: "+$35.50",
        pnlPct: "+2.26%",
        pnlTone: "positive",
        a11yLabel: "VOO, $1,605.10, 3.5 acciones, rendimiento +$35.50 +2.26%",
      },
    ]);
  });

  // The legend is the only thing tying a slice to its ticker, and it ties them
  // by colour — so two slices sharing one makes the mapping unreadable. This
  // used to break from 5 priced holdings on: the palette held 4 colours and
  // segmentColor wrapped with `% 4`, so the 5th slice reused the 1st's.
  it.each([5, 6, 7, 9])("gives every drawn segment its own colour with %i priced holdings", (n) => {
    const tickers = Array.from({ length: n }, (_, i) => `T${i}`);
    const movements: Movement[] = [deposit(100_000), ...tickers.map((t, i) => buy(t, 100, 100 - i))];
    const stocks = Object.fromEntries(tickers.map((t) => [t, stock(t, 100)]));
    const view = buildPortfolioView(assemblePortfolio(movements, stocks));

    const colors = view.distribution.segments.map((s) => segmentColor(s.colorIndex));
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("groups 7+ holdings into top 5 + Otros; Efectivo never inside Otros", () => {
    // Seven priced holdings, cash spent to ~0 so the donut shows holdings only.
    const movements: Movement[] = [
      deposit(10_000),
      buy("AAA", 100, 20), // 2000
      buy("BBB", 100, 18), // 1800
      buy("CCC", 100, 16), // 1600
      buy("DDD", 100, 14), // 1400
      buy("EEE", 100, 12), // 1200
      buy("FFF", 100, 10), // 1000
      buy("GGG", 100, 10), // 1000
    ];
    const stocks = {
      AAA: stock("AAA", 100),
      BBB: stock("BBB", 100),
      CCC: stock("CCC", 100),
      DDD: stock("DDD", 100),
      EEE: stock("EEE", 100),
      FFF: stock("FFF", 100),
      GGG: stock("GGG", 100),
    };
    const view = buildPortfolioView(assemblePortfolio(movements, stocks));

    // cash == 0 → no Efectivo segment: exactly 6 segments (top 5 + Otros).
    expect(view.distribution.segments.map((s) => s.key)).toEqual(["AAA", "BBB", "CCC", "DDD", "EEE", "others"]);
    const others = view.distribution.segments.at(-1)!;
    expect(others.label).toBe("Otros");
    expect(others.colorIndex).toBe("others");
    // Otros carries the tail (FFF 1000 + GGG 1000) over the 10,000 invested.
    expect(others.amount).toBe("$2,000.00");
    expect(others.fraction).toBeCloseTo(2000 / 10_000, 8);
    expect(fractionSum(view)).toBeCloseTo(1, 8);

    // All seven holdings still list individually in "Mis Activos".
    expect(view.holdings.map((h) => h.ticker)).toEqual(["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"]);
  });

  it("excludes an unpriced holding from the donut and flags its row", () => {
    const movements: Movement[] = [
      deposit(3000),
      buy("AAPL", 100, 10), // priced
      buy("XYZ", 100, 5), // no price
    ];
    const view = buildPortfolioView(assemblePortfolio(movements, { AAPL: stock("AAPL", 120) }));

    expect(view.distribution.missingPriceCount).toBe(1);
    // Only AAPL and Efectivo appear in the donut/legend — never XYZ.
    expect(view.distribution.segments.map((s) => s.key)).toEqual(["AAPL", "cash"]);
    expect(view.distribution.legend.some((l) => l.key === "XYZ")).toBe(false);

    // XYZ still lists, flagged, with null price-applied fields.
    const xyz = view.holdings.find((h) => h.ticker === "XYZ")!;
    expect(xyz).toMatchObject({
      value: null,
      pnl: null,
      pnlPct: null,
    });
  });

  it("marks an empty portfolio and hides the cards", () => {
    const view = buildPortfolioView(assemblePortfolio([], {}));
    expect(view.state).toBe("empty");
    expect(view.holdings).toHaveLength(0);
    expect(view.distribution.segments).toHaveLength(0);
    expect(view.distribution.legend).toHaveLength(0);
  });

  it("renders a single full Efectivo segment and no rows for a cash-only portfolio", () => {
    const view = buildPortfolioView(assemblePortfolio([deposit(1000)], {}));

    expect(view.state).toBe("ready");
    expect(view.distribution.segments).toEqual([
      {
        key: "cash",
        label: "Efectivo",
        fraction: 1,
        amount: "$1,000.00",
        colorIndex: "cash",
      },
    ]);
    expect(view.distribution.legend[0].pct).toBe("100.0%");
    expect(view.holdings).toHaveLength(0);
  });

  it("keeps segments proportional over Market Value and a red pct-less Efectivo row when cash is negative", () => {
    // Withdraw more than cash on hand via a buy that overspends: engineer
    // negative cash by buying beyond the deposit.
    const movements: Movement[] = [
      deposit(1000),
      buy("AAPL", 100, 15), // 1500 spent on 1000 cash → cash = -500
    ];
    const portfolio = assemblePortfolio(movements, { AAPL: stock("AAPL", 100) });
    expect(portfolio.cash).toBeLessThan(0);

    const view = buildPortfolioView(portfolio);
    // Donut: holdings only, proportional over Market Value sum (single holding → 1).
    expect(view.distribution.segments.map((s) => s.key)).toEqual(["AAPL"]);
    expect(view.distribution.segments[0].fraction).toBeCloseTo(1, 8);

    // Legend keeps a negative Efectivo row: red, no percentage, signed.
    const cashRow = view.distribution.legend.find((l) => l.key === "cash")!;
    expect(cashRow.negative).toBe(true);
    expect(cashRow.pct).toBeNull();
    expect(cashRow.amount).toContain("-");
    expect(cashRow.amount).not.toContain("\u2212"); // ASCII hyphen, never U+2212
  });

  it("formats a loss with an ASCII-signed percent and a negative tone", () => {
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5)];
    const view = buildPortfolioView(assemblePortfolio(movements, { AAPL: stock("AAPL", 60) }));

    const aapl = view.holdings[0];
    expect(aapl.pnlTone).toBe("negative");
    expect(aapl.pnlPct?.startsWith("-")).toBe(true); // signed like Home
    expect(aapl.pnlPct).not.toContain("\u2212"); // ASCII hyphen, never U+2212
    expect(aapl.pnl).toContain("-");
    expect(aapl.pnl).not.toContain("\u2212");
  });
});
