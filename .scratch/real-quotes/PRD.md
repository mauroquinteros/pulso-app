# PRD — The Quote becomes real (prices leave the mock)

**Feature:** `real-quotes`
**Implements:** `docs/adr/0011-a-quote-is-read-apart-from-the-history.md` (new),
`docs/adr/0008-prices-arrive-by-cron-not-by-request.md` (the client half it never covered)
**Depends on:** the `stocks` table, the `refresh-stocks` cron and the `resolve-stock`
endpoint — all applied, deployed and verified since August 2026
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Scope:** the client stops reading a hardcoded price map and reads **Stocks** from Postgres,
plus one retry inside `resolve-stock`.

> **Why this before Compra.** The obvious next slice was persisting a **Compra**, now that a
> deposit creates **Cash** for its funds gate to pass. It cannot go first. The mock price map
> holds two hardcoded numbers, and the moment a buy persists, a **Holding** of `AAPL` would
> render a **Market Value** derived from a constant that the app cannot tell apart from a real
> price. That is the one failure `0008` and the `price_is_never_zero` constraint were written
> to prevent. The mock map cannot survive the Compra slice, so it has to die before it.

---

## Problem Statement

**Every price in Pulso is a constant, and the app has no way to say so.**

The whole price pipeline is real and has been for weeks. The `stocks` table is applied,
indexed and RLS-protected. A cron invokes `refresh-stocks` every ten minutes through the
trading day. `resolve-stock` confirms a **Símbolo** against the provider and writes a real,
named **Stock** with a real price and the market moment it belongs to. The one thing not
connected to any of it is the app: it reads two numbers out of a hardcoded map, and a ticker
absent from that map has no price at all.

Today this is invisible, because no **Compra** has ever been persisted and there are no
**Holdings** to value. That is exactly what makes it urgent. The **History** became real in
the last slice — deposits are stored and read back — and the next slice puts a buy in it. On
that day the mock map stops being dormant and starts printing figures: a fabricated
**Market Value**, a fabricated **Net P&L**, a fabricated **Total Portfolio Value**. The user
would have no way to know, and neither would the app.

There is a second problem underneath it. `CONTEXT.md` defines **Stale Price** at length and
insists the distinction *"has a name"* — yet the word appears nowhere in the running code. The
price map is `Record<string, number>`: a bare number, with nowhere to put `quoted_at` even
though the schema stores one and constrains the pair to travel together. So the app throws
away the market moment at the boundary, and every question about a price's age becomes
unanswerable by construction.

And a third, quieter one. The app has exactly **one** thing to say about a price it does not
have — exclude it and flag it — while there are three genuinely different reasons, and one of
them is not a missing price at all. If the price read fails outright, the derivation engine
reports a **Market Value** of zero, so **Inicio** would print *Aportado $5,000 → Vale hoy $50*
and a **Total Return** near -100%, with the only caveat living on a different tab. A dropped
packet would render as a wiped-out portfolio.

## Solution

**The app reads Stocks from Postgres, and a price on screen is one the database holds.**

A **Quote** — a price together with the market moment it belongs to — replaces the bare
number. The app reads the `stocks` table **separately from the History and in parallel with
it**, unfiltered, whenever the tabs mount or the app returns from the background. The read
**never gates the app**: a user with no Quote for anything still sees their **Movements**,
their **Efectivo** and their **History**, because a **Stock** is shared and sits outside the
all-or-nothing rule that governs a **Perfil**'s Movements.

What a Quote's absence *means* stops being one thing. Three causes get three sentences: a
Quote **not yet read**, a Quote that **could not be obtained**, and a **Stock that has no
Quote** because the provider has none for it. A fourth situation is named and kept apart
because it is not an absence at all — a **failed refresh**, where the app holds a Quote and
could not find out whether a newer one exists. It says so in a banner and keeps showing what
it has, because hiding a good price to record a failed attempt trades a true fact for a
temporary one.

