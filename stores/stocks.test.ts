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

  it("a read answering after a confirmation keeps the Stock it confirmed", () => {
    // The race the merge exists for. The read fires on the tabs mounting and a
    // símbolo can be confirmed while it is still in flight; its answer cannot
    // carry that Stock, because `user_stocks` links a ticker only when its
    // Movement is inserted (ADR 0015). Replacing the map deleted the Quote the
    // app had just fetched and the new Holding read "sin precio".
    useStocksStore.getState().stockConfirmed(voo);

    stocksInHand({ AAPL: apple });

    expect(useStocksStore.getState().status).toBe("ready");
    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple, VOO: voo });
  });

  it("a read wins over what is held for every ticker it does carry", () => {
    // Merging must not make the map stale: the read is authoritative for the
    // Stocks it returns, and only fills in around the ones it does not.
    const stale: Stock = { ...apple, quote: { price: 100.0, quotedAt: "2026-02-01T21:00:00Z" } };
    useStocksStore.getState().stockConfirmed(stale);

    stocksInHand({ AAPL: apple });

    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple });
  });

  it("a confirmed Stock joins the map without displacing the ones already held", () => {
    stocksInHand({ AAPL: apple });

    useStocksStore.getState().stockConfirmed(voo);

    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple, VOO: voo });
  });

  it("a confirmed Stock replaces an older Quote for the same ticker", () => {
    stocksInHand({ AAPL: apple });
    const fresher: Stock = { ...apple, quote: { price: 310.03, quotedAt: "2026-08-18T20:00:00Z" } };

    useStocksStore.getState().stockConfirmed(fresher);

    expect(useStocksStore.getState().stocks).toEqual({ AAPL: fresher });
  });

  it.each(["unread", "ready", "failed"] as const)("a confirmation leaves the status at %s", (status) => {
    // The constraint is an ABSENCE, so nothing in a diff reveals it and only this
    // can hold it. `status` records how the last *read* came out, and a
    // confirmation is not a read - so a symbol typed into the Compra form must
    // never clear the refresh-failed banner, which is the fault the store's own
    // "nothing can unsay a failure" guarantee exists to prevent (ADR 0013).
    useStocksStore.setState({ status, stocks: { AAPL: apple } });

    useStocksStore.getState().stockConfirmed(voo);

    expect(useStocksStore.getState().status).toBe(status);
    expect(useStocksStore.getState().stocks).toEqual({ AAPL: apple, VOO: voo });
  });

  it("signing out drops a confirmed Stock with the rest", () => {
    stocksInHand({ AAPL: apple });
    useStocksStore.getState().stockConfirmed(voo);

    useStocksStore.getState().forgetStocks();

    expect(useStocksStore.getState().stocks).toEqual({});
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
