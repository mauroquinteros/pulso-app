import { beforeEach, describe, expect, it, vi } from "vitest";

import { readHistory } from "./history";
import type { CashRow, DividendRow, TradeRow } from "./movement-rows";

type TableName = "movement_trades" | "movement_dividends" | "movement_cash";
type Result = { data: unknown[] | null; error: { message: string; code: string } | null; status: number };

/**
 * The one place in the suite that fakes the database. It costs more than a pure
 * unit, and it is worth it exactly once: an untested all-or-nothing rule is the
 * rule most likely to quietly stop holding, and it is the one ADR 0006 exists
 * to protect.
 *
 * The fake reproduces the property that makes the rule easy to get wrong -
 * `supabase-js` reports a failed select as an `error` on a *resolved* promise,
 * so `Promise.all` never rejects and never short-circuits. A reader that only
 * catches rejections would pass every happy test and merge a partial History in
 * production.
 */
const db = vi.hoisted(() => ({
  selects: [] as string[],
  results: {} as Record<string, Result>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        db.selects.push(table);
        return Promise.resolve(db.results[table]);
      },
    }),
  },
}));

const buyRow: TradeRow = {
  id: "7c1e0b40-0000-4000-8000-000000000001",
  type: "buy",
  execution_date: "2026-03-09",
  ticker: "AAPL",
  shares: 12,
  execution_price: 187.42,
  fee: 0.35,
  regulatory_fees: null,
  created_at: "2026-03-09T18:41:07.221Z",
};

const dividendRow: DividendRow = {
  id: "7c1e0b40-0000-4000-8000-000000000002",
  execution_date: "2026-02-14",
  ticker: "MSFT",
  gross_amount: 18.6,
  tax: 5.58,
  created_at: "2026-02-14T09:15:00.000Z",
};

const depositRow: CashRow = {
  id: "7c1e0b40-0000-4000-8000-000000000003",
  type: "deposit",
  execution_date: "2026-01-02",
  amount: 1000,
  transfer_fee: 3.5,
  created_at: "2026-01-02T22:00:00.000Z",
};

const ROWS: Record<TableName, unknown[]> = {
  movement_trades: [buyRow],
  movement_dividends: [dividendRow],
  movement_cash: [depositRow],
};

const TABLES: TableName[] = ["movement_trades", "movement_dividends", "movement_cash"];

/** Every select answers with its rows, except `broken`, which errors. */
function given(broken?: TableName) {
  db.selects = [];
  db.results = Object.fromEntries(
    TABLES.map((table) => [
      table,
      table === broken
        ? { data: null, error: { message: `${table} is unreachable`, code: "PGRST500" }, status: 500 }
        : { data: ROWS[table], error: null, status: 200 },
    ]),
  );
}

beforeEach(() => given());

describe("readHistory", () => {
  it("returns the whole History, one Movement per row across the three tables", async () => {
    const answer = await readHistory();

    expect(answer.ok).toBe(true);
    expect(answer.ok && answer.movements.map((m) => m.type)).toEqual(["buy", "dividend", "deposit"]);
  });

  it("hands back domain objects, not rows", async () => {
    const answer = await readHistory();

    expect(answer.ok && answer.movements).toContainEqual({
      id: "7c1e0b40-0000-4000-8000-000000000003",
      type: "deposit",
      executionDate: "2026-01-02",
      createdAt: "2026-01-02T22:00:00.000Z",
      amount: 1000,
      transferFee: 3.5,
    });
  });

  it("is ok and empty for a Perfil who has recorded nothing", async () => {
    // The expected outcome on day one: three empty tables are an empty History,
    // which is a fact about the user - not a failure.
    db.results = Object.fromEntries(TABLES.map((table) => [table, { data: [], error: null, status: 200 }]));

    expect(await readHistory()).toEqual({ ok: true, movements: [] });
  });

  it("fires the three selects together rather than one after another", async () => {
    // The History is one thing; there is no order in which its parts are wanted.
    // Asserting before the returned promise settles is what tells a parallel
    // reader from a serial one: a serial one would have issued only the first.
    const pending = readHistory();

    expect(db.selects).toEqual(TABLES);

    await pending;
  });

  for (const broken of TABLES) {
    it(`fails wholly when ${broken} fails, discarding the two that worked`, async () => {
      given(broken);

      const answer = await readHistory();

      // No `movements` key at all, so there is no partial merge to reach for.
      // A History missing some of its Movements is not a smaller History but a
      // wrong one, and nothing downstream can tell (ADR 0006).
      expect(answer.ok).toBe(false);
      expect(answer).not.toHaveProperty("movements");

      // The refusal names which select failed and why, so an intermittent
      // fault leaves something behind to diagnose it with.
      expect(!answer.ok && answer.failures).toEqual([
        { table: broken, status: 500, code: "PGRST500", message: `${broken} is unreachable` },
      ]);
    });
  }

  it("fails when every select fails", async () => {
    // status 0 is a request that never left the phone - the shape a dropped
    // connection takes, as opposed to a 401 or a policy refusal.
    db.results = Object.fromEntries(
      TABLES.map((table) => [table, { data: null, error: { message: "offline", code: "" }, status: 0 }]),
    );

    const answer = await readHistory();

    // All three are named, not just the first: offline and a single broken
    // policy must not read the same in the log.
    expect(answer.ok).toBe(false);
    expect(!answer.ok && answer.failures.map((f) => f.table)).toEqual(TABLES);
    expect(!answer.ok && answer.failures.every((f) => f.status === 0)).toBe(true);
  });

  it("still asks all three tables when one of them fails", async () => {
    // The rule is about what is accepted, not about what is asked for: the three
    // are already in flight together, so a failure cannot cancel the others.
    given("movement_trades");

    await readHistory();

    expect(db.selects).toEqual(TABLES);
  });
});
