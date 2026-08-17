import { MOCK_PORTFOLIO_SUMMARY } from "@/lib/mock-data";
import type { BuyMovement, DepositMovement, Movement, Stock, WithdrawalMovement } from "@/types/models";
import { assemblePortfolio } from "@/utils/portfolio/valuation";
import { describe, expect, it } from "vitest";
import { buildHomeView, showsRefreshFailed } from "./view-model";

let seq = 0;
const deposit = (amount: number, transferFee = 0): DepositMovement => ({
  id: `dep${seq++}`,
  type: "deposit",
  amount,
  transferFee,
  executionDate: "2025-01-01",
  createdAt: "2025-01-01T00:00:00Z",
});
const withdrawal = (amount: number, transferFee = 0): WithdrawalMovement => ({
  id: `wit${seq++}`,
  type: "withdrawal",
  amount,
  transferFee,
  executionDate: "2025-03-01",
  createdAt: "2025-03-01T00:00:00Z",
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
    const view = buildHomeView(MOCK_PORTFOLIO_SUMMARY, "ready");

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

    // Every Holding is priced, so there is nothing to say about the prices.
    expect(view.priceNote).toBeNull();
  });

  it("keeps every figure and says nothing when a portfolio holds only cash", () => {
    // No Movements at all: an empty portfolio is not an unpriceable one, so
    // nothing is refused and no line about prices appears.
    const empty = buildHomeView(assemblePortfolio([], {}), "ready");
    expect(empty.worth.total).toBe("$0.00");
    expect(empty.worth.invested).not.toBeNull();
    expect(empty.worth.cash.pct).toBe("0.0%");
    expect(empty.return.total).toBe("+$0.00");
    expect(empty.return.valeHoy).toBe("$0.00");
    expect(empty.assets.netPnl).toBe("+$0.00 · +0.00%");
    expect(empty.priceNote).toBeNull();

    // Same for a Perfil who has deposited but bought nothing.
    const deposited = buildHomeView(assemblePortfolio([deposit(1000)], {}), "ready");
    expect(deposited.worth.total).toBe("$1,000.00");
    expect(deposited.priceNote).toBeNull();
  });

  it("leaves value/pnl null for a holding without a current price", () => {
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 10, 1)];
    const portfolio = assemblePortfolio(movements, {}); // no price for AAPL
    const view = buildHomeView(portfolio, "ready");

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
    const view = buildHomeView(portfolio, "ready");

    expect(view.worth.total).toBe("$1,000.00");
    expect(view.worth.invested).toEqual({
      label: "En activos",
      pct: "0.0%",
      amount: "$0.00",
      flex: 0.0001,
    });
    expect(view.worth.cash.amount).toBe("$1,000.00");
    expect(view.worth.cash.pct).toBe("100.0%");
    expect(view.assets.holdings).toHaveLength(0);
  });

  it("uses a negative tone and an ASCII-signed string for a negative Total Return", () => {
    // Bought high, priced low: every figure on the loss side.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1)];
    const portfolio = assemblePortfolio(movements, { AAPL: stock("AAPL", 60) });
    const view = buildHomeView(portfolio, "ready");

    expect(view.return.tone).toBe("negative");
    expect(view.return.total?.startsWith("-")).toBe(true);
    expect(view.return.total).not.toContain("\u2212"); // ASCII hyphen, never U+2212
    expect(view.assets.netPnlTone).toBe("negative");
    expect(view.assets.netPnl).toContain("-");
  });

  it("keeps printing every figure with some holdings unpriced, and says what was left out", () => {
    // AAPL priced at 120, MSFT not. Total Portfolio Value is the sum over the
    // priced holdings plus Cash (CONTEXT.md), so it is a real number with a
    // caveat - not a refusal.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1), buy("MSFT", 50, 2)];
    const portfolio = assemblePortfolio(movements, { AAPL: stock("AAPL", 120) });
    const view = buildHomeView(portfolio, "ready");

    // Cash 1000 - 501 - 100 = 399; Market Value 5 x 120 = 600 (AAPL only).
    expect(view.worth.total).toBe("$999.00");
    expect(view.worth.invested).toEqual({
      label: "En activos",
      pct: "60.1%",
      amount: "$600.00",
      flex: 600,
    });
    expect(view.worth.cash).toEqual({
      label: "Efectivo",
      pct: "39.9%",
      amount: "$399.00",
      flex: 399,
    });

    expect(view.return.total).toBe("+$99.00"); // 100 unrealized - 1 fee
    expect(view.return.percent).toBe("+9.90%");
    expect(view.return.aportado).toBe("$1,000.00");
    expect(view.return.valeHoy).toBe("$999.00");
    expect(view.return.components.map((c) => c.value)).toEqual(["+$100.00", "+$0.00", "+$0.00", "-$1.00"]);
    expect(view.return.components.every((c) => c.fill !== null)).toBe(true);
    expect(view.assets.netPnl).toBe("+$100.00 · +16.67%"); // over the priced Cost Basis

    expect(view.priceNote).toBe("1 activo sin precio, excluido de los totales");
  });

  it("counts the unpriced holdings in the note, in the plural", () => {
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1), buy("MSFT", 50, 2), buy("NVDA", 10, 1)];
    const portfolio = assemblePortfolio(movements, { AAPL: stock("AAPL", 120) });

    expect(buildHomeView(portfolio, "ready").priceNote).toBe("2 activos sin precio, excluidos de los totales");
  });

  it("withholds every price-dependent figure when no holding is priced", () => {
    // Aportado $1,000 with nothing priced would otherwise print Vale hoy
    // $499.00 and a Total Return near -50%: a dropped read drawn as a loss.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1)];
    const view = buildHomeView(assemblePortfolio(movements, {}), "ready");

    // Withheld: everything a current price is needed to state.
    expect(view.worth.total).toBeNull();
    expect(view.worth.invested).toBeNull(); // the bar goes with it
    expect(view.worth.cash.pct).toBeNull(); // it divides by Total Portfolio Value
    expect(view.return.total).toBeNull();
    expect(view.return.percent).toBeNull();
    expect(view.return.valeHoy).toBeNull();
    expect(view.return.components[0]).toMatchObject({ label: "No realizado", value: null });
    expect(view.assets.netPnl).toBeNull();
    // Every fill goes at once: rescaling to the three known components would
    // draw the largest of *those* full, stating a share of a refused total.
    expect(view.return.components.map((c) => c.fill)).toEqual([null, null, null, null]);

    // Printed: everything the History alone decides, unchanged.
    expect(view.worth.cash.amount).toBe("$499.00");
    expect(view.worth.cash.label).toBe("Efectivo");
    expect(view.return.aportado).toBe("$1,000.00");
    expect(view.return.components.slice(1).map((c) => [c.label, c.value])).toEqual([
      ["Realizado", "+$0.00"],
      ["Dividendos netos", "+$0.00"],
      ["Comisiones", "-$1.00"],
    ]);
    // The holding still lists, flagged one by one as it always was.
    expect(view.assets.holdings).toEqual([
      {
        ticker: "AAPL",
        shares: "5 acc",
        priceAvailable: false,
        value: null,
        pnl: null,
        pnlTone: "positive",
      },
    ]);

    // No sentence: "No se pudo calcular" stands where each figure would have
    // been, and the holding above already reads "Sin precio", so a paragraph
    // would restate what the screen shows twice. It also keeps this clear of the
    // History's "No pudimos cargar tus movimientos" and the banner's "No pudimos
    // actualizar los precios" without having to word a third sentence around them.
    expect(view.priceNote).toBeNull();
    expect(view.withheldLabel).toBe("No se pudo calcular");
  });

  it("drops the percentage tooltip along with the percentage it explains", () => {
    // Peak Contributions (1000) exceeds Net Contributions (600), which is the
    // one case that earns a tooltip - and there is no percentage to explain.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1), withdrawal(400)];
    const view = buildHomeView(assemblePortfolio(movements, {}), "ready");

    expect(view.return.percent).toBeNull();
    expect(view.return.percentTooltip).toBeNull();

    // The same history with a price keeps both.
    const priced = buildHomeView(assemblePortfolio(movements, { AAPL: stock("AAPL", 120) }), "ready");
    expect(priced.return.percent).not.toBeNull();
    expect(priced.return.percentTooltip).toContain("$1,000.00");
  });

  it("says nothing about prices before a read has answered", () => {
    // The race this exists for: the tabs are held until the Movements arrive, so
    // if the Stocks read is the slower of the two the screen renders with none
    // in hand. It has not failed - it has not finished - and claiming a figure
    // could not be worked out would be a fault the app has no grounds to report.
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1)];
    const view = buildHomeView(assemblePortfolio(movements, {}), "unread");

    expect(view.withheldLabel).toBe("Sin dato");
    // The figures are withheld either way - only the reason differs.
    expect(view.worth.total).toBeNull();
    expect(view.return.total).toBeNull();
    // And nothing is claimed about why.
    expect(view.priceNote).toBeNull();
  });

  it("says a figure could not be worked out once a read has answered", () => {
    const movements: Movement[] = [deposit(1000), buy("AAPL", 100, 5, 1)];
    const portfolio = assemblePortfolio(movements, {});

    for (const status of ["ready", "failed"] as const) {
      const view = buildHomeView(portfolio, status);
      expect(view.withheldLabel).toBe("No se pudo calcular");
      // No sentence beneath it: the placeholder says what happened, and Mis
      // Activos lists every holding with "Sin precio" against it, which is why.
      expect(view.priceNote).toBeNull();
    }
  });

  it("keeps both placeholders free of punctuation lookalikes", () => {
    // Written as escapes so the assertion says which character it means: no em
    // dash and no minus-sign lookalike, the two the ASCII rule keeps catching.
    const portfolio = assemblePortfolio([deposit(1000), buy("AAPL", 100, 5, 1)], {});
    for (const status of ["unread", "ready"] as const) {
      const { withheldLabel } = buildHomeView(portfolio, status);
      expect(withheldLabel).not.toContain("\u2014");
      expect(withheldLabel).not.toContain("\u2212");
    }
  });
});

