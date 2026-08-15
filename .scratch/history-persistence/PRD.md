# PRD — The History becomes real (deposit slice)

**Feature:** `history-persistence`
**Implements:** `docs/adr/0006-movements-in-three-tables-read-all-or-nothing.md` (as amended),
`docs/adr/0010-a-movement-is-saved-only-when-the-database-says-so.md` (new)
**Depends on:** the three `movement_*` tables, applied to the remote project on 2026-08-02
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Scope:** the **full History read** (all three tables) plus **one write path — Depósito**.
Compra, Venta, Dividendo and Retiro are marked "Pronto" until their own slices.

> **Why deposit and not buy.** The obvious slice was "persist a Compra", since the Símbolo
> confirmation just landed there. It cannot work. `summarizeBuy` gates the save on
> `total <= availableCash`, **Cash** is derived from the History, and all three tables hold
> **zero rows** — so Cash is `0`, `saveEnabled` is permanently `false`, and a buy could never
> be saved even once. The only Movement that creates Cash is a deposit. Deposit is therefore
> not a warm-up; it is the only door into the app.

---

## Problem Statement

**Pulso has never stored anything a user did.**

Every **Movement** the user records lives in an in-memory Zustand store seeded with mock data.
Close the app and the seed comes back; whatever was recorded is gone, and the mock portfolio
that returns is not theirs. All three movement tables — applied, indexed and RLS-protected
since August 2nd — hold zero rows. The database is real, the auth is real, the **Símbolo**
confirmation calls a real endpoint and writes a real **Stock**; the user's own history is the
one thing that is not.

This makes the app unusable rather than merely incomplete. A portfolio tracker whose history
resets is not a tracker. Every figure the app is proud of — **Total Portfolio Value**,
**Total Return** and its four components, **Aportado → Vale hoy** — is derived from a list
that evaporates.

There is a second, quieter problem sitting next to it. `clearPerfilScopedState` — the function
that stops one **Perfil**'s data being shown to the next — is called from exactly one place:
the "Cerrar sesión" button. Any other way a session can end (an expired refresh token, a token
revoked server-side, a sign-out performed on another device) drops the guard, unmounts the
tabs, and leaves the store fully populated. Today that is invisible, because the store holds
mock data every Perfil shares. The day the History is real it becomes a cross-Perfil data
leak, contradicting CONTEXT.md's flat statement that two Perfiles "share nothing" and that
"nothing in the app reconciles them."

## Solution

**The History is read once, as one thing, before the app shows anything — and a deposit is
saved only when Postgres hands the row back.**

On entering the tabs, the app reads the signed-in Perfil's whole **History**: three selects
against `movement_trades`, `movement_dividends` and `movement_cash`, fired in parallel and
accepted **all-or-nothing**. A single component, `RequireHistory`, wraps the tabs and absorbs the outcome. While
the reads are in flight it shows a spinner; if any of the three fails it shows an error with
**Reintentar**; only when all three succeed does it render the tabs. Below it nothing
changes — every screen, view-model and `usePortfolio` call goes on receiving a definite
`Movement[]`, exactly as they do from the mock seed today.

Recording a **Depósito** waits for the database. Tapping **Guardar movimiento** puts the
button into a pending state and holds it there until Postgres acknowledges the insert. On
success the app takes back **the row the database stored** — not the object the form built —
maps it through the same mapper the read path uses, appends it to the History, fires the
success haptic and dismisses. On failure the form stays open, showing what went wrong, with
every typed value still in place.

The four remaining forms are marked **"Pronto"** in the movement-type picker, using the
disabled state that already exists there. Until each one persists, the app never shows a
Movement it did not store — so the **Cash** on screen is always the Cash in Postgres.

## User Stories

