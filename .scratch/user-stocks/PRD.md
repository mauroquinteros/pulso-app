# PRD — Per-Perfil Stock membership (`user_stocks`)

**Feature:** `user-stocks`
**Implements:** `docs/adr/0015-a-perfil-reads-only-the-stocks-it-has-movements-in.md`
**Revises the read half of:** `docs/adr/0011-a-quote-is-read-apart-from-the-history.md`
**Leaves standing:** `docs/adr/0008-prices-arrive-by-cron-not-by-request.md` — the cron and
its ceiling are outside this work.
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).

> **Status. BUILT — the appendix's live checks are still owed.** Every decision below is
> settled — argued out in full and recorded in ADR 0015. Read the ADR for *why*, this file for
> *what to build*. The appendix holds the executable form; the body holds the requirements it
> has to satisfy.

---

## Problem Statement

A **Perfil** who holds twenty **Stocks** downloads every **Stock** the install base has ever
confirmed, every time the tabs mount and every time the app returns from the background.

The read is unfiltered because the `stocks` table has no owner — a **Stock** is shared, never
owned, and the schema says so. That is still true and is not the problem. The problem is that
"shared" was allowed to mean "everyone reads all of it": the **Quotes** a Perfil is sent bear
no relation to the **Movements** they have recorded, so the cost of opening the app is set by
how many people use it rather than by how much the Perfil owns.

The table saturates rather than growing without bound — a **Stock** enters only when the
symbol-confirmation endpoint accepts it, and it accepts only US listings — so the ceiling is
the US listing universe, not the user count. The gap between that ceiling and one Perfil's own
holdings is nonetheless two orders of magnitude, paid on every foreground return, on a phone.

**This has not been measured.** The figures reasoned about during design were derived from row
width. Anyone justifying this work with a number should measure first.

## Solution

The app records which **Stocks** a **Perfil** has **Movements** in, and reads only those.

The membership is written by the database itself when a **Movement** is saved, so nothing in
the app has to remember to keep it current, and it is joined server-side so the price read
remains a single request that waits for nothing — in particular, it does not wait for the
**History**, which is the reason ADR 0011 refused to filter in the first place.

A **Stock** is unchanged: still shared, still owned by nobody. Membership records which Stocks
a Perfil needs *priced*. It is not a claim of ownership, and the day someone reads it as one is
the day the shared table grows an owner column it was designed never to have.

Membership means **ever traded**, not **currently held**. Selling a position in full does not
end it.

## User Stories

1. As a **Perfil**, I want the app to fetch prices only for **Stocks** I have **Movements** in,
   so that opening the app does not download quotes for companies I have never owned.
2. As a **Perfil**, I want my prices to arrive as quickly as they do today, so that scoping the
   read does not buy a smaller payload at the price of a slower first screen.
3. As a **Perfil**, I want my prices to keep arriving even when my **History** fails to load, so
   that one failure does not become two.
4. As a **Perfil**, I want my **Holdings** to be priced the moment the tabs appear, so that
   nothing about this change makes me wait for a screen that used to be ready.
5. As a **Perfil** signing in for the first time, I want the app to load cleanly with no prices
   at all, so that having recorded nothing yet is an empty portfolio and not an error.
6. As a **Perfil** recording my first **Compra** of a company, I want its price to appear
   without my doing anything else, so that a new position is priced like every other.
7. As a **Perfil** who has sold a position in full, I want that **Stock** to stay known to the
   app, so that its **Total Return of a stock** can still be shown when that screen exists.
8. As a **Perfil**, I want a **Dividendo** recorded for a symbol I mistyped to still save, so
   that a typo costs me an unpriced row rather than a rejected **Movement**.
9. As a **Perfil**, I want a **Dividendo** for a **Stock** I no longer hold to behave exactly as
   it does today, so that the app's existing rule — a dividend is not gated against a
   **Holding** — is not quietly tightened.
10. As a **Perfil**, I want a **Holding** whose price is unavailable to be excluded and flagged,
    so that the missing-price policy is the same one the app has always applied.
11. As a **Perfil** who has been using the app before this change, I want every position I
    already hold to stay priced, so that an upgrade does not blank my portfolio.
12. As a **Perfil**, I want another Perfil's **Movements** to remain invisible to me, so that
    scoping the read does not become a way to learn what anyone else owns.
13. As a **Perfil** who signs out, I want my membership to be irrelevant to whoever signs in
    next, so that a shared phone does not leak a portfolio's shape.
14. As a **Perfil** returning from the background, I want a refreshed set of prices for what I
    own, so that the app's existing reason for re-reading survives the change.
15. As a **Perfil**, I want a failed price read to leave the **Quotes** I already have on
    screen, so that a fault is still reported as a fault and not as an absence.
