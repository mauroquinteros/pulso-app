# 03 - A deposit is saved only when Postgres says so

Type: **AFK** - every decision is settled in the PRD and ADR 0010.

## Parent

`.scratch/history-persistence/PRD.md`

## What to build

Recording a **Depósito** writes a row to `movement_cash` and waits for it. This is the slice
that makes the app worth recording anything into: save a deposit, kill the app, reopen it, and
the deposit - and the **Efectivo** it created - are still there.

**The save waits.** Tapping **Guardar movimiento** puts the button into a pending state and
holds it until Postgres acknowledges the insert. On success the movement joins the History, the
success haptic fires, and the form dismisses. On failure the form stays open, showing what went
wrong, with every typed value still in place.

There is no optimistic write. The store is the sole input to the engine, so a movement the
database never received is not a pending write - it is a **History that lies**, in the one way
nothing downstream can detect. A failed optimistic deposit overstates **Cash**, and the Compra
form's funds gate then trusts that figure.

**The store receives the row Postgres returned, never the object the form built.** The insert
selects the stored row back and maps it through the *same* row mapper the read path uses. A
**Movement** therefore comes into existence exactly one way - a row from Postgres through the
mapper - rather than two ways that can silently disagree. The form does not produce a Movement;
it produces the fields for one.

**`createdAt` comes from the database's clock.** The insert omits `created_at` and lets the
column default fire. This is not tidiness: `createdAt` is the tiebreaker for movements sharing an
`executionDate`, so it orders **Average Cost** and **Realized P&L** and gates the Venta form's
sellable-shares calculation. A tiebreaker drawn from whichever phone recorded the movement does
not reliably break ties. Consequently the deposit view-model stops emitting `createdAt`, its
existing tests move with that change, and the injected movement dependencies narrow from
`{ id, now }` to `{ id }`.

**Ids are client-generated UUIDs from `expo-crypto`.** All three `id` columns are
`uuid NOT NULL` with **no default** - verified against the live database - so the client must
supply one. Expo's runtime does not polyfill `crypto`, so `expo-crypto`'s `randomUUID()` is the
source; the existing injected-id seam means this is a one-line change that keeps the view-model
tests deterministic.

**The id is minted once per form session, not once per tap.** If an insert succeeds but the
response is lost, a second tap must carry the same id so it cannot become a second deposit. This
is what makes the retry-safety real rather than claimed.

**The write module keeps two exports, permanently** - the reader from issue 02 and a single
`saveMovement`, not one save function per movement type. The read side already spans all three
tables behind one function; the write side is symmetric, and ADR 0006 is explicit that the
three-table split is a storage fact the domain does not follow. This slice implements only the
`movement_cash` branch; later slices add their own branch rather than a new export.

`saveMovement` cannot take a `Movement`, since the form no longer produces one. It takes a
Movement-minus-`createdAt`, which needs a **distributive** conditional type - a plain `Omit`
across the union collapses the five variants into one wide object where every field is optional
and the discriminated union stops discriminating:

```ts
type NewMovement<M = Movement> = M extends Movement ? Omit<M, "createdAt"> : never
```

**One existing bug this slice must fix.** The shared save button guards double taps with a ref
that is a **one-way latch - it never resets**. That is correct today because saving always
dismisses. With a save that can fail and leave the form open, the button would be permanently
dead. It resets on failure.

**Saving becomes an event on the History's state machine, not a second writer.**
Issue 02 left `addMovement` writing the `movements` array directly while the reducer owns both
that array and the status. Two writers to one fact is how they drift. Replace it with a
`movementSaved` event the reducer handles, so the History has exactly one writer and the rule
"a movement can only join a History that is in hand" falls out of the reducer rather than being
remembered at the call site. A `movementSaved` arriving in any status but `ready` is ignored.

**Note on where the form lives.** The add-movement modal is a root `Stack` screen, so it sits
*outside* `RequireHistory` rather than below it. It is only reachable from tabs that already
have a ready History, so this is not a bug today - but it does mean the form is not itself
covered by the guarantee that a History is in hand, and it must not assume otherwise.

## Acceptance criteria

- [x] Saving a deposit inserts into `movement_cash` and the form does not dismiss until Postgres
      acknowledges it
- [x] The button shows a pending state while the insert is in flight and cannot be tapped twice
- [x] On failure the form stays open, states that the save failed, and preserves the amount,
      transfer fee and date the user typed
- [x] After a failure the button is tappable again
- [x] Tapping **Guardar** again after a failure records the deposit **once**, never twice
- [x] The movement added to the store is built from the row Postgres returned, through the same
      mapper the read path uses
- [x] `created_at` is not sent on insert; the stored value comes from the database
- [x] Ids are UUIDs from `expo-crypto`, minted once per form session
- [x] A saved deposit appears immediately in Movimientos and changes **Efectivo** on Inicio
- [x] Killing and reopening the app shows the deposit still there, with the same **Efectivo**
- [x] The deposit's `transfer_fee` is stored, so **Aportado** stays distinct from **Efectivo**
- [x] The deposit view-model's existing tests are updated for the loss of `createdAt`
- [x] `movements` has exactly one writer: the reducer. `addMovement` no longer sets it directly
- [x] A `movementSaved` event in any status but `ready` leaves the state untouched
- [x] `npx tsc --noEmit` and the full test suite pass

## Blocked by

- `.scratch/history-persistence/issues/02-the-history-is-read-from-its-three-tables.md`

## Closed

Verified on a device and against the live table. A recorded deposit produced exactly one row:
`amount 1000`, `transfer_fee 6.5`, `execution_date 2026-08-12` unshifted, `created_at` from the
server's clock, and `user_id` filled by the column default rather than sent by the client - so
ADR 0010 and CONTEXT.md's "a Movement carries no owner" both hold at the boundary. The deposit
and the Efectivo it created survive a kill and reopen.

Double-tapping Guardar records one deposit. The failure path keeps every typed value and leaves
the button usable, which is the one-way latch fixed here.

One change to what this issue specified: **a duplicate id is answered with the row it already
wrote, not with a refusal.** The id is minted once per form session, so a `23505` can only be
this save's own first attempt landing after its response was lost. Reporting that as a failure
is how a *real* duplicate gets made - told it did not save, the natural thing to do is type the
deposit again, minting a new id and writing a second row. The client-generated id made the
mechanical retry safe; this is what makes the human one safe.

One criterion was written wrong and could not be met as stated: *"a buy's NULL regulatory_fees
becomes 0"*. `BuyMovement` has no such field and ADR 0006 says only a sell has one, so there was
nowhere for the 0 to land. Implemented as: a buy maps with the key absent, and the `?? 0` guard
sits on the sell branch, the only place the column is read. Both readings are tested.
