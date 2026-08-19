import { mapCashRow, mapDividendRow, mapTradeRow, type CashRow, type TradeRow } from "@/lib/movement-rows";
import { supabase } from "@/lib/supabase";
import type { BuyMovement, DepositMovement, Movement, NewMovement, WithdrawalMovement } from "@/types/models";
import type { HistoryAnswer, SaveAnswer } from "@/utils/history-status";

/**
 * The only file that reads and writes the movement tables. It hides the database
 * completely, which is what lets the state machine above it import nothing
 * async - the same seam `lib/resolve-stock.ts` puts in front of the network,
 * and for the same reason.
 *
 * Nothing throws out of here. `supabase-js` reports a failed select as an
 * `error` on the result rather than as a rejection, so there is no rejection to
 * catch - and, less obviously, `Promise.all` cannot short-circuit on one: all
 * three settle regardless, and the three `error` fields are what the
 * all-or-nothing rule is decided on.
 */

/**
 * Both halves of every outcome are traced in development, because this file is
 * the only place where what the app believes and what Postgres holds can come
 * apart - and a save that quietly did nothing looks exactly like a save that
 * worked.
 *
 * `trace` for the ordinary path and `fault` for the refusals, so only the second
 * raises LogBox: a warning that fires on success is a warning nobody reads. Both
 * are dev-only; neither ships.
 */
const trace = (message: string, detail: unknown) => {
  if (__DEV__) console.log(`[history] ${message}`, detail);
};

const fault = (message: string, detail: unknown) => {
  if (__DEV__) console.warn(`[history] ${message}`, detail);
};

/**
 * PostgREST's code for a token dated later than its own clock. It is the one
 * 401 that means *ask again in a moment* rather than *your session is bad*.
 *
 * The `iat` claim is written by the auth server and checked by PostgREST, which
 * are different machines with different clocks; PostgREST forgives 30 seconds of
 * disagreement and refuses beyond it. So a token can be rejected for being
 * newborn rather than for being wrong, and only ever in the first moments of its
 * life - which is exactly when this app reads, because a Perfil signing in is
 * what starts the read.
 *
 * Retrying is not hope. Either the request lands on a differently-skewed
 * instance, or by then the token has aged past the disagreement. Both are
 * self-correcting, and neither is anything the user did.
 */
const CLOCK_DISAGREEMENT = "PGRST303";

/**
 * One retry, not a loop: the fault clears in seconds or it is not this fault,
 * and a user waiting on a spinner is owed an answer rather than persistence.
 */
const RETRY_AFTER_MS = 250;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The tables this file writes to. The dividends table joins when its own slice does. */
type TableName = "movement_cash" | "movement_trades";

/**
 * A Movement this file has a branch for. Narrower than `NewMovement` on purpose:
 * `destinationFor` is total over this union, so adding a type to it without
 * giving it a table is a type error rather than a row written somewhere wrong.
 */
type WritableMovement = NewMovement<BuyMovement | DepositMovement | WithdrawalMovement>;

/**
 * The row mappers take their own row shapes, and PostgREST hands back untyped
 * data, so the destination carries the mapper that matches the table it names -
 * the pairing is made once, where the table is chosen, rather than trusted at
 * each call site.
 */
type RowMapper = (row: unknown) => Movement;

interface Destination {
  table: TableName;
  row: Record<string, string | number>;
  map: RowMapper;
}

/**
 * The whole of the signed-in Perfil's History, or nothing at all.
 *
 * A newborn token is retried once, and the *whole* read is repeated rather than
 * the one select that failed - so the three results still come from a single
 * attempt and all-or-nothing stays true by construction rather than by argument.
 *
 * This also restores in release what development was providing by accident:
 * React double-invokes effects in dev, so a rejected first read was quietly
 * replaced by a second one and nobody saw the failure screen. A release build
 * has no such spare attempt, so the retry has to be deliberate.
 */
export async function readHistory(): Promise<HistoryAnswer> {
  const first = await attemptRead();

  if (first.ok || !first.failures.some((f) => f.code === CLOCK_DISAGREEMENT)) return settled(first);

  trace("token dated ahead of the server's clock, reading again:", { after: RETRY_AFTER_MS });
  await pause(RETRY_AFTER_MS);

  return settled(await attemptRead());
}

