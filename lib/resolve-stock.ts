import { supabase } from "@/lib/supabase";
import type { Stock } from "@/types/models";
import type { SymbolAnswer } from "@/utils/symbol-check";

/**
 * The endpoint's confirmation body. `price` and `quotedAt` are null together -
 * both are read from the same quote, and the endpoint drops a quote whose market
 * moment is missing - which is the same pairing the schema's
 * `price_and_quote_time_travel_together` constraint enforces.
 */
interface ConfirmedBody {
  ticker: string;
  name: string;
  price: number | null;
  quotedAt: string | null;
}

/**
 * A verdict, and the **Stock** it confirmed. The two travel together because the
 * endpoint already upserts the Stock and answers with it, and because the verdict
 * is what unlocks Guardar - so the answer that makes a buy saveable is the same
 * answer that puts its Stock in hand, with no window between them (ADR 0013).
 *
 * `stock` is null for every refusal, and also for a symbol the provider confirmed
 * but had no price for: there is genuinely no **Quote** then, which is an absence
 * the app already renders honestly rather than a failure.
 */
export interface ResolveAnswer {
  answer: SymbolAnswer;
  stock: Stock | null;
}

/**
 * The only file that speaks to the `resolve-stock` endpoint. It hides HTTP
 * completely, which is what lets the state machine above it import nothing
 * async - the same seam `lib/google-sign-in.ts` puts in front of the native
 * Google module.
 *
 * The call goes through the Supabase client's function invocation rather than a
 * bare fetch because that attaches both credentials the endpoint's two auth
 * layers expect: the project key in `apikey`, and the signed-in user's access
 * token in `Authorization`.
 *
 * Nothing throws out of here. `invoke` reports a transport failure as an error
 * value rather than a rejection, so there is no rejection to catch.
 *
 * The endpoint's contract is in .scratch/resolve-stock/PRD.md (Part 1).
 */
export async function resolveStock(ticker: string): Promise<ResolveAnswer> {
  const { data, error, response } = await supabase.functions.invoke<ConfirmedBody>("resolve-stock", {
    body: { ticker },
  });

  if (!error) return { answer: "confirmed", stock: toStock(data) };

  // 404 is the only status that means the provider answered and has no such US
  // listing. Everything else - 401, 500, 502, and a request that never arrived
  // at all - collapses into `unavailable`, because they share the only fact the
  // user needs: no answer came back. An expired session reported as a bad
  // ticker would tell someone a real company does not exist.
  //
  // 400 is unreachable from this form: the field strips everything but letters,
  // so nothing the endpoint rejects as malformed can be typed.
  return { answer: response?.status === 404 ? "unknown" : "unavailable", stock: null };
}

/**
 * The endpoint's flat body as a domain **Stock**, or nothing.
 *
 * Checked rather than trusted: `invoke` types the body from the call site, so
 * nothing has actually verified what came over the wire. A Stock with a
 * fabricated price is the one wrong figure the app cannot tell from a right one,
 * so anything short of a positive price with its market moment yields no Stock at
 * all - which falls through the missing-price path that has always existed.
 *
 * Folded in here rather than given its own file: one mapper with one caller does
 * not earn the separation `lib/movement-rows.ts` earns with three.
 */
function toStock(body: ConfirmedBody | null): Stock | null {
  if (!body || typeof body.ticker !== "string" || typeof body.name !== "string") return null;
  if (typeof body.price !== "number" || body.price <= 0 || typeof body.quotedAt !== "string") return null;

  return { ticker: body.ticker, name: body.name, quote: { price: body.price, quotedAt: body.quotedAt } };
}