**Inicio** learns to flag a partial miss and to refuse a total one. Excluding some holdings is
a caveat on a number and stays the documented policy; excluding all of them leaves no number
to caveat, so *Vale hoy* and **Total Return** decline to print. **Efectivo** stays on screen
throughout — **Cash** derives from the History alone and is still exactly right, so the app can
honestly say what is held in cash while refusing to say what it is all worth.

Finally, `resolve-stock` **retries its quote call once**. Two Finnhub calls are structurally
necessary — no free endpoint carries name, price and market moment together — and the second
one failing is what silently mints an unpriced **Stock**. Today that leaves a brand-new
Holding reading "sin precio" until the next cron pass, which over a weekend is Monday. One
retry with a short pause removes the common accident.

## User Stories

1. As a Pulso user, I want the prices behind my portfolio to be real ones, so that the value on my screen means something.
2. As a Pulso user, I want a **Market Value** the app cannot fabricate, so that a number I trust was never invented.
3. As a Pulso user, I want my prices to come from the same source for every ticker, so that one **Holding** is not valued more honestly than another.
4. As a Pulso user, I want a price I see to be one the database actually holds, so that reinstalling the app cannot change what my portfolio is worth.
5. As a Pulso user, I want my **Total Portfolio Value** to move when the market moves, so that the headline figure is worth looking at twice in a day.
6. As a Pulso user opening the app, I want current prices fetched automatically, so that I never have to ask for them.
7. As a Pulso user returning to the app after doing something else, I want the prices refreshed, so that coming back does not show me the value from whenever I last opened it.
8. As a Pulso user, I want switching tabs to fetch nothing, so that moving between Inicio, Movimientos and Portafolio stays instant.
9. As a Pulso user, I want opening a stock's screen not to reload anything, so that navigating within the app is free.
10. As a Pulso user, I want prices to load without blocking my **Movements**, so that a slow price fetch never hides a History that is already in hand.
11. As a Pulso user whose price fetch failed, I want my **Movements** and **Efectivo** anyway, so that a price problem does not cost me my whole app.
12. As a Pulso user, I want to be told plainly when prices could not be loaded, so that I do not mistake a fetch failure for a collapse in value.
13. As a Pulso user whose price refresh failed, I want the prices I already had to stay on screen, so that a dropped packet does not blank a portfolio that was fine a second ago.
14. As a Pulso user whose price refresh failed, I want to be told the refresh failed, so that I know the figures are not being updated even though they look normal.
15. As a Pulso user with no prices at all, I want **Vale hoy** and **Total Return** withheld rather than shown as near-total losses, so that a network fault never reads as a wiped-out portfolio.
16. As a Pulso user with no prices at all, I want my **Efectivo** still shown, so that the app tells me what it genuinely knows instead of going blank.
17. As a Pulso user with some holdings unpriced, I want **Inicio** to say so, so that I know the headline excludes something rather than covering everything.
18. As a Pulso user, I want an unpriced holding excluded from **Distribución** rather than estimated, so that the percentages I read are not partly invented.
19. As a Pulso user, I want a **Stock** the provider cannot price to be described as such, so that I do not read a permanent condition as a temporary glitch.
20. As a Pulso user recording a **Compra** whose símbolo just confirmed, I want that **Stock** to already have a price, so that my new **Holding** does not appear valueless.
21. As a Pulso user confirming a símbolo when the provider blips, I want the app to try again before giving up, so that one bad moment does not cost me a priced Holding.
22. As a Pulso user recording a **Compra** on a weekend, I want its price obtained then rather than on Monday, so that my portfolio is not missing a position for two days.
23. As a **Perfil** signing in, I want prices fetched for my own session, so that what I see was read now rather than inherited.
24. As a **Perfil** signing in after someone else signed out, I want nothing of theirs left on screen, so that "signed out" means the same thing for every kind of data.
25. As a Pulso user, I want a routine token refresh to leave my prices alone, so that the app does not churn over figures that are already correct.
26. As a Pulso user, I want the app to keep working when the price provider is down, so that a third party's outage does not become my outage.
27. As a Pulso user, I want a price and the moment it belongs to kept together, so that the app can one day tell me how current a figure is.
28. As a Pulso user with an empty portfolio, I want no price machinery visible at all, so that a first run looks empty rather than broken.
29. As a Pulso user, I want the app to stop shipping sample prices, so that nothing I see was authored by a developer.
30. As a developer, I want one place that knows the `stocks` table exists, so that a schema change has one blast radius.
31. As a developer, I want database column names never to appear in domain objects, so that the schema can change without the engine noticing.
32. As a developer, I want the price read's lifecycle testable without a network, so that its failure paths are exercised rather than hoped about.
33. As a developer, I want the derivation engine to know nothing about reads, so that a pure function stays pure and its tests stay free of lifecycle.
34. As a developer, I want a **Quote** to be non-optional wherever it appears, so that no caller has to remember a null check the query already guarantees.
35. As a developer, I want the mock price map out of the running app, so that no screen can accidentally read authored data again.
36. As a developer, I want the reconciliation corpus preserved, so that the invariants it proves keep being proven.