1. As a Pulso user, I want the deposits I record to still be there when I reopen the app, so that the app is worth recording anything into.
2. As a Pulso user, I want my **History** to load automatically when I open the app, so that I never have to ask for my own data.
3. As a Pulso user, I want to see that my data is loading, so that a blank screen does not read as an empty portfolio.
4. As a Pulso user, I want to be told plainly when my History could not be loaded, so that I do not mistake a failure for having recorded nothing.
5. As a Pulso user, I want a **Reintentar** button when the load fails, so that a dropped connection costs me a tap rather than a restart.
6. As a Pulso user whose connection is down, I want the same clear error rather than a silently empty app, so that I never see a **Total Portfolio Value** of $0 that is not true.
7. As a Pulso user, I want the app to refuse to show me a partial History, so that a figure derived from half my movements never reaches my screen.
8. As a Pulso user, I want **Cash** on screen to always match what the database holds, so that I can trust the number I make decisions from.
9. As a Pulso user recording a deposit, I want the app to wait until it is really saved before closing the form, so that "saved" means saved.
10. As a Pulso user recording a deposit, I want to see the button working while it saves, so that I do not tap it twice.
11. As a Pulso user whose deposit failed to save, I want the form to stay open with everything I typed, so that I do not retype an amount, a fee and a date.
12. As a Pulso user whose deposit failed to save, I want to be told it failed, so that I do not walk away believing it worked.
13. As a Pulso user who taps **Guardar** again after a failure, I want the deposit recorded once and not twice, so that my **Aportado** is not silently doubled.
14. As a Pulso user, I want a deposit that saved to appear immediately in my History, so that I can see the effect on **Efectivo** without reopening the app.
15. As a Pulso user, I want my movements ordered the same way today as tomorrow, so that **Average Cost** and **Realized P&L** do not change on their own.
16. As a Pulso user, I want two movements recorded on the same day to keep a stable order, so that a same-day sequence means one thing and keeps meaning it.
17. As a Perfil signing in for the first time, I want to see an honest empty portfolio rather than someone's sample data, so that the app is mine from the first screen.
18. As a Perfil, I want to never see another Perfil's **Movements**, **Cash** or holdings, so that lending my phone does not leak my finances.
19. As a Perfil whose session expired without me signing out, I want my data cleared from the device just as thoroughly, so that "signed out" means the same thing however it happened.
20. As a Perfil signing in after someone else signed out, I want my own History fetched rather than theirs reused, so that the previous person's portfolio is not what greets me.
21. As a Pulso user, I want a routine token refresh to leave my screen alone, so that the app does not flash a loading state over data that is already correct.
22. As a Pulso user, I want switching tabs to be instant, so that moving between Inicio, Movimientos and Portafolio never waits on the network.
23. As a Pulso user, I want opening a movement's detail or a stock's screen not to reload anything, so that navigating within the app is free.
24. As a Pulso user, I want backgrounding and reopening the app not to throw me behind a loading screen, so that switching apps is not punished.
25. As a Pulso user, I want forms that cannot yet save my data marked **"Pronto"** rather than silently losing it, so that I am never invited to record something that will vanish.
26. As a Pulso user, I want the movement-type picker to make clear which movements I can record today, so that I know what the app can currently do for me.
27. As a Pulso user with no movements yet, I want **Movimientos** and **Portafolio** to show their existing empty states, so that "nothing recorded" is stated rather than implied by blankness.
28. As a Pulso user with no movements yet, I want Inicio to show honest zeros rather than an error or a broken percentage, so that an empty portfolio looks empty rather than wrong.
29. As a Pulso user, I want my deposit's transfer fee stored alongside its amount, so that **Aportado** stays distinct from **Efectivo** exactly as the app describes them.
30. As a Pulso user, I want the amounts I typed to come back exactly as I typed them, so that a stored figure never quietly differs from the one I confirmed.
31. As a developer, I want database column names never to appear in domain objects, so that the schema can change without the engine noticing.
32. As a developer, I want one place that knows the movement tables exist, so that a schema change has one blast radius.
33. As a developer, I want the all-or-nothing rule expressed in one function rather than remembered at each call site, so that it cannot be half-applied.
34. As a developer, I want the load lifecycle testable without a network, so that its failure paths are exercised rather than hoped about.
35. As a developer, I want a Movement to be constructible exactly one way, so that a saved movement and a read movement can never disagree.

## Implementation Decisions

### Scope: deposit writes, full History reads

The read covers **all three tables** — the whole History, every movement type — because
**Inicio** needs it. Its cards derive **Efectivo** from all five types, **Dividendos netos**
from `movement_dividends`, **Aportado** and **Peak Contributions** from `movement_cash`, and
**Comisiones** from buy/sell fees *plus* deposit/withdrawal `transferFee`. There is no subset
of the History that answers the first screen, so a per-tab or lazy strategy would fetch the
same three tables anyway and save nothing. Switching tabs fires no request at all: every tab
derives from the same in-memory `Movement[]`.

The write covers **deposit only**. See the note at the top: a buy cannot be saved against a
Cash of zero, and only a deposit creates Cash.

### The History's four states

A pure state machine, in the mould of `utils/symbol-check.ts`:

```ts
type HistoryStatus =
  | "unread"    // nobody has tried to read it yet
  | "reading"   // three selects in flight
  | "ready"     // the History is in hand
  | "failed"    // a fault; error + Reintentar
```

