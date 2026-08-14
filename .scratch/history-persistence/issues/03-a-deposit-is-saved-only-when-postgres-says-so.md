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

## Acceptance criteria

- [ ] Saving a deposit inserts into `movement_cash` and the form does not dismiss until Postgres
      acknowledges it
- [ ] The button shows a pending state while the insert is in flight and cannot be tapped twice
- [ ] On failure the form stays open, states that the save failed, and preserves the amount,
      transfer fee and date the user typed
- [ ] After a failure the button is tappable again
- [ ] Tapping **Guardar** again after a failure records the deposit **once**, never twice
- [ ] The movement added to the store is built from the row Postgres returned, through the same
      mapper the read path uses
- [ ] `created_at` is not sent on insert; the stored value comes from the database
- [ ] Ids are UUIDs from `expo-crypto`, minted once per form session
- [ ] A saved deposit appears immediately in Movimientos and changes **Efectivo** on Inicio
- [ ] Killing and reopening the app shows the deposit still there, with the same **Efectivo**
- [ ] The deposit's `transfer_fee` is stored, so **Aportado** stays distinct from **Efectivo**
- [ ] The deposit view-model's existing tests are updated for the loss of `createdAt`
- [ ] `npx tsc --noEmit` and the full test suite pass

## Blocked by

- `.scratch/history-persistence/issues/02-the-history-is-read-from-its-three-tables.md`