## Implementation Decisions

### A Quote is a price and its market moment, and a Stock carries one

`Quote` is `{ price, quotedAt }`; `Stock` is `{ ticker, name, quote }`. The `name` belongs to
the Stock, not to the Quote — `CONTEXT.md` defines a Stock as *"identified by its ticker and
carrying a name (`Apple Inc.`) and a current share price."* The engine's price map changes from
a map of bare numbers to a map of Stocks keyed by ticker.

`quotedAt` is carried even though nothing reads it yet. The schema's
`price_and_quote_time_travel_together` constraint exists so the pair is never split, and
lighting the **Stale Price** signal later has to be a pure function over data already in hand
rather than a schema change and a re-read.

### The read filters on price, so `quote` is never optional

The read is `select ... where price is not null`. A ticker present in the map therefore always
has a Quote, and an unpriced **Stock** is simply absent — falling through the same
missing-price path the engine has always had. The guarantee is enforced by the query rather
than asserted by a type, and no branch exists to keep it true.

A held ticker with no row at all is **not** handled as its own case. ADR 0009 makes it
unreachable: a Compra cannot be saved until its símbolo confirms, and confirming writes the
row. Nothing deletes rows.

### The read is unfiltered by ticker, and never gates the app

`select` over the whole table. The read needs nothing from the History, so both fire in
parallel at the same moment and neither waits on the other. This matches the domain — a Stock
is shared, never owned — and the RLS policy already says so, granting select to any
authenticated user with no owner column to scope by.

Filtering to the **Perfil**'s held tickers was rejected: held tickers derive from the History,
so the price read would have to wait for it, the two reads would serialise, and a failed
History would mean no prices either.

### The trigger is the tabs mounting, plus the app returning from the background

Not "on launch". The session guard removes the tabs from the tree on sign-out and mounts them
fresh on sign-in, so **mount is the one event that covers a cold start and a fresh sign-in
identically**. Tab switches do not fire it; pushing a movement or stock detail does not either.

This is deliberately unlike the History, whose read triggers on an `unread` status and never
on mount. A History is re-read only when it is genuinely gone; every new session should ask
for Quotes again, because ten minutes may have passed or ten hours.

### The three causes, and the fourth thing that is not an absence

A Quote **not yet read**, a Quote that **could not be obtained**, and a **Stock with no Quote**.
Only the third is a fact about the Stock and only the third is permanent.

A **failed refresh** is kept apart from all three. The app holds Quotes and could not learn
whether newer ones exist, so the Quotes stay on screen and a banner says the prices could not
be updated. Hiding them would report a fault as an absence; silence would present a Quote of
unknown age as current. This needs **no market calendar** — announcing that an attempt failed
is a fact about the app, whereas **Stale Price** is a judgement about a Quote the app has,
measured against market activity.

### Inicio flags a partial miss and refuses a total one