`unread` was deliberately **not** called `unknown` or `idle`. `unknown` reads as "something
went wrong and the app cannot cope" — the opposite of its meaning — and `idle` is ambiguous
between "not started" and "finished and resting". The names are the tenses of ADR 0006's own
verb: the doc speaks of "three reads" and "a failed read".

The states are not interchangeable with an empty array. `[]` would mean *still loading*, *this
Perfil has nothing*, and *the read failed* all at once, and the last two are deliberately
different screens. CONTEXT.md's new **History** entry states the distinction in domain terms.

### The read is triggered by state, never by lifecycle

`RequireHistory`'s rule is one sentence: **if the History is `unread`, read it.** Cold start,
fresh sign-in, sign-in after someone else signed out, and **Reintentar** all funnel through
that single condition — sign-out and retry simply set the status back to `unread`. Nothing
else can start a read.

This is chosen over a mount effect (which would make correctness depend on an Expo Router
detail, and would need a second mechanism for retry) and over keying on the session object
(which re-reads on every `TOKEN_REFRESHED`, since auth-js hands back a new object for the same
user). Under the state rule, a token refresh cannot start a read because the status never
leaves `ready`.

### One component in front of the tabs: `RequireHistory`

`RequireHistory` wraps the tabs, observes the outcome and renders one of three things: a
spinner while `reading`, an error with **Reintentar** when `failed`, the tabs when `ready`.
It mirrors the precedent in the root layout, which holds the splash until the session is known
so that no screen below ever branches on "not yet known".

Below it **nothing changes**: `usePortfolio` keeps returning a plain `Portfolio`, and no
existing screen or view-model is touched. The all-or-nothing unit gets exactly one observer,
rather than three screens each re-deciding the same three states.

**`RequireHistory` waits for the History and nothing else.** When prices arrive from `stocks` in a
later slice, that read runs alongside and must never block `RequireHistory`: a **Stock** is shared,
not owned, and CONTEXT.md is explicit that "a missing Stock costs a **Market Value**, not a
wrong one". The engine already implements that degradation — unpriced holdings return
`priceAvailable: false` and are excluded from **Total Portfolio Value** while `Efectivo` and
**Cost Basis** stay correct. Putting prices behind `RequireHistory` would make that tested machinery
unreachable and turn a partial-data condition into a dead app.

### The History is read once per launch

Nothing re-reads it after a successful read. A deposit recorded in the Supabase dashboard, or
on a second device, will not appear until the app is killed and reopened. Accepted
deliberately: the History only changes when this app changes it, and the awaited write keeps
the store exact for changes made here. A pull-to-refresh could not reuse `RequireHistory` anyway —
returning to `unread` would blank the whole app behind a spinner to reload data already on
screen — so it would need its own path that leaves `ready` standing. Out of scope.

### Saving waits, and takes back the row

Per ADR 0010. The insert is awaited; the store receives **the row Postgres returned**, mapped
through the same mapper the read path uses. A Movement therefore comes into existence exactly
one way — a row from Postgres through the mapper — rather than two ways that can silently
disagree. The form does not produce a Movement; it produces the fields for one.

Optimistic writes were rejected because the store is the sole input to the engine: a movement
the database never received is not a pending write, it is a **History that lies**, and it lies
in the one way nothing downstream can detect. Concretely, a failed optimistic deposit
overstates **Cash**, and the Compra form's own funds gate then approves a purchase there is no
money for.

### `createdAt` comes from the database's clock

The insert omits `created_at` and lets the column default fire. This is not tidiness:
`createdAt` is the tiebreaker for same-`executionDate` movements in `compareChronological`, so
it orders **Average Cost** and **Realized P&L**, and it gates the Venta form through
`maxSellableAsOf`. A tiebreaker drawn from whichever phone recorded the movement does not
reliably break ties. One clock — the database's — is the only one that orders consistently.

Consequently `buildDepositMovement` no longer returns a complete `DepositMovement`, and
`MovementDeps` narrows from `{ id, now }` to `{ id }`.

### Ids are client-generated UUIDs, minted once per form session

Verified against the live database: all three `id` columns are `uuid NOT NULL` with **no
default**, so the client must supply one — ADR 0006 implemented faithfully. `expo-crypto`'s
`randomUUID()` is the source; Expo's winter runtime polyfills `FormData`, `TextDecoder`, `URL`
and `fetch` but **not** `crypto`, so there is no global to use, and `uuid` plus
`react-native-get-random-values` needs an import-order-sensitive polyfill for no benefit in an
Expo app.

The id is minted **once per form session, not once per tap**. If an insert succeeds but the
response is lost, a second tap must carry the same id so it cannot become a second deposit.
This is what makes ADR 0010's retry-safety real rather than claimed.