16. As a **Perfil**, I want my **Efectivo**, my **Movements** and my **History** to render even
    when no price arrives, so that prices continue to gate nothing.
17. As a **Perfil** deleting a **Movement** through some future edit screen, I want the app to
    behave predictably, so that the absence of cleanup today is a known gap rather than a
    surprise.
18. As a developer, I want the price read's public shape to be unchanged, so that the store,
    the derivation engine and every screen are untouched by a database change.
19. As a developer, I want the membership to be impossible to write from the client, so that
    the only thing that can claim a **Perfil** owns a **Stock** is the act of recording a
    **Movement**.
20. As a developer, I want the membership to be derivable from **Movements** at any time, so
    that it can be rebuilt if it is ever found to have drifted.
21. As a developer, I want to know from the schema alone that `stocks` is still ownerless, so
    that the domain rule survives contact with the new table.

## Implementation Decisions

**A membership table, not a derived view.** Both produce the same rows and both cost one
request. The table was chosen for plan predictability — a composite primary key guarantees an
index scan where a view's plan is the planner's to choose — and because a table can carry
columns that do not derive from **Movements**. The view remains the first alternative to
reopen if the write path becomes a maintenance cost.

**Membership is keyed by Perfil and Stock, and holds nothing else.** No price, no name, no
share count. Everything about a **Stock** stays in the one shared row it has always had.

**The database writes it, not the app.** A trigger on the movement tables adds the link as a
**Movement** is inserted, inside the same transaction. The alternative — the client writing
the link alongside the **Movement** — is two writes without a transaction, which is the exact
failure ADR 0010 exists to prevent: a **Compra** that saved while its link did not, leaving a
**Holding** that never prices.

**The trigger reacts to a Compra or a Dividendo, and to insertion only.** A **Venta** is
excluded by a condition on the trigger itself: a sell can only follow a buy of the same
**ticker**, whose link already exists, so firing would cost a scan of `stocks` to reach an
`on conflict do nothing`. Postgres evaluates a trigger's `when` without calling the function,
so a sell never reaches plpgsql at all. No cleanup on delete or update. The app has no edit
and no delete path today, so cleanup would be code for an event nothing can raise. The
underlying permissions do allow a direct deletion, so a stale link is reachable; its cost is a
**Quote** fetched and unused — never a wrong figure. The edit screen owns this when it arrives.

**A ticker with no Stock behind it links nothing, and says nothing.** The trigger finds no
**Stock** and inserts no link. This is a reachable path, not a theoretical one: the
**Dividendo** form accepts any non-empty symbol. Raising an error instead would abort the
**Movement**'s own insertion, turning a mistyped symbol into a save that fails with a generic
database error — collapsing "the provider says no" into "we could not ask", which ADR 0009
forbids.

**The membership is rebuildable, and the backfill is the rebuild.** The same query that
populates it on deploy recomputes it from **Movements** at any later time, and it is idempotent.
That is the answer to a membership found to have drifted — from a direct deletion, from a
future write path that forgets — and it is why no reconciliation job is specified: there is
nothing to reconcile against that is not already the source of truth.

**The shared table keeps its open read permission.** Scoping happens on the membership;
permissions apply to both sides of the join, so scoping the **Stock** itself would reintroduce
per-row work the membership exists to remove, and would break the join outright if written to
exclude.

**A Stock gains a surrogate identifier, and this is a convention rather than a requirement.**
It is referenced by exactly one column in the system — the membership's own — and by nothing
else: not the movement tables, which keep the **ticker** and are right to; not the client,
which never sees it; not the two server functions; not the stock detail route. The ticker
remains unique, remains the identity in the domain, and gains a byte-comparison collation,
which closes the only performance gap that favoured a surrogate key. Recorded as a preference
so no future reader searches for a technical reason that was never there.

**The read becomes a nested join and returns the same domain objects.** The data-access
function's signature and return type are unchanged; what moves is the wire shape, which is
unwrapped by the mapper that already exists at that boundary. No new mapper is introduced —
one property access does not earn a module.

**The join must be declared inner.** Filtering an outer join's nested resource removes the
nested object but keeps its parent, so the price filter would stop filtering. This is the one
detail most likely to be got wrong and to pass a cursory review.

**The migration must backfill.** The membership is born empty and the trigger only sees new
insertions, so without a backfill every existing **Perfil** loses every price on deploy.

**The migration and the client change ship independently, in that order.** The unfiltered read
keeps working while the schema changes; reversing the order breaks the app.

## Testing Decisions