describe("showsRefreshFailed", () => {
  /** One Holding and one Quote in hand - the only case the banner is about. */
  const held = { quotedCount: 1, holdingCount: 1 };

  it("says nothing while the Stocks are in hand and current", () => {
    expect(showsRefreshFailed({ ...held, status: "ready" })).toBe(false);
  });

  it("speaks when a refresh fails with Stocks already in hand", () => {
    expect(showsRefreshFailed({ ...held, status: "failed" })).toBe(true);
  });

  it("says nothing when the first read fails, since there is nothing to refresh", () => {
    // Issue 02's behaviour, unchanged: no Quote in hand means the holdings are
    // excluded and flagged, and no sentence about a refresh is true.
    expect(showsRefreshFailed({ quotedCount: 0, holdingCount: 1, status: "failed" })).toBe(false);
  });

  it("says nothing to a user holding nothing", () => {
    expect(showsRefreshFailed({ quotedCount: 3, holdingCount: 0, status: "failed" })).toBe(false);
  });

  it("says nothing before anything has been read", () => {
    expect(showsRefreshFailed({ ...held, status: "unread" })).toBe(false);
  });

  it("falls quiet again once a refresh succeeds", () => {
    expect(showsRefreshFailed({ ...held, status: "ready" })).toBe(false);
  });

  // It cannot blink off mid-refresh, and that is not this function's doing: a
  // read in flight moves the store's `reading`, never its `status`, so the facts
  // this reads do not change while one runs. The guarantee is asserted where it
  // now lives, in stores/stocks.test.ts.
});