/**
 * Warns about the answer the caller actually receives, and only that one.
 *
 * A `PGRST303` on a first attempt is the ordinary case, not a defect: the two
 * servers disagree about the clock for a moment and the retry settles it. Warning
 * there fired LogBox on every launch and every sign-in for something already
 * handled, which is how a warning stops being read - and the next real failure
 * would have looked exactly like the noise. The attempt is still traced; what
 * moves is when the app raises its voice.
 */
function settled(answer: HistoryAnswer): HistoryAnswer {
  if (!answer.ok) fault("read failed:", answer.failures);
  return answer;
}

/** One pass at the three tables. Every rule about the History lives here. */
async function attemptRead(): Promise<HistoryAnswer> {
  const [trades, dividends, cash] = await Promise.all([
    supabase.from("movement_trades").select("*"),
    supabase.from("movement_dividends").select("*"),
    supabase.from("movement_cash").select("*"),
  ]);

  // All-or-nothing, in one place so it cannot be half-applied (ADR 0006). If
  // `movement_cash` fails while the other two arrive, every deposit vanishes
  // while every buy still subtracts its cost: Cash goes deeply negative,
  // Aportado collapses, and Total Return % divides by a Peak Contributions near
  // zero. The engine cannot detect that and must not try - it is correct for
  // whatever list it is handed. So the two that worked are discarded with the
  // one that did not.
  if (trades.error || dividends.error || cash.error) {
    // The reason travels with the refusal. An earlier version returned a bare
    // `{ ok: false }`, which made every fault look like every other one: a
    // revoked token, an RLS policy and a dropped packet were one value, so an
    // intermittent failure left nothing behind to diagnose it with. The screen
    // still says the same sentence; this is for whoever has to explain it.
    const failures = [
      { table: "movement_trades", result: trades },
      { table: "movement_dividends", result: dividends },
      { table: "movement_cash", result: cash },
    ].flatMap(({ table, result }) =>
      result.error
        ? [{ table, status: result.status, code: result.error.code ?? null, message: result.error.message }]
        : [],
    );

    // Traced, not faulted: this is one attempt, and the caller above may retry
    // it into a success. The detail is kept either way - a recovered fault is
    // still a fault that happened, and the line below is the only record that
    // it did - but it does not raise LogBox until the answer is final.
    trace("read attempt failed:", failures);

    return { ok: false, failures };
  }

  // No sorting and no filtering here: every screen reads the whole History and
  // narrows it in memory, so the three results are simply concatenated.
  const movements = [
    ...trades.data.map(mapTradeRow),
    ...dividends.data.map(mapDividendRow),
    ...cash.data.map(mapCashRow),
  ];

  // Per table rather than one total, because that is what tells a Perfil who has
  // recorded nothing from a read that silently returned nothing: on day one all
  // three are 0 and the two look identical on screen.
  trace("read ok:", {
    trades: trades.data.length,
    dividends: dividends.data.length,
    cash: cash.data.length,
  });

  return { ok: true, movements };
}

/**
 * Records one Movement, and hands back the Movement the database stored.
 *
 * One function for all five types rather than one per type, so the interface
 * does not grow when the app learns to save a new one. The read side already
 * shows the shape: nobody wanted `readTrades`/`readDividends`/`readCash`,
 * because the caller does not want three things, it wants a History. The
 * type -> table decision therefore lives in here, beside the mappers that
 * already encode it - ADR 0006 is explicit that the three-table split is a
 * storage fact the domain does not follow.
 *
 * Nothing is optimistic. The caller awaits this, and only what comes back joins
 * the store, because the store is the sole input to the engine: a Movement
 * Postgres never received is not a pending write, it is a History that lies,
 * and it lies in the one way nothing downstream can detect (ADR 0010).
 */
export async function saveMovement(movement: NewMovement): Promise<SaveAnswer> {
  // Venta and Dividendo are still "Pronto" in the picker and cannot be opened, so
  // nothing can reach the branches their own slices will add. A refusal rather
  // than a throw, because nothing throws out of this file.
  if (movement.type === "sell" || movement.type === "dividend") {
    const failure = { table: "", status: 0, code: "unwritten_type", message: `a ${movement.type} cannot be saved yet` };

    fault("save refused:", failure);

    return { ok: false, failure };
  }

  const first = await attemptSave(movement);

  if (first.ok || first.failure.code !== CLOCK_DISAGREEMENT) return settledSave(first);

  trace("token dated ahead of the server's clock, saving again:", { after: RETRY_AFTER_MS });
  await pause(RETRY_AFTER_MS);

  // Safe to repeat: a token refused at the gate never reached the table, so
  // there is nothing to undo - and were it ever otherwise, the id is the same
  // one, so the duplicate branch below answers with the row already stored.
  return settledSave(await attemptSave(movement));
}