A good test here asserts what a caller can observe: **Stocks** keyed by **ticker**, returned as
domain objects, a failure reported rather than thrown, and one retry against a token the server
reads as future-dated. It does not assert the shape of a query, a table name, or the presence
of a join — all of which are the change under discussion and none of which a caller can see.

**The existing data-access tests are the prior art and stay as they are.** `lib/stocks.test.ts`
mocks the client chain, and that chain is identical under the new query. Only the helper that
stages a response changes, to nest the row the way the join returns it. The row fixtures keep
describing the domain row, so the nesting appears in exactly one place in the test file.

**No new test is owed at that boundary.** The behaviour under test is unchanged; only the wire
shape moved. A test written to assert the new query shape would be a test of the
implementation, and would have to be rewritten the next time the query changes.

**The trigger is verified against the live project, not unit tested.** There is no database test
harness in this repo and this PRD does not introduce one. Four checks, run in order: a
non-empty membership after backfill where movements existed; a **Compra** for a never-held
symbol producing a link; a **Dividendo** for a garbage symbol saving with no link and no error;
and a second **Perfil** seeing only its own rows. The third is the one worth performing
deliberately — it is the silent path, and it is better seen once on purpose than discovered.

## Out of Scope

- **The scheduled price refresh and its ceiling.** It still reads every **Stock**, because it
  must refresh any **ticker** any **Perfil** holds. It stops finishing inside its window at a
  few hundred **Stocks**, and this work does not move that. Describing this change as having
  addressed it would be wrong.
- **The Dividendo form's symbol gate.** Recorded separately in the backlog. This work depends
  on the gap existing — it is why the silent path is reachable — but does not close it.
- **Cleanup of membership on edit or deletion of a Movement.** Arrives with the edit screen.
- **Any screen for closed positions.** The membership is deliberately "ever traded" so those
  rows exist when that feature is built. Building it is not this.
- **Measuring the payload.** Worth doing, not required to ship.

## Further Notes

**One accepted regression.** A **Stock** confirmed in the **Compra** form but not yet saved is
held only in memory. If the app is backgrounded and returned to before the save, the price read
that fires on return no longer carries that **Stock** — no **Movement** references it yet — and
the map is replaced wholesale, so the brand-new **Holding** reads "sin precio" until the next
read. The unfiltered read had no such window. Accepted rather than coded around: the cost is a
missing price, not a wrong one, and it falls through the path that has always existed.

**An empty result is now an ordinary state.** It means "this **Perfil** has recorded nothing
yet", which is every new Perfil's first session, and it yields a completed read over an empty
set rather than a failure.

**Two glossary gaps this work surfaced and did not close.** **Holding** is used throughout
`CONTEXT.md` and never defined there. And there is no agreed term for a position that has been
sold in full — the backlog, the proposed UI and this document each use a different one.

---

# Appendix — The executable form

File paths are given; line numbers deliberately are not, because they rot. The SQL below is
the decision, not a pointer to it.

## Part 1 — The migration

One file: `supabase/migrations/<timestamp>_create_user_stocks.sql`.

Order matters. Steps 2 and 3 are a pair: dropping the primary key takes `ticker`'s implicit
`NOT NULL` with it, and without step 3 you are left with a nullable column under a UNIQUE,
which accepts rows with no symbol.

```sql
-- 1. stocks: surrogate id, ticker demoted to UNIQUE.
alter table public.stocks add column id uuid not null default gen_random_uuid();
alter table public.stocks drop constraint stocks_pkey;
alter table public.stocks alter column ticker set not null;   -- the drop above removed this
alter table public.stocks alter column ticker type text collate "C";
alter table public.stocks add constraint stocks_pkey primary key (id);
alter table public.stocks add constraint stocks_ticker_key unique (ticker);
```

`collate "C"` makes ticker comparison a `memcmp` instead of an ICU collation walk, and is
correct because `ticker_is_uppercase` already restricts the column to uppercase ASCII. The
UNIQUE is what `resolve-stock`'s `upsert(..., { onConflict: "ticker" })` resolves against — it
must exist or that endpoint breaks.

```sql
-- 2. The membership.
create table public.user_stocks (
  user_id    uuid not null references auth.users(id)    on delete cascade,
  stock_id   uuid not null references public.stocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);

alter table public.user_stocks enable row level security;

create policy "Perfil reads own stock links"
  on public.user_stocks for select to authenticated
  using ((select auth.uid()) = user_id);
-- Deliberately NO insert/update/delete policy. The trigger is the only writer, the same shape
-- `stocks` uses to make the service role its only writer. `(select auth.uid())` is wrapped so
-- Postgres evaluates it once as an InitPlan -- the pattern the movement policies already use.
```

