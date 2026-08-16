import { MOCK_PORTFOLIO_SUMMARY } from "@/lib/mock-data";
import type { BuyMovement, DepositMovement, Movement, Stock } from "@/types/models";
import { assemblePortfolio } from "@/utils/portfolio/valuation";
import { describe, expect, it } from "vitest";
import { buildHomeView } from "./view-model";

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

describe("buildHomeView", () => {
  it("renders MOCK_PORTFOLIO_SUMMARY with every figure matching and reconciling", () => {
    const view = buildHomeView(MOCK_PORTFOLIO_SUMMARY);

    // Worth — Total Portfolio Value headline + composition.
    expect(view.worth.total).toBe("$4,863.38");
    expect(view.worth.invested).toEqual({
      label: "En activos",
      pct: "94.5%",
      amount: "$4,596.31",
      flex: 4596.31,
    });
    expect(view.worth.cash).toEqual({
      label: "Efectivo",
      pct: "5.5%",
      amount: "$267.07",
      flex: 267.07,
    });
    // Composition shares sum to ~100% of Total Portfolio Value.
    const mvPct = (4596.31 / 4863.38) * 100;
    const cashPct = (267.07 / 4863.38) * 100;
    expect(mvPct + cashPct).toBeCloseTo(100, 8);

    // Return — Total Return + the four components.
    expect(view.return.total).toBe("+$354.40");
    expect(view.return.tone).toBe("positive");
    // Percentage divides by Peak Contributions (5007.98), not current net
    // contributions (4508.98): the seed's 500 withdrawal lowers net below its peak. 354.40 / 5007.98 = 7.08%. Aportado still shows the net figure.
    expect(view.return.percent).toBe("+7.08%");
    // Peak (5007.98) exceeds net (4508.98) because of the 500 withdrawal, so the
    // tooltip explaining the percentage base is present and names the peak.
    expect(view.return.percentTooltip).toBe(
      "Calculado sobre tu aportado máximo ($5,007.98), no el actual, para que un retiro no infle tu rendimiento.",
    );
    expect(view.return.aportado).toBe("$4,508.98");
    expect(view.return.valeHoy).toBe("$4,863.38");

    expect(view.return.components).toHaveLength(4);
    const [unrealized, realized, dividends, fees] = view.return.components;

    expect(unrealized).toMatchObject({
      label: "No realizado",
      sub: "· Net P&L",
      value: "+$275.68",
      tone: "positive",
    });
    expect(realized).toMatchObject({
      label: "Realizado",
      value: "+$67.29",
      tone: "positive",
    });
    expect(realized.sub).toBeUndefined();
    expect(dividends).toMatchObject({
      label: "Dividendos netos",
      value: "+$21.56",
      tone: "positive",
    });
    expect(fees).toMatchObject({
      label: "Comisiones",
      value: "-$10.13",
      tone: "negative",
    });

    // Fills are |amount| / max(|amount|); the largest component fills fully.
    const maxAbs = 275.68;
    expect(unrealized.fill).toBeCloseTo(1, 8);
    expect(realized.fill).toBeCloseTo(67.29 / maxAbs, 8);
    expect(dividends.fill).toBeCloseTo(21.56 / maxAbs, 8);
    expect(fees.fill).toBeCloseTo(10.13 / maxAbs, 8);

    // Components sum to Total Return (reconciliation of the breakdown).
    expect(275.68 + 67.29 + 21.56 - 10.13).toBeCloseTo(354.4, 8);

    // Assets — aggregate Net P&L over Cost Basis + per-holding rows.
    // 275.68 / 4320.63 = 6.38% (over Cost Basis, not net contributions).
    expect(view.assets.netPnl).toBe("+$275.68 · +6.38%");
    expect(view.assets.netPnlTone).toBe("positive");

    expect(view.assets.holdings).toEqual([
      {
        ticker: "AAPL",
        shares: "15.07666 acc",
        priceAvailable: true,
        value: "$2,991.21",
        pnl: "+$240.18 · +8.73%",
        pnlTone: "positive",
      },
      {
        ticker: "VOO",
        shares: "3.5 acc",
        priceAvailable: true,
        value: "$1,605.10",
        pnl: "+$35.50 · +2.26%",
        pnlTone: "positive",
      },
    ]);

    // Per-holding Net P&L rows sum to aggregate Net P&L.
    expect(240.18 + 35.5).toBeCloseTo(275.68, 8);
  });

  it("leaves value/pnl null for a holding without a current price", () => {
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 10, 1)];
    const portfolio = assemblePortfolio(movements, {}); // no price for AAPL
    const view = buildHomeView(portfolio);

    expect(view.assets.holdings).toHaveLength(1);
    const aapl = view.assets.holdings[0];
    expect(aapl.priceAvailable).toBe(false);
    expect(aapl.value).toBeNull();
    expect(aapl.pnl).toBeNull();
    // The shares label and ticker still render.
    expect(aapl.ticker).toBe("AAPL");
    expect(aapl.shares).toBe("10 acc");
  });

  it("shows Market Value 0 and all-cash composition for a deposits-only portfolio", () => {
    const portfolio = assemblePortfolio([deposit(1000)], {});
    const view = buildHomeView(portfolio);

    expect(view.worth.total).toBe("$1,000.00");
    expect(view.worth.invested.amount).toBe("$0.00");
    expect(view.worth.invested.pct).toBe("0.0%");
    expect(view.worth.cash.amount).toBe("$1,000.00");
    expect(view.worth.cash.pct).toBe("100.0%");
    expect(view.assets.holdings).toHaveLength(0);
  });

  it("uses a negative tone and an ASCII-signed string for a negative Total Return", () => {
    // Bought high, priced low: every figure on the loss side.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1)];
    const portfolio = assemblePortfolio(movements, { AAPL: stock("AAPL", 60) });
    const view = buildHomeView(portfolio);

    expect(view.return.tone).toBe("negative");
    expect(view.return.total.startsWith("-")).toBe(true);
    expect(view.return.total).not.toContain("\u2212"); // ASCII hyphen, never U+2212
    expect(view.assets.netPnlTone).toBe("negative");
    expect(view.assets.netPnl).toContain("-");
  });
});
