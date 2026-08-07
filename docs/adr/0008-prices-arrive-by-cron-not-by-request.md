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

## The cadence is daily, and that is a reversal

An earlier plan set the refresh at every five minutes during market hours. It is
now **once a day**. The consequence is not cosmetic: from the opening bell to the
close, the price on screen is the previous session's, so **Market Value** — which
the glossary defines as `current share price × shares held` — is not literally
what it claims during the only hours anyone is watching. Pulso is a long-term
tracker, not a trading app, and intraday movement is noise against the figure it
exists to report. That trade is accepted deliberately.

It leaves one thing genuinely unresolved, recorded here so it is not mistaken for
an oversight: **what the number on screen claims to be**. Either it is relabelled
as a closing price and stated as a fact, or it keeps claiming to be current and
the **Stale Price** signal is lit every weekday from open to close — at which
point the signal carries no information and a dead cron is indistinguishable from
an ordinary Tuesday. That choice belongs to the first screen that renders a real
price. Deferring it is cheap only because the cron rewrites every row daily, so
any column added later fills itself on the next run.

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
  tested path.
- **The only timestamp available is `updated_at` — when the cron asked.** Finnhub's
  quote response carries no market timestamp, so the app cannot know which market
  moment a price belongs to, only when it fetched it. The **Stale Price** entry in
  `CONTEXT.md` insists staleness is measured against market activity and never
  against the clock; honouring that literally would need a market calendar the app
  does not have.
- **Two writers, one table.** The daily cron, and the symbol-validation function of
  `0009`, which upserts a Stock the moment it is confirmed real. Both are the same
  upsert, and the client is neither of them.
- **The client re-reads on app open and on entering a screen that shows prices.**
  No timers and no realtime subscription: with a daily write, a socket would
  deliver nothing on almost every session.
