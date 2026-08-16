import { afterEach, describe, expect, it } from "vitest";

import type { Stock } from "@/types/models";
import { initialStocksState, useStocksStore } from "./stocks";

const apple: Stock = {
  ticker: "AAPL",
  name: "Apple Inc.",
  quote: { price: 198.4, quotedAt: "2026-02-13T21:00:00Z" },
};

const voo: Stock = {
  ticker: "VOO",
  name: "Vanguard S&P 500 ETF",
  quote: { price: 458.6, quotedAt: "2026-02-13T21:00:00Z" },
};

/** A read that has already answered, so the Stocks are in hand. */
function stocksInHand(stocks: Record<string, Stock>) {
  useStocksStore.getState().answerRead({ ok: true, stocks });
}

describe("useStocksStore", () => {
  // The store is module-level, so a test that leaves Quotes behind is a test
  // that hands them to the next one.
  afterEach(() => {
    useStocksStore.setState(initialStocksState);
  });

  it("starts with no Stocks and no claim to have read any", () => {
    // `unread` is the first of the three causes: an empty map says nothing on
    // its own, and only the status tells "nobody has asked yet" from "asked and
    // the database prices nothing".
    expect(useStocksStore.getState().stocks).toEqual({});
    expect(useStocksStore.getState().status).toBe("unread");
  });

  it("an answered read puts the Stocks in hand", () => {
    useStocksStore.getState().answerRead({ ok: true, stocks: { AAPL: apple } });

    expect(useStocksStore.getState().status).toBe("ready");
    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple });
  });

  // There is no test that a read in flight leaves the previous failure standing,
  // because there is no way to express one: nothing runs when a read starts, so
  // only an answer moves the status. The banner announcing a fault cannot blink
  // off while the next select runs, by construction rather than by assertion.

  it("a failure with nothing previously held", () => {
    useStocksStore
      .getState()
      .answerRead({ ok: false, failure: { status: 0, code: null, message: "Network request failed" } });

    expect(useStocksStore.getState().status).toBe("failed");
    expect(useStocksStore.getState().stocks).toEqual({});
  });

  it("a failed re-read leaves the Stocks already in hand untouched", () => {
    // The rule the whole "a failed refresh is not an absence" decision rests on
    // (ADR 0011): the app holds Quotes and could not learn whether newer ones
    // exist. Dropping them would report a fault as an absence.
    stocksInHand({ AAPL: apple, VOO: voo });

    useStocksStore
      .getState()
      .answerRead({ ok: false, failure: { status: 500, code: null, message: "internal error" } });

    expect(useStocksStore.getState().status).toBe("failed");
    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple, VOO: voo });
  });

  it("signing out returns the store to its initial state", () => {
    // For freshness, not for privacy - a Quote is shared and leaks nothing. What
    // must not survive is a Quote shown as current in a session whose own read
    // failed.
    stocksInHand({ AAPL: apple });

    useStocksStore.getState().forgetStocks();

    expect(useStocksStore.getState().status).toBe("unread");
    expect(useStocksStore.getState().stocks).toEqual({});
  });
});
