# A movement is saved only when the database says so

**Guardar movimiento** waits for the insert. The button enters a pending state,
and only once Postgres has acknowledged the row does the movement enter the
store, the success haptic fire, and the form dismiss. If the insert fails the
form stays open, showing the error, with everything the user typed still in it.
There is no optimistic write anywhere in the app.

This is the unfashionable choice. Mobile convention is to accept the tap, dismiss
immediately, and reconcile in the background — and for most apps that is right,
because the worst case is a post that has to be re-sent. Here the worst case is
different in kind.

## Why the usual trade does not apply

The store is the **sole** input to the engine. Every figure in Pulso — **Cash**,
**Cost Basis**, **Net Contributions**, **Total Return** — is derived from the
`Movement[]` and from nothing else, which is the whole point of
[`0006`](0006-movements-in-three-tables-read-all-or-nothing.md). So a movement
sitting in the store that Postgres never received is not a pending write. It is a
**History that lies**, and it lies in the one way `0006` says nothing downstream
can detect.

The cascade is concrete rather than theoretical. Suppose an optimistic buy fails
to insert. **Cash** is now understated by the full cost of a purchase that never
happened — and the buy form's own funds gate is computed against that figure. The
user is told they cannot afford something they can comfortably afford, on a screen
with no error on it anywhere. They relaunch, the phantom buy is gone, and the
number changes for no reason they can see. An optimistic deposit fails the same way
in reverse: Cash overstated, and the gate approves a purchase there is no money for.

This is also the rule the buy form already applies one field earlier.
[`0009`](0009-a-buy-is-blocked-until-its-symbol-is-confirmed.md) blocks the save
while a **Símbolo** check is in flight, on the stated grounds that _"accepting a tap
and then rejecting the save is a worse moment to learn the symbol is wrong than the
field turning red while the user is still looking at it."_ Accepting a tap and then
losing the whole movement is worse still. And `0009` already assumed this decision
in passing when it noted that _"saving a movement already requires the network,
because the movement is written to Postgres"_ — this ADR is that sentence made
deliberate.

## Considered Options

- **Optimistic write, reconcile in the background.** The fast, conventional
  choice, and it preserves exactly the feel the forms have today. Rejected: a
  failure leaves the screen and the database disagreeing about money, with no
  moment at which the user is told. A toast is not an answer — it is dismissible,
  missable, and gone before the consequence shows up.
- **Optimistic with rollback.** Closes the divergence honestly: on failure, remove
  the movement and surface a blocking error. Rejected for what it does to the user
  rather than to the data — a buy appears on Home, is watched for a second or two,
  and is then retracted by an error the user has already navigated away from. It
  also demands an undo path through code that today only knows how to add.
- **A durable write queue.** The only option that makes an offline save meaningful.
  Rejected as far out of proportion: `supabase-js` provides no primitive for it (see
  the amended `0006`), so it is a hand-rolled outbox with its own ordering and
  conflict rules, for an app that cannot render a **History** offline anyway.

## Consequences

- **Saving requires connectivity, and now visibly so.** Previously implied by
  `0009` for buys only; now true of every movement type, and true at the moment of
  the tap rather than at the next launch.
- **The save button gains a pending state**, and every form's `onSave` becomes
  async. `SaveButton` is shared by all five forms, so this lands once.
- **A retried save must not record the movement twice.** The client-generated UUID
  that [`0006`](0006-movements-in-three-tables-read-all-or-nothing.md) requires is
  what makes this safe: the id is minted before the request, so a save retried after
  a timeout carries the same id and cannot become a second buy. The id must be
  generated once per form session, not once per tap.
- **The store receives the row Postgres returned, never the object the form built.**
  The insert is `.insert(...).select().single()`, and the returned row goes through
  the **same** `mapRowToMovement` the read path uses. So a **Movement** comes into
  existence exactly one way — a row from Postgres through the mapper — rather than
  two ways that can disagree in silence. The form does not produce a Movement; it
  produces the fields for one.
- **`createdAt` therefore comes from the database's clock, not the device's.** The
  insert omits `created_at` and lets the column default fire. This is not tidiness:
  `createdAt` is the chronological tiebreaker for same-`executionDate` movements in
  `compareChronological`, so it orders **Average Cost** and **Realized P&L**, and it
  gates the sell form through `maxSellableAsOf`. A tiebreaker drawn from whichever
  phone happened to record the movement does not reliably break ties — two devices
  with a few seconds of skew order the same two movements differently, and the money
  figures move with them. One clock, the database's, is the only one that orders
  consistently. Consequently `build*Movement` no longer returns a complete Movement
  and `MovementDeps` narrows to the id alone.
- **The same rule will govern edits and deletes**, which `0007` has not yet had to
  answer. Deciding otherwise later means a form that blocks on create and not on
  update, which is harder to explain than either rule alone.
- **The failure is now the user's problem, on purpose.** A save that cannot reach
  Postgres ends with the user looking at their own unsaved data and deciding what to
  do. That is worse UX than a silent retry and better honesty, and honesty is the
  premise of the app.
