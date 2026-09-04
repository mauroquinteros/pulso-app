-- 1. stocks gains a surrogate key; ticker is demoted to UNIQUE.
--
-- Order matters. Dropping the primary key takes ticker's implicit NOT NULL with
-- it, so it has to be restored explicitly -- otherwise the column is left
-- nullable under a UNIQUE, which accepts a Stock with no symbol.
--
-- `collate "C"` makes ticker comparison a memcmp rather than an ICU collation
-- walk, which is correct because ticker_is_uppercase already restricts the column
-- to uppercase ASCII. The UNIQUE is what resolve-stock's
-- upsert(..., { onConflict: "ticker" }) resolves against: it must exist or that
-- endpoint breaks.
alter table public.stocks add column id uuid not null default gen_random_uuid();
alter table public.stocks drop constraint stocks_pkey;
alter table public.stocks alter column ticker set not null;
alter table public.stocks alter column ticker type text collate "C";
alter table public.stocks add constraint stocks_pkey primary key (id);
alter table public.stocks add constraint stocks_ticker_key unique (ticker);

-- 2. The membership. Keyed by Perfil and Stock, and holding nothing else: no
-- price, no name, no share count. Everything about a Stock stays in the one
-- shared row it has always had.
create table public.user_stocks (
  user_id    uuid not null references auth.users(id)    on delete cascade,
  stock_id   uuid not null references public.stocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);

alter table public.user_stocks enable row level security;

create policy "Perfil reads own stock links"
  on public.user_stocks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Write: deliberately NO policy, the same shape `stocks` uses to make the service
-- role its only writer. The trigger below is the only thing that writes here, and
-- it does so as its definer, so the publishable key has no door to walk through.
-- `(select auth.uid())` is wrapped so Postgres evaluates it once as an InitPlan --
-- the pattern the movement policies already use.

-- 3. The writer. A link is added as the Movement is inserted, inside the same
-- transaction, so there is no window where a Compra exists and its link does not
-- (the two-writes failure ADR 0010 exists to prevent).
--
-- INSERT only: the app has no edit and no delete path, so cleanup would be code
-- for an event nothing can raise. The edit screen owns that when it arrives.
--
-- A ticker with no Stock behind it selects nothing and inserts nothing -- the
-- silent skip, on purpose. The Dividendo form accepts any non-empty symbol, so
-- this is a reachable path; raising here would abort the Movement's own insert and
-- surface a typo as a generic database error, which is the collapse ADR 0009
-- forbids between "the provider says no" and "we could not ask".
--
-- `security definer` with an empty search_path is what makes the missing INSERT
-- policy safe: without it the trigger would run as `authenticated` and would need
-- one. The empty search_path forces the schema-qualified references the body
-- already uses.
create function public.link_stock_to_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_stocks (user_id, stock_id)
  select new.user_id, s.id from public.stocks s where s.ticker = new.ticker
  on conflict do nothing;
  return new;
end;
$$;

-- A Compra is what makes a ticker this Perfil's. A Venta is not: it can only
-- follow a Compra of the same ticker, so the link already exists and the insert
-- would be a `on conflict do nothing` that scanned `stocks` to learn nothing. The
-- `when` is what keeps that work from happening at all -- Postgres evaluates the
-- condition without calling the function, so a sell never reaches plpgsql.
--
-- movement_cash gets no trigger at all: it has no ticker.
create trigger link_stock_on_trade
  after insert on public.movement_trades
  for each row
  when (new.type = 'buy')
  execute function public.link_stock_to_perfil();

create trigger link_stock_on_dividend
  after insert on public.movement_dividends
  for each row
  execute function public.link_stock_to_perfil();

-- 4. Backfill, which is also the rebuild: it derives the same set from Movements
-- at any later time and is safe to re-run. Without it every existing Perfil loses
-- every price the moment the read is switched over, because the table is born
-- empty and the trigger only sees new insertions.
insert into public.user_stocks (user_id, stock_id)
select distinct m.user_id, s.id
from (
  -- Buys only, matching the trigger above: the rebuild has to derive the set the
  -- writer would have written, not a wider one.
  select user_id, ticker from public.movement_trades where type = 'buy'
  union
  select user_id, ticker from public.movement_dividends
) m
join public.stocks s on s.ticker = m.ticker
on conflict do nothing;
