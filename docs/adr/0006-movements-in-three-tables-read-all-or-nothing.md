# Movements are stored in three tables, and the history is read all-or-nothing

A **Movement** is one domain type with five variants, but it is persisted in **three** tables grouped by the only axis the domain actually has — _does this movement name a ticker?_ — giving `movement_trades` (buy, sell), `movement_dividends`, and `movement_cash` (deposit, withdrawal). The domain does not follow: the `Movement` union, the engine, and every view-model stay exactly as they are, with three row mappers as the only things that know a table exists. Because the user's history is then assembled from three reads, **those reads must succeed or fail as a unit** — a partial merge yields a history that is not smaller but _wrong_, and nothing downstream can tell.

## Considered Options

- **One flat table with five CHECK constraints.** The whole history in one `select`, one RLS policy, one insert path, one migration surface — at the cost of a wide table where most columns are NULL for most rows and where the shape of each variant lives only in the constraints. Rejected because the grouped schema is self-documenting and absorbs a sixth movement type gracefully, which matters more than it looks: [ADR 0002](0002-scope-boundaries-v1.md) excludes corporate actions and share transfers on the strength of a single user's holdings, and that argument weakens as other people's portfolios enter.
- **Five tables, one per variant.** Rejected: within each pair the columns genuinely coincide, so this is the three-table schema split twice for no gain.
- **Two tables, ticker vs. no ticker.** Rejected: a dividend shares exactly one column with a trade — the ticker. No shares, no execution price, no commission. Folding it in leaves that table nearly as NULL-riddled as the flat one.
- **One table with a `type` column and a JSONB payload.** Rejected as the opposite of the independence being sought: it makes the database a passive mirror of the domain's shape with no rules of its own. Each side should do _its own_ job well, and the database's job includes refusing a deposit that carries a ticker.

Notably, **performance decided nothing.** At this scale — hundreds of rows per **Perfil** — it would have been an invented reason.

## Consequences

- **Three `user_id` columns and three RLS policies** (`using` _and_ `with check` on each), with `default auth.uid()` supplying the owner. A Movement still carries no owner in the domain; ownership is established on write and enforced on read.
- **Ids must be client-generated UUIDs, not per-table sequences.** A movement's detail route resolves it by searching the already-merged list, so two tables each owning an id `1` would render the wrong movement. Client-side UUIDs also make an insert idempotent.
- **No `UNION` and no view are needed.** The database never sorts and never filters here — every screen reads the whole history and narrows it in memory — so the client issues three selects and concatenates.
- **`regulatory_fees` is the schema's only nullable column**, since only a sell has one.
- **The all-or-nothing rule is not a nicety.** If `movement_trades` arrives and `movement_cash` does not, every deposit vanishes while every buy still subtracts its cost: **Cash** goes deeply negative, **Net Contributions** collapses, and Total Return % divides by a **Peak Contributions** near zero. If `movement_dividends` fails, positions look untouched while their income disappears silently. The engine cannot detect this and must not try — it is correct for whatever list it is handed; the list is what lies.
- **A failed read is a fault, not a known condition.** Offline (no connectivity) renders the cached history, which degrades honestly on its own: without prices, holdings are flagged missing and excluded from **Total Portfolio Value**, while **Cash**, cost basis and the movements list stay correct. A read that fails while connected shows an error screen with retry. The two are deliberately different screens, and the cached history is never described as _stale_ — that word is reserved for prices.
