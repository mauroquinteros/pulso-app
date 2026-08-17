# 02 - A Holding is valued from the `stocks` table

Type: **AFK** - every decision is settled in ADR 0011; nothing here needs a look.

## Parent

`.scratch/real-quotes/PRD.md`

## What to build

The app stops reading prices from a hardcoded map and reads **Stocks** out of Postgres.

A **Quote** is a price together with the market moment it belongs to, and the two never travel
apart. A **Stock** is a ticker, a name and its Quote. The read asks for the whole `stocks` table,
filtered to rows that have a price, and it fires **when the tabs mount** - the one event that
covers a cold start and a fresh sign-in identically, because the session guard removes the tabs
from the tree on sign-out and mounts them again on sign-in. Tab switches do not fire it, and
neither does pushing a movement or stock detail.

The read is **independent of the History**. Both go out at the same moment and neither waits on
the other, which is why the `stocks` read carries no ticker filter: filtering to the **Perfil**'s
held tickers would mean deriving them from the History first and serialising the two reads. It
also **gates nothing** - a user with no Quote for anything still sees their **Movements**, their
**Efectivo** and their **History**, because a **Stock** is shared and sits outside the
all-or-nothing rule. So the trigger is a hook the tabs layout uses, not a wrapper component like
`RequireHistory`, which would read as a gate that forgot to gate.

Filtering on price is what makes a Quote **non-optional** everywhere above the boundary. A ticker
present in the map always has one; an unpriced Stock is simply absent and falls through the same
missing-price path the engine has always had. The guarantee lives in the query, so no branch has
to keep it true. A held ticker with no row at all is **not** a case to handle: ADR 0009 makes it
unreachable, since a **Compra** cannot be saved until its símbolo confirms and confirming writes
the row.

Two modules, named for what they do and mirroring the History exactly - one that reads the table
and hides the database completely, nothing throwing out of it, and one store that holds the
result and the read's status. The store also carries the lifecycle; there is no separate pure
reducer, because the reasons the History has one do not exist here. Sign-out clears the store -
**for freshness, not for privacy**. A Quote is shared and leaks nothing, but Quotes surviving into
a session whose own read fails would be shown as current with nothing able to say otherwise. The
comment has to say that, or the next reader concludes a Quote is Perfil-scoped and adds an owner
filter to a shared table.

The derivation engine's price map changes type; its logic does not. It goes on answering "given
these Stocks, what is the portfolio" and never learns a read exists.

The mock price map leaves the running app - this removes the last two production readers of
authored data. It stays as test data, because the portfolio summary derived from it is what makes
three invariants provable. The unused holdings export, dead before this work began, goes with it.

**How to see it work.** No **Compra** can be saved yet, so nothing on screen has a price to show.
Insert a buy row into `movement_trades` directly by SQL for a ticker that exists in `stocks`: the
History read already covers all three tables, so a real **Holding** appears and is valued from a
real Quote.

## Acceptance criteria

- [ ] `Quote` holds a price and its market moment; `Stock` holds a ticker, a name and a Quote,
      with the Quote non-optional
- [ ] The read asks for the whole table, filtered to rows that have a price
- [ ] The read fires when the tabs mount, and does not fire on tab switches or on navigating to a
      movement or stock detail
- [ ] The read fires again when a different **Perfil** signs in, without a relaunch
- [ ] The read runs in parallel with the History read and neither waits on the other
- [ ] The app renders normally while the read is in flight and if it fails outright - no spinner
      over the tabs, no error screen, **Movements** and **Efectivo** unaffected
- [ ] Column names from the database appear in no domain object
- [ ] Sign-out empties the Stock store, with a comment stating it is for freshness and not
      privacy
- [ ] The derivation engine's signature and behaviour are unchanged apart from the map's type
- [ ] Nothing in the running app imports the mock price map; the dead holdings export is gone
- [ ] The mock movement corpus and the summary derived from it still exist and still reconcile
- [ ] Store tests cover: a read in flight then Stocks in hand; a read in flight then a failure
      with nothing previously held; sign-out returning the store to its initial state
- [ ] With a buy row inserted by SQL for a ticker present in `stocks`, the **Holding** shows a
      **Market Value** matching that row's price
- [ ] Existing engine and view-model suites are updated for the new map type and pass unchanged
      in meaning
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

None - can start immediately.

## Closed

Verified on a device, partially: the Stocks read fires on cold start and again on
sign-out then sign-in, alongside the History read and without waiting on it. The
app renders normally throughout, and a Perfil with no Holdings sees no new UI.

**The criterion about a Holding's Market Value is NOT checked, deliberately.** It
asks for a buy row inserted by SQL; the user chose to verify the whole price path
in one pass once the Compra form persists, rather than through hand-inserted rows.
So this ships proven by `tsc` and the suite, not by eyes on a valued Holding. That
is a deferral, not an oversight, and it is the same gap issues 03, 04 and 05 carry.
