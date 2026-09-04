# 01 - `user_stocks` exists and fills itself

Type: **HITL** - applying the migration is unattended, but the verification is not. Three of
the checks require the live project *and* the forms: a Compra saved, a Dividendo saved with a
symbol nobody confirmed, and a second Perfil signed in. An agent cannot tap through those.

## Parent

`.scratch/user-stocks/PRD.md` - decisions in `docs/adr/0015-a-perfil-reads-only-the-stocks-it-has-movements-in.md`

## What to build

The database learns which **Stocks** a **Perfil** has **Movements** in, and keeps that current
by itself.

Recording a **Movement** that names a ticker adds the link, inside the same transaction as the
**Movement**, so there is no window where a **Compra** exists and its link does not. Nothing in
the app writes the link and nothing can: the membership is readable by its owner and writable
by no one, the way `stocks` is readable by any signed-in **Perfil** and writable only by the
service role.

Membership means **ever traded**. A position sold in full keeps its link - and the **Venta**
does not even fire the trigger, because a sell can only follow a buy of the same ticker whose
link already exists. The closed-position screens that ADR 0015 anticipates will need the
**Stock**'s name, and it is still there. Nothing removes a link either, because nothing in the
app can remove a **Movement** yet.

A ticker with no **Stock** behind it links nothing, **and says nothing** - no error, no failed
save. This is a real path, not a defensive one: the **Dividendo** form accepts any non-empty
symbol (backlog: *A dividend can be saved for a symbol nobody confirmed*). Raising here would
abort the **Movement**'s own write and surface a typo as a generic database failure, which is
the collapse ADR 0009 forbids between "the provider says no" and "we could not ask".

Every **Movement** that already exists gets its link in the same migration. Without that step
every current **Perfil** loses every price the moment the read is switched over. The backfill
is also the repair: it derives the same set at any later time and is safe to re-run.

The two shapes that carry the decisions, from the PRD:

```sql
create table public.user_stocks (
  user_id    uuid not null references auth.users(id)    on delete cascade,
  stock_id   uuid not null references public.stocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);
```

```sql
-- The whole writer. No FK to violate, so an unknown ticker selects nothing and
-- inserts nothing -- the silent skip, on purpose. Its only `from` is `stocks`:
-- `new.ticker` is the row being inserted, so no movement table is read here.
insert into public.user_stocks (user_id, stock_id)
select new.user_id, s.id from public.stocks s where s.ticker = new.ticker
on conflict do nothing;
```

The ordered migration, the collation change and the backfill are in the PRD's appendix verbatim.
Follow its order: it contains a trap that silently produces a nullable `ticker`. No index is
added on the movement tables, and the appendix says why.

## Acceptance criteria

- [ ] `stocks` is keyed by a uuid, and `ticker` is both UNIQUE and NOT NULL - dropping the old
      primary key removes `ticker`'s implicit NOT NULL, which has to be restored explicitly
- [ ] `ticker` compares byte-wise rather than through a linguistic collation
- [ ] `resolve-stock` still upserts successfully - its conflict target must still exist
- [ ] `user_stocks` has row-level security on, a read policy scoped to its owner, and **no**
      insert, update or delete policy
- [ ] Saving a **Compra** for a ticker the **Perfil** has never held produces exactly one link
- [ ] Selling a position in full leaves its link in place, without firing the trigger at all
- [ ] Saving a **Dividendo** for a symbol absent from `stocks` saves the **Dividendo**, creates
      no link, and surfaces no error
- [ ] A second **Perfil** reading the membership sees only its own rows
- [ ] After the backfill, every ticker with a **Compra** or a **Dividendo** has a link
- [ ] Re-running the backfill changes nothing
- [ ] The app is unchanged throughout - the unfiltered read still works, because this slice
      touches no client code

## Blocked by

None - can start immediately.