Excluding some holdings stays the documented policy — `CONTEXT.md` defines **Total Portfolio
Value** as the sum over priced holdings — but Inicio finally shows the flag it currently omits,
as the distribution card already does. Excluding all of them is different in kind: there is no
number left to caveat, so *Vale hoy* and Total Return withhold. **Efectivo** stays visible
throughout.

### The status lives in the screens; the engine is untouched

`assemblePortfolio` keeps its exact signature and meaning — *given these Stocks, what is the
portfolio* — and never learns that a read exists. The screens read the status beside the
portfolio and choose the sentence. This mirrors the History, whose status lives in its store
and never inside `Movement[]`, and it keeps the engine's tests free of lifecycle.

The refuse-vs-flag decision is made in the home view-model as a pure function, not as branching
inside JSX, so it is one testable place rather than several.

### Modules

- **`lib/stocks.ts`** — the only file that reads the `stocks` table. Hides the database
  completely, the same seam `lib/history.ts` and `lib/resolve-stock.ts` put in front of their
  own boundaries. Nothing throws out of it; a failed select is reported as an answer. The row
  mapper folds in here rather than taking its own file: one mapper with one caller does not
  earn the separation that `movement-rows.ts` earns with three reused by a write path.
- **`stores/stocks.ts`** — holds the Stock map and the read's status, named for what it holds,
  exactly like `stores/movements.ts`. The lifecycle lives here rather than in a separate pure
  reducer: the History's reducer exists for an all-or-nothing rule that cannot be half-applied
  and a race that could show one Perfil's data to another, and the Quote lifecycle has neither.
  Its worst race is a slightly staler map winning, which is harmless.
- **the trigger** — fires the read on mount and on the app returning from the foreground. It
  gates nothing and renders nothing, so it is a hook used by the tabs layout rather than a
  wrapper component like `RequireHistory`, which would read as a gate that forgot to gate.
- **the derivation engine** — the price map's type changes; the logic does not.
- **`usePortfolio` and the stock detail screen** — read the store instead of the mock map.
  These are the last two production readers of authored data.
- **the Perfil-scoped state reset** — clears the Stock store on sign-out.
- **the home view-model** — takes the status and decides refuse-vs-flag.
- **the mock data module** — the price map is retyped to Stocks so the derived summary still
  builds; the unused holdings export goes.
- **`resolve-stock`** — the retry.

### Quotes are cleared on sign-out, for freshness and not for privacy

A Quote is shared, so nothing leaks — the next Perfil learning that `AAPL` trades at $198
learns nothing about the previous one. They are cleared anyway because Quotes surviving into a
session whose own read **fails** would be valued as current with no way to say otherwise,
collapsing the three causes into two at the moment the third one matters.

The comment on the reset must say *freshness, not privacy*, or the next reader concludes a
Quote is Perfil-scoped and one day adds an owner filter to a shared table.

### resolve-stock retries its quote once

Confirmed by the live probes already recorded for this project: **no free Finnhub endpoint
carries name, price and market moment together.** The quote endpoint has no name, search has no
price, the company profile endpoint answers empty for ETFs, and the ETF profile endpoint is
premium. Two calls are structurally necessary.

The nullable price is therefore not caused by the two calls — it is caused by writing the row
when the *second* one fails, which is deliberate, because ADR 0009's confirmation is the exact
symbol match and the price is not part of the verdict. What the retry removes is the common
accident. One retry with a 250ms pause, the same shape the History read uses against a
clock-disagreement refusal, and for the same reason: the fault clears in moments or it is not
this fault.

The write-anyway branch stays. `price` stays nullable. The client's filter is what protects
the app.

## Testing Decisions

**What makes a good test here.** Test what a module promises, not how it keeps the promise.
The suites in this repo already work this way: the History's lifecycle is tested by feeding it
events with no network anywhere, and the row mappers are tested as pure functions with no
database. Neither reaches inside for internals. Follow that.

**New tests: `stores/stocks.ts` only.** Its lifecycle is the one piece of genuinely
asynchronous behaviour this work adds, and it is the only place the new rules are expressed
rather than merely used:

