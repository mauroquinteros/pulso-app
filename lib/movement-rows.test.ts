import { describe, expect, it } from "vitest";

import {
  mapCashRow,
  mapDividendRow,
  mapTradeRow,
  type CashRow,
  type DividendRow,
  type TradeRow,
} from "./movement-rows";

const buyRow: TradeRow = {
  id: "2b0f6a10-0000-4000-8000-000000000001",
  type: "buy",
  execution_date: "2026-03-09",
  ticker: "AAPL",
  shares: 12,
  execution_price: 187.42,
  fee: 0.35,
  regulatory_fees: null,
  created_at: "2026-03-09T18:41:07.221Z",
};

const sellRow: TradeRow = {
  ...buyRow,
  id: "2b0f6a10-0000-4000-8000-000000000002",
  type: "sell",
  regulatory_fees: 0.04,
};

const dividendRow: DividendRow = {
  id: "2b0f6a10-0000-4000-8000-000000000003",
  execution_date: "2026-02-14",
  ticker: "MSFT",
  gross_amount: 18.6,
  tax: 5.58,
  created_at: "2026-02-14T09:15:00.000Z",
};

const depositRow: CashRow = {
  id: "2b0f6a10-0000-4000-8000-000000000004",
  type: "deposit",
  execution_date: "2026-01-02",
  amount: 1000,
  transfer_fee: 3.5,
  created_at: "2026-01-02T22:00:00.000Z",
};

/** Every column name the three tables use. None of them may reach the domain. */
const COLUMN_NAMES = [
  "execution_date",
  "execution_price",
  "created_at",
  "regulatory_fees",
  "gross_amount",
  "transfer_fee",
  "user_id",
  "updated_at",
];

describe("mapTradeRow", () => {
  it("maps a buy row to a BuyMovement in camelCase", () => {
    expect(mapTradeRow(buyRow)).toEqual({
      id: "2b0f6a10-0000-4000-8000-000000000001",
      type: "buy",
      executionDate: "2026-03-09",
      createdAt: "2026-03-09T18:41:07.221Z",
      ticker: "AAPL",
      shares: 12,
      executionPrice: 187.42,
      fee: 0.35,
    });
  });

  it("maps a sell row to a SellMovement, regulatory fees included", () => {
    expect(mapTradeRow(sellRow)).toEqual({
      id: "2b0f6a10-0000-4000-8000-000000000002",
      type: "sell",
      executionDate: "2026-03-09",
      createdAt: "2026-03-09T18:41:07.221Z",
      ticker: "AAPL",
      shares: 12,
      executionPrice: 187.42,
      fee: 0.35,
      regulatoryFees: 0.04,
    });
  });

  it("a buy's NULL regulatory_fees never reaches the domain as a null", () => {
    // The schema's only nullable column, and it is NULL for every buy - the
    // table's CHECK constraint requires it, since only a sell has regulatory
    // fees (ADR 0006). `BuyMovement` has no field to put a `0` in, so the rule
    // lands as an absent field rather than a zero; what matters either way is
    // that no `null` gets past this boundary into a figure.
    const buy = mapTradeRow(buyRow);

    expect(buy).not.toHaveProperty("regulatoryFees");
    expect(Object.values(buy)).not.toContain(null);
  });

  it("a NULL regulatory_fees on a sell becomes 0, never null or undefined", () => {
    const sell = mapTradeRow({ ...sellRow, regulatory_fees: null });

    expect(sell).toHaveProperty("regulatoryFees", 0);
  });

  it("keeps numerics as numbers", () => {
    const buy = mapTradeRow(buyRow);

    expect(typeof buy.shares).toBe("number");
    expect(typeof buy.executionPrice).toBe("number");
    expect(typeof buy.fee).toBe("number");
  });
});

describe("mapDividendRow", () => {
  it("maps a dividend row to a DividendMovement in camelCase", () => {
    expect(mapDividendRow(dividendRow)).toEqual({
      id: "2b0f6a10-0000-4000-8000-000000000003",
      type: "dividend",
      executionDate: "2026-02-14",
      createdAt: "2026-02-14T09:15:00.000Z",
      ticker: "MSFT",
      grossAmount: 18.6,
      tax: 5.58,
    });
  });
});

describe("mapCashRow", () => {
  it("maps a deposit row to a DepositMovement in camelCase", () => {
    expect(mapCashRow(depositRow)).toEqual({
      id: "2b0f6a10-0000-4000-8000-000000000004",
      type: "deposit",
      executionDate: "2026-01-02",
      createdAt: "2026-01-02T22:00:00.000Z",
      amount: 1000,
      transferFee: 3.5,
    });
  });

  it("maps a withdrawal row to a WithdrawalMovement, from the same table", () => {
    // One table, two subtypes: the `type` column is what tells them apart.
    expect(mapCashRow({ ...depositRow, type: "withdrawal" }).type).toBe("withdrawal");
  });
});

describe("the snake_case boundary", () => {
  it("no column name survives any of the three mappers", () => {
    const mapped = [mapTradeRow(buyRow), mapTradeRow(sellRow), mapDividendRow(dividendRow), mapCashRow(depositRow)];

    for (const movement of mapped) {
      for (const column of COLUMN_NAMES) {
        expect(movement).not.toHaveProperty(column);
      }
      expect(Object.keys(movement).join()).not.toContain("_");
    }
  });

  it("execution_date survives as the calendar date it is, never timezone-converted", () => {
    // A calendar date is the day the movement happened. Round-tripping it
    // through a Date moves it a day in one direction or the other depending on
    // where the phone is, which silently reorders Average Cost and Realized P&L
    // (ADR 0004). So the mapper hands the string through untouched.
    const late = "2026-03-09"; // a date whose UTC midnight is the 8th in Lima

    expect(mapTradeRow({ ...buyRow, execution_date: late }).executionDate).toBe(late);
    expect(mapDividendRow({ ...dividendRow, execution_date: late }).executionDate).toBe(late);
    expect(mapCashRow({ ...depositRow, execution_date: late }).executionDate).toBe(late);
    expect(typeof mapCashRow({ ...depositRow, execution_date: late }).executionDate).toBe("string");
  });

  it("created_at survives as the instant the database recorded", () => {
    // The chronological tiebreaker, read from one clock - the database's.
    expect(mapCashRow(depositRow).createdAt).toBe("2026-01-02T22:00:00.000Z");
  });
});
