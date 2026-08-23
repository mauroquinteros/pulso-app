# 01 - A Venta is written to Postgres

Type: **AFK** - client only; `movement_trades`, its constraints and its policies are already
applied. No migration, and nothing left to decide.

## Parent

`.scratch/sell-movement/PRD.md`

## What to build

**Venta** opens from the movement picker, and **Guardar movimiento** writes to
`movement_trades`. The save waits for Postgres and nothing is optimistic: the **Movement** that
joins the **History** is built from the row the database stored, so `createdAt` arrives from the
database's clock. A save in flight leaves the button inert; a save that fails says so and leaves
**Símbolo**, **Acciones**, **Precio**, **Comisión**, **Impuestos** and **Fecha** exactly as
typed, with nothing to roll back because nothing was written.

The id is minted **once per form session, not once per tap**, so a retry after a lost response
carries the first attempt's id and the database refuses the duplicate rather than recording a
second sale.

**Why the clock matters more here than anywhere else.** `createdAt` is the chronological
tiebreaker between two movements sharing an `executionDate`. For a deposit it orders two
movements whose **Cash Impact** is order-independent anyway. For a sell it chooses the **Average
Cost** the sale is measured against, and with it the **Realized P&L** and every later Average
Cost for that ticker. A sell ordered before its same-day buy meets an Average Cost of zero and
fabricates the whole proceeds as gain (ADR `0010`).

**This is the last form, and three things end with it.**

1. **The write path gains a new destination.** A sell is the first type since the deposit to
   need its own branch - every other slice only had to stop being refused. It shares
   `movement_trades` and its mapper with the buy but **not** its row: a buy **omits**
   `regulatory_fees` so the column default supplies the NULL that
   `regulatory_fees_belong_to_sells` requires of it, while a sell must **send** the column,
   including `0` when no **Impuestos** were typed. The sell branch is therefore not a copy of
   the buy branch with a field added.

2. **The refusal machinery is deleted.** With the sell writable there is no movement the app can
   construct that the write path will not store, so the runtime guard naming the unwritable
   types, its `unwritten_type` failure code and the narrowed writable-movement type all go, and
   the destination function is widened to take every movement.

3. **The picker loses its *Pronto* machinery.** No row is disabled any more, so the disabled
   flag, the tag it rendered, the non-pressable branch and their styles are removed. The press
   handler becomes required rather than optional. ADR `0002` is what makes this safe: shares
   enter only via a buy and leave only via a sell, with no corporate actions and no transfers,
   so the five types are the closed set and *Pronto* has no future user.

**What must NOT change.** This slice deletes more than any before it, so the boundaries are
explicit:

- **No exhaustiveness check replaces the deleted guard.** The destination function's final
  branch is not a default - the compiler has narrowed it to the two cash movements, which is why
  it can reach for their fields. Widening the input type *is* the guard: a type with no branch
  falls through to one that does not fit and fails to compile, which is exactly what forces the
  sell branch to exist. An `assertNever` adds nothing and would put a `throw` in a file whose
  stated contract is that nothing throws out of it.
- **The final branch keeps its shape.** Deposit and withdrawal continue to share one unnamed
  branch. Do not give them branches of their own.
- **The shares gate stays date-qualified.** The ceiling remains the most shares a sale dated
  `executionDate` could take without driving the position negative anywhere in the replay. ADR
  `0005` draws this line on purpose - the *cash* gate is not date-qualified, the *shares* gate
  is - and this slice does not move it.
- **The engine's oversell clamp stays.** It is the engine's own defence against an incoherent
  history and is not made redundant by the form's gate.
- **A fully exited position still disappears from Mis Activos and Portafolio.** Accepted and
  recorded in the tech-debt backlog; do not repair it here.

## Acceptance criteria

- [ ] The **Venta** row in the OPERACIONES group is active; tapping it opens the form
- [ ] **No row in the picker renders a *Pronto* tag**, and the disabled flag, its render branch
      and its styles are gone; the press handler is required rather than optional
- [ ] The sell builder returns the fields of a sell with **no `createdAt`**, and its dependencies
      are an injected id alone - no clock
- [ ] The write path has a **sell branch** that sends `regulatory_fees`, including `0` when no
      Impuestos were typed
- [ ] The buy branch still **omits** `regulatory_fees`, so the column's NULL is what lands
- [ ] The refusal guard, its `unwritten_type` failure code and the narrowed writable-movement
      type are **deleted**; the destination function takes every movement
- [ ] **No `assertNever` or equivalent runtime check** is added, and nothing in the write path
      throws
- [ ] Deposit and withdrawal still share one unnamed final branch
- [ ] **Guardar movimiento** awaits the write path; nothing joins the store before Postgres
      answers
- [ ] While the save is in flight the button is inert and shows its pending state
- [ ] On failure: one line of Spanish above the button, every field left exactly as typed, and no
      row written
- [ ] On success: the Movement that joins the store is built from the row the database returned,
      a success haptic fires, and the modal dismisses to **Inicio**
- [ ] `created_at` is never sent in the insert, so the stored instant is the database's
- [ ] The id is minted **once per form session**: two taps, or a retry after a lost response,
      record **one** sale
- [ ] A sale recorded on the same day as a buy is ordered **after** it, so that day's shares are
      sellable
- [ ] **Inicio** re-derives with no manual refresh: **Efectivo** rises by the proceeds,
      **Realizado** shows the gain, and the position shrinks or disappears
- [ ] Selling part of a position leaves its **Average Cost** unchanged; closing one entirely
      resets it to zero
- [ ] The shares gate is unchanged and still date-qualified; the engine's oversell clamp is
      untouched
- [ ] The sell view model's summary tests are unchanged; its builder tests drop the `createdAt`
      assertion and gain a named test that the builder **emits no `createdAt`**
- [ ] One new write-path test: a sell is written to `movement_trades` **with `regulatory_fees`
      present in the payload** - the mistake it guards is copying the adjacent buy branch and
      inheriting its deliberate omission, which the constraint rejects at runtime and TypeScript
      cannot see
- [ ] The test asserting the write path refuses a type it has no branch for is **deleted**, and
      nothing replaces it
- [ ] The sale survives a force-quit and relaunch, and leaves with the Perfil on sign-out
- [ ] `npm test` green, `tsc --noEmit` clean, `npx prettier --check` clean on every touched file

## Blocked by

None - can start immediately.
