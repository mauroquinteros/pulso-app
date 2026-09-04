# 02 - The price read is scoped to the Perfil

Type: **AFK** - client only. No migration, no live project. The whole slice is six lines and a
test helper, and `npm test` is the verdict.

## Parent

`.scratch/user-stocks/PRD.md` - decisions in `docs/adr/0015-a-perfil-reads-only-the-stocks-it-has-movements-in.md`

## What to build

The app asks for the **Quotes** of the **Stocks** this **Perfil** has **Movements** in, instead
of every **Quote** the database holds.

It stays **one request that waits for nothing**. The filter is resolved by the database through
the membership from issue 01, so the price read still does not wait for the **History** - which
is the whole reason ADR 0011 refused to filter in the first place, and the property most likely
to be lost by someone "simplifying" this later.

Nothing above the data-access boundary changes. The read still answers with **Stocks** keyed by
**ticker**, as domain objects, so the store, the derivation engine, the hooks and every screen
are untouched. What moves is the wire shape: rows arrive with the **Stock** nested inside its
membership row, and the mapper that already sits at that boundary unwraps them. No second
mapper - one property access does not earn a module (`AGENTS.md` rule 2).

**The join must be declared inner.** Filtering the nested resource of an outer join removes the
nested object but keeps its parent, so the price filter silently stops filtering and unpriced
rows come back as empty shells. This is the single detail most likely to be got wrong and to
pass review.

A **Perfil** with no **Movements** now gets an empty answer, which is every new **Perfil**'s
first session. That is a completed read over an empty set - not a failure, not an error screen.

One accepted regression, from ADR 0015, which is **not** to be coded around: a **Stock**
confirmed in the **Compra** form but not yet saved lives only in memory, so backgrounding the
app and returning before saving drops it from the map and the new **Holding** reads "sin
precio" until the next read. A missing price, not a wrong one, on the path that has always
existed.

## Acceptance criteria

- [ ] The read's signature and return type are unchanged, and no file outside the data-access
      module is modified
- [ ] Only **Stocks** the **Perfil** has **Movements** in come back
- [ ] A **Stock** with no price is still absent from the answer
- [ ] A **Perfil** with no **Movements** gets a completed read over an empty set, not a failure
- [ ] The retry against a token the server reads as future-dated still fires, once
- [ ] A failed read still leaves the **Quotes** already in hand on screen
- [ ] The join is inner - a **Stock** filtered out by price removes its whole row rather than
      arriving hollow
- [ ] The existing data-access tests pass with a single change to the helper that stages a
      response; the row fixtures still describe the domain row
- [ ] No new test is added at this boundary - the behaviour under test did not change

## Blocked by

`.scratch/user-stocks/issues/01-user-stocks-exists-and-fills-itself.md` - hard dependency.
Reversing the order breaks the app: the membership would not exist.