### Perfil-scoped clearing moves to the auth listener

`clearPerfilScopedState` moves out of the "Cerrar sesión" handler and into the
`onAuthStateChange` listener that already declares itself the session store's **only writer** —
keyed on the **user id changing**, not on an event name, so it covers a button press, an
expiry, a server-side revocation and a sign-out on another device alike. It must reset the
History status to `unread` as well as emptying the movements, or the next Perfil lands on a
`ready` empty portfolio and no read ever fires.

### The four other forms are marked "Pronto"

`disabled: true` on buy, sell, dividend and withdrawal in the movement-type picker. The
disabled rendering already exists — a greyed, unpressable row with a **Pronto** tag. Without
this, a buy recorded in memory survives until relaunch and then vanishes, leaving **Cash**
overstated and the Compra form's funds gate trusting the inflated figure. Four booleans, each
flipped back by its own slice.

### The save button's double-tap latch must reset

`SaveButton` guards double taps with a ref that is a **one-way latch — it never resets**.
That is correct today because saving always dismisses. With an awaited save that can fail, the
form stays open and the button would be permanently dead. It resets on failure, and gains a
pending appearance while the insert is in flight.

### Modules

| Module | Kind | Responsibility |
| --- | --- | --- |
| History status machine | new, pure | The four states and their transitions; no async imports |
| Movement row mappers | new, pure | Three mappers, one per table; snake_case → camelCase; correct `Movement` subtype |
| History source | new, I/O | `readHistory()` (three parallel selects, all-or-nothing) and `saveMovement()` (insert, select back, map). Two exports, permanently. With the row mappers, the only code that knows a table exists |
| Movements store | modified | Holds the History and its status |
| Session store | modified | Auth listener clears Perfil-scoped state on user-id change |
| Perfil-scoped state | modified | Also resets status to `unread` |
| `RequireHistory` | new, UI | Wraps the tabs; renders the spinner, the failure screen, or the app |
| Tabs layout | modified | Wrapped in `RequireHistory` |
| Movement deps | modified | Narrows to `{ id }`, sourced from `expo-crypto` |
| Deposit view-model | modified | Produces insert fields rather than a Movement |
| Deposit form | modified | Async save, pending state, error surface, stable per-session id |
| Save button | modified | Pending appearance; latch resets on failure |
| Movement-type picker | modified | Four rows disabled |

**On naming.** This module is deliberately not called a gateway, a service or a repository.
No module in this codebase carries a pattern suffix — they are named for the thing they do or
the thing they are (`resolve-stock`, `symbol-check`, `google-sign-in`, `perfil-scoped-state`),
and a pattern name here would be the first. "Gateway" is technically apt but reads as **API
Gateway** to most people, which is the same ambiguity CONTEXT.md rejects "cuenta" and
"invested amount" for. What the module actually produces is a **History**: the whole of one
Perfil's Movements, assembled from three tables into the one thing the app derives everything
from. So it is named for that, and a movement joining the History belongs in the same module —
which the shared row mappers require in any case.

**Two exports, permanently — `readHistory()` and `saveMovement()`.** Not one save function per
movement type. The read side already shows the shape: `readHistory()` spans all three tables
because the caller does not want three things, it wants a History; nobody proposed
`readTrades`/`readDividends`/`readCash` as separate exports. The write side is symmetric.
ADR 0006 is explicit that the table split is a storage fact the domain does not follow — "the
`Movement` union, the engine, and every view-model stay exactly as they are, with three row
mappers as the only things that know a table exists" — and a `saveDeposit`/`saveBuy`/`saveSell`
family drags that storage fact straight back into the interface. Five near-identical bodies
would also drift apart over time.

So the type→table decision lives *inside*, beside the mappers that already encode it. **This
slice implements only the `movement_cash` branch**; each later slice adds its own branch rather
than a new export, and no existing caller changes. That is what keeps this a deep module: the
interface does not grow when the app learns a new movement type.

`saveMovement` cannot take a `Movement`, since per ADR 0010 the form no longer produces one —
`createdAt` comes from the database. It takes a Movement-minus-`createdAt`, which needs a
**distributive** conditional type, or `Omit` collapses the five variants into one wide object
where every field is optional and the discriminated union stops discriminating:

```ts
type NewMovement<M = Movement> = M extends Movement ? Omit<M, "createdAt"> : never
```

The module returns results as values and never throws — the same seam `lib/resolve-stock.ts`
puts in front of the network, and for the same reason: the state machine above it stays free
of async imports and can be tested by feeding it events.

## Testing Decisions

