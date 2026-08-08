-- The `stocks` table from docs/adr/0008-prices-arrive-by-cron-not-by-request.md.
-- A Stock is shared, never owned: AAPL is the same Stock for every Perfil. So the
-- table has no user_id, no ownership, and no `movement_` prefix -- it is not part
-- of the history the all-or-nothing rule governs.
--
-- Assumes public.set_updated_at() already exists. It was created by the movement
-- tables, which were applied straight to the remote project before this directory
-- existed -- so there is no migration here that creates it.

create table public.stocks (
  ticker     text primary key,
  name       text        not null,
  price      numeric,
  quoted_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The ticker is the key, so it must be one spelling. Uppercase only -- but NOT
  -- letters-only: BRK.B is a real symbol that the app cannot currently type, and
  -- baking today's input regex into the schema would make that permanent.
  constraint ticker_is_uppercase check (ticker = upper(ticker)),

  -- The hard rule of ADR 0008, enforced where it cannot be bypassed: a price of 0
  -- is never written. An unknown symbol comes back HTTP 200 with every figure
  -- zeroed, and a stored 0 reads as a real price with priceAvailable = true,
  -- silently dropping that holding's Market Value to nothing. A missing price is
  -- already handled correctly (exclude + flag); a zero is not, and never will be.
  constraint price_is_never_zero check (price is null or price > 0),

  -- A price always knows which market moment it belongs to. Storing one without
  -- the other yields a number nobody can describe -- which is the entire reason
  -- quoted_at exists rather than relying on updated_at.
  constraint price_and_quote_time_travel_together check ((price is null) = (quoted_at is null))
);

alter table public.stocks enable row level security;

-- Read: any signed-in user. Prices are not user data, so there is nothing to scope.
create policy "stocks are readable by any authenticated user"
  on public.stocks
  for select
  to authenticated
  using (true);

-- Write: deliberately NO policy. With RLS on and no insert/update/delete policy,
-- the publishable key can never write here. The service role bypasses RLS, so the
-- Edge Function (cron refresh, and resolve-stock) is the only writer -- which is
-- exactly the rule ADR 0008 states.

create trigger stocks_set_updated_at
  before update on public.stocks
  for each row
  execute function public.set_updated_at();
