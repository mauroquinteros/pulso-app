import { mapCashRow, mapDividendRow, mapTradeRow } from "@/lib/movement-rows";
import { supabase } from "@/lib/supabase";
import type { NewMovement } from "@/types/models";
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
 * The whole of the signed-in Perfil's History, or nothing at all.
 *
 * The three selects are fired together rather than awaited one after another.
 * The History is one thing; there is no order in which its parts are wanted.
 */
export async function readHistory(): Promise<HistoryAnswer> {
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

    fault("read failed:", failures);

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
  // This slice wires up `movement_cash` only. Compra, Venta and Dividendo are
  // "Pronto" in the picker and cannot be opened, so nothing can reach the
  // branches their own slices will add here. A refusal rather than a throw,
  // because nothing throws out of this file.
  if (movement.type !== "deposit" && movement.type !== "withdrawal") {
    const failure = { table: "", status: 0, code: "unwritten_type", message: `a ${movement.type} cannot be saved yet` };

    fault("save refused:", failure);

    return { ok: false, failure };
  }

  const { data, error, status } = await supabase
    .from("movement_cash")
    .insert({
      // `created_at` is deliberately absent, so the column default fires. It is
      // the chronological tiebreaker between two movements sharing an
      // executionDate, so it orders Average Cost and Realized P&L - and a
      // tiebreaker taken from whichever phone happened to record the movement
      // does not reliably break ties. One clock, the database's (ADR 0010).
      id: movement.id,
      type: movement.type,
      execution_date: movement.executionDate,
      amount: movement.amount,
      transfer_fee: movement.transferFee,
    })
    .select()
    .single();

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
    return readSavedMovement(movement.id);
  }

  if (error) {
    // Every other reason travels with the refusal, exactly as it does for a
    // read: a policy refusal and a dropped packet must not arrive as one value.
    const failure = { table: "movement_cash", status, code: error.code ?? null, message: error.message };

    fault("save failed:", failure);

    return { ok: false, failure };
  }

  // The row Postgres stored, through the *same* mapper the read path uses. So a
  // Movement comes into existence exactly one way rather than two that can
  // silently disagree - and `createdAt` arrives filled in by the clock that
  // filled it.
  const saved = mapCashRow(data);

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
async function readSavedMovement(id: string): Promise<SaveAnswer> {
  const { data, error, status } = await supabase.from("movement_cash").select().eq("id", id).single();

  if (error) {
    const failure = { table: "movement_cash", status, code: error.code ?? null, message: error.message };

    fault("saved row could not be read back:", failure);

    return { ok: false, failure };
  }

  const saved = mapCashRow(data);

  trace("read back the row already stored:", { id: saved.id, createdAt: saved.createdAt });

  return { ok: true, movement: saved };
}
