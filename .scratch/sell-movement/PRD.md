# PRD — The Venta becomes real (the sell slice)

**Feature:** `sell-movement`
**Implements:** nothing new. No ADR — like the withdrawal, every decision in it was already
written down.
**Respects:** `0001` (Average Cost is a moving average, and Realized P&L is measured against
it), `0004` (executionDate is a calendar date), `0005` (the cash gate is not date-qualified —
and its closing note that the *shares* gate is, and stays so), `0006` (three tables, read
all-or-nothing), `0007` (edits and deletes do not revalidate history), `0010` (a movement is
saved only when the database says so)
**Supersedes:** `.scratch/sell-ux/PRD.md` — its *Out of Scope* section, which defers
persistence, auth and a real `userId` — and the equivalent sections of
`.scratch/sell-ux/UX.md`. The rest of both still stands: the screen they specify is built,
and this slice does not touch its layout, copy or fields.
**Depends on:** the buy slice — shares have to exist before they can be sold — and the four
save slices before it, whose lifecycle this one copies
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`)
**Scope:** a **Venta** can be recorded and is written to `movement_trades`; **Realized P&L**
becomes reachable from user input for the first time; the picker's last *Pronto* row goes, and
the write path's refusal machinery goes with it

---

## Problem Statement

**You can buy into Pulso and you cannot sell out of it.**

**Venta** sits in the picker marked *Pronto* and cannot be opened. The form behind it is
finished — a **Símbolo**, an **Acciones** field with the sellable quantity printed beside its
label, a **Precio**, a **Comisión** and **Impuestos**, a live **Monto bruto** and **Total a
recibir**, and a gate that refuses more shares than the position held *on the chosen date*.
Its **Guardar movimiento** leads nowhere: it commits to an in-memory store that Postgres never
hears about, and stamps the movement with a `createdAt` read from the phone's clock.

**The Venta is the one type the write path turns away at the door.** Every other movement has
had only to stop being refused; a sell has no branch in the write path at all — no table, no
row, no mapper — and is rejected before any insert is attempted. It is the last type still
named in that refusal, and the only one whose slice has to add a destination rather than merely
delete a line.

**Three figures have never been reachable from anything a user typed.** All of them come from
a sell and from nothing else:

- **Realized P&L** — the gross locked-in gain, `(sale price − Average Cost at the time of sale)
  × shares sold`. **Realizado** on Inicio has only ever been a figure the engine could compute
  and no user could produce.
- **The realized component of Total Return** — one of the four the headline breaks out, and the
  one that has always been zero.
- **The Average Cost reset on a full exit.** ADR `0001` specifies that Average Cost "resets to
  zero when the position is fully closed", and no user has ever been able to close one.

Each is built and covered by tests written against a movement type nothing could create. The
sell is what turns three engine behaviours into things a person can cause.

## Solution

**A Venta can be recorded, and the position it closes is really closed.**

Saving a sell waits for Postgres. Nothing is optimistic: the **Movement** that joins your
**History** is built from the row the database stored, so `createdAt` comes from the database's
clock — which matters more here than anywhere else, because it is the tiebreaker that orders a
sell against a same-day buy, and that order decides the **Average Cost** the sale is measured
against. A save that fails says so and leaves every field as typed. Recording the same form
twice cannot record two sells, because the id is minted once per form session.

**The refusal disappears rather than shrinking.** With the sell writable there is no movement
type the app can build and the write path will not store, so the guard, its failure code and
the narrowed type it defended are all deleted. What replaces them is nothing: the destination
function's type is widened to every movement, and the compiler enforces from then on what a
hand-maintained list of type strings enforced before.

**The picker's last *Pronto* row lights up, and the machinery behind it goes.** No row is
disabled any more, and ADR `0002` closes the type list — shares enter only via a buy and leave
only via a sell, with no corporate actions and no transfers — so there is no sixth type coming
that would need the tag back.

From the user's perspective:

> tap `+` -> pick **"Venta"** -> type the **Símbolo**, see how many **Acciones** are sellable ->
> fill Precio / Comisión / Impuestos / Fecha -> watch **Total a recibir** update live ->
> **Guardar movimiento** -> the modal dismisses -> **Efectivo** rises, the position shrinks or
> disappears, and **Realizado** shows a real number for the first time.

## User Stories

1. As a **Perfil**, I want to open **Venta** from the movement picker, so that I can record the
   sales that shaped my portfolio.
2. As a Perfil, I want no row in the picker marked *Pronto*, so that the app stops advertising
   things it cannot do.
3. As a Perfil, I want my sell written to Postgres before the form closes, so that a movement I
   was told was saved is still there tomorrow.
4. As a Perfil, I want a sell that failed to save to tell me so, so that I do not walk away
   believing a position is closed when it is not.
5. As a Perfil, I want a failed save to leave my **Símbolo**, **Acciones**, **Precio**,
   **Comisión**, **Impuestos** and **Fecha** exactly as typed, so that retrying costs me one tap
   and not six fields.
6. As a Perfil, I want tapping **Guardar** twice — or retrying after a lost connection — to
   record one sell and not two, so that I am not shown a position I still hold as gone.
7. As a Perfil, I want the save button to go inert while the save is in flight, so that I can
   see something is happening and cannot fire a second one.
8. As a Perfil, I want to sell by share count rather than by amount, so that I can record the
   sale the way my broker reports it.
9. As a Perfil, I want to see how many **Acciones** I can sell before I type anything, so that
   the ceiling is visible rather than discovered.
10. As a Perfil, I want to be stopped from selling more shares than I hold, so that my position
    can never go negative.
11. As a Perfil backdating a sale, I want the ceiling to be the shares I held **on that date**,
    so that a sale cannot outrun the buy that backs it.
12. As a Perfil backdating a sale, I want shares already spent by a *later* sell to be excluded,
    so that the same shares cannot be sold twice.
13. As a Perfil, I want to be told plainly when I never held a ticker at all, so that a typo in
    the **Símbolo** reads as a typo and not as a broken app.
14. As a Perfil, I want a different message when I held the ticker but not on the date I chose,
    so that I can tell a wrong symbol from a wrong date.
15. As a Perfil, I want a live **Monto bruto** and **Total a recibir**, so that I can see both
    the trade principal and what actually lands in my **Cash**.
16. As a Perfil, I want **Comisión** and **Impuestos** both subtracted from the proceeds, so
    that the figure I see is the one that reaches my **Buying Power**.
17. As a Perfil, I want a sale whose fees exceed its **Gross Amount** refused, so that I cannot
    record a sale that pays me less than nothing.
18. As a Perfil, I want field errors to appear only after I leave a field, so that the form does
    not shout at me while I am still typing.
19. As a Perfil, I want the **Fecha** to default to today and refuse the future, so that the
    common case needs no interaction and I cannot record a sale that has not happened.
20. As a Perfil, I want the date I choose to be the day the sale happened, unshifted by wherever
    my phone is, so that a sale dated the 3rd is never filed on the 2nd.
21. As a Perfil, I want a sell recorded on the same day as a buy to be ordered after it, so that
    the shares I bought that morning are available to sell that afternoon.
22. As a Perfil, I want my sale measured against the **Average Cost** at the time of sale, so
    that my **Realized P&L** reflects what I actually paid for those shares.
23. As a Perfil, I want **Realizado** on Inicio to finally show a real figure, so that I can see
    the gains I have actually locked in.
24. As a Perfil, I want my realized gain to appear as its own component of **Total Return**, so
    that I can tell locked-in gains from paper ones.
25. As a Perfil, I want my sale's **Comisión** and **Impuestos** to erode **Total Return** by
    their full amount, so that the cost of trading is visible in my performance.
26. As a Perfil, I want selling part of a position to leave its **Average Cost** unchanged, so
    that a partial sale does not distort what I paid for the shares I still hold.
27. As a Perfil, I want closing a position entirely to reset its **Average Cost** to zero, so
    that a later re-entry starts from what I pay then, not from what I paid years ago.
28. As a Perfil, I want the proceeds to raise my **Cash**, so that I can put them to work on
    another **Compra** without recording a deposit.
29. As a Perfil, I want my sell to appear in the movements list with its **Cash Impact**, so
    that the list and the **Buying Power** it explains can never drift apart.
30. As a Perfil, I want to open my sell and see a receipt whose lines add up to its total, so
    that I can check the app's arithmetic against my broker's.
31. As a Perfil who signs out, I want my sell to leave with me, so that the next Perfil to use
    the phone sees their own **History** and not mine.

## Implementation Decisions

### The sell is built without a clock

The sell view model's builder stops producing a **Movement** and starts producing the *fields*
of one: `createdAt` leaves its return type, and the clock generator leaves its dependencies,
reducing them to an injected id. Its dependencies interface stays local to the view model
rather than importing a shared one, as all five do.

This matters more for a sell than for any other type. `createdAt` is the chronological
tiebreaker between two movements sharing an `executionDate`, and for a sell that tiebreaker is
load-bearing: a sell ordered before its same-day buy meets an **Average Cost** of zero and
fabricates the whole proceeds as **Realized P&L**. One clock, the database's (ADR `0010`).

### The form adopts the save lifecycle the other four already run

Dependencies held in screen state so the id is minted **once per form session rather than once
per tap**; an asynchronous save handler that awaits the write path; a pending flag driving the
button's spinner and keeping it inert; a failure flag surfacing one line of Spanish above the
button with every field left as typed; and, only on success, the returned Movement joining the
store, the haptic firing and the modal dismissing.

The once-per-session id is what makes a retry safe rather than merely permitted: a second tap
after a lost response carries the first attempt's id, the database refuses the duplicate, and
the write path answers with the row already stored.

### The write path gains its sell branch, and `regulatory_fees` is sent rather than omitted

The sell is the first type since the deposit to need a **new destination**. It shares
`movement_trades` and its mapper with the buy, but not its row: the buy **omits**
`regulatory_fees` so the column default supplies the NULL that `regulatory_fees_belong_to_sells`
requires of it, while a sell must **send** the column, including `0` when the user typed no
**Impuestos**.

That asymmetry is the domain distinction the mapper already makes coming back: a buy has no
regulatory fees *at all* — not zero of them — and a sell has however many it has, possibly zero.
It also means the sell branch cannot be a copy of the buy branch with a field added, which is
exactly the mistake the new test exists to catch.

The destination function keeps its existing shape: named branches for the types that need their
own row, and a final unnamed branch that the compiler has narrowed to deposit-and-withdrawal,
which share a row exactly. After this slice that is **five types across four branches and three
tables** — `movement_trades` carries two branches for one table, `movement_cash` one branch for
two types. What decides a branch is the row shape, not the table.

### The refusal machinery is deleted, and the compiler takes over

With the sell writable there is no movement the app can construct that the write path will not
store. The runtime guard naming the unwritable types, its `unwritten_type` failure code and the
narrowed writable-movement type are all removed, and the destination function is widened to take
every movement.

**No exhaustiveness check replaces them, deliberately.** The function's final branch is not a
default — it is a branch the compiler has narrowed, which is why it can reach for a cash
movement's fields. Widening the input type *is* the guard: a type with no branch falls through
to one that does not fit it and fails to compile, which is precisely what forces the sell branch
to exist. An `assertNever` would add nothing the narrowing does not already do, and would put a
`throw` in a file whose stated contract is that nothing throws out of it — every refusal there
travels as a return value, because `supabase-js` reports failures as values and every caller is
written to that.

The residual gap is named and accepted: a hypothetical sixth type that *happened* to carry both
of a cash movement's fields would typecheck at the final branch and be written to the wrong
table. That requires reversing ADR `0002` and the new type structurally matching a cash
movement.

### The picker loses its *Pronto* machinery

Enabling the sell row leaves no disabled row, so the disabled flag, the tag it rendered, the
non-pressable branch and the three styles behind them are removed — an orphan **this change
creates**, which is the case `AGENTS.md` says to clean up rather than the pre-existing dead code
it says to leave. The press handler becomes required rather than optional, closing a real gap:
today a row can be enabled with no handler and silently do nothing when tapped.

ADR `0002` is what makes this safe rather than optimistic. Shares enter only via a buy and leave
only via a sell; there are no corporate actions and no transfers. The five types are the closed
set, so *Pronto* has no future user rather than merely no current one.

### The shares gate is unchanged, and stays date-qualified

The form's ceiling remains the most shares a sale dated `executionDate` could take without
driving the position negative anywhere in the replay — the minimum of the shares held as of that
date and the shares held after every later movement. ADR `0005` draws this line explicitly: the
**cash** gate is not date-qualified because Cash is an order-independent running sum, while the
**shares** gate is, because shares feed **Realized P&L**, which is built by walking movements in
date order. This slice does not move that line in either direction.

### A closed position disappears from the app, and that is accepted

Selling a whole holding drives its share count to zero, and the engine lists only tickers with
shares remaining — so a fully exited ticker leaves **Mis Activos** and Portafolio, and since
those rows are the only routes to a stock's detail, that screen becomes unreachable for it. Its
**Realized P&L** still counts in the portfolio total; its movements remain in the list, each
still opening its own receipt.

This slice is what makes full exits reachable, so it is where the gap first has a consequence —
and it is **not** repaired here. The shares-remaining filter is load-bearing far beyond that
screen: **Cost Basis**, **Market Value**, the allocation percentages and Inicio's donut all
assume a holding is an *open* position. Recorded in the tech-debt backlog with its approach:
prefer leaving holdings alone and giving closed positions their own route.

## Testing Decisions

**What makes a good test here.** Tests assert external behaviour — the figures a view model
returns, the gate flags it raises, the payload the write path sends and the Movement it hands
back — never how any of it is arranged internally. No rendering, no navigation, no network.

**The sell view model.** Its summary half needs no change: the derived **Monto bruto** and
**Total a recibir**, the share gate against the sellable quantity, the fee ceiling and the
touched-field flags are all covered, and none of their rules move. The builder half loses its
`createdAt` assertion and gains the named test its four siblings carry — that the builder
**emits no `createdAt`, because the form does not own that clock**. Prior art: the deposit,
withdrawal, buy and dividend view model suites, which are this change already made four times.

**The write path — one new test, and this one has a threat model that holds.** A sell is written
to `movement_trades` **with `regulatory_fees` present in the payload**. The branch it must not
resemble sits directly above it: seven identical fields, the same table, the same mapper, and a
deliberate *omission* of the one column a sell is required to send. Copying the buy branch and
inheriting that omission is the single most likely mistake in this slice, and its consequence is
that `regulatory_fees_belong_to_sells` rejects **every** sell at runtime. TypeScript cannot see
it: the row is a string-keyed bag of values, where a missing key is not an error. The buy already
carries the mirror assertion — that it omits the column, so the database's NULL is what lands —
so this completes a pair rather than inventing a category.

**One test is deleted.** The assertion that the write path refuses a type it has no branch for
goes with the guard it describes. Nothing replaces it: there is no unwritable type left, and a
test standing in for the type system's job is worse than none.

**Not tested, and why.** The engine needs nothing — **Realized P&L**, the Average Cost reset on
a full exit, the oversell clamp and the date-qualified sellable quantity are all covered by
suites written before a sell could be created. Neither does the receipt, the movements list or
the row mapper, all three of which already have their sell cases.

## Out of Scope

- **Browsing a closed position.** Recorded in the tech-debt backlog, raised by this slice.
- **A Realized P&L preview on the form.** The sell PRD deferred it to Inicio and the receipt;
  unchanged here, and now that Realizado is real those are the screens that answer it.
- **Any change to the Venta screen's design.** Layout, fields, copy and the date picker are
  settled and shipped.
- **Extracting a shared save lifecycle.** Tracked in the backlog, which anticipates this slice
  as the fifth copy. Deliberately deferred again.
- **A "Vender todo" shortcut and a holdings selector for the Símbolo.** Both settled against in
  the sell PRD: free text plus a held-shares lookup, and a tracker's user knows the exact shares.
- **Editing or deleting a sell.** ADR `0007` settles that edits do not revalidate history — which
  is sharper for a sell than for anything else, since editing one silently re-derives every
  Average Cost after it.
- **An as-of-date cash gate.** Settled by ADR `0005`; the shares side is date-qualified and the
  cash side is not, on purpose.
- **Any offline write queue.** Rejected in ADR `0010` as far out of proportion.

## Further Notes

**The reconciliation stays intact.** A sale of `S` shares at `P` with fees `F`: **Cash** rises by
`P × S − F`, **Realized P&L** by `(P − Average Cost) × S` *before* fees, and **Total Return**
falls by `F`. Realized gains flow into Cash and are not re-counted as profit, so
`Cash + Market Value == Net Contributions + Total Return` still holds.

**This is the fifth and last form.** After it every movement type in `CONTEXT.md` can be
recorded, the picker has no disabled rows, and the write path stores everything the app can
build. It is also the largest of the five, and for a reason worth stating: every other slice only
had to stop being refused, while this one adds a destination, deletes the refusal that guarded
all of them, and retires the picker affordance that announced their absence.

**The tiebreaker is doing real work here for the first time.** For a deposit or a withdrawal,
`createdAt` orders two movements whose **Cash Impact** is order-independent anyway. For a sell it
chooses the **Average Cost** the sale is measured against, and with it the **Realized P&L** and
every later Average Cost for that ticker. ADR `0010`'s insistence on one clock stops being an
argument about tidiness and starts being an argument about a number on screen.

**Venta is the type most exposed to ADR `0007`.** Edits do not revalidate history, and a sell is
where that is sharpest: change one sell's share count and every Average Cost after it moves, with
nothing recomputing the gate that once allowed it. Worth remembering whenever editing is picked
up.
