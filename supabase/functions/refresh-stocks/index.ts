// refresh-stocks -- the Edge Function the cron calls every 10 minutes.
//
// Reads every row in `stocks`, asks Finnhub for its quote, and writes the price
// back. It never creates a row: rows are created by the buy/dividend validation
// path (a later PRD), which is the only thing that knows a company's name.
//
// See docs/adr/0008-prices-arrive-by-cron-not-by-request.md. The client never
// calls Finnhub; this function is the only thing that does, and the key lives in
// the function's secrets, never in the app bundle.
//
// JWT verification is OFF for this function -- see `[functions.refresh-stocks]`
// in supabase/config.toml. Pulso uses the new API keys, which are not JWTs, and
// verify_jwt only understands the legacy anon/service_role JWTs. With verification
// off the platform stops gating this endpoint, so the caller is checked here
// instead -- see requireCron.
//
// Secrets to set:  supabase secrets set FINNHUB_KEY=... CRON_KEY=...
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY")!;
const CRON_KEY = Deno.env.get("CRON_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Milliseconds between Finnhub requests. The free tier allows 60 a minute; one
 *  a second stays under it without any bookkeeping. */
const PACE_MS = 1_100;

/** The two fields of a Finnhub quote this app cares about: the current price,
 *  and the market moment it belongs to (unix seconds). */
interface Quote {
  c: number;
  t: number;
}

/**
 * A quote, or null when Finnhub does not really know the symbol.
 *
 * The provider gives no help here: an unknown symbol answers **HTTP 200** with
 * every figure zeroed (`{"c":0,"d":null,...,"t":0}`), so the payload has to be
 * inspected. `t === 0` is the tell -- a genuine quote always carries a real
 * market moment. Returning null rather than a zero is the hard rule of ADR 0008:
 * a stored 0 reads as a real price and silently drops that holding's Market
 * Value to nothing, while an absent price already has a correct, tested path
 * (exclude + flag).
 */
async function fetchQuote(ticker: string): Promise<Quote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const quote = (await response.json()) as Quote;
  if (!quote || quote.t === 0 || !(quote.c > 0)) return null;
  return quote;
}

/**
 * The only gate on this endpoint.
 *
 * Deployed with --no-verify-jwt, so an unguarded function would let anyone who
 * learns the URL drain the Finnhub quota and hammer the database on demand.
 *
 * The token checked here is a dedicated random string, NOT a Supabase key, and it
 * travels on its own header. The cron also sends the project key on `apikey` to
 * satisfy the platform's own check -- but that key is not what authorises the call,
 * because it is a credential with far more reach than "the cron sent this" needs.
 */
function requireCron(request: Request): boolean {
  return request.headers.get("x-cron-key") === CRON_KEY;
}

Deno.serve(async (request) => {
  if (!requireCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: stocks, error } = await supabase.from("stocks").select("ticker");
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!stocks || stocks.length === 0) {
    return Response.json({ refreshed: 0, skipped: 0, note: "no stocks to refresh" });
  }

  const skipped: string[] = [];
  let refreshed = 0;

  // Sequential and paced. The free tier allows 60 calls a minute, and one run
  // makes one call per Stock back to back -- so an unspaced loop over a growing
  // list is a burst, not a trickle. A second between requests keeps it under the
  // ceiling by construction. It also bounds how many Stocks one run can cover
  // before it meets the function's own wall-clock limit: worth measuring before
  // the list gets long, not after.
  for (const [index, { ticker }] of stocks.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS));

    const quote = await fetchQuote(ticker);

    // A failed or unusable quote leaves the row untouched -- price, quoted_at
    // and updated_at all keep their previous values. That is deliberate: the
    // last good price is still the best information that exists, and blanking
    // it would destroy a true fact to record a temporary failure. The unmoved
    // updated_at is what says the refresh did not happen.
    if (!quote) {
      skipped.push(ticker);
      continue;
    }

    const { error: writeError } = await supabase
      .from("stocks")
      .update({
        price: quote.c,
        quoted_at: new Date(quote.t * 1000).toISOString(),
      })
      .eq("ticker", ticker);

    if (writeError) skipped.push(ticker);
    else refreshed += 1;
  }

  return Response.json({ refreshed, skipped });
});
