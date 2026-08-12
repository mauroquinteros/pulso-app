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
- [x] Leaving **Símbolo** with `APPL` never opens the gate, no matter what else is filled in
- [x] Editing a confirmed symbol closes the gate on the first keystroke
- [x] Blurring an already-confirmed, unchanged symbol fires no second request
- [x] Blurring after an `unavailable` result fires a fresh check
- [ ] `aapl` confirms as `AAPL`
- [x] An empty **Símbolo** behaves exactly as it does today, including its existing error
- [x] The input accepts typing in every state - only the save button is ever gated
- [x] Saving remains a local operation with no second round trip
- [x] A reducer test suite exists mirroring `utils/sign-in.test.ts`, covering: an edit withdraws a confirmation, an edit clears a failure, a stale answer is dropped while a newer check is in flight, and an answer arriving with no check in flight is a no-op
- [x] The buy view-model suite gains cases proving the gate is closed for every status except `confirmed`
- [x] No visual change to the field: no spinner, no icon, no border-colour change
- [x] `npm test` and `npm run lint` pass

## Blocked by

None - can start immediately. The endpoint is deployed and verified (PRD Part 1).

## Comments

**2026-08-12 - built, unverified on a device.**

Written:

- `utils/symbol-check.ts` - the five-state machine, plus `shouldCheck(state, ticker)`, which is
  the firing rule as a predicate. It lives beside the reducer rather than in the screen for the
  same reason the race does: so no rule depends on the caller remembering it.
- `utils/symbol-check.test.ts` - 17 cases.
- `lib/resolve-stock.ts` - the transport seam. `invoke` returns `{ error, response }`, so the
  status comes off `response?.status` and never needs a try/catch: it reports transport failure
  as an error value rather than a rejection (verified in `@supabase/functions-js` 2.98.0).
- `components/add-movement/buy-view-model.ts` - `summarizeBuy` takes the status as a required
  third argument. Required rather than defaulted, so no caller can acquire the old, ungated
  behaviour by omission.
- `app/add-movement/buy.tsx` - blur fires, edit withdraws.

Two criteria stay unticked because both are runtime observations against the live endpoint and
nothing here exercises a rendered screen (the PRD's Testing Decisions rule out component tests).
Everything they depend on is covered from the other side: the field already uppercases on
every keystroke, and the endpoint's `aapl` case is verified in PRD Part 1, step 6.

Deviation from the issue as written: the Spanish failure copy is **not** in this slice. The
machine carries `unknown` and `unavailable` as distinct states, but nothing reads a message off
them yet, so the strings land in issue 03 with the code that renders them.