/** The save's half of `settled`, for the same reason. */
function settledSave(answer: SaveAnswer): SaveAnswer {
  if (!answer.ok) fault("save failed:", answer.failure);
  return answer;
}

/**
 * Where a Movement goes, what Postgres wants written, and how to read the answer
 * back. The type -> table decision lives here beside the mappers that already
 * encode it - ADR 0006 is explicit that the three-table split is a storage fact
 * the domain does not follow.
 *
 * `created_at` is deliberately absent from every row, so the column default fires.
 * It is the chronological tiebreaker between two movements sharing an
 * executionDate, so it orders Average Cost and Realized P&L - and a tiebreaker
 * taken from whichever phone happened to record the movement does not reliably
 * break ties. One clock, the database's (ADR 0010).
 */
function destinationFor(movement: WritableMovement): Destination {
  if (movement.type === "buy") {
    return {
      table: "movement_trades",
      row: {
        id: movement.id,
        type: movement.type,
        execution_date: movement.executionDate,
        ticker: movement.ticker,
        shares: movement.shares,
        execution_price: movement.executionPrice,
        fee: movement.fee,
        // `regulatory_fees` is omitted rather than sent as null, so the column
        // default supplies the NULL that `regulatory_fees_belong_to_sells`
        // requires of a buy. A buy has no regulatory fees at all - not zero of
        // them - which is the same distinction `mapTradeRow` makes coming back.
      },
      map: (row) => mapTradeRow(row as TradeRow),
    };
  }

  return {
    table: "movement_cash",
    row: {
      id: movement.id,
      type: movement.type,
      execution_date: movement.executionDate,
      amount: movement.amount,
      transfer_fee: movement.transferFee,
    },
    map: (row) => mapCashRow(row as CashRow),
  };
}

/** One pass at the insert, and the mapping of whatever came back. */
async function attemptSave(movement: WritableMovement): Promise<SaveAnswer> {
  const { table, row, map } = destinationFor(movement);

  const { data, error, status } = await supabase.from(table).insert(row).select().single();

  // A duplicate id is not a failure - it is this save's own first attempt,
  // already stored. The id is minted once per form session, so nothing else can
  // collide with it: `23505` on it means the insert whose response was lost
  // landed after all, and the honest answer is the row it wrote.
  //
  // Reporting it as a failure would be worse than confusing. Told the deposit
  // was not saved, the natural thing to do is type it again - a new form
  // session, a new id, and a second row that really is a duplicate. The
  // client-generated id exists to make a retry safe (ADR 0010); saying "no"
  // here is what would make the human retry unsafe.
  if (error?.code === "23505") {
    trace("id already stored, reading it back rather than writing again:", movement.id);
    return readSavedMovement(movement.id, table, map);
  }

  if (error) {
    // Every other reason travels with the refusal, exactly as it does for a
    // read: a policy refusal and a dropped packet must not arrive as one value.
    const failure = { table, status, code: error.code ?? null, message: error.message };

    // Traced rather than faulted, as with a read attempt: the caller decides
    // whether this was the final answer.
    trace("save attempt failed:", failure);

    return { ok: false, failure };
  }

  // The row Postgres stored, through the *same* mapper the read path uses. So a
  // Movement comes into existence exactly one way rather than two that can
  // silently disagree - and `createdAt` arrives filled in by the clock that
  // filled it.
  const saved = map(data);

  // `createdAt` is worth printing: the form never supplies one, so a value here
  // is the database's clock answering, which is the whole of ADR 0010 visible in
  // one line.
  trace("saved:", { id: saved.id, type: saved.type, createdAt: saved.createdAt });

  return { ok: true, movement: saved };
}

/**
 * Reads back the row an insert already wrote. Only reachable from the duplicate
 * id above, so a miss here is not "the movement is not there" - it is the row
 * being unreadable a moment after proving it exists, which is a genuine fault
 * and reported as one.
 */
async function readSavedMovement(id: string, table: TableName, map: RowMapper): Promise<SaveAnswer> {
  const { data, error, status } = await supabase.from(table).select().eq("id", id).single();

  if (error) {
    const failure = { table, status, code: error.code ?? null, message: error.message };

    fault("saved row could not be read back:", failure);

    return { ok: false, failure };
  }

  const saved = map(data);

  trace("read back the row already stored:", { id: saved.id, createdAt: saved.createdAt });

  return { ok: true, movement: saved };
}
