# 01 - A Retiro is written to Postgres

Type: **AFK** - client only; the cash table already accepts the type, and the write path already
routes it. No migration, and nothing to decide.

## Parent

`.scratch/withdrawal-movement/PRD.md`

## What to build

**Retiro** opens from the movement picker, and **Guardar movimiento** writes to the cash table.
The save waits for Postgres and nothing is optimistic: the **Movement** that joins the **History**
is built from the row the database stored, so `createdAt` arrives from the database's clock rather
than from whichever phone happened to record the withdrawal. A save in flight leaves the button
inert; a save that fails says so and leaves the **Monto**, **Comisión** and **Fecha** exactly as
typed, with nothing written to roll back.

**Why this matters.** The form has been finished since its own slice and its Guardar leads nowhere -
it commits to an in-memory store that Postgres never hears about, and stamps the movement with a
`createdAt` read from the phone's clock. The code says so itself, in a comment left for this slice
to delete. Neither fault has ever reached a user, because the picker row is marked *Pronto* and
cannot be opened; both wake up the moment it is enabled, which is one line.

The id is minted **once per form session, not once per tap**, which is what makes a retry after a
lost response safe: the second attempt carries the first attempt's id and the database refuses the
duplicate rather than recording a second withdrawal and draining **Cash** twice. That refusal is
already handled by the write path, which reads the stored row back and answers with it.

**Three things that look like gaps and are not.** There is **no migration** - the cash table has
constrained `type` to deposit or withdrawal since it was created. There is **no change to the write
path** - its writable-movement union already includes the type, its cash branch already produces the
right table, row spelling and mapper, and its refusal list names **Venta** alone. And there is **no
change to the engine, the receipt or the movements list** - all three were built and tested against
a withdrawal during earlier slices, against a movement type nothing could yet create.

**What does change.** The withdrawal view model's builder stops producing a **Movement** and starts
producing the *fields* of one: `createdAt` leaves its return type and the clock generator leaves its
dependencies, reducing them to an injected id alone (ADR `0010`). The form adopts the save lifecycle
the Depósito, Compra and Dividendo forms already run, verbatim. And the picker's Retiro row is
enabled.

**The picker row is enabled unconditionally** - it does not react to the **Cash** the **Perfil**
holds. A Perfil with $0 needs no special handling, because the view model already closes the gate:
the save requires a Monto that is positive *and* no larger than the available Cash, so the button
never enables and the refusal names the figure. *Pronto* means the app cannot do this yet, which is
a fact about the app; having no cash is a fact about the Perfil, and rendering the second as the
first would tell a new user that withdrawals are not built.

**No validation moves.** The two rules a withdrawal must satisfy - a positive Monto, and a Comisión
below it - stay in the view model and are not mirrored into Postgres. See *Where a validation lives*
in `AGENTS.md`.

## Acceptance criteria

- [ ] The **Retiro** row in the EFECTIVO group is active (no *Pronto* tag); tapping it opens the form
- [ ] The withdrawal builder returns the fields of a withdrawal with **no `createdAt`**, and its
      dependencies are an injected id alone - no clock
- [ ] **Guardar movimiento** awaits the write path; nothing joins the store before Postgres answers
- [ ] While the save is in flight the button is inert and shows its pending state
- [ ] On failure: one line of Spanish above the button, every field left exactly as typed, and no
      row written
- [ ] On success: the **Movement** that joins the store is the one built from the row the database
      returned, a success haptic fires, and the modal dismisses to **Inicio**
- [ ] `createdAt` is never sent in the insert, so the stored instant is the database's
- [ ] The id is minted **once per form session**: tapping Guardar twice, or retrying after a lost
      response, records **one** withdrawal and not two
- [ ] **Inicio** re-derives with no manual refresh - **Efectivo** falls by the Monto, **Aportado**
      falls by `Monto - Comisión`, and **Valor total** follows
- [ ] The withdrawal survives a force-quit and relaunch, and leaves with the Perfil on sign-out
- [ ] The save gate is unchanged: Monto > 0, Comisión < Monto, Monto <= available **Cash**
- [ ] No migration, no change to the write path, and no change to the engine, receipt or movements
      list
- [ ] The withdrawal view model's summary tests are unchanged; its builder tests drop the
      `createdAt` assertion and gain a named test that the builder **emits no `createdAt`**, mirroring
      the deposit's
- [ ] One new write-path test: the withdrawal is **written to the cash table** - the only direct
      proof a Retiro can be written, since today it is exercised only transitively, through the
      branch it shares with the deposit
- [ ] `npm test` green and `tsc --noEmit` clean

## Blocked by

None - can start immediately.
