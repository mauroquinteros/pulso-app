# PRD — The Compra becomes real (the buy slice)

**Feature:** `buy-movement`
**Implements:** `docs/adr/0012-a-buy-total-is-derived-from-its-shares.md` (new),
`docs/adr/0013-a-confirmed-stock-rides-back-on-the-confirmation.md` (new)
**Respects:** `0004` (executionDate is a calendar date), `0005` (the cash gate is not
date-qualified), `0006` (three tables, read all-or-nothing), `0009` (a buy is blocked until
its symbol is confirmed), `0010` (a movement is saved only when the database says so),
`0011` (a Quote is read apart from the History)
**Depends on:** the deposit slice — **Cash** has to exist before it can be spent — and the
`stocks` read, which put real **Quotes** on screen
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`)
**Scope:** a **Compra** can be recorded and is written to `movement_trades`; the form's total
and its funds gate stop disagreeing with what leaves **Buying Power**; the confirmed **Stock**
reaches the app instead of being thrown away

---

## Problem Statement

**You can put money into Pulso and you cannot buy anything with it.**

**Compra** sits in the picker marked *Pronto* and cannot be opened. The form behind it is
finished — it confirms the **Símbolo** against the provider, derives shares from a **Monto**,
prices a **Fee**, and gates on available **Cash** — but its **Guardar movimiento** leads
nowhere. It commits to an in-memory store that Postgres never hears about, and the write path
refuses outright any **Movement** that is not a deposit or a withdrawal. The last slice made
**Cash** real; there is nothing to spend it on.

Underneath that, two faults are dormant, and both wake up on the day a buy first persists.

**The form promises a total it will not charge.** A buy is stored as a share count and an
execution price; the **Monto** typed is not kept. Shares are rounded to five decimals, so the
principal recovered by multiplying the two back together is not the Monto — it drifts by up to
`0.000005 × executionPrice`. On a $7 share that is invisible. On a $7,000 share it is three and
a half cents. The form displays `Monto + Fee` and gates on it, so a buy that exactly exhausts
your Cash is waved through and lands **Buying Power** at -$0.02, and the movement's own receipt
prints a different total from the form that created it. The **Fee** causes the same divergence
far more often and always has: type a Monto equal to your Cash with any commission at all, and
the app refuses you with a message naming the exact figure you just typed.

**The first buy of any new symbol arrives unpriced.** Confirming a **Símbolo** already asks the
provider, writes a real named **Stock** with its price and the market moment it belongs to, and
answers with all of it. The app reads the verdict and discards the rest. So the **Holding** you
have just created has no **Quote**, reads *Sin precio* on **Inicio**, and stays that way until
the app is sent to the background and brought back — which someone who has just recorded a buy
and is looking at the result has no reason to do. The app fetched the price, stored it, and
declined to keep it.

## Solution

**A Compra can be recorded, and every figure the form shows is one the app will stand behind.**

Saving a buy waits for Postgres. Nothing is optimistic: the **Movement** that joins your
**History** is built from the row the database stored, so a buy you were told was saved is one
that is really there, and a buy that failed says so and leaves everything you typed on screen.
Recording the same form twice cannot record two buys, because the id is minted once per form
session and the database refuses the duplicate.

**Total a pagar** becomes the figure that actually leaves **Buying Power** — the shares you are
buying, times the price you are paying, plus the commission — and the funds gate tests that same
figure. When it does not fit, the refusal names the relationship rather than repeating numbers
already on screen: *El total a pagar supera tu efectivo.*

And the **Stock** confirmed on the way in stays. The answer that unlocks **Guardar** is the same
answer that carries the Stock, so a **Holding** created from a confirmed symbol has a
**Market Value** from the moment it appears. There is no second request, no race, and no window
in which a brand-new Holding reads *Sin precio* for a reason that is not true.

## User Stories

1. As a **Perfil**, I want to open **Compra** from the movement picker, so that I can record the
   buys that built my portfolio.
2. As a Perfil, I want my buy written to Postgres before the form closes, so that a movement I
   was told was saved is still there tomorrow.
3. As a Perfil, I want a buy that failed to save to tell me so, so that I do not walk away
   believing a **Holding** exists that does not.
4. As a Perfil, I want a failed save to leave my **Símbolo**, **Monto**, **Precio**,
   **Comisión** and **Fecha** exactly as I typed them, so that retrying costs me one tap and
   not five fields.
5. As a Perfil, I want tapping **Guardar** twice — or retrying after a lost connection — to
   record one buy and not two, so that my **Cost Basis** is not silently doubled.
6. As a Perfil, I want the save button to go inert while the save is in flight, so that I can
   see something is happening and cannot fire a second one.
7. As a Perfil, I want the **Total a pagar** on the form to be the amount that actually leaves
   my **Buying Power**, so that the number I agree to is the number I am charged.
8. As a Perfil, I want the same movement to show the same total on the form and on its receipt,
   so that I never have to work out which of two screens is telling the truth.
9. As a Perfil, I want to be stopped from recording a buy I cannot afford, so that my
   **Cash** never goes negative from a purchase the app said was fine.
10. As a Perfil, I want a refused buy to tell me *which figure* does not fit, so that a total
    equal to my **Cash** being rejected does not read as a bug in the app.
11. As a Perfil, I want my shares derived from the **Monto** and the **Precio**, so that I can
    record a buy the way I actually made it — by dollar amount, not by share count.
12. As a Perfil, I want the **Comisión** added to what I pay rather than netted out of it, so
    that the commission's effect on my **Total Return** is honest.
13. As a Perfil, I want a **Símbolo** the provider does not know to be refused, so that I cannot
    create a **Holding** that will read *Sin precio* forever.
14. As a Perfil, I want to keep filling in **Monto** and **Precio** while the símbolo is being
    confirmed, so that I never wait on a round trip.
15. As a Perfil, I want **Guardar** to stay closed while a confirmation is still in flight, so
    that I learn a symbol is wrong while I am still looking at the field.
16. As a Perfil, I want a **Holding** I have just created to carry a **Market Value**
    immediately, so that **Inicio** reflects the buy I just recorded rather than an absence.
17. As a Perfil, I want a buy of a **Stock** the provider has no price for to still save, so
    that a missing **Quote** costs me a Market Value and not the movement itself.
18. As a Perfil, I want a **Stock** that genuinely has no **Quote** to read *Sin precio*
    honestly, so that an absence is never dressed up as a figure.
19. As a Perfil, I want a failed price refresh not to be announced because of something I typed
    into a form, so that the banner keeps meaning what it says.
20. As a Perfil, I want two movements I recorded on the same day to stay in the order they were
    recorded, so that my **Average Cost** and **Realized P&L** do not shift between sessions.
21. As a Perfil, I want the **Fecha** I choose to be the day the buy happened, unshifted by
    wherever my phone is, so that a buy dated the 3rd is never filed on the 2nd.
22. As a Perfil, I want my buy to reduce **Cash** and raise my **Cost Basis** and
    **Average Cost**, so that every derived figure moves together and none of them disagree.
23. As a Perfil, I want my buy to appear in the movements list with its **Cash Impact**, so that
    the list and the **Buying Power** it explains can never drift apart.
24. As a Perfil, I want to open my buy and see a receipt whose lines add up to its total, so that
    I can check the app's arithmetic against my broker's.
25. As a Perfil who signs out, I want my buy to leave with me, so that the next Perfil to use the
    phone sees their own **History** and not mine.
26. As a Perfil recording my first ever buy with no **Cash**, I want to be told plainly that the
    total exceeds what I have, so that I understand I need to record a deposit first.

## Implementation Decisions

### The confirmed Stock travels back on the confirmation

The symbol-confirmation boundary stops returning a bare verdict and returns **both** the verdict
and the **Stock** it confirmed — `{ answer, stock }`, where `stock` is `null` when the provider
confirmed the symbol but had no price for it. The endpoint already upserts the Stock and already
answers with `{ ticker, name, price, quotedAt }`; the flat body is mapped into a domain `Stock`
carrying its **Quote** inside that same module, following the precedent that one mapper with one
caller does not earn a file of its own.

The buy screen's blur handler splits the two results: the verdict goes to the símbolo state
machine as it does today, and the Stock is merged into the **Stocks** store. Because
`saveEnabled` requires a confirmed símbolo, the answer that unlocks the save is the same answer
that carries the Stock — so there is no window in which a saveable buy has a Stock the app does
not hold. See ADR `0013` for why a re-read of the whole table was chosen first and reversed.

**The símbolo state machine does not change.** The answer type stays the plain string union and
the screen splits the two results, so the reducer, its stale-answer race guard, and its tests are
untouched.

**No stale-answer guard is applied to the Stock write.** A Stock is shared and owned by nobody,
and the worst outcome of a race is a slightly staler map winning, which costs nothing.

### The Stocks store gains one action, and its silence is load-bearing

The store gains an action that merges a single confirmed **Stock** into the map. **It must not
touch `status`.** The store guarantees by construction that nothing can unsay a failure before
another answer lands — an earlier version raised the refresh banner, blanked it, and raised it
again. A confirmation that set the status to ready would clear that banner because somebody typed
a symbol into a form. Leaving it alone is also what the field means: the status records how the
last *read* came out, and a confirmation is not a read.

**Known and accepted consequence.** The banner's suppression rule treats an empty Stocks map as a
proxy for "no read has ever succeeded, so there is nothing we are failing to refresh". A
confirmation is the first thing that can fill the map without a successful read, so a failed
launch read followed by a confirmed símbolo and a saved buy will raise *No pudimos actualizar los
precios* over a portfolio whose only price is seconds old. Rare, not false, and deliberately not
fixed here — see Out of Scope.

### The form's total is derived, and the gate tests the same figure

The buy view model computes **Total a pagar** as `executionPrice × shares + fee` — the identical
expression the derivation engine uses for a buy's **Cash Impact** — rather than as
`Monto + Comisión`. The same figure drives the funds gate, so a buy that would overdraw
**Buying Power** cannot be saved. Shares continue to round **to nearest**; see ADR `0012` for why
rounding down is the wrong direction to move if the Monto is ever stored.

The insufficient-funds message becomes **"El total a pagar supera tu efectivo."** — it names the
relationship and repeats no figures, because both are already on screen: the available Cash sits
directly above the Monto field, and the total is pinned below the scroll area and visible with
the keyboard raised.

### The buy is built without a clock and saved through the existing write path

The buy builder returns the *fields* of a **Movement** rather than a Movement: `createdAt` is
absent, because it is read from the database's clock when the row is stored (`0010`). Its
device-clock dependency is dropped.

The write path gains a `movement_trades` branch for a buy alongside the cash branch it already
has. `regulatory_fees` is **omitted from the payload** rather than sent as null, so the column
default lands the NULL that the schema's constraint requires of a buy — sells remain refused, as
do dividends. The stored row is mapped back into a **Movement** through the same mapper the read
path uses, so a Movement comes into existence exactly one way. The clock-disagreement retry and
the duplicate-id read-back that already guard the cash insert cover the trade insert unchanged.

### The buy screen adopts the deposit screen's save lifecycle

The screen holds its id-bearing dependencies in state so the id is minted **once per form
session, not once per tap** — which is what makes a retry after a lost response safe. The save
becomes asynchronous and awaited, with in-flight and failed states driving the button's pending
appearance and a failure message. On success the Movement returned by the database joins the
store, haptics fire, and the form dismisses.

**This is the second copy of that lifecycle.** It is duplicated deliberately rather than
extracted: the third form to need it is the point at which a shared module earns its place, and
extracting now would drag the working deposit form into this slice for no benefit today.

### The picker opens Compra

The Compra row loses its *Pronto* tag and becomes navigable. Venta, Dividendo and Retiro stay
closed.

## Testing Decisions

**What makes a good test here.** Tests assert external behaviour — the figure a view model
returns, the state a store lands in, the payload a write path sends and the Movement it hands
back — never how any of it is arranged internally. The codebase's strongest existing tests are
pure functions and reducers fed events, which is why the arithmetic and the lifecycle rules live
outside the screens: an entirely asynchronous behaviour is tested by feeding it answers, with no
network and no renderer.

**The buy view model.** The derived total and the funds gate, including the case ADR `0012` is
written about: **Cash** $1,000.00, **Precio** $7,000.00, **Monto** $1,000.00 must produce a total
of $1,000.02 and a **closed** gate — a named test, so a future change that reopens it fails
loudly. Also the commission's effect on the gate, a blank Monto producing a zero total, and the
builder producing buy fields with no `createdAt`. Prior art: the existing buy, deposit,
withdrawal, sell and dividend view-model suites.

**The Stocks store.** That a confirmed Stock merges into the map without displacing the Stocks
already in it, and — the important one — that it **leaves `status` untouched in every status**,
including `failed`. That constraint is an absence, so nothing in a diff reveals it and only a test
can hold it. Prior art: the existing Stocks store suite, which already asserts that a failed read
keeps the Stocks it had.

**The movement write path.** That a buy inserts into the trades table with `regulatory_fees`
absent from the payload, that the Movement handed back is mapped from the row the database
returned rather than the object passed in, that a duplicate id reads the stored row back instead
of failing, and that sells and dividends are still refused. Prior art: the existing write-path
suite covering the cash insert, its retry and its duplicate branch.

**The home view model.** A test pinning the accepted banner false positive — a failed status with
a non-empty Stocks map and at least one **Holding** raises the banner. It documents a known hole
rather than a desired behaviour, so that whoever closes it gets a failing test pointing at ADR
`0013` instead of filing it as a fresh bug. Prior art: the existing suite for the banner's two
deliberate silences.

**Not tested:** the symbol-confirmation boundary. It invokes an Edge Function and maps its
response; the mapping is a few lines with one caller, and covering it would mean the slice's only
new test file and its only mock, for a path whose interesting outcomes are already expressed in
the state machine that consumes it.

## Out of Scope

- **Venta, Dividendo and Retiro.** They stay *Pronto*; the write path continues to refuse them.
- **Storing the typed Monto.** The better fix for the divergence this PRD works around, deferred
  in ADR `0012` with its full surface written down — a migration, the trade row mapper, the buy
  type, the Cash Impact and holding-facts calculations, and the reconciliation corpus.
- **Showing the confirmed company's name.** The name now arrives with the **Stock** and is
  deliberately not rendered. ADR `0009` documents what that leaves open — a real symbol standing
  for the wrong company — and reversing this costs one line in the slot the símbolo error already
  occupies.
- **Fixing the refresh banner's false positive.** Accepted and documented rather than repaired;
  repairing it means teaching the Stocks store whether a read has ever succeeded, which is a
  change to a store this slice otherwise only adds to.
- **Extracting a shared save lifecycle.** Deferred to the third form that needs it.
- **Editing or deleting a buy.** `0007` already settles that edits do not revalidate history.
- **Any offline write queue.** Saving a buy requires the network, both to confirm the símbolo and
  to write the row. `0009` notes this would be the moment its "the provider says no" versus "we
  could not ask" distinction starts to matter on screen.

## Further Notes

**Two acceptance criteria are absences, and absences do not appear in a diff.** The store action
must not move `status`, and the símbolo state machine must not change. Both are easy to break
without noticing and both are covered by tests for that reason.

**The banner false positive should be closed as "known" if it is reported.** It is written into
ADR `0013` and pinned by a test; a future fix should start from the ADR rather than from the
symptom.

**This slice completes the loop the last two opened.** The deposit slice made **Cash** real, and
the quotes slice made a **Quote** real; a buy is the first Movement that consumes both — it spends
the Cash and it needs the Quote to be worth anything on screen. Every price-applied figure on
**Inicio** and **Portafolio** becomes reachable from user input for the first time.
