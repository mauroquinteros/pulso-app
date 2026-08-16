import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStocks } from "./stocks";

type Failure = { message: string; code: string } | null;
type Result = { data: unknown[] | null; error: Failure; status: number };

/**
 * Fakes the database for one question: does the read ask twice when the token is
 * refused for being dated ahead of the server, and only then?
 *
 * That rule is worth the cost of a fake because it is invisible when it works and
 * silent when it breaks. This read fires the instant the tabs mount, which is the
 * instant a Perfil signs in - so a token can be refused for being newborn rather
 * than for being wrong, and without the retry every Holding renders unpriced
 * beside a History that retried and arrived.
 *
 * Results are staged per attempt, so a test can make the first pass fail and the
 * second succeed.
 */
const db = vi.hoisted(() => ({
  attempts: [] as Result[],
  passes: 0,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        not: () => {
          const staged = db.attempts[db.passes];
          db.passes += 1;
          return Promise.resolve(staged);
        },
      }),
    }),
  },
}));

const appleRow = { ticker: "AAPL", name: "Apple Inc.", price: 313.33, quoted_at: "2026-08-07T20:00:00Z" };
const vooRow = { ticker: "VOO", name: "Vanguard S&P 500 ETF", price: 710.71, quoted_at: "2026-08-07T20:00:00Z" };

const ok = (rows: unknown[]): Result => ({ data: rows, error: null, status: 200 });
const clockSkew: Result = { data: null, error: { message: "JWT issued at future", code: "PGRST303" }, status: 401 };
const revoked: Result = { data: null, error: { message: "JWT expired", code: "PGRST301" }, status: 401 };

beforeEach(() => {
  db.attempts = [];
  db.passes = 0;
});

describe("readStocks", () => {
  it("hands back Stocks keyed by ticker, as domain objects rather than rows", async () => {
    db.attempts = [ok([appleRow, vooRow])];

    const answer = await readStocks();

    expect(answer).toEqual({
      ok: true,
      stocks: {
        AAPL: { ticker: "AAPL", name: "Apple Inc.", quote: { price: 313.33, quotedAt: "2026-08-07T20:00:00Z" } },
        VOO: {
          ticker: "VOO",
          name: "Vanguard S&P 500 ETF",
          quote: { price: 710.71, quotedAt: "2026-08-07T20:00:00Z" },
        },
      },
    });
    // No column name survives the boundary: a Quote is spelled the domain's way
    // from here up (CLAUDE.md).
    expect(JSON.stringify(answer)).not.toContain("quoted_at");
  });

  it("is ok and empty when the database can price nothing", async () => {
    db.attempts = [ok([])];

    // Not a failure, and not the same fact as a read that did not arrive - which
    // is exactly why the status lives beside the map in the store.
    expect(await readStocks()).toEqual({ ok: true, stocks: {} });
    expect(db.passes).toBe(1);
  });

  it("reads again when the token is refused for being dated ahead of the server", async () => {
    db.attempts = [clockSkew, ok([appleRow])];

    const answer = await readStocks();

    expect(answer.ok).toBe(true);
    expect(db.passes).toBe(2);
  });

  it("gives up after one retry rather than looping", async () => {
    db.attempts = [clockSkew, clockSkew];

    const answer = await readStocks();

    expect(answer).toEqual({
      ok: false,
      failure: { status: 401, code: "PGRST303", message: "JWT issued at future" },
    });
    expect(db.passes).toBe(2);
  });

  it("does not retry a fault that will not clear on its own", async () => {
    db.attempts = [revoked];

    const answer = await readStocks();

    expect(answer.ok).toBe(false);
    // A revoked token is not a disagreement about the time; asking again would
    // only spend a round trip to be told the same thing.
    expect(db.passes).toBe(1);
  });
});
