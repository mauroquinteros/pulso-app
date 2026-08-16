import { supabase } from "@/lib/supabase";
import type { Stock } from "@/types/models";

/**
 * The only file that reads the `stocks` table. It hides the database completely,
 * the same seam `lib/history.ts` and `lib/resolve-stock.ts` put in front of
 * their own boundaries - so the store above it imports nothing async and its
 * lifecycle is testable without a network.
 *
 * Nothing throws out of here. `supabase-js` reports a failed select as an
 * `error` on the result rather than as a rejection, so there is no rejection to
 * catch and a failure is returned as an answer.
 *
 * The row mapper folds in here rather than taking its own file: one mapper with
 * one caller does not earn the separation `lib/movement-rows.ts` earns with
 * three that the write path reuses.
 */

const trace = (message: string, detail: unknown) => {
  if (__DEV__) console.log(`[stocks] ${message}`, detail);
};

const fault = (message: string, detail: unknown) => {
  if (__DEV__) console.warn(`[stocks] ${message}`, detail);
};

/**
 * PostgREST's code for a token dated later than its own clock - the one 401 that
 * means *ask again in a moment* rather than *your session is bad*. The reasoning
 * is `lib/history.ts`'s in full, and it applies here for the same reason: this
 * read fires when the tabs mount, and a Perfil signing in is what mounts them,
 * so it lands in exactly the first moments of a token's life when the auth
 * server and PostgREST can still disagree about the clock.
 *
 * Without this the two reads fail differently at the same instant. The History
 * retries and arrives, so the app renders; the Stocks do not, so every Holding
 * is unpriced - and nothing asks again until the app is backgrounded and brought
 * back, which a Perfil who has just signed in and is looking at the screen has
 * no reason to do.
 */
const CLOCK_DISAGREEMENT = "PGRST303";

/**
 * One retry, not a loop: the fault clears in seconds or it is not this fault,
 * and a portfolio waiting to be priced is owed an answer rather than persistence.
 */
const RETRY_AFTER_MS = 250;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `stocks`, as the read asks for it. This is the snake_case boundary: a column
 * name goes in, a camelCase Stock comes out, and nothing past this file spells a
 * Quote the way Postgres does (CLAUDE.md).
 *
 * `price` and `quoted_at` are nullable columns, typed non-null here because the
 * query is what makes that true: the filter below leaves only rows that have a
 * price, and the schema's `price_and_quote_time_travel_together` constraint is
 * what makes the moment follow from the price.
 */
interface StockRow {
  ticker: string;
  name: string;
  price: number;
  quoted_at: string;
}

/** Why the select did not arrive. Carried so one fault can be told from another:
 * a 401 is a session that has gone bad and a 0 is a request that never left the
 * phone. Nothing renders it - it exists so a fault has a name. */
export interface StocksFailure {
  status: number;
  code: string | null;
  message: string;
}

/** What a read can come back as. The Stocks are keyed by ticker, which is the
 * shape the derivation engine takes them in - the read does the grouping once
 * rather than every screen doing it again. */
export type StocksAnswer = { ok: true; stocks: Record<string, Stock> } | { ok: false; failure: StocksFailure };

/**
 * Every Stock the database can price, whoever is asking.
 *
 * No ticker filter, deliberately: held tickers are derived from the History, so
 * filtering to them would make this read wait for that one, and a failed History
 * would cost the prices too (ADR 0011). A Stock is shared and the RLS policy
 * already says so - `using (true)`, with no owner column to scope by.
 *
 * The filter is on the price, and it is what makes a Quote non-optional above
 * this line. An unpriced Stock is not an error and not a special case: it is
 * absent from the map, and a holding of it falls through the missing-price path
 * that has always existed.
 */
export async function readStocks(): Promise<StocksAnswer> {
  const first = await attemptRead();

  if (first.ok || first.failure.code !== CLOCK_DISAGREEMENT) return first;

  trace("token dated ahead of the server's clock, reading again:", { after: RETRY_AFTER_MS });
  await pause(RETRY_AFTER_MS);

  return attemptRead();
}

/** One pass at the table. */
async function attemptRead(): Promise<StocksAnswer> {
  const { data, error, status } = await supabase
    .from("stocks")
    .select("ticker, name, price, quoted_at")
    .not("price", "is", null);

  if (error) {
    const failure = { status, code: error.code ?? null, message: error.message };

    fault("read failed:", failure);

    return { ok: false, failure };
  }

  const stocks: Record<string, Stock> = {};
  for (const row of data) stocks[row.ticker] = mapStockRow(row);

  trace("read ok:", { priced: data.length });

  return { ok: true, stocks };
}

function mapStockRow(row: StockRow): Stock {
  return {
    ticker: row.ticker,
    name: row.name,
    quote: { price: row.price, quotedAt: row.quoted_at },
  };
}
