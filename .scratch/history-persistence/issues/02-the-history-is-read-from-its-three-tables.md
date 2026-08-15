# 02 - The History is read from its three tables

Type: **HITL, now resolved** - this slice introduces the app's first error screen, so it was
held for a decision on naming, copy and visual treatment. All three are settled below and no
further human input is needed to build it.

## Parent

`.scratch/history-persistence/PRD.md`

## What to build

The signed-in **Perfil**'s whole **History** arrives from Postgres instead of from the mock
seed, and one component decides what the user sees while that happens.

On entering the tabs, three selects fire in parallel against `movement_trades`,
`movement_dividends` and `movement_cash`. The results are accepted **all-or-nothing**: if any
one of the three fails, nothing is returned - never a partial merge of the two that worked. A
partial History is not a smaller History but a **wrong** one, and no figure derived from it can
tell (ADR 0006).

A single component named **`RequireHistory`** wraps the tabs, observes the outcome and renders
one of three things: a
spinner while the reads are in flight, an error with **Reintentar** if they failed, the tabs
once they succeeded. **Below it nothing changes** - every screen, every view-model and
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

**The read is triggered by state, never by lifecycle.** `RequireHistory`'s rule is one sentence: *if the
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

**The name.** `RequireHistory`, in a file named for it. Not "gate", not "guard" (already taken
by the router's `Stack.Protected` guard), and not "boundary". The name states the rule: the
tabs require a History, and this is what enforces it.

**The two screens (the decided part).**

*Loading* is a bare centred `ActivityIndicator` on the app background - the same one the buy
form's Símbolo field already uses. Nothing else. No skeleton, no copy.

*Failure* reuses the **layout** of the existing empty states - centred, a glyph, a 16/700 title,
a 13pt secondary body capped around 240pt, and the gradient pill for the action - but **must not
reuse their illustration**. The ledger-with-a-badge glyph means "nothing recorded yet", which is
the single confusion this screen exists to prevent. Use a muted Ionicons glyph instead
(`cloud-offline-outline`), in the same outline colour family the empty-state illustration uses.

Copy, final:

- Title: **No pudimos cargar tus movimientos**
- Body: **Revisa tu conexión e inténtalo de nuevo.**
- Action: **Reintentar**

Keep the verb. "No pudimos cargar" is what separates this screen from the empty state's
"Todavía no hay movimientos" - they otherwise name the same noun, so a shortening to anything
like "Sin movimientos" would collapse the two into one sentence. The copy must never describe a
failed read as *stale*; that word belongs to prices alone.

## Acceptance criteria

- [x] Signing in reads all three tables in parallel and puts the merged History in the store
- [x] If any one of the three selects errors, no movements are stored - not a partial merge
- [x] `RequireHistory` shows a spinner while reading, the failure screen when failed, the tabs when ready
- [x] **Reintentar** returns the status to `unread`, which starts a fresh read
- [x] No screen, view-model or `usePortfolio` call below `RequireHistory` is modified
- [x] A token refresh, a tab switch, opening the add-movement modal, opening a movement or stock
      detail, and backgrounding-then-foregrounding all trigger no read
- [x] With three empty tables the app renders: Inicio at $0.00 / +0.0%, and the existing empty
      states on Movimientos and Portafolio
- [x] The movements store no longer seeds from mock data; `MOCK_MOVEMENTS` remains as test
      fixture data and is not deleted
- [x] Tests: the state machine's transitions, including an answer arriving for a Perfil who has
      since signed out being dropped
- [x] Tests: each table's row maps to the correct `Movement` subtype with camelCase fields; a
      buy's `NULL` `regulatory_fees` becomes `0`; `execution_date` survives as a calendar date
      string and is never timezone-converted
- [x] Tests: the all-or-nothing rule - any single select failing yields a failure and no
      movements
- [x] The failure screen does not reuse the empty-state illustration, and its title reads
      "No pudimos cargar tus movimientos"
- [x] Verified by hand: airplane mode produces the failure screen, and **Reintentar** recovers
      once connectivity returns

## Blocked by

- `.scratch/history-persistence/issues/01-forms-that-cannot-save-say-pronto.md`

## Closed

Verified on a device. A cold start reads all three tables and renders the empty History as
honest zeros - Inicio at $0.00 / +0.00% with no `NaN`, and the existing empty states on
Movimientos and Portafolio. Switching tabs, opening the add-movement modal and returning from
the background produce no further read, confirmed by the absence of a new `read ok` line in the
log rather than by inspection.

The failure screen was verified by accident before it was verified on purpose: a real
`PGRST303` put it on screen, and reopening the app recovered - so the screen, its copy and its
recovery path were all exercised by a genuine fault rather than a simulated one.

Two things landed after this slice was written, both consequences of it:

- **Failures carry their cause** (`fault`/`trace`, dev-only). The first version returned a bare
  `{ ok: false }`, so an intermittent failure left nothing behind to diagnose it with. This is
  what named the fault below, one test run later.
- **A newborn token is retried once.** `PGRST303` means the auth server's clock and PostgREST's
  disagree by more than the 30 seconds PostgREST forgives, so a token can be rejected for being
  new rather than wrong - precisely when this app reads, since signing in is what starts the
  read. It is also what the unreproducible sign-out/sign-in error had been all along.
  Development was hiding it: React double-invokes effects there, so a rejected first read was
  silently replaced by a second, and a release build has no such spare attempt.