```sql
-- 3. The writer.
create function public.link_stock_to_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_stocks (user_id, stock_id)
  select new.user_id, s.id from public.stocks s where s.ticker = new.ticker
  on conflict do nothing;
  return new;
end; $$;

create trigger link_stock_on_trade    after insert on public.movement_trades
  for each row when (new.type = 'buy') execute function public.link_stock_to_perfil();
create trigger link_stock_on_dividend after insert on public.movement_dividends
  for each row execute function public.link_stock_to_perfil();
```

The `when` is what keeps a **Venta** out: the condition is evaluated without calling the
function, so a sell does not enter plpgsql. `movement_cash` gets no trigger at all — it has no
ticker.

`security definer` + `set search_path = ''` is why there is no INSERT policy: without it the
trigger runs as `authenticated` and would need one, which is a door the client could walk
through directly. The empty search_path forces schema-qualified references, which the body
already uses.

**No index is added on the movement tables.** An earlier draft of this appendix created
`(user_id, ticker)` on both, described as the lookup the trigger and the backfill drive. Neither
drives it. The trigger's only `from` is `stocks` — `new.ticker` is the row being inserted, not a
row it reads — so the lookup it makes is on `stocks.ticker`, which the UNIQUE above already
indexes. The backfill reads every row of both tables once, which is a sequential scan whatever
indexes exist, and cannot be served index-only because `type` is not in the index. The app's own
reads are by `user_id` alone, and `movement_trades_user_id_idx` and
`movement_dividends_user_id_idx` already exist. Recorded here so the pair is not re-added.

The one index with a reason behind it is on `user_stocks (stock_id)` — the composite primary key
leads with `user_id`, so a delete from `stocks` would scan to find its referencing rows. It is not
created either: nothing deletes a **Stock**, which has no delete policy and one service-role
writer.

```sql
-- 4. Backfill. Also the rebuild command: idempotent, and derivable at any later time.
insert into public.user_stocks (user_id, stock_id)
select distinct m.user_id, s.id
from (
  -- Buys only, matching the trigger: the rebuild derives the set the writer would have
  -- written, not a wider one.
  select user_id, ticker from public.movement_trades where type = 'buy'
  union
  select user_id, ticker from public.movement_dividends
) m
join public.stocks s on s.ticker = m.ticker
on conflict do nothing;
```

### Verification

Run against the linked project, in this order:

1. `select count(*) from public.user_stocks;` — non-zero if there were movements before the
   migration. Zero on a wiped database is correct, not a failure.
2. Save a **Compra** for a ticker the Perfil has never held. A row appears.
3. Save a **Dividendo** for a garbage symbol (`ZZZZ`). The dividend saves; **no** row appears;
   no error surfaces. This is the silent-skip path, worth seeing on purpose.
4. Sell a position in full. The link stays — the trigger does not fire on a **Venta**, and
   nothing removes a link.
5. `select * from public.user_stocks;` signed in as a second Perfil returns only that Perfil's
   rows.

## Part 2 — The client read

One file: `lib/stocks.ts`. Six lines. `readStocks()` still returns `StocksAnswer` with a
`Record<ticker, Stock>`, so nothing outside this file changes.

**The query:**

```ts
const { data, error, status } = await supabase
  .from("user_stocks")
  .select("stocks!inner(ticker, name, price, quoted_at)")
  .not("stocks.price", "is", null);
```

**The row type**, beside the existing `StockRow`:

```ts
/** A `user_stocks` row with its Stock nested - how PostgREST returns a to-one embed. */
interface StockLinkRow {
  stocks: StockRow;
}
```

An object, not an array, because `user_stocks.stock_id -> stocks.id` is many-to-one — which is
what PostgREST returns, and what the mapper reads. **`supabase-js` types it as an array anyway.**
The client is built with no generated `Database` type, so the library parses the select string
with no schema to tell it the cardinality and widens the embed. The loop below therefore casts,
and the cast has to go through `unknown`: `as StockLinkRow[]` alone is refused as a conversion
between types that do not overlap.

**The loop:**

```ts
for (const row of data as unknown as StockLinkRow[]) stocks[row.stocks.ticker] = mapStockRow(row.stocks);
```

`mapStockRow` does not change. **Do not touch** the `PGRST303` retry, the `StocksAnswer` type,
or `stores/stocks.ts`.

**The test**, in `lib/stocks.test.ts` — one line, the response helper:

```ts
const ok = (rows: unknown[]): Result => ({ data: rows.map((s) => ({ stocks: s })), error: null, status: 200 });
```

The row fixtures stay as they are.

## Order of operations

1. Migration applied and verified. The unfiltered client read keeps working throughout —
   `stocks` is untouched apart from its key.
2. Client read switched.

Independent commits. Reversing the order breaks the app: `user_stocks` would not exist.
