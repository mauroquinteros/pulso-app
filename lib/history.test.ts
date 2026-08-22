import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuyMovement, DepositMovement, DividendMovement, NewMovement, WithdrawalMovement } from "@/types/models";
import { readHistory, saveMovement } from "./history";
import type { CashRow, DividendRow, TradeRow } from "./movement-rows";

type TableName = "movement_trades" | "movement_dividends" | "movement_cash";
type Failure = { message: string; code: string } | null;
type Result = { data: unknown[] | null; error: Failure; status: number };
/** What `.insert(...).select().single()` resolves to: one row, not a list. */
type SingleResult = { data: unknown; error: Failure; status: number };

/**
 * The one place in the suite that fakes the database. It costs more than a pure
 * unit, and it is worth it exactly twice: an untested all-or-nothing rule is the
 * rule most likely to quietly stop holding, and it is the one ADR 0006 exists
 * to protect - and the save's whole point is which object comes back out of it.
 *
 * The fake reproduces the property that makes the read rule easy to get wrong -
 * `supabase-js` reports a failed select as an `error` on a *resolved* promise,
 * so `Promise.all` never rejects and never short-circuits. A reader that only
 * catches rejections would pass every happy test and merge a partial History in
 * production.
 *
 * It records what was inserted as well as what was asked for, because two of
 * ADR 0010's rules are about the request rather than the response: `created_at`
 * must not be sent, and a type with no branch yet must not reach a table.
 */
