# Prices arrive by cron into a `stocks` table, never by a request from the app

The app **never calls the market-data provider**. A scheduled job invokes an Edge
Function, which asks Finnhub for the price of every **Stock** the app knows about
and upserts it into a `stocks` table. The client only ever issues a `select`
against that table, and nothing in the binary knows Finnhub exists. The refresh
runs **once a day**.

## Considered Options

- **The app calls Finnhub directly.** Rejected outright: the API key would ship
  inside the binary. An `.ipa` is a zip; its strings come out with one command.
  There is no client-side way to hold a provider key.
- **The app calls an Edge Function, which calls Finnhub.** The key is safe, but
  every app open triggers live calls for the _same_ tickers, so cost scales with
  users × opens rather than with distinct **Stocks**. Worse, the price arrives as
  a bare number with nowhere to record _when_ it was obtained, and swapping
  providers later means a new build and another Beta App Review.
- **Cron → Edge Function → Finnhub → `stocks`, client reads Postgres.** Chosen.
  Cost collapses to the number of distinct Stocks — a **Stock** is shared, never
  owned, so `AAPL` is fetched once for everybody. Changing provider is a
  server-side change with no build and no review. The write carries a timestamp,
  because the row has a column to put it in.

Notably, **the cron must invoke the Edge Function over HTTP** rather than
Postgres fetching the price itself. A free Supabase project pauses after seven
days without API requests, and sporadic use is exactly the usage pattern of "a
few friends trying it". Hitting the platform on every run is what keeps the
project awake.

## The cadence is every ten minutes, and the schedule is deliberately loose

`*/10 13-21 * * 1-5`. A once-a-day refresh was considered and rejected: it would
have meant that from the opening bell to the close, the price on screen was the
previous session's, so **Market Value** — which the glossary defines as
`current share price × shares held` — would not be literally what it claims
during the only hours anyone is watching. Worse, the **Stale Price** signal would
then be lit every weekday from open to close, carrying no information at all, and
a dead cron would look identical to an ordinary Tuesday. Ten minutes keeps both
terms honest and the signal rare.

**The UTC window is wider than the session on purpose.** The regular session is
09:30–16:00 in New York, but cron schedules are interpreted in UTC and New York
observes DST, so the same session sits at 13:30–20:00 UTC in summer and
14:30–21:00 UTC in winter. `13-21` is the union of the two: it contains the whole
session in both halves of the year and never needs revisiting. The alternative — a
tight window adjusted twice a year — fails *silently*, quietly ceasing to update
an hour before the close each November, which is the kind of thing nobody notices
until a number is wrong. The runs that fall outside the session cost nothing:
Finnhub returns the same price and the same market moment, and the row is
rewritten identically.

What the price on screen *claims to be* is now a smaller question than it was, but
not a settled one. It belongs to the first screen that renders a real price.

## Consequences

- **`stocks` has no `user_id` and no owner.** A **Stock** is shared, so the table
  sits outside the per-**Perfil** rules entirely. RLS reads for any authenticated
  user; only the service role writes. This is also why it carries no `movement_`
  prefix: it is not part of the history the all-or-nothing rule governs.
- **A missing Stock costs a **Market Value**, not a wrong one.** The holding takes
  the existing `exclude + flag` path. This is the whole reason the next point is a
  hard rule.
- **An unknown symbol is never written with price `0`.** A zero reads as a real
  price with `priceAvailable: true` and silently drops that holding's Market Value
  to nothing — strictly worse than the absent row, which already has a correct and
  tested path. The provider gives no help here: an unknown symbol comes back
  **HTTP 200** with every figure zeroed, so the guard must read the payload. A
  market moment of `0` is the tell — a genuine quote always carries a real one.
- **Two timestamps, and they mean different things.** The quote carries the market
  moment the price belongs to — verified as the closing bell to the second — and it
  is stored alongside the price. `updated_at` records when the cron asked. Only the
  first can answer the **Stale Price** question, which `CONTEXT.md` insists is
  measured against market activity and never against the clock: a Friday close read
  on Sunday is correct, and only the market moment can say so. Confusing the two is
  a bug, not a simplification. (A third, `lastReadAt`, is client-side and in memory
  only: when the app last read the table, which decides whether to read it again.)
- **Two writers, one table.** The daily cron, and the symbol-validation function of
  `0009`, which upserts a Stock the moment it is confirmed real. Both are the same
  upsert, and the client is neither of them.
- **The client re-reads on app open and on entering a screen that shows prices.**
  No timers and no realtime subscription. A subscription would not _replace_ this
  read, it would sit on top of it: with the app closed there is no socket, so on
  opening it the client needs the current state anyway — which is a `select`,
  unconditionally. Realtime earns its place when an event is rare, unpredictable
  and urgent; a price refresh on a schedule you wrote yourself is none of those.
- **The refresh paces itself.** The free tier allows 60 calls a minute, and one run
  makes one call per **Stock** back to back, so an unspaced loop over a growing
  list is a burst that trips the limit. Requests are spaced roughly a second
  apart, which in turn bounds how many Stocks a single run can cover before it
  meets the function's own wall-clock limit — a ceiling worth measuring before the
  list gets long, not after.
