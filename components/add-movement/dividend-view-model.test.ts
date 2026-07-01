import { describe, expect, it } from "vitest";

import {
  buildDividendMovement,
  summarizeDividend,
  type DividendDeps,
} from "./dividend-view-model";

const deps: DividendDeps = {
  id: () => "dividend-1",
  userId: () => "mock-user-001",
  now: () => "2025-06-25T12:00:00Z",
};

const base = { ticker: "AAPL", executedAt: "2025-06-25" };

describe("summarizeDividend", () => {
  it("gross is the Monto bruto", () => {
    const { gross } = summarizeDividend({
      ...base,
      grossAmount: "130.00",
      tax: "5.50",
    });
    expect(gross).toBe(130);
  });

  it("total a recibir is gross minus Impuestos", () => {
    const { total } = summarizeDividend({
      ...base,
      grossAmount: "130.00",
      tax: "5.50",
    });
    expect(total).toBe(124.5);
  });

  it("treats blank Impuestos as 0 (total equals gross)", () => {
    const { total } = summarizeDividend({
      ...base,
      grossAmount: "130",
      tax: "",
    });
    expect(total).toBe(130);
  });

  it("shows 0 gross and 0 total when Monto bruto is blank", () => {
    const { gross, total } = summarizeDividend({
      ...base,
      grossAmount: "",
      tax: "5",
    });
    expect(gross).toBe(0);
    expect(total).toBe(0);
  });

  it("enables save only when ticker and Monto bruto are valid and tax is within range", () => {
    expect(
      summarizeDividend({ ...base, grossAmount: "", tax: "" }).saveEnabled,
    ).toBe(false);
    expect(
      summarizeDividend({ ...base, ticker: "", grossAmount: "130", tax: "" })
        .saveEnabled,
    ).toBe(false);
    expect(
      summarizeDividend({ ...base, grossAmount: "130", tax: "200" })
        .saveEnabled,
    ).toBe(false);
    expect(
      summarizeDividend({ ...base, grossAmount: "130", tax: "5.50" })
        .saveEnabled,
    ).toBe(true);
  });

  it("flags an empty ticker as invalid (whitespace-only too)", () => {
    expect(
      summarizeDividend({ ...base, ticker: "", grossAmount: "130", tax: "" })
        .tickerInvalid,
    ).toBe(true);
    expect(
      summarizeDividend({ ...base, ticker: "   ", grossAmount: "130", tax: "" })
        .tickerInvalid,
    ).toBe(true);
    expect(
      summarizeDividend({ ...base, grossAmount: "130", tax: "" }).tickerInvalid,
    ).toBe(false);
  });

  it("flags a Monto bruto value entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeDividend({ ...base, grossAmount: "0", tax: "" }).grossInvalid,
    ).toBe(true);
    expect(
      summarizeDividend({ ...base, grossAmount: "", tax: "" }).grossInvalid,
    ).toBe(false);
  });

  it("blocks save and flags taxExceedsGross when Impuestos exceeds Monto bruto", () => {
    const over = summarizeDividend({
      ...base,
      grossAmount: "130",
      tax: "150",
    });
    expect(over.taxExceedsGross).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("allows tax equal to gross (net of 0)", () => {
    const exact = summarizeDividend({
      ...base,
      grossAmount: "130",
      tax: "130",
    });
    expect(exact.taxExceedsGross).toBe(false);
    expect(exact.saveEnabled).toBe(true);
    expect(exact.total).toBe(0);
  });

  it("does not flag taxExceedsGross for a blank form", () => {
    const blank = summarizeDividend({ ...base, grossAmount: "", tax: "" });
    expect(blank.taxExceedsGross).toBe(false);
  });
});

describe("buildDividendMovement", () => {
  it("maps fields to a typed DividendMovement with injected system fields", () => {
    const movement = buildDividendMovement(
      {
        ticker: "AAPL",
        grossAmount: "130.00",
        tax: "5.50",
        executedAt: "2023-10-24",
      },
      deps,
    );
    expect(movement).toEqual({
      id: "dividend-1",
      userId: "mock-user-001",
      type: "dividend",
      ticker: "AAPL",
      grossAmount: 130,
      tax: 5.5,
      executedAt: "2023-10-24",
      createdAt: "2025-06-25T12:00:00Z",
    });
  });

  it("stores the ticker uppercase and trimmed", () => {
    const movement = buildDividendMovement(
      { ...base, ticker: "  aapl ", grossAmount: "130", tax: "" },
      deps,
    );
    expect(movement.ticker).toBe("AAPL");
  });

  it("defaults empty Impuestos to 0", () => {
    const movement = buildDividendMovement(
      { ...base, ticker: "GOOG", grossAmount: "80", tax: "" },
      deps,
    );
    expect(movement.tax).toBe(0);
  });
});
