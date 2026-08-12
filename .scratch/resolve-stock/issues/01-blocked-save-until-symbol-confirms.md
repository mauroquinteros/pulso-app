# 01 - Guardar movimiento stays closed until the símbolo confirms

Type: **AFK** - every decision is settled in the PRD; nothing here needs a human.

## Parent

`.scratch/resolve-stock/PRD.md` (Part 2)

## What to build

The tracer bullet: the whole confirmation path, end to end, with **no new visuals**. The only
thing that changes on screen is whether **Guardar movimiento** is available.

Leaving **Símbolo** fires a check against the already-deployed `resolve-stock` endpoint. Until
that check comes back confirmed, the save gate is closed. Editing the field withdraws a
previous confirmation and closes the gate again.

Three pieces:

**A pure state machine**, in the shape of the sign-in reducer — same file layout, same
discipline, same testing style. It owns every rule, including the race, so that no rule depends
on the caller remembering to apply it:

```ts
type SymbolCheckState =
  | { status: "unchecked" }
  | { status: "checking"; ticker: string; requestId: number }
  | { status: "confirmed"; ticker: string }
  | { status: "unknown"; ticker: string }
  | { status: "unavailable"; ticker: string };

type SymbolCheckEvent =
  | { type: "edited" }
  | { type: "checkStarted"; ticker: string; requestId: number }
  | { type: "answered"; requestId: number; answer: SymbolAnswer };
```

All five states land in this slice even though two of them render nothing yet — the machine is
written and tested once, and issue 03 only teaches the screen to draw them.

**A transport adapter** that maps a ticker to `confirmed (with the name) | unknown |
unavailable` and hides HTTP completely, so the reducer imports nothing async. `200` is
confirmed, `404` is unknown, and **everything else — including `401`, `500`, `502` and network
failures — is unavailable**, because they share the only fact that matters: no answer came
back. An expired session must never be reported as a bad ticker. Call through the Supabase
client's function invocation so the project key and the user's access token are both attached;
the endpoint checks for both.

**The gate**, threaded through the existing pure buy summary as a third argument next to the
available **Cash**. Both are state derived elsewhere and handed in. The screen must not
re-derive "can this be saved" — one expression, one place.

### The firing rule

A check fires on blur **when there is no answer on file for the text currently in the box**.
That one sentence produces all three behaviours: a confirmed symbol blurred again does not
re-fire, a rejected symbol does not re-fire (the user's move there is to edit, which fires
naturally), and an `unavailable` symbol *does* re-fire, because no answer exists — which is
what makes retrying work without any extra affordance.

### Why the race rule is not optional

Two checks can be in flight after a quick edit, and the ordering genuinely inverts: an edge
function cold start costs seconds where a warm one costs a fraction of that, and the rejection
path is systematically faster than the confirmation path, because a confirmed symbol costs two
provider calls and an unknown one costs a single call. The dangerous direction is a slow
*confirming* answer landing after a fast rejection, because it opens the gate for a symbol that
is no longer in the field. The reducer drops any answer whose request id is not the one in
flight.

The endpoint also echoes the `ticker` in every response. Leave that unused as a mechanism — it
is a debugging aid; the id covers cases the ticker cannot.

## Acceptance criteria

- [ ] Leaving **Símbolo** with `AAPL` runs a check, and once Monto and Precio are valid, **Guardar movimiento** is available
- [ ] Leaving **Símbolo** with `APPL` never opens the gate, no matter what else is filled in
- [ ] Editing a confirmed symbol closes the gate on the first keystroke
- [ ] Blurring an already-confirmed, unchanged symbol fires no second request
- [ ] Blurring after an `unavailable` result fires a fresh check
- [ ] `aapl` confirms as `AAPL`
- [ ] An empty **Símbolo** behaves exactly as it does today, including its existing error
- [ ] The input accepts typing in every state - only the save button is ever gated
- [ ] Saving remains a local operation with no second round trip
- [ ] A reducer test suite exists mirroring `utils/sign-in.test.ts`, covering: an edit withdraws a confirmation, an edit clears a failure, a stale answer is dropped while a newer check is in flight, and an answer arriving with no check in flight is a no-op
- [ ] The buy view-model suite gains cases proving the gate is closed for every status except `confirmed`
- [ ] No visual change to the field: no spinner, no icon, no border-colour change
- [ ] `npm test` and `npm run lint` pass

## Blocked by

None - can start immediately. The endpoint is deployed and verified (PRD Part 1).