**What makes a good test here.** Test external behaviour, never implementation. A test should
survive a rewrite of the thing it covers and fail only when the *behaviour* changes. Every
test in this repo is a pure unit test over a module that imports nothing async — view-models,
utils, stores — which is precisely what makes an asynchronous feature testable by feeding
events rather than by mocking timers. Prior art to follow: `utils/symbol-check.test.ts` for a
state machine, `components/add-movement/deposit-view-model.test.ts` for a view-model,
`stores/perfil-scoped-state.test.ts` for store behaviour.

**Modules to be tested:**

1. **History status machine.** Transitions from events: a read starting from `unread`; a
   success landing in `ready` with the History; any failure landing in `failed`; **Reintentar**
   returning to `unread`; and the case that matters most — an answer arriving for a Perfil who
   has since signed out being dropped rather than applied.

2. **Movement row mappers.** Each table's row maps to the correct `Movement` subtype with
   camelCase fields; a buy's `NULL` `regulatory_fees` becomes `0` rather than `undefined`;
   `execution_date` survives as a calendar date string and is never converted; numerics arrive
   as numbers. These guard a rule CLAUDE.md states outright — snake_case must not leak past
   this boundary — so the assertions are about the domain shape, not the SQL.

3. **`readHistory` is all-or-nothing.** The behaviour ADR 0006 exists to protect and the one
   nothing else covers: if any of the three selects errors, it returns a failure and **no**
   movements — never a partial merge of the two that worked. Also that the three run in
   parallel rather than in series. Requires a fake Supabase client, so it costs more than the
   pure units; accepted, because an untested all-or-nothing rule is the rule most likely to
   quietly stop holding.

**Not new coverage, but required:** `deposit-view-model.test.ts` will break when
`buildDepositMovement` stops emitting `createdAt`, and moves with the change.

**Not tested:** `RequireHistory` itself. The repo has no component-render setup, and adding one for
a single conditional is disproportionate. Verified by hand — airplane mode for the error path,
a fresh sign-in for the read, a second Perfil for the clearing.

## Out of Scope

- **Compra, Venta, Dividendo and Retiro writes.** Marked "Pronto"; one slice each. Each adds a
  branch inside `saveMovement` and flips one boolean in the picker — no new export, no caller
  changed.
- **Real prices.** `usePortfolio` keeps reading `MOCK_PRICES` even though `stocks` is live and
  `resolve-stock` already writes real rows into it. Invisible in this slice — a deposit has no
  price — but it bites the day a buy persists, and it is its own slice with its own
  non-blocking read.
- **Offline support of any kind.** `supabase-js` ships no query cache and no offline
  persistence; every offline story for Supabase is hand-rolled or a third-party sync engine.
  ADR 0006 has been amended to say so. The app requires connectivity to render a History.
- **A cached History.** Follows from the above, and carries its own Perfil-keying hazard:
  a history at rest must be scoped per Perfil and cleared on sign-out, or it reintroduces the
  leak this PRD closes.
- **Pull-to-refresh, or any re-read after the first.** Read once per launch.
- **A first-run empty state for Inicio.** It ships with honest zeros. Movimientos and
  Portafolio already have proper empty states; Inicio is the only tab without one, and it is
  worth designing once against the real thing.
- **Edits and deletes.** ADR 0007 governs their semantics; ADR 0010 will govern their write
  path when they arrive.
- **Removing `MOCK_MOVEMENTS`.** It leaves the store's seed but stays as fixture data for the
  engine and view-model tests, which depend on it heavily.
- **Renaming the deposit route.** The deposit form lives at the generic `/add-movement/form`
  route while every sibling is named for its type. A real smell, unrelated to this work.

## Further Notes

- **Two ADRs were written or amended during the design of this slice.** ADR 0006's final
  consequence used to promise that offline would render a cached History on its own screen; it
  was written before the cost of offline was checked, no code was ever written under it, and
  it has been corrected in place. ADR 0010 is new and records the awaited write, the
  returned-row rule and the database clock.
- **CONTEXT.md gained the term **History***, which had been doing load-bearing work in ADR
  0006 and throughout this design while sitting undefined. Its entry states the all-or-nothing
  property in domain terms and separates the three situations that look alike on screen: a
  History not yet in hand, one that could not be obtained, and the genuinely empty History of a
  Perfil who has recorded nothing. Only the third is a fact about the user.
- **The `createdAt` glossary note was sharpened** to name which clock, since the tiebreaker
  only breaks ties if one clock supplies it.
- **Verified against the live project, not the migration files:** all three `id` columns are
  `uuid NOT NULL` with no default; all three tables hold zero rows.
- **The zero-row fact is what makes the empty states real** rather than hypothetical. Every
  Perfil hits them on day one.
