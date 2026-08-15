import { mapCashRow, mapDividendRow, mapTradeRow } from "@/lib/movement-rows";
import { supabase } from "@/lib/supabase";
import type { HistoryAnswer } from "@/utils/history-status";

/**
 * The only file that reads the movement tables. It hides the database
 * completely, which is what lets the state machine above it import nothing
 * async - the same seam `lib/resolve-stock.ts` puts in front of the network,
 * and for the same reason.
 *
 * Nothing throws out of here. `supabase-js` reports a failed select as an
 * `error` on the result rather than as a rejection, so there is no rejection to
 * catch - and, less obviously, `Promise.all` cannot short-circuit on one: all
 * three settle regardless, and the three `error` fields are what the
 * all-or-nothing rule is decided on.
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

    if (__DEV__) console.warn("[history] read failed:", failures);

    return { ok: false, failures };
  }

  // No sorting and no filtering here: every screen reads the whole History and
  // narrows it in memory, so the three results are simply concatenated.
  return {
    ok: true,
    movements: [...trades.data.map(mapTradeRow), ...dividends.data.map(mapDividendRow), ...cash.data.map(mapCashRow)],
  };
}
