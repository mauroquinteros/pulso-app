import { supabase } from "@/lib/supabase";
import type { SymbolAnswer } from "@/utils/symbol-check";

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
export async function resolveStock(ticker: string): Promise<SymbolAnswer> {
  const { error, response } = await supabase.functions.invoke("resolve-stock", { body: { ticker } });

  if (!error) return "confirmed";

  // 404 is the only status that means the provider answered and has no such US
  // listing. Everything else - 401, 500, 502, and a request that never arrived
  // at all - collapses into `unavailable`, because they share the only fact the
  // user needs: no answer came back. An expired session reported as a bad
  // ticker would tell someone a real company does not exist.
  //
  // 400 is unreachable from this form: the field strips everything but letters,
  // so nothing the endpoint rejects as malformed can be typed.
  return response?.status === 404 ? "unknown" : "unavailable";
}
