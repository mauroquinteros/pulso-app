// resolve-stock -- the Edge Function the buy form calls to confirm a symbol before
// the movement can be saved. The buy form only: a dividend needs no price and
// presupposes the buy that already confirmed the symbol, so it does not call this.
// See the ADR below for what that leaves standing.
//
// It is the only thing that CREATES a row in `stocks`. It asks Finnhub whether the
// typed symbol really exists and, on an exact match, upserts the Stock with its
// name and current price. refresh-stocks then keeps that price fresh; it never
// inserts. Between them the two functions are the only writers the table has.
//
// See docs/adr/0009-a-buy-is-blocked-until-its-symbol-is-confirmed.md for why a
// symbol the provider does not know cannot be recorded at all, and
// .scratch/stocks-table/finnhub-api.md for the live responses parsed below.
//
// POST, not GET, because the call writes. `{"ticker":"AAPL"}` in; one of five
// answers out -- confirmed (200), unknown symbol (404), provider unreachable (502),
// unusable input (400), confirmed but not stored (500). All four failures block the
// save today. They are kept apart because ADR 0009 says "the provider says no" and
// "we could not ask" must never render the same the day an offline write queue
// exists.
//
// The caller is checked TWICE, and both halves are load-bearing:
//   - `verify_jwt = true` in supabase/config.toml rejects a token this project did
//     not sign, before this code boots.
//   - requireSignedInUser below rejects a token that is validly signed but belongs
//     to nobody. Platform verification only asks "did this project sign it" -- and
//     a legacy anon key is exactly that, a JWT this project signed, shipped inside
//     the app bundle. Only asking the Auth server WHOSE token it is tells a
//     signed-in person apart from a key anyone can read out of the binary.
//
// Secrets to set:  supabase secrets set FINNHUB_KEY=...
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** One hit from Finnhub's /search. `description` is the company name and is filled
 *  in for ETFs too -- which is the whole reason /stock/profile2 is not used here:
 *  it answers `{}` for VOO, and half this portfolio is ETFs. */
interface Listing {
  description: string;
  symbol: string;
}

/** The two fields of a Finnhub quote this app cares about: the current price, and
 *  the market moment it belongs to (unix seconds). */
interface Quote {
  c: number;
  t: number;
}

/** The three things the provider can tell us about a symbol. "unknown" and
 *  "unreachable" both block the save, but they are different facts and the client
 *  is told which. */
type Lookup = { outcome: "confirmed"; listing: Listing } | { outcome: "unknown" } | { outcome: "unreachable" };

/**
 * Uppercase, bounded, and made of characters a ticker can contain -- or null.
 *
 * Deliberately LOOSER than the buy form's field, which strips everything but
 * letters and therefore cannot type `BRK.B`. This regex is a guard against sending
 * junk to a rate-limited third party, not a definition of what a symbol is; the
 * definition lives in the provider's answer. Uppercasing is not cosmetic: `ticker`
 * is the primary key of `stocks` and the table constrains it to one spelling.
 */
function normalizeTicker(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ticker = raw.trim().toUpperCase();
  return /^[A-Z0-9.-]{1,10}$/.test(ticker) ? ticker : null;
}

/**
 * Does this symbol exist, and what is it called?
 *
 * `exchange=US` is mandatory, not a convenience. Unfiltered, `AAPL` also matches
 * the Toronto, Mexican, Romanian and Santiago listings of the same company, all
 * quoting in their own currency -- and ADR 0002 fixes Pulso to USD with no FX
 * anywhere, so a peso price in `stocks` would be multiplied by a share count and
 * labelled USD.
 *
 * The match is an EXACT symbol comparison, never "did we get results". Finnhub's
 * search is fuzzy: `APPL` -- the likeliest typo in the app -- returns eleven hits
 * and not one of them is `APPL`. A count check would wave through precisely the
 * failure this endpoint exists to catch.
 */
