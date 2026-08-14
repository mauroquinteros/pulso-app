# 02 - The History is read from its three tables

Type: **HITL** - introduces the app's first error screen, and it is the first thing a user sees
on a cold start. Everything else here is settled; the visual treatment of the gate wants a look
before it becomes the app's front door.

## Parent

`.scratch/history-persistence/PRD.md`

## What to build

The signed-in **Perfil**'s whole **History** arrives from Postgres instead of from the mock
seed, and one gate decides what the user sees while that happens.

On entering the tabs, three selects fire in parallel against `movement_trades`,
`movement_dividends` and `movement_cash`. The results are accepted **all-or-nothing**: if any
one of the three fails, nothing is returned - never a partial merge of the two that worked. A
partial History is not a smaller History but a **wrong** one, and no figure derived from it can
tell (ADR 0006).

A single gate inside the tabs layout observes the outcome and renders one of three things: a
spinner while the reads are in flight, an error with **Reintentar** if they failed, the tabs
once they succeeded. **Below the gate nothing changes** - every screen, every view-model and
`usePortfolio` go on receiving a definite `Movement[]`, exactly as they do from the seed today.
This mirrors the root layout holding the splash until the session is known, so that no screen
below ever has to branch on "not yet known".

**The state machine** is pure, in the shape of the símbolo reducer - it imports nothing async,
so an entirely asynchronous behaviour is tested by feeding it events:

```ts
type HistoryStatus =
  | "unread"    // nobody has tried to read it yet
  | "reading"   // three selects in flight
  | "ready"     // the History is in hand
  | "failed"    // a fault; error + Reintentar
```

`unread` is deliberately not `unknown` (which reads as "something went wrong and the app cannot
cope" - the opposite of its meaning) and not `idle` (ambiguous between "not started" and
"finished and resting"). The names are the tenses of ADR 0006's own verb.

**The read is triggered by state, never by lifecycle.** The gate's rule is one sentence: *if the
History is `unread`, read it.* Cold start, fresh sign-in and **Reintentar** all funnel through
that single condition - retry simply sets the status back to `unread`. Nothing else starts a
read. A `TOKEN_REFRESHED` event cannot, because the status never leaves `ready`; neither can a
tab switch, a modal, or the app returning from the background.

**Three row mappers**, one per table, are the only things besides the reader that know a table
exists. They translate snake_case columns into camelCase domain fields and produce the correct
`Movement` subtype. snake_case must not leak past this boundary (see `CLAUDE.md`).

The reader lives beside the other modules that speak to the backend and returns results as
values rather than throwing - the same seam `resolve-stock` puts in front of the network, and
for the same reason: the state machine above it stays free of async imports.

**The empty History is the expected outcome of this slice.** All three tables hold zero rows, so
a successful read yields an empty portfolio: Movimientos and Portafolio show their existing
empty states, and Inicio shows honest zeros ($0.00, +0.0%). That is correct, not a bug -
Inicio's first-run design is deliberately out of scope.

**On the error screen (the HITL part).** There is no error-screen precedent in the app. The
closest existing idiom is the centred empty-state used by Movimientos and Portafolio. Follow
that shape unless review says otherwise. The copy must not describe a failed read as *stale* -
that word belongs to prices alone - and must not imply the user has recorded nothing.

## Acceptance criteria

- [ ] Signing in reads all three tables in parallel and puts the merged History in the store
- [ ] If any one of the three selects errors, no movements are stored - not a partial merge
- [ ] The gate shows a spinner while reading, the error screen when failed, the tabs when ready
- [ ] **Reintentar** returns the status to `unread`, which starts a fresh read
- [ ] No screen, view-model or `usePortfolio` call below the gate is modified
- [ ] A token refresh, a tab switch, opening the add-movement modal, opening a movement or stock
      detail, and backgrounding-then-foregrounding all trigger no read
- [ ] With three empty tables the app renders: Inicio at $0.00 / +0.0%, and the existing empty
      states on Movimientos and Portafolio
- [ ] The movements store no longer seeds from mock data; `MOCK_MOVEMENTS` remains as test
      fixture data and is not deleted
- [ ] Tests: the state machine's transitions, including an answer arriving for a Perfil who has
      since signed out being dropped
- [ ] Tests: each table's row maps to the correct `Movement` subtype with camelCase fields; a
      buy's `NULL` `regulatory_fees` becomes `0`; `execution_date` survives as a calendar date
      string and is never timezone-converted
- [ ] Tests: the all-or-nothing rule - any single select failing yields a failure and no
      movements
- [ ] Verified by hand: airplane mode produces the error screen, and **Reintentar** recovers
      once connectivity returns

## Blocked by

- `.scratch/history-persistence/issues/01-forms-that-cannot-save-say-pronto.md`