const db = vi.hoisted(() => ({
  selects: [] as string[],
  results: {} as Record<string, Result>,
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  inserted: {} as SingleResult,
  readBack: {} as SingleResult,
  /** Results staged per pass, so a test can make a first attempt fail and a retry succeed. */
  attempts: [] as Record<string, Result>[],
  insertAttempts: [] as SingleResult[],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        // Which pass at the three tables this is. A retry re-reads all three, so
        // three selects make one attempt.
        const attempt = Math.floor(db.selects.length / 3);
        db.selects.push(table);
        const staged = db.attempts[attempt];
        if (staged) {
          return Object.assign(Promise.resolve(staged[table]), {
            eq: () => ({ single: () => Promise.resolve(db.readBack) }),
          });
        }
        // A thenable that also answers `.eq(...).single()`, because the
        // duplicate-id path reads one row back rather than awaiting the select.
        return Object.assign(Promise.resolve(db.results[table]), {
          eq: () => ({ single: () => Promise.resolve(db.readBack) }),
        });
      },
      insert: (row: Record<string, unknown>) => {
        const staged = db.insertAttempts[db.inserts.length];
        db.inserts.push({ table, row });
        return { select: () => ({ single: () => Promise.resolve(staged ?? db.inserted) }) };
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

/** What the Depósito form produces: every field of a deposit but `createdAt`. */
const newDeposit: NewMovement<DepositMovement> = {
  id: "7c1e0b40-0000-4000-8000-000000000004",
  type: "deposit",
  executionDate: "2026-05-04",
  amount: 500,
  transferFee: 2.5,
};

/**
 * What Postgres hands back. Its `created_at` is the point: the caller supplied
 * no such field and could not have guessed this value, so a `saveMovement` that
 * echoed its argument back instead of mapping the returned row cannot produce
 * it (ADR 0010).
 */
const storedDepositRow: CashRow = {
  id: newDeposit.id,
  type: "deposit",
  execution_date: "2026-05-04",
  amount: 500,
  transfer_fee: 2.5,
  created_at: "2026-05-04T17:08:52.913Z",
};

/** What the Retiro form produces: every field of a withdrawal but `createdAt`. */
const newWithdrawal: NewMovement<WithdrawalMovement> = {
  id: "7c1e0b40-0000-4000-8000-000000000009",
  type: "withdrawal",
  executionDate: "2026-05-04",
  amount: 200,
  transferFee: 1,
};

/** What Postgres hands back for it - the same table and mapper as a deposit. */
const storedWithdrawalRow: CashRow = {
  id: newWithdrawal.id,
  type: "withdrawal",
  execution_date: "2026-05-04",
  amount: 200,
  transfer_fee: 1,
  created_at: "2026-05-04T18:22:03.117Z",
};

/** What the Compra form produces: every field of a buy but `createdAt`. */
const newBuy: NewMovement<BuyMovement> = {
  id: "7c1e0b40-0000-4000-8000-000000000007",
  type: "buy",
  executionDate: "2026-05-04",
  ticker: "NVDA",
  shares: 4.30775,
  executionPrice: 232.14,
  fee: 0.35,
};

/** What Postgres hands back for it. `regulatory_fees` is NULL, as the schema
 * requires of a buy, and `created_at` is the database's own clock. */
const storedBuyRow: TradeRow = {
  id: newBuy.id,
  type: "buy",
  execution_date: "2026-05-04",
  ticker: "NVDA",
  shares: 4.30775,
  execution_price: 232.14,
  fee: 0.35,
  regulatory_fees: null,
  created_at: "2026-05-04T17:08:52.913Z",
};

/** What the Dividendo form produces: every field of a dividend but `createdAt`. */
const newDividend: NewMovement<DividendMovement> = {
  id: "7c1e0b40-0000-4000-8000-000000000008",
  type: "dividend",
  executionDate: "2026-05-04",
  ticker: "MSFT",
  grossAmount: 18.6,
  tax: 5.58,
};

/** What Postgres hands back for it. There is no `type` column on that table, so
 * none comes back either - `mapDividendRow` hard-codes the type from the table
 * the row was read out of. */
const storedDividendRow: DividendRow = {
  id: newDividend.id,
  execution_date: "2026-05-04",
  ticker: "MSFT",
  gross_amount: 18.6,
  tax: 5.58,
  created_at: "2026-05-04T17:08:52.913Z",
};

const ROWS: Record<TableName, unknown[]> = {
  movement_trades: [buyRow],
  movement_dividends: [dividendRow],
  movement_cash: [depositRow],
};

const TABLES: TableName[] = ["movement_trades", "movement_dividends", "movement_cash"];

/** Every select answers with its rows, except `broken`, which errors. */
/** A token PostgREST refused for being dated ahead of its own clock. */
const clockSkew = { message: "JWT issued at future", code: "PGRST303" };

function given(broken?: TableName) {
  db.selects = [];
  db.inserts = [];
  db.attempts = [];
  db.insertAttempts = [];
  db.inserted = { data: storedDepositRow, error: null, status: 201 };
  db.readBack = { data: storedDepositRow, error: null, status: 200 };
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

  it("reads again when the token is refused for being dated ahead of the server", async () => {
    // PGRST303 is not "your session is bad", it is "the two servers disagree
    // about what time it is". It clears on its own within seconds, so the one
    // honest response is to ask again rather than to put a failure screen in
    // front of someone who just signed in successfully.
    db.attempts = [
      Object.fromEntries(TABLES.map((t) => [t, { data: null, error: clockSkew, status: 401 }])),
      Object.fromEntries(TABLES.map((t) => [t, { data: ROWS[t], error: null, status: 200 }])),
    ];

    const answer = await readHistory();

    expect(answer.ok).toBe(true);
    expect(answer.ok && answer.movements).toHaveLength(3);
    // Six selects: the whole read repeated, not just the select that failed, so
    // the three results still come from one attempt.
    expect(db.selects).toHaveLength(6);
  });

  it("gives up after one retry rather than looping", async () => {
    // A user on a spinner is owed an answer. If it is still refused a second
    // time it is not the transient fault, and Reintentar is the user's own
    // retry - deliberately theirs to make.
    db.attempts = [
      Object.fromEntries(TABLES.map((t) => [t, { data: null, error: clockSkew, status: 401 }])),
      Object.fromEntries(TABLES.map((t) => [t, { data: null, error: clockSkew, status: 401 }])),
    ];

    const answer = await readHistory();

    expect(answer.ok).toBe(false);
    expect(db.selects).toHaveLength(6);
  });

  it("does not retry a fault that will not clear on its own", async () => {
    // An RLS refusal means the same thing however many times it is asked. Only
    // the clock disagreement is worth a second attempt.
    given("movement_trades");

    const answer = await readHistory();

    expect(answer.ok).toBe(false);
    expect(db.selects).toHaveLength(3);
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

describe("saveMovement", () => {
  it("saves again when the token is refused for being dated ahead of the server", async () => {
    // Safe to repeat: a token refused at the gate never reached the table, so
    // there is nothing to undo - and the id is the same one either way.
    db.insertAttempts = [{ data: null, error: clockSkew, status: 401 }];

    const answer = await saveMovement(newDeposit);

    expect(answer.ok).toBe(true);
    expect(db.inserts).toHaveLength(2);
    expect(db.inserts[0].row.id).toBe(db.inserts[1].row.id);
  });

  it("treats a duplicate id as the save it already made, not as a failure", async () => {
    // The id is minted once per form session, so nothing else can collide with
    // it: a 23505 means this save's own first attempt landed and only its
    // response was lost. Reporting that as a failure is how a *real* duplicate
    // gets created - told it did not save, the user types the deposit again,
    // which mints a new id and writes a second row (ADR 0010).
    db.inserted = {
      data: null,
      error: { message: 'duplicate key value violates unique constraint "movement_cash_pkey"', code: "23505" },
      status: 409,
    };

    const answer = await saveMovement(newDeposit);

    expect(answer.ok).toBe(true);
    // Read back, not echoed: `createdAt` is the instant the *first* attempt
    // stored, which the caller never had.
    expect(answer.ok && answer.movement.createdAt).toBe("2026-05-04T17:08:52.913Z");
    expect(answer.ok && answer.movement.id).toBe(newDeposit.id);
  });

  it("reports a fault when the row it just proved exists cannot be read back", async () => {
    db.inserted = {
      data: null,
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
      status: 409,
    };
    db.readBack = { data: null, error: { message: "network request failed", code: "" }, status: 0 };

    const answer = await saveMovement(newDeposit);

    expect(answer.ok).toBe(false);
    expect(!answer.ok && answer.failure.status).toBe(0);
  });

  it("hands back the Movement built from the row Postgres stored", async () => {
    const answer = await saveMovement(newDeposit);

    // `createdAt` is the proof. The caller passed no such field, so this value
    // can only have come back through the mapper from the returned row - a save
    // that echoed its argument would have nothing to put here. A Movement comes
    // into existence exactly one way, so a saved one and a read one cannot
    // silently disagree.
    expect(answer).toEqual({
      ok: true,
      movement: {
        id: "7c1e0b40-0000-4000-8000-000000000004",
        type: "deposit",
        executionDate: "2026-05-04",
        createdAt: "2026-05-04T17:08:52.913Z",
        amount: 500,
        transferFee: 2.5,
      },
    });
  });

  it("writes the deposit to movement_cash, in the columns' own spelling", async () => {
    await saveMovement(newDeposit);

    expect(db.inserts).toEqual([
      {
        table: "movement_cash",
        row: {
          id: "7c1e0b40-0000-4000-8000-000000000004",
          type: "deposit",
          execution_date: "2026-05-04",
          amount: 500,
          transfer_fee: 2.5,
        },
      },
    ]);
  });

  it("does not send created_at, so the stored instant is the database's", async () => {
    // The tiebreaker between two movements sharing an executionDate. Sending
    // the device's clock would let two phones a few seconds apart order the
    // same pair differently, and Average Cost and Realized P&L move with them.
    await saveMovement(newDeposit);

    expect(db.inserts[0].row).not.toHaveProperty("created_at");
  });

  it("returns the cause when the insert is refused, and no Movement", async () => {
    // A policy refusal, not a duplicate id: 23505 is this save's own first
    // attempt and is answered with the row it wrote, so it cannot stand in for
    // a refusal here. The cause travels so that this can be told apart from a
    // dropped packet - one means the session is wrong, the other means try
    // again - even though the screen says the same sentence for both.
    db.inserted = {
      data: null,
      error: { message: "new row violates row-level security policy", code: "42501" },
      status: 403,
    };

    const answer = await saveMovement(newDeposit);

    expect(answer.ok).toBe(false);
    expect(answer).not.toHaveProperty("movement");
    expect(!answer.ok && answer.failure).toEqual({
      table: "movement_cash",
      status: 403,
      code: "42501",
      message: "new row violates row-level security policy",
    });
  });

  it("refuses a type it has no branch for rather than writing it somewhere", async () => {
    // Venta alone now: Dividendo has its own branch. Venta is still "Pronto" in
    // the picker, so nothing can reach this. It refuses as a value rather than
    // throwing, because nothing throws out of that module - and it touches no
    // table on the way out.
    const answer = await saveMovement({
      id: "7c1e0b40-0000-4000-8000-000000000005",
      type: "sell",
      executionDate: "2026-05-04",
      ticker: "AAPL",
      shares: 3,
      executionPrice: 190,
      fee: 0.35,
      regulatoryFees: 0.02,
    });

    expect(answer.ok).toBe(false);
    expect(db.inserts).toEqual([]);
  });

  it("writes the withdrawal to movement_cash, through the deposit's branch", async () => {
    // The only direct proof that a Retiro can be written. Today it is covered
    // transitively - a withdrawal and a deposit share one branch of
    // `destinationFor`, so the deposit's test happens to run the same code - and
    // that holds only while the two stay merged. Hence the assertions: the row
    // lands, and it lands in the cash table carrying its own type. The column
    // spellings are the deposit's test to make, not this one's.
    db.inserted = { data: storedWithdrawalRow, error: null, status: 201 };

    const answer = await saveMovement(newWithdrawal);

    expect(answer.ok).toBe(true);
    expect(db.inserts).toEqual([{ table: "movement_cash", row: expect.objectContaining({ type: "withdrawal" }) }]);
    expect(answer.ok && answer.movement.type).toBe("withdrawal");
  });

  it("writes the dividend to movement_dividends, in the columns' own spelling", async () => {
    db.inserted = { data: storedDividendRow, error: null, status: 201 };

    await saveMovement(newDividend);

    expect(db.inserts).toEqual([
      {
        table: "movement_dividends",
        row: {
          id: newDividend.id,
          execution_date: "2026-05-04",
          ticker: "MSFT",
          gross_amount: 18.6,
          tax: 5.58,
        },
      },
    ]);
  });

  it("sends no type on a dividend, because that table has no such column", async () => {
    // The other two branches both send one, so the omission reads like a slip
    // and is not. `movement_dividends` holds one kind of Movement and has no
    // `type` column at all - and PostgREST builds its column list from the
    // payload's keys, so a type here is not a harmless extra field but a request
    // naming a column that does not exist. The whole insert is refused.
    db.inserted = { data: storedDividendRow, error: null, status: 201 };

    await saveMovement(newDividend);

    expect(db.inserts[0].row).not.toHaveProperty("type");
    expect(db.inserts[0].row).not.toHaveProperty("created_at");
  });

  it("hands back the dividend built from the row Postgres stored", async () => {
    db.inserted = { data: storedDividendRow, error: null, status: 201 };

    const answer = await saveMovement(newDividend);

    // `createdAt` is the proof: the caller supplied no such field and could not
    // have guessed it, so an answer echoing the argument back cannot produce it.
    // And `type` comes back on the Movement despite never being stored - the
    // table a row was read from is what says what it is.
    expect(answer).toEqual({
      ok: true,
      movement: {
        id: newDividend.id,
        type: "dividend",
        executionDate: "2026-05-04",
        createdAt: "2026-05-04T17:08:52.913Z",
        ticker: "MSFT",
        grossAmount: 18.6,
        tax: 5.58,
      },
    });
  });

  it("reads a duplicate dividend back from movement_dividends, not from another table", async () => {
    // The same trap the buy branch fell into: the duplicate branch has to follow
    // the movement to its own table, or a retried dividend is answered with
    // whatever sits under that id elsewhere.
    db.inserted = {
      data: null,
      error: { message: 'duplicate key value violates unique constraint "movement_dividends_pkey"', code: "23505" },
      status: 409,
    };
    db.readBack = { data: storedDividendRow, error: null, status: 200 };

    const answer = await saveMovement(newDividend);

    expect(db.selects).toEqual(["movement_dividends"]);
    expect(answer).toEqual({
      ok: true,
      movement: {
        id: newDividend.id,
        type: "dividend",
        executionDate: "2026-05-04",
        createdAt: "2026-05-04T17:08:52.913Z",
        ticker: "MSFT",
        grossAmount: 18.6,
        tax: 5.58,
      },
    });
  });

  it("returns the cause when a dividend insert is refused, and writes no Movement", async () => {
    db.inserted = {
      data: null,
      error: { message: "new row violates row-level security policy", code: "42501" },
      status: 403,
    };

    const answer = await saveMovement(newDividend);

    expect(answer.ok).toBe(false);
    if (answer.ok) throw new Error("expected a refusal");
    expect(answer.failure.table).toBe("movement_dividends");
    expect(answer.failure.code).toBe("42501");
  });

  it("writes the buy to movement_trades, in the columns' own spelling", async () => {
    db.inserted = { data: storedBuyRow, error: null, status: 201 };

    await saveMovement(newBuy);

    expect(db.inserts).toEqual([
      {
        table: "movement_trades",
        row: {
          id: newBuy.id,
          type: "buy",
          execution_date: "2026-05-04",
          ticker: "NVDA",
          shares: 4.30775,
          execution_price: 232.14,
          fee: 0.35,
        },
      },
    ]);
  });

  it("omits regulatory_fees on a buy, so the column's NULL is what lands", async () => {
    // The schema's `regulatory_fees_belong_to_sells` requires NULL on a buy, and
    // PostgREST builds its column list from the payload's keys - so sending an
    // explicit null and omitting the key are different requests. A buy has no
    // regulatory fees at all, not zero of them, which is the same distinction
    // `mapTradeRow` makes on the way back.
    db.inserted = { data: storedBuyRow, error: null, status: 201 };

    await saveMovement(newBuy);

    expect(db.inserts[0].row).not.toHaveProperty("regulatory_fees");
    expect(db.inserts[0].row).not.toHaveProperty("created_at");
  });

  it("hands back the buy built from the row Postgres stored", async () => {
    db.inserted = { data: storedBuyRow, error: null, status: 201 };

    const answer = await saveMovement(newBuy);

    // `createdAt` is the proof again, and `regulatoryFees` is absent rather than
    // 0 - the NULL came back through the same mapper the read path uses.
    expect(answer).toEqual({
      ok: true,
      movement: {
        id: newBuy.id,
        type: "buy",
        executionDate: "2026-05-04",
        createdAt: "2026-05-04T17:08:52.913Z",
        ticker: "NVDA",
        shares: 4.30775,
        executionPrice: 232.14,
        fee: 0.35,
      },
    });
  });

  it("reads a duplicate buy back from movement_trades, not from movement_cash", async () => {
    // The duplicate branch has to follow the movement to its own table, or a
    // retried buy would be answered with whatever `movement_cash` holds.
    db.inserted = {
      data: null,
      error: { message: 'duplicate key value violates unique constraint "movement_trades_pkey"', code: "23505" },
      status: 409,
    };
    db.readBack = { data: storedBuyRow, error: null, status: 200 };

    const answer = await saveMovement(newBuy);

    expect(answer.ok).toBe(true);
    expect(answer.ok && answer.movement.type).toBe("buy");
    expect(answer.ok && answer.movement.createdAt).toBe("2026-05-04T17:08:52.913Z");
  });

  it("names movement_trades when a buy is refused", async () => {
    db.inserted = {
      data: null,
      error: { message: "new row violates row-level security policy", code: "42501" },
      status: 403,
    };

    const answer = await saveMovement(newBuy);

    expect(!answer.ok && answer.failure.table).toBe("movement_trades");
  });
});