async function lookupListing(ticker: string): Promise<Lookup> {
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(ticker)}&exchange=US&token=${FINNHUB_KEY}`;

  let body: { result?: Listing[] };
  try {
    const response = await fetch(url);
    if (!response.ok) return { outcome: "unreachable" };
    body = await response.json();
  } catch {
    return { outcome: "unreachable" };
  }

  const listing = body.result?.find((hit) => hit.symbol === ticker);
  return listing ? { outcome: "confirmed", listing } : { outcome: "unknown" };
}

/**
 * One retry, not a loop, and after a pause rather than instantly: the fault clears
 * in moments or it is not this fault, and if the provider was rate-limiting us then
 * an immediate second call makes it worse. The same 250ms `lib/history.ts` waits
 * before re-reading a clock-refused token, for the same reasoning.
 */
const RETRY_AFTER_MS = 250;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A quote, or null after asking twice.
 *
 * The retry is here and NOT on the search: the search's answer IS the verdict
 * (ADR 0009), and its two failures are already answers -- "unknown" is a fact about
 * the symbol with nothing to re-ask, and "unreachable" is returned as a 502 the
 * client retries by asking the user to try again. The quote has no such voice; a
 * blip here silently mints an unpriced Stock, and the brand-new Holding reads "sin
 * precio" until the next cron pass -- Monday, if it happened on a Saturday.
 *
 * Both causes of null are retried, including a 200 with `t === 0`, which is Finnhub
 * stating it does not know the symbol rather than a transport failure. Telling them
 * apart is deferred in ADR 0011 -- it needs a column and a migration to be worth
 * anything -- and the conflation is cheap here: the symbol has already passed the
 * exact-match search, so `t === 0` is the two endpoints disagreeing, not the common
 * typo, and it costs one wasted call on a path that ends in a write either way.
 */
async function fetchQuote(ticker: string): Promise<Quote | null> {
  const quote = await attemptQuote(ticker);
  if (quote) return quote;

  await pause(RETRY_AFTER_MS);
  return attemptQuote(ticker);
}

/**
 * One ask.
 *
 * Same payload guard as refresh-stocks, and kept as its own copy on purpose: the
 * two functions deploy independently, and sharing eight lines would couple their
 * release cycles for no gain. An unknown symbol answers HTTP 200 with every figure
 * zeroed, so `t === 0` is the tell -- a genuine quote always carries a real market
 * moment. A stored 0 reads as a real price and silently drops that holding's Market
 * Value to nothing.
 */
async function attemptQuote(ticker: string): Promise<Quote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const quote = (await response.json()) as Quote;
    if (!quote || quote.t === 0 || !(quote.c > 0)) return null;
    return quote;
  } catch {
    return null;
  }
}

/**
 * Is a signed-in user asking?
 *
 * The client is keyed with the service role, but `getUser(token)` validates the
 * TOKEN THAT WAS PASSED, not the key -- the key only satisfies the platform's own
 * apikey check. An expired session, a tampered token, or a bare project key all
 * come back without a user.
 */
async function requireSignedInUser(request: Request, supabase: SupabaseClient): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) return false;

  const { data, error } = await supabase.auth.getUser(token);
  return !error && data.user !== null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (!(await requireSignedInUser(request, supabase))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let ticker: string | null;
  try {
    const body = await request.json();
    ticker = normalizeTicker(body?.ticker);
  } catch {
    ticker = null;
  }
  if (!ticker) {
    return Response.json({ error: "invalid_symbol" }, { status: 400 });
  }

  // Every answer from here on echoes the ticker it is about. The check is
  // asynchronous and races: a user who edits the field twice has two calls in
  // flight, and a client that cannot match a response to the symbol it asked about
  // will eventually show the wrong verdict for the field on screen.
  const lookup = await lookupListing(ticker);

  if (lookup.outcome === "unreachable") {
    return Response.json({ error: "provider_unavailable", ticker }, { status: 502 });
  }
  if (lookup.outcome === "unknown") {
    return Response.json({ error: "unknown_symbol", ticker }, { status: 404 });
  }

  // Confirmed. The price is a bonus, not part of the verdict: ADR 0009's
  // confirmation is the exact symbol match. A quote that fails still leaves a real,
  // named Stock in the table for the next cron pass to price.
  const quote = await fetchQuote(ticker);
  const name = lookup.listing.description;
  const quotedAt = quote ? new Date(quote.t * 1000).toISOString() : null;

  // price and quoted_at are OMITTED rather than nulled when there is no quote, so a
  // row that already holds a good price keeps it -- ON CONFLICT only writes the
  // columns present here. Blanking them would destroy a true fact to record a
  // temporary failure, which is the same rule refresh-stocks follows by skipping.
  const row: Record<string, string | number> = { ticker, name };
  if (quote && quotedAt) {
    row.price = quote.c;
    row.quoted_at = quotedAt;
  }

  const { error } = await supabase.from("stocks").upsert(row, { onConflict: "ticker" });

  // A symbol confirmed but not stored is the exact hole ADR 0009 exists to close:
  // with no row, the cron never prices it and the holding reads "Sin precio"
  // forever. So a failed write fails the request and the save stays blocked.
  if (error) {
    return Response.json({ error: "write_failed", ticker }, { status: 500 });
  }

  return Response.json({ ticker, name, price: quote?.c ?? null, quotedAt });
});
