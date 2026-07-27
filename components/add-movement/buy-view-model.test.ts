import { describe, expect, it } from "vitest";

import { buildBuyMovement, summarizeBuy, type BuyDeps } from "./buy-view-model";

const deps: BuyDeps = {
  id: () => "buy-1",
  userId: () => "mock-user-001",
  now: () => "2025-06-25T12:00:00Z",
};

const base = { ticker: "AAPL", executionDate: "2025-06-25" };

describe("summarizeBuy", () => {
  it("derives shares as Monto / Precio", () => {
    const { shares } = summarizeBuy(
      { ...base, amount: "365", executionPrice: "182.5", fee: "0.15" },
      1000,
    );
    expect(shares).toBe(2);
  });

  it("rounds derived shares to 5 decimals", () => {
    const { shares } = summarizeBuy(
      { ...base, amount: "500", executionPrice: "123.7", fee: "" },
      100000,
    );
    expect(shares).toBe(4.04204); // 500 / 123.7 = 4.042037... -> 5 dp
  });

  it("total a pagar is Monto + Comisión", () => {
    const { total } = summarizeBuy(
      { ...base, amount: "365", executionPrice: "182.5", fee: "0.15" },
      1000,
    );
    expect(total).toBe(365.15);
  });

  it("treats a blank Comisión as 0 (total equals Monto)", () => {
    const { total } = summarizeBuy(
      { ...base, amount: "200", executionPrice: "100", fee: "" },
      1000,
    );
    expect(total).toBe(200);
  });

  it("shows 0 shares and 0 total when Monto is blank", () => {
    const { shares, total } = summarizeBuy(
      { ...base, amount: "", executionPrice: "100", fee: "1" },
      1000,
    );
    expect(shares).toBe(0);
    expect(total).toBe(0);
  });

  it("shows 0 shares when Precio is blank (but total still reflects Monto)", () => {
    const { shares, total } = summarizeBuy(
      { ...base, amount: "200", executionPrice: "", fee: "1" },
      1000,
    );
    expect(shares).toBe(0);
    expect(total).toBe(201);
  });

  it("enables save only when ticker, Monto and Precio are all valid", () => {
    expect(
      summarizeBuy({ ...base, amount: "", executionPrice: "", fee: "" }, 1000)
        .saveEnabled,
    ).toBe(false);
    expect(
      summarizeBuy(
        { ...base, ticker: "", amount: "200", executionPrice: "100", fee: "" },
        1000,
      ).saveEnabled,
    ).toBe(false);
    expect(
      summarizeBuy(
        { ...base, amount: "200", executionPrice: "", fee: "" },
        1000,
      ).saveEnabled,
    ).toBe(false);
    expect(
      summarizeBuy(
        { ...base, amount: "200", executionPrice: "100", fee: "" },
        1000,
      ).saveEnabled,
    ).toBe(true);
  });

  it("flags an empty ticker as invalid (whitespace-only too)", () => {
    expect(
      summarizeBuy(
        { ...base, ticker: "", amount: "200", executionPrice: "100", fee: "" },
        1000,
      ).tickerInvalid,
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
      ).tickerInvalid,
    ).toBe(true);
    expect(
      summarizeBuy(
        { ...base, amount: "200", executionPrice: "100", fee: "" },
        1000,
      ).tickerInvalid,
    ).toBe(false);
  });

  it("flags a Monto entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeBuy(
        { ...base, amount: "0", executionPrice: "100", fee: "" },
        1000,
      ).amountInvalid,
    ).toBe(true);
    expect(
      summarizeBuy(
        { ...base, amount: "", executionPrice: "100", fee: "" },
        1000,
      ).amountInvalid,
    ).toBe(false);
  });

  it("flags a Precio entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeBuy(
        { ...base, amount: "200", executionPrice: "0", fee: "" },
        1000,
      ).priceInvalid,
    ).toBe(true);
    expect(
      summarizeBuy(
        { ...base, amount: "200", executionPrice: "", fee: "" },
        1000,
      ).priceInvalid,
    ).toBe(false);
  });

  it("blocks save and flags insufficientFunds when total exceeds available Cash", () => {
    const over = summarizeBuy(
      { ...base, amount: "1000", executionPrice: "100", fee: "1" },
      267.07,
    );
    expect(over.insufficientFunds).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("includes the fee in the funds gate (fee tips it over Cash)", () => {
    const over = summarizeBuy(
      { ...base, amount: "200", executionPrice: "100", fee: "1" },
      200,
    );
    expect(over.insufficientFunds).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("allows a total exactly equal to the available Cash", () => {
    const exact = summarizeBuy(
      { ...base, amount: "200", executionPrice: "100", fee: "0.15" },
      200.15,
    );
    expect(exact.insufficientFunds).toBe(false);
    expect(exact.saveEnabled).toBe(true);
  });

  it("does not flag insufficientFunds for a blank form", () => {
    const blank = summarizeBuy(
      { ...base, amount: "", executionPrice: "", fee: "" },
      0,
    );
    expect(blank.insufficientFunds).toBe(false);
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
      userId: "mock-user-001",
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
    const movement = buildBuyMovement(
      { ...base, amount: "1000", executionPrice: "182.5", fee: "" },
      deps,
    );
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
    const movement = buildBuyMovement(
      { ...base, ticker: "VOO", amount: "445", executionPrice: "445", fee: "" },
      deps,
    );
    expect(movement.fee).toBe(0);
  });
});
