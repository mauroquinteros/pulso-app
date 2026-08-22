# PRD — The Retiro becomes real (the withdrawal slice)

**Feature:** `withdrawal-movement`
**Implements:** nothing new. This slice introduces **no ADR** — every decision in it was already
written down, which is itself the headline: the withdrawal is the first movement type to arrive
with its rules settled in advance.
**Respects:** `0003` (a deposit/withdrawal amount is the cash-side figure), `0004` (executionDate
is a calendar date), `0005` (the cash gate is not date-qualified), `0006` (three tables, read
all-or-nothing), `0010` (a movement is saved only when the database says so)
**Supersedes:** `.scratch/withdrawal-ux/PRD.md` — its *Out of Scope* section, which defers
persistence, auth and a real `userId` — and `.scratch/withdrawal-ux/UX.md` §3 (system fields),
§10 (save behavior) and §11 (state & data source). The rest of both documents still stands: the
screen they specify is built, and this slice does not touch its layout, copy or fields.
**Depends on:** the deposit slice — **Cash** has to exist before it can be withdrawn — and the buy
and dividend slices, which built the save lifecycle this one copies
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`)
**Scope:** a **Retiro** can be recorded and is written to `movement_cash`; **Cash**, **Net
Contributions** and **Total Return** re-derive on **Inicio** without a manual refresh

---

## Problem Statement

**You can put money into Pulso and you cannot take it out.**

**Retiro** sits in the picker marked *Pronto* and cannot be opened. The form behind it is
finished — a **Monto** with the available **Cash** printed beside its label, an optional
**Comisión**, a **Fecha** that defaults to today and refuses the future, a live *"Recibirás en tu
banco"*, touch-gated errors, and a gate that refuses a Monto larger than the Cash held. Its
**Guardar movimiento** leads nowhere. It commits to an in-memory store that Postgres never hears
about, and stamps the movement with a `createdAt` read from the phone's clock. The code says so
itself, in a comment left there for this slice to delete.

Neither fault has ever reached a user, because nothing can open the form. Both wake up the moment
the picker row is enabled, which is one line.

**The cash side of the account is one-directional.** A **Perfil** can fund the brokerage account
and can now spend that funding on a **Compra**, but the money can never leave. Every figure that
depends on money leaving is therefore unreachable from anything the user types: **Net
Contributions** can only rise, **Peak Contributions** can only equal it, and the **Total Return**
percentage's whole reason for dividing by Peak rather than Net — that a realized gain lets you
withdraw more than you deposited — describes a state the app cannot be put into. **Inicio** already
carries the tooltip that explains the divergence, built and tested, and no user has ever been able
to make it appear.

**The withdrawal is the second-thinnest movement and the last of the cash pair.** With Compra and
Dividendo now live, Retiro and Venta are what remain — and Retiro is by far the smaller, because
its engine arithmetic, its storage, its receipt and its list row were all built and tested during
earlier slices against a movement type nothing could yet create.

## Solution

**A Retiro can be recorded, and the money leaves for good.**

Saving a withdrawal waits for Postgres. Nothing is optimistic: the **Movement** that joins your
**History** is built from the row the database stored, so a Retiro you were told was saved is one
that is really there, and one that failed says so and leaves the **Monto**, **Comisión** and
**Fecha** exactly as you typed them. Recording the same form twice cannot record two withdrawals,
because the id is minted once per form session and the database refuses the duplicate. The
`createdAt` that orders two movements sharing a date comes from the database's clock, not from
whichever phone happened to be holding the form.

**Everything downstream already knows what a withdrawal is.** `movement_cash` accepts the type,
the write path routes it, the mappers read it back, the engine subtracts its Monto from **Cash**
and its `amount - fee` from **Net Contributions**, the movements list prints its **Cash Impact**,
and its receipt runs the arithmetic backwards from the bank up to the cash. None of that changes.
This slice is the shortest distance between a finished form and a real movement: enable the row,
stop supplying a clock, and wait for the answer.

From the user's perspective:

> tap `+` -> pick **"Retiro"** -> fill Monto / Comisión / Fecha -> watch **"Recibirás en tu banco"**
> update live -> **Guardar movimiento** -> the button goes inert while the row is written -> the
> modal dismisses -> **Inicio**'s **Valor total**, **Efectivo** and **Aportado** have all moved.

**And the last unreachable figure on Inicio becomes reachable.** A withdrawal is the only movement
that can pull **Net Contributions** below an earlier high-water mark, so it is the only one that
can make **Peak Contributions** differ from it — the exact case the **Total Return** percentage's
tooltip exists to explain.

## User Stories

1. As a **Perfil**, I want to open **Retiro** from the movement picker, so that I can record money
   I moved out of my brokerage account and back to my bank.
2. As a Perfil, I want the **Retiro** row to be active rather than marked *Pronto*, so that the
   picker stops telling me the app cannot do something it can.
3. As a Perfil, I want my withdrawal written to Postgres before the form closes, so that a
   movement I was told was saved is still there tomorrow.
4. As a Perfil, I want a withdrawal that failed to save to tell me so, so that I do not walk away
   believing my **Cash** is lower than it really is.
5. As a Perfil, I want a failed save to leave my **Monto**, **Comisión** and **Fecha** exactly as I
   typed them, so that retrying costs me one tap and not three fields.
6. As a Perfil, I want tapping **Guardar** twice — or retrying after a lost connection — to record
   one withdrawal and not two, so that my **Cash** is not silently drained twice.
7. As a Perfil, I want the save button to go inert while the save is in flight, so that I can see
   something is happening and cannot fire a second one.
8. As a Perfil, I want my **Monto** to mean the cash that leaves my **Buying Power**, so that the
   number I type matches how I think about a withdrawal.
9. As a Perfil, I want the **Comisión** subtracted from what I receive rather than added to what
   leaves, so that the fee reduces my bank deposit and not my brokerage cash.
10. As a Perfil, I want a live **"Recibirás en tu banco"** figure, so that I can see exactly what
    will land at my bank before I commit to the withdrawal.
11. As a Perfil, I want to be stopped from withdrawing more than my available **Cash**, so that my
    **Buying Power** never goes negative from a transfer the app said was fine.
12. As a Perfil, I want to be told how much **Cash** I actually have when I ask for too much, so
    that a refusal tells me the amount I can take instead of just saying no.
13. As a Perfil, I want to see my available **Cash** beside the **Monto** label before I type
    anything, so that the ceiling is visible rather than discovered.
14. As a Perfil, I want a **Comisión** equal to or larger than my **Monto** refused, so that I
    cannot record a withdrawal where nothing reaches my bank.
15. As a Perfil with no **Cash** at all, I want the save to stay closed and tell me why, so that I
    understand I need to record a deposit or a sale first.
16. As a Perfil, I want field errors to appear only after I leave a field, so that the form does
    not shout at me while I am still typing the number.
17. As a Perfil, I want the **Fecha** to default to today, so that recording today's withdrawal
    needs no interaction at all.
18. As a Perfil, I want the **Fecha** I choose to be the day the withdrawal happened, unshifted by
    wherever my phone is, so that a withdrawal dated the 3rd is never filed on the 2nd.
19. As a Perfil, I want two movements I recorded on the same day to stay in the order I recorded
    them, so that my **Average Cost** and **Realized P&L** do not shift between sessions.
20. As a Perfil, I want my withdrawal to lower **Cash** and adjust **Aportado** together, so that
    every derived figure moves at once and none of them disagree.
21. As a Perfil, I want the **Comisión** to erode my **Total Return** by its full amount, so that
    the cost of moving money is visible in my performance rather than hidden.
22. As a Perfil who has withdrawn more than I ever deposited, I want the **Total Return**
    percentage to stay meaningful, so that a successful year does not print an absurd number.
23. As a Perfil, I want to be told why that percentage is divided by something other than the
    **Aportado** on screen, so that two figures that look inconsistent explain themselves.
24. As a Perfil, I want my withdrawal to appear in the movements list with its **Cash Impact**, so
    that the list and the **Buying Power** it explains can never drift apart.
25. As a Perfil, I want to open my withdrawal and see a receipt whose lines add up, so that I can
    check the app's arithmetic against my broker's statement.
26. As a Perfil, I want **Inicio** to re-derive the moment the modal dismisses, so that I see the
    result of my withdrawal without pulling to refresh.
27. As a Perfil who signs out, I want my withdrawal to leave with me, so that the next Perfil to
    use the phone sees their own **History** and not mine.
28. As a Perfil, I want the Retiro to look and behave exactly like the Depósito, so that the two
    cash actions feel like one pair rather than two features.

## Implementation Decisions

### The withdrawal is built without a clock

The withdrawal view model's builder stops producing a **Movement** and starts producing the
*fields* of one: `createdAt` leaves its return type, and the `now` generator leaves its
dependencies, which reduces them to an injected id alone. That instant is the reducer's
chronological tiebreaker between two movements sharing an `executionDate`, so it orders **Average
Cost** and **Realized P&L** — and a tiebreaker read from whichever phone recorded the movement does
not reliably break ties (ADR `0010`). It is supplied by the column default when the row is stored.

The dependencies interface stays **local to the withdrawal view model** rather than importing the
shared one. All five view models declare their own, the two already persisting (deposit, buy) have
already shed `now` this way, and a view model that named a shared type would couple five modules
that today share only a shape.

### The form adopts the save lifecycle the other three already run

The withdrawal screen takes the lifecycle the deposit, buy and dividend forms run verbatim: the
dependencies are held in screen state so the id is minted **once per form session rather than once
per tap**; the save handler becomes asynchronous and awaits the write path; a pending flag drives
the button's spinner and keeps it inert; a failure flag surfaces one line of Spanish above the
button, leaving every field as typed; and only on success does the Movement returned by the
database join the store, the success haptic fire, and the modal dismiss.

The once-per-session id is what makes retrying safe rather than merely permitted. If the insert
lands but its response is lost, the second tap carries the id the first one used, the database
refuses the duplicate, and the write path answers with the row already stored — instead of
recording the withdrawal twice and draining **Cash** twice.

### The picker opens Retiro, unconditionally

The **Retiro** row's disabled flag is cleared and nothing else about the picker changes. In
particular the row does **not** react to the **Cash** the Perfil holds.

A Perfil with $0 needs no special handling, because the view model already closes the gate for
them: `saveEnabled` requires the Monto to be positive *and* no larger than the available Cash, so
the button never enables and the refusal names the figure. Making one row's availability depend on
a derived figure would mean the picker starts reading the portfolio, and the honest version of that
reads it for **Compra** (which is gated on Cash identically) and for **Venta** (which needs a
**Holding**) too — a picker that knows about the engine, to pre-empt a case the form already
explains.

There is also a domain reason. *Pronto* means **the app cannot do this yet**, which is a fact about
the app. *You have no cash* is a fact about the Perfil. Rendering the second as the first would tell
a new user that withdrawals are not built — the same category error `CONTEXT.md` refuses for a
**History** not yet read, one that could not be obtained, and the empty History of a Perfil who has
recorded nothing.

### Nothing is added to the write path, and nothing to the schema

Both of these look like gaps and are not, so they are recorded here to stop a future reader
searching for the missing piece.

**The write path already routes a withdrawal.** Its writable-movement union already includes the
type, its destination function's cash branch already produces the right table, row spelling and
mapper — the same branch the deposit takes, since the two differ only in the `type` string — and
its refusal list names sell alone. A withdrawal reaches `movement_cash` today; nothing has ever
been able to hand it one.

**The schema already accepts a withdrawal.** `movement_cash` constrains `type` to deposit or
withdrawal and has since the table was created. There is **no migration in this slice**.

### The validation stays in the view model, and no CHECK is added

The two rules a withdrawal must satisfy — a positive Monto, and a Comisión below it — live in the
view model and are not mirrored into Postgres. This is the repo-wide line, now written into
`AGENTS.md` under *Where a validation lives*: the three CHECKs the movement tables carry are all
**structural** (which type a row is, which columns that type may fill), and every rule about a
*value* — the dividend's tax ceiling, the buy's funds gate, the sell's held-shares gate — lives in
a `summarize*` function. The withdrawal is the fourth type to be built this way, not an exception
to three that were built otherwise.

The reasons, briefly: a structural constraint is what the row mappers read a row back through, so
the schema is the only place it can live; a value rule is policy that changes, and the Depósito's
own fee ceiling was already added and then deliberately dropped; and a CHECK on a value refuses for
a reason the user cannot act on, since the save button never enables for it. The condition that
reopens the question is a **second write path** — an edit screen, a bulk import, anything reaching
the write path without a form in front of it.

### The over-withdrawal gate is not date-qualified, deliberately

The gate compares the Monto against **current Cash**, not against the Cash held on the chosen
`executionDate`, and this slice does not change that. ADR `0005` settles it by name: **Cash** is an
order-independent running sum, so backdating a withdrawal to before its funding deposit leaves the
final Cash, holdings, **Realized P&L** and **Total Return** all correct. An as-of-date cash gate
would forbid recording a historically-insolvent instant and protect no derived figure.

Note also what the gate does *not* include: the **Comisión**. Under the cash-side convention
(ADR `0003`) the transfer fee never touches **Cash** — it sits in the gap between Cash and **Net
Contributions** — so the binding constraint is the Monto alone.

## Testing Decisions

**What makes a good test here.** Tests assert external behaviour — the figures a view model
returns, the gate flags it raises, the payload the write path sends and the Movement it hands
back — never how any of it is arranged internally. No rendering, no navigation, no network. The
codebase's strongest existing tests are pure functions fed inputs, which is exactly what this
slice's two changed seams are.

**The withdrawal view model.** Its summary half needs **no change at all**: the live *Recibirás*
figure, the blank-Monto case, the fee ceiling, the insufficient-funds gate and the
withdraw-exactly-your-Cash boundary are all covered already, and none of their rules move. The
builder half loses its `createdAt` assertion and gains the named test its deposit counterpart
already carries — that the builder **emits no `createdAt`, because the form does not own that
clock** — so that a future change reintroducing a device clock fails loudly rather than silently
reordering someone's **Average Cost**. Prior art: the deposit view model suite, which is this
change already made once.

**The movement write path.** One new case: the withdrawal is **written to `movement_cash`**. It is
the only direct proof that a Retiro can be written at all — deposit, buy and dividend each have such
a test, and without this one withdrawal would be the sole writable type whose write is never
exercised. Today it is covered only *transitively*: a withdrawal and a deposit return from the same
branch of `destinationFor`, so the deposit's test happens to run the same code, and that holds only
while the two stay merged. The test asserts the row lands in the cash table carrying its own type;
the column spellings stay the deposit's test to make. Prior art: the existing write-path suite,
which already covers the cash insert, its retry and its duplicate branch.

**Not tested, and why.** The withdrawal's column spellings and the absence of `created_at` from its
payload are not re-asserted. Both are already covered on the deposit, which returns from the *same*
branch of the *same* destination function with the *same* mapper; a withdrawal copy would assert
that the code is the code rather than that the behaviour is the behaviour. The engine needs nothing
either — the withdrawal's **Cash Impact**, its effect on **Net Contributions**, the Peak-versus-Net
divergence and the tooltip it raises are all covered by existing suites written before the movement
was reachable.

## Out of Scope

- **Venta.** It stays *Pronto* and the write path continues to refuse it.
- **Any change to the Retiro screen's design.** Layout, fields, copy, tokens and the date picker
  are settled and shipped; this slice touches only the save handler and the state it needs.
- **The over-withdrawal error's wording.** It quotes the available Cash while *Disponible* already
  prints the same figure beside the Monto label — the buy slice deliberately reasoned the other way,
  refusing to quote a figure already on screen. Recorded as a follow-up, not repaired here.
- **Extracting a shared save lifecycle.** Already tracked: *The save lifecycle is copied per form,
  and each copy carries ADR `0010`* in the tech-debt backlog, which anticipates this slice by name.
  This slice adds the fourth copy and does not extract the hook — that refactor edits three shipped
  forms, and the backlog entry is where its risk and its fix are written down.
- **Editing or deleting a withdrawal.** ADR `0007` already settles that edits do not revalidate
  history.
- **An as-of-date cash gate.** Settled by ADR `0005`; a strict solvency-at-every-instant rule would
  be a new product decision covering buy and withdrawal together, not a fix.
- **Any offline write queue.** Saving requires the network, and ADR `0010` rejected the queue as far
  out of proportion for an app that cannot render a **History** offline anyway.
- **A `CHECK` for either withdrawal rule.** Settled above and in `AGENTS.md`.

## Further Notes

**The reconciliation stays intact.** After a withdrawal of Monto `A` with fee `F`: **Cash** falls by
`A`, **Net Contributions** by `A - F`, and **Total Return** by `F`. The invariant
`Cash + Market Value == Net Contributions + Total Return` still holds, which is what makes the fee's
erosion of Total Return arithmetic rather than assertion.

**This slice is unusual in how little it decides.** It writes no ADR, adds no migration, touches no
engine, and introduces no term to `CONTEXT.md`. Every question it raised during design resolved to a
decision already on paper — `0003` for the fee's direction, `0005` for the gate, `0010` for the save
lifecycle, and now `AGENTS.md` for where validation lives. That is what a mature slice looks like,
and it is worth noticing because the next one, **Venta**, will not be: it carries an as-of-date
shares gate, an oversell clamp and the only movement type whose ordering changes its own figures.

**The `sanitizeDecimal` helper is load-bearing and easy to miss.** It strips `-` on every keystroke,
so a negative cannot be typed into any money field in any form. That input helper, not any view
model gate and not any constraint, is what keeps negatives out of the `numeric` columns.

**The two `withdrawal-ux` issues are stale and should not be ticked as written.** Both predate
persistence, describe saving as appending to an in-memory store, and one names the fee field
wrongly. They record the form-design work, which was delivered; they do not describe this slice.
