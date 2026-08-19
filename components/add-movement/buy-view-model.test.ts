import { describe, expect, it } from "vitest";

import { buildBuyMovement, summarizeBuy, type BuyDeps } from "./buy-view-model";

const deps: BuyDeps = {
  id: () => "buy-1",
  now: () => "2025-06-25T12:00:00Z",
};

const base = { ticker: "AAPL", executionDate: "2025-06-25" };

describe("summarizeBuy", () => {
  it("derives shares as Monto / Precio", () => {
    const { shares } = summarizeBuy(
      { ...base, amount: "365", executionPrice: "182.5", fee: "0.15" },
      1000,
      "confirmed",
    );
    expect(shares).toBe(2);
  });

  it("rounds derived shares to 5 decimals", () => {
    const { shares } = summarizeBuy({ ...base, amount: "500", executionPrice: "123.7", fee: "" }, 100000, "confirmed");
    expect(shares).toBe(4.04204); // 500 / 123.7 = 4.042037... -> 5 dp
  });

  it("total a pagar is what the shares cost plus the Comisión", () => {
    const { total } = summarizeBuy({ ...base, amount: "365", executionPrice: "182.5", fee: "0.15" }, 1000, "confirmed");
    expect(total).toBe(365.15); // 182.5 × 2 shares + 0.15; the shares divide evenly here
  });

  it("treats a blank Comisión as 0 (total is the shares' cost alone)", () => {
    const { total } = summarizeBuy({ ...base, amount: "200", executionPrice: "100", fee: "" }, 1000, "confirmed");
    expect(total).toBe(200);
  });

  it("shows 0 shares and 0 total when Monto is blank", () => {
    const { shares, total } = summarizeBuy({ ...base, amount: "", executionPrice: "100", fee: "1" }, 1000, "confirmed");
    expect(shares).toBe(0);
    expect(total).toBe(0);
  });

  it("shows 0 shares and 0 total when Precio is blank", () => {
    // Without a price there is no share count, so there is no purchase to total -
    // the Monto on its own says what the user wants to spend, not what they will pay.
    const { shares, total } = summarizeBuy({ ...base, amount: "200", executionPrice: "", fee: "1" }, 1000, "confirmed");
    expect(shares).toBe(0);
    expect(total).toBe(0);
  });

  it("derives a total above the Monto when the share rounding goes up (ADR 0012)", () => {
    // The case the decision is written about. 1000 / 7000 = 0.142857142857..., which
    // roundShares takes UP to 0.14286, so the shares cost more than the Monto asked to
    // spend. Computed from the Monto this buy passed the gate at exactly the available
    // Cash and drove Buying Power to -$0.02.
    const summary = summarizeBuy({ ...base, amount: "1000", executionPrice: "7000", fee: "" }, 1000, "confirmed");

    expect(summary.shares).toBe(0.14286);
    expect(summary.total).toBe(1000.02);
    expect(summary.total).toBeGreaterThan(1000); // the Monto typed, and the Cash on hand
    expect(summary.insufficientFunds).toBe(true);
    expect(summary.saveEnabled).toBe(false);
  });

  it("derives a total below the Monto when the share rounding goes down", () => {
    // The same mechanism in the harmless direction, so the pair documents that the drift
    // has no preferred sign. 2000 / 7000 = 0.285714285..., which rounds DOWN to 0.28571,
    // leaving the buy three cents cheaper than the Monto - and affordable at the very
    // Cash the case above is refused at.
    const summary = summarizeBuy({ ...base, amount: "2000", executionPrice: "7000", fee: "" }, 2000, "confirmed");

    expect(summary.total).toBe(1999.97);
    expect(summary.total).toBeLessThan(2000);
    expect(summary.saveEnabled).toBe(true);
  });

  it("keeps save closed when the Monto is too small to buy any shares", () => {
    // A cent against a $7,000 listing derives 0.0000014 shares, which rounds to none at
    // all. Monto and Precio are both positive, so the gate used to open on a purchase
    // that acquired nothing and totalled $0.00.
    const summary = summarizeBuy({ ...base, amount: "0.01", executionPrice: "7000", fee: "" }, 1000, "confirmed");

    expect(summary.shares).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.saveEnabled).toBe(false);
    expect(summary.amountTooSmall).toBe(true);
  });

  it("blames the Precio, not the Monto, when the Precio is simply missing", () => {
    // Both leave 0 shares, so only the price check tells them apart - otherwise a form
    // with the Precio not yet filled in would accuse a perfectly good Monto.
    const noPrice = summarizeBuy({ ...base, amount: "200", executionPrice: "", fee: "" }, 1000, "confirmed");
    expect(noPrice.amountTooSmall).toBe(false);
    expect(noPrice.saveEnabled).toBe(false);
  });

  it("enables save only when ticker, Monto and Precio are all valid", () => {
    expect(summarizeBuy({ ...base, amount: "", executionPrice: "", fee: "" }, 1000, "confirmed").saveEnabled).toBe(
      false,
    );
    expect(
      summarizeBuy({ ...base, ticker: "", amount: "200", executionPrice: "100", fee: "" }, 1000, "confirmed")
        .saveEnabled,
    ).toBe(false);
    expect(summarizeBuy({ ...base, amount: "200", executionPrice: "", fee: "" }, 1000, "confirmed").saveEnabled).toBe(
      false,
    );
    expect(
      summarizeBuy({ ...base, amount: "200", executionPrice: "100", fee: "" }, 1000, "confirmed").saveEnabled,
    ).toBe(true);
  });

  it("flags an empty ticker as invalid (whitespace-only too)", () => {
    expect(
      summarizeBuy({ ...base, ticker: "", amount: "200", executionPrice: "100", fee: "" }, 1000, "confirmed")
        .tickerInvalid,
    ).toBe(true);
    expect(
      summarizeBuy(
        {
          ...base,
          ticker: "   ",
          amount: "200",
          executionPrice: "100",
          fee: "",
        },
        1000,
        "confirmed",
      ).tickerInvalid,
    ).toBe(true);
    expect(
      summarizeBuy({ ...base, amount: "200", executionPrice: "100", fee: "" }, 1000, "confirmed").tickerInvalid,
    ).toBe(false);
  });

  it("flags a Monto entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeBuy({ ...base, amount: "0", executionPrice: "100", fee: "" }, 1000, "confirmed").amountInvalid,
    ).toBe(true);
    expect(summarizeBuy({ ...base, amount: "", executionPrice: "100", fee: "" }, 1000, "confirmed").amountInvalid).toBe(
      false,
    );
  });

  it("flags a Precio entered as 0 as invalid (but blank is not)", () => {
    expect(summarizeBuy({ ...base, amount: "200", executionPrice: "0", fee: "" }, 1000, "confirmed").priceInvalid).toBe(
      true,
    );
    expect(summarizeBuy({ ...base, amount: "200", executionPrice: "", fee: "" }, 1000, "confirmed").priceInvalid).toBe(
      false,
    );
  });

  it("blocks save and flags insufficientFunds when total exceeds available Cash", () => {
    const over = summarizeBuy({ ...base, amount: "1000", executionPrice: "100", fee: "1" }, 267.07, "confirmed");
    expect(over.insufficientFunds).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("includes the fee in the funds gate (fee tips it over Cash)", () => {
    const over = summarizeBuy({ ...base, amount: "200", executionPrice: "100", fee: "1" }, 200, "confirmed");
    expect(over.insufficientFunds).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("allows a total exactly equal to the available Cash", () => {
    const exact = summarizeBuy({ ...base, amount: "200", executionPrice: "100", fee: "0.15" }, 200.15, "confirmed");
    expect(exact.insufficientFunds).toBe(false);
    expect(exact.saveEnabled).toBe(true);
  });

  it("does not flag insufficientFunds for a blank form", () => {
    const blank = summarizeBuy({ ...base, amount: "", executionPrice: "", fee: "" }, 0, "confirmed");
    expect(blank.insufficientFunds).toBe(false);
  });

  it("keeps save closed for every símbolo status except confirmed", () => {
    // An otherwise perfect form. The only thing moving is the confirmation, and
    // it is the only thing that can open the gate - including `checking`, which
    // would otherwise accept a tap and reject the save a moment later.
    const perfect = { ...base, amount: "200", executionPrice: "100", fee: "" };

    expect(summarizeBuy(perfect, 1000, "unchecked").saveEnabled).toBe(false);
    expect(summarizeBuy(perfect, 1000, "checking").saveEnabled).toBe(false);
    expect(summarizeBuy(perfect, 1000, "unknown").saveEnabled).toBe(false);
    expect(summarizeBuy(perfect, 1000, "unavailable").saveEnabled).toBe(false);
    expect(summarizeBuy(perfect, 1000, "confirmed").saveEnabled).toBe(true);
  });

  it("leaves everything but the gate untouched by the símbolo status", () => {
    // The confirmation blocks the save; it does not change what the form shows
    // while the user is still filling it in.
    const input = { ...base, amount: "365", executionPrice: "182.5", fee: "0.15" };
    const { saveEnabled: _ignored, ...unchecked } = summarizeBuy(input, 1000, "unchecked");
    const { saveEnabled: _alsoIgnored, ...confirmed } = summarizeBuy(input, 1000, "confirmed");

    expect(unchecked).toEqual(confirmed);
  });
});

describe("buildBuyMovement", () => {
  it("maps fields to a typed BuyMovement, deriving shares from Monto / Precio", () => {
    const movement = buildBuyMovement(
      {
        ticker: "AAPL",
        amount: "365",
        executionPrice: "182.5",
        fee: "0.15",
        executionDate: "2023-10-24",
      },
      deps,
    );
    expect(movement).toEqual({
      id: "buy-1",
      type: "buy",
      ticker: "AAPL",
      executionPrice: 182.5,
      shares: 2,
      fee: 0.15,
      executionDate: "2023-10-24",
      createdAt: "2025-06-25T12:00:00Z",
    });
  });

  it("stores derived shares rounded to 5 decimals (the app-wide share precision)", () => {
    const movement = buildBuyMovement({ ...base, amount: "1000", executionPrice: "182.5", fee: "" }, deps);
    expect(movement.shares).toBe(5.47945); // 1000 / 182.5 = 5.479452... -> 5 dp
  });

  it("stores the ticker uppercase and trimmed", () => {
    const movement = buildBuyMovement(
      {
        ...base,
        ticker: "  aapl ",
        amount: "100",
        executionPrice: "50",
        fee: "",
      },
      deps,
    );
    expect(movement.ticker).toBe("AAPL");
  });

  it("defaults an empty Comisión to 0", () => {
    const movement = buildBuyMovement({ ...base, ticker: "VOO", amount: "445", executionPrice: "445", fee: "" }, deps);
    expect(movement.fee).toBe(0);
  });
});