- a read in flight, then Stocks in hand
- a read in flight, then a failure — with nothing previously held
- **a failed re-read leaving the Stocks already in hand untouched**, which is the rule the
  whole "failed refresh is not an absence" decision rests on
- sign-out returning the store to its initial state

Driven through the store's own actions rather than a separate reducer, since there is no
separate reducer. Prior art: the Perfil-scoped state suite, which tests a store directly, and
the History status suite for the event-driven shape.

**Existing suites are updated, not extended.** The derivation engine's tests and the home and
portfolio view-model tests all build a price map, so they stop compiling the moment its type
changes. They are updated to build Stocks and must go on passing unchanged in meaning — but no
new cases are added for the refuse-total and flag-partial states in this pass. That is a
deliberate gap, recorded here so it is a decision rather than an oversight.

**The reconciliation corpus stays.** The mock movement list and the portfolio summary derived
from it are what make three invariants provable at all — that the running sum of every
Movement's **Cash Impact** equals **Cash** across all five types, that Inicio's figures
reconcile, and that **Allocations** sum to 100%. Thirteen movements spanning every type, a
partial sell and a full exit. It is no longer mock data the app uses; it is a fixture, and it
is kept.

**The retry is not tested.** There is no Deno test setup under the functions directory, and
standing one up for one retry is not proportionate. It is verified the way both Edge Functions
were verified before: manually, against the deployed function.

## Out of Scope

- **The Stale Price signal.** The Quote carries `quotedAt` so the judgement becomes possible,
  but nothing judges. Staleness is measured against market activity, never the clock — a Friday
  close read on a Sunday morning is not stale — and that means a market calendar with holidays
  in it. Deferred deliberately, with the data now in hand for whenever it lands.
- **The delisting detector.** The cron already asks about every ticker every ten minutes, and a
  provider response of zeros is a statement that it does not know the symbol rather than a
  transport failure, so the cron is a detector that currently discards its evidence — and a
  skipped row keeps its last good price forever. Its own slice: it needs a column, a migration,
  a split of unquotable from unreachable, a re-validation rule, and a UI answer for a Stock that
  stopped trading.
- **Checking `stocks` before calling the provider in `resolve-stock`.** Would cost zero external
  calls on the common path, but makes a Stock's `name` write-once and lets a delisted symbol
  confirm forever. Recorded in ADR 0011.
- **Making `price` NOT NULL.** Mechanically incompatible with the write-anyway branch, for
  reasons recorded in ADR 0011.
- **Persisting a Compra**, and the four movement forms still marked "Pronto".
- **The ADR 0010 hole in those four forms**, which write to the store a Movement the database
  never received and are held back only by the picker's disabled state.
- **Pull-to-refresh.** The client only ever selects from `stocks`; it cannot reach the provider,
  so a pull would promise the user control they do not have.
- **Showing a Stock's name.** It is read and carried, but no screen displays it yet.
- **Edits and deletes**, which do not exist for any Movement.

## Further Notes

**One assumption in the write path is worth confirming on a device.** `resolve-stock` omits
price and quote time from its upsert when the quote fails, relying on those columns being left
untouched so a row that already holds a good price keeps it. That behaviour is documented and
was checked against the provider's own issue tracker: the column list is built from the payload
keys, so omitted columns are absent from the generated update. Two caveats came out of that
check and are recorded in ADR 0011 — the omitted columns are NULL in the *proposed* insert row
and constraints are checked there **before** the conflict resolves, and this only passes because
both columns are nullable and always omitted together. Worth one live confirmation, since the
failure would be a loud constraint error rather than a silent NULL.

**ADR 0011's title is slightly loose.** It says a Quote is read apart from the History, when
strictly what is read is a **Stock** carrying a Quote. Defensible shorthand; tighten it if it
ever reads as wrong.

**The unused holdings export in the mock module is dead today**, before any of this work —
exported and imported nowhere. It goes with this change rather than being left behind.
