# PRD — Símbolo confirmation (`resolve-stock`)

**Feature:** `resolve-stock`
**Implements:** `docs/adr/0009-a-buy-is-blocked-until-its-symbol-is-confirmed.md`
**Sibling of:** `supabase/functions/refresh-stocks` (`docs/adr/0008-prices-arrive-by-cron-not-by-request.md`)
**Provider facts:** `.scratch/stocks-table/finnhub-api.md` (live probes, not docs).
**Supersedes on one point:** `.scratch/buy-ux/PRD.md` — its user stories 6 and 16 and its
"Símbolo is free text" constraint no longer describe the form.
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Scope:** the **Compra** form only. Not Venta, not Dividendo — see Out of Scope.

> **Status.** This PRD has two halves at different stages.
> **Part 1, the endpoint — BUILT.** Deployed and verified against the live project on
> 2026-08-10; results are recorded below, and it does not need re-verifying.
> **Part 2, the form — NOT STARTED.** Every decision in it is settled, none of it is written.

---

## Problem Statement

A Pulso user types a **ticker** into **Símbolo** and the form believes them. `APPL` saves as
cleanly as `AAPL`, and the failure is silent and permanent: the derived **Holding** has no
price, reads **"Sin precio"** forever, and the user's **Total Portfolio Value** is quietly
short by that position. Nothing in the app ever explains why, because from the app's side
nothing went wrong — a movement was recorded exactly as typed.

Underneath, `stocks` has no way to gain a row. `refresh-stocks` iterates the table and updates
prices; it never inserts, and says so in its own header. So the table only ever holds what was
seeded by hand, and every symbol outside it is priceless by construction.

ADR 0009 settled the rule — a symbol the provider does not know cannot be recorded at all —
and left both halves unbuilt.

## Solution

**Símbolo confirms itself against the market-data provider while the user fills the rest of
the form**, and the confirmation registers the **Stock** as it goes.

The user types a ticker and moves on to **Monto comprado**. As they leave the field, a check
fires; a spinner sits in the corner of the input while it runs. A moment later the border
turns teal and a check mark appears — the symbol is real, and the **Stock** is now registered
with a live price that the cron will keep fresh. The user never waited for it, because it
happened during work they were doing anyway.

If the symbol does not exist, the border turns red and one line of Spanish appears beneath it,
in the slot the form already uses for its other field errors. **Guardar movimiento** stays
disabled until the field is confirmed. The input itself is never locked: the fix is to correct
the ticker, which clears the error on the first keystroke and re-checks on the next blur.

A failure to *reach* the provider says something different from a symbol that does not exist,
because they ask the user to do different things — one means fix your typing, the other means
your typing is fine, try again.

Confirmation and registration are **the same act**, which is what makes a typo unable to enter
`stocks` by construction, and what means the **Holding** the user is about to create already
has a price rather than waiting for the next cron pass.

From the user's perspective:

> type **AAPL** → tap into **Monto** → spinner → teal check → keep filling the form →
> **Guardar movimiento** is available.

And when it goes wrong:

> type **APPL** → tap into **Monto** → spinner → red border, "No encontramos ese símbolo." →
> fix it to **AAPL** → red clears as you type → blur → teal check.

## User Stories

1. As a Pulso user, I want **Símbolo** to be checked against the market as soon as I leave the field, so that I find out about a bad ticker while I am still filling the form and not days later.
2. As a Pulso user, I want the check to run while I fill in **Monto comprado**, so that I never sit and wait for it.
3. As a Pulso user, I want to see that a check is running, so that a pause between typing and confirmation does not look like the app ignoring me.
4. As a Pulso user, I want a confirmed symbol to be visibly confirmed, so that I know the form accepted it without having to look down at the save button.
5. As a Pulso user, I want the confirmation mark to sit inside the **Símbolo** field, so that it appears where I am already looking rather than somewhere else on the screen.
6. As a Pulso user, I want **Guardar movimiento** to stay disabled until the symbol is confirmed, so that I cannot record a buy for a company that does not exist.
7. As a Pulso user, I want a symbol the provider does not know to be refused outright, so that I never end up with a **Holding** that reads "Sin precio" for a reason nobody can explain.
8. As a Pulso user, I want to be told in Spanish that the symbol was not found, so that I understand what is wrong rather than only seeing a red box.
9. As a Pulso user, I want a different message when the app could not reach the provider, so that I do not retype a correct ticker over and over trying to fix something that is not broken.
10. As a Pulso user on a bad connection, I want to be able to retry simply by leaving the field again, so that a temporary network problem does not trap me in the form.
11. As a Pulso user, I want to keep typing in **Símbolo** no matter what state the check is in, so that a rejected symbol is something I can correct immediately.
12. As a Pulso user, I want the red border and message to disappear the moment I start correcting the symbol, so that the form stops shouting at me about a value I am already fixing.
13. As a Pulso user, I want editing a confirmed symbol to withdraw that confirmation, so that a confirmation for `AAPL` can never authorize saving `AAPLX`.
14. As a Pulso user, I want the save button to close again when I edit a confirmed symbol, so that the gate always describes what is in the field right now.
15. As a Pulso user, I want the app not to re-check a symbol it has already confirmed, so that leaving and re-entering the field costs nothing.
16. As a Pulso user who edits the symbol twice quickly, I want the field to show the verdict for what I typed last, so that a slow answer about an old symbol can never open the save gate for a different one.
17. As a Pulso user, I want an empty **Símbolo** to keep behaving exactly as it does today, so that the existing "Ingresa un símbolo." error is not replaced by something less clear.
18. As a Pulso user, I want the teal accent on **Símbolo** to mean the symbol is real, so that the colour is telling me something rather than congratulating me for typing.
19. As a Pulso user, I want lowercase input to work, so that `aapl` and `AAPL` are the same symbol.
20. As a Pulso user, I want the confirmed **Stock** to be registered when I confirm it, so that its price is already being maintained by the time I own it.
21. As a Pulso user, I want saving to stay instant once the symbol is confirmed, so that recording the movement is not slowed down by a second round trip.
22. As a Pulso user, I want an expired session to look like a temporary failure rather than a bad ticker, so that I am not told a real company does not exist.
23. As a Pulso user holding ETFs, I want `VOO` to confirm exactly like a common stock, so that half my portfolio is not refused by the form.
24. As a Pulso user, I want only US listings to confirm, so that a foreign listing quoting in another currency never enters my portfolio labelled as dollars.
25. As a Pulso user, I want the market-data key to live on the server, so that it never ships inside the app I install.
26. As a Pulso user, I want the confirmation endpoint to refuse callers who are not signed in, so that the app's own key being readable inside the bundle does not let a stranger write into the shared **Stock** list.
27. As a developer, I want the confirmation lifecycle expressed as a pure state machine, so that the rules can be tested without a network, a device, or a rendered screen.
28. As a developer, I want the save gate to stay in one place, so that "can this be saved" never has two answers that can drift apart.

---

# Part 1 — The endpoint (built)

## The contract

`POST /functions/v1/resolve-stock` — **POST, not GET, because the call writes.**

```jsonc
// request
{ "ticker": "AAPL" }
```

| Status | Body | Means |
|---|---|---|
| `200` | `{ ticker, name, price, quotedAt }` | Confirmed and stored. `price`/`quotedAt` are `null` when the quote leg failed — the symbol is still confirmed. |
| `400` | `{ error: "invalid_symbol" }` | Not a string, empty, over 10 chars, or characters a ticker cannot contain. Never reaches the provider. |
| `404` | `{ error: "unknown_symbol", ticker }` | The provider answered, and it has no such US listing. |
| `502` | `{ error: "provider_unavailable", ticker }` | We could not ask. |
| `500` | `{ error: "write_failed", ticker }` | Confirmed, but the row did not land. |
| `401` | `{ error: "unauthorized" }` | No signed-in user behind the call. |
| `405` | `{ error: "method_not_allowed" }` | |

All four failure bodies block the save. They stay distinct because ADR 0009 is explicit that
*"the provider says no"* and *"we could not ask"* must never render the same the day an offline
write queue exists — and `write_failed` is the one an operator needs to see in the logs, not a
user.

Every answer echoes the `ticker` it is about. See the race decision in Part 2 for what the
client actually does with that.

## Behaviour

1. **Confirmation is an exact symbol match**, never a non-empty result. Finnhub's `/search` is
   fuzzy — `APPL` returns eleven hits (`AAPL`, `AMAT`, `APP`, …) and none of them is `APPL`. A
   count check would wave through the single most likely typo in the app.
2. **`exchange=US` is mandatory.** Unfiltered, `AAPL` also matches its Toronto, Mexican,
   Romanian and Santiago listings, each quoting in its own currency. ADR 0002 fixes Pulso to
   USD with no FX; this filter is what makes that true at the boundary rather than merely
   assumed. Today it is protected only by accident — the Símbolo field strips non-letters, so
   `AAPL.MX` cannot be typed.
3. **The name comes from `/search`'s `description`**, for stocks and ETFs alike.
   `/stock/profile2` answers `{}` for `VOO` and `/etf/profile` is premium, so profile2 is not
   in this design at all.
4. **A price of 0 is never written.** An unknown symbol answers HTTP 200 with every figure
   zeroed; `t === 0` is the tell. A stored 0 reads as a real price with `priceAvailable: true`
   and drops that holding's Market Value to nothing, while a missing price already has a
   correct, tested path (exclude + flag).
5. **A failed quote never blanks an existing price.** The upsert omits `price` and `quoted_at`
   rather than nulling them, so `ON CONFLICT` leaves a good stored price alone. Same rule
   `refresh-stocks` follows by skipping.
6. **Two provider calls on the happy path** (`/search`, then `/quote`), one on every rejection
   — the search decides the verdict, so nothing else runs when it says no.

## Authorization

Two layers, both required:

- **`verify_jwt = true`** at the platform rejects a token this project did not sign, before the
  function boots. (This is the opposite of `refresh-stocks`, whose caller is a cron with no
  user token at all and which is gated by a dedicated `CRON_KEY`.)
- **`supabase.auth.getUser(token)`** inside the function rejects a token that is validly signed
  but belongs to nobody.

The write itself uses the service role, because `stocks` has RLS on with deliberately no write
policy: the publishable key can never write there, by construction. The Finnhub key stays in
function secrets and never reaches the app bundle — ADR 0008's rule, unchanged.

## Verification

**Run against the deployed function on 2026-08-10. 1–6 pass; 7 is not yet exercised.**

1. No `Authorization` header → `401`. ✅
2. Publishable key as the bearer token → `401`. ✅ This is the one the in-function check exists
   for, and it earned its place — see the finding below.
3. Signed-in user, `AAPL` → `200`, row written with `APPLE INC` and a `quoted_at` of
   `20:00:00Z`, the closing bell to the second. ✅
4. `APPL` → `404 unknown_symbol`, **no row created**. ✅ The assertion that matters most in this
   whole document.
5. `VOO` → `200`, `VANGUARD S&P 500 ETF`. ✅ The ETF path that killed `profile2`.
6. `aapl` → `200` for `AAPL`, one row, not two. ✅ Plus `AAPL.MX!!` → `400`, and `GET` → `405`.
7. A symbol with an existing good price, called while the quote leg fails → the stored price is
   unchanged, not nulled. **Not tested** — it needs the provider to fail on demand, and nothing
   here can arrange that. The behaviour rests on the upsert omitting the columns rather than
   nulling them, which is visible in the code but unproven.

### What the two auth layers actually do

Probed separately, because a `401` looks the same from the outside whichever layer produced it:

- The **platform** refuses a forged HS256 token (`UNAUTHORIZED_LEGACY_JWT`) and a request with
  no credential at all (`UNAUTHORIZED_NO_AUTH_HEADER`). It also accepts a real user token
  **with no `apikey` header**, so the concern that it might not understand this project's
  asymmetric signing keys was unfounded.
- But it treats a valid **publishable key in the `apikey` header as sufficient on its own**: a
  request with no `Authorization` header at all reached the function. Steps 1 and 2 above were
  answered by `getUser()` inside the function, not by the platform.

So the layers are not redundant, and picking platform-only would have shipped an endpoint that
anyone with the app bundle could write to `stocks` through.

---

# Part 2 — The Compra form (not started)

## The confirmation is a five-state machine

`unchecked · checking · confirmed · unknown · unavailable`

`unchecked` is deliberately not called `idle` — the field can be full of text and still be in
it. It covers an empty field, a field being typed into, and a field whose previous confirmation
was withdrawn by an edit.

The shape that encodes the decisions:

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

## When a check fires

**On blur, when there is no answer on file for the text currently in the box.** That single
rule produces every behaviour wanted:

- Confirmed `AAPL`, blur again with `AAPL` unchanged → an answer exists, nothing fires.
- `unknown` for `APPL`, blur again → an answer exists and it will not change, nothing fires.
  The user's move here is to edit, which fires naturally.
- `unavailable` for `AAPL` → **no answer exists**, so blurring again re-checks. The retry falls
  out of the rule and needs no separate affordance.

## Any edit withdraws the confirmation

A keystroke returns the machine to `unchecked`, closing the save gate and clearing any error
styling. Without this, a confirmation for `AAPL` would keep authorizing a field that now says
`AAPLX`.

## The race is resolved inside the reducer

Each check carries a request id. The reducer drops any `answered` event whose id is not the one
currently in flight. The rule lives in the machine, not in the caller's discipline — the same
choice the sign-in reducer makes when it guards every outcome on `status === "signing"`.

This is not theoretical. Two situations invert the expected ordering: an edge function cold
start can cost seconds while a warm one costs a fraction of that, and the **rejection path is
systematically faster than the confirmation path**, because a confirmed symbol costs two
provider calls and an unknown one costs a single call. A slow *confirming* answer landing after
a fast rejection is the dangerous direction, because it opens the gate.

The endpoint echoes the `ticker` in every response. That is kept, but as a debugging aid rather
than the mechanism — matching on the id also covers two checks for the same ticker, which
matching on the ticker cannot.

## The save gate stays in the buy view model

The confirmation status is passed into the existing pure summary function as a third argument,
next to the available **Cash**. Both are state derived elsewhere and handed in, and keeping them
together means there is exactly one expression of "can this be saved" rather than a partial
answer in the view model and a correction in the screen.

The gate is **strict**: the button is disabled unless the status is `confirmed`. The alternative
— leaving it enabled during `checking` and having the press wait on the in-flight answer — was
rejected. It lets the app accept a tap and *then* reject the save, which is a worse moment to
learn the symbol is wrong than the field turning red while the user is still looking at it.

## The transport is an adapter with a three-outcome result

One async function maps a ticker to `confirmed (with the name) | unknown | unavailable`, hiding
HTTP entirely so the reducer imports nothing async. The mapping:

| Response | Result |
|---|---|
| `200` | `confirmed` |
| `404` | `unknown` |
| everything else, including network errors | `unavailable` |

Folding `401`, `500`, `502` and transport failures into one outcome is deliberate: they share
the only fact the user needs, which is that no answer came back. An expired session must not be
reported as a bad ticker. `400` is unreachable from this form, because the field strips
non-letters before anything is sent.

The call goes through the Supabase client's function invocation, which attaches both the project
key and the user's access token — the pair the endpoint's two auth layers expect.

## What the user sees

| State | Border | Inside the field | Message slot |
|---|---|---|---|
| `unchecked` | neutral | — | existing "Ingresa un símbolo." when touched and empty |
| `checking` | neutral | spinner | — |
| `confirmed` | teal | teal check mark | — |
| `unknown` | red | — | "No encontramos ese símbolo." |
| `unavailable` | red | — | "No pudimos verificar el símbolo. Vuelve a intentar." |

The message reuses the conditional line the form already renders under this exact field, so it
costs no layout — the slot occupies space only when there is something to say.

The teal accent is **retied to `confirmed`**. Today the field turns teal whenever it is
non-empty, which means `APPL` gets the same encouraging border as `AAPL`; after this the colour
reports a fact.

The check mark is teal rather than the palette's `positive` green. Green means *gain* everywhere
else in the app, and on a form surrounded by money a green mark beside a ticker invites the
reading "AAPL is up".

The two failure strings follow the voice of the existing sign-in error copy — what happened,
then what to do — and they stay distinct for the reason that file already documents: telling
someone to check their internet when the server is the problem sends them to fix something that
is not broken.

## The input is never locked

Every state accepts typing. Only **Guardar movimiento** is gated.

## Nothing new is persisted on the client

The response's `name` is not shown and not stored; the `price` is discarded. The endpoint has
already written the **Stock**, and a Stock is shared, never owned — copying its name onto one
user's **Movement** would freeze a fact that lives elsewhere. Saving the movement remains a
purely local operation with no second round trip.

---

## Testing Decisions

A good test here states a rule a user would recognize and asserts only what the module promises
from the outside. For the machine that means feeding events and asserting the resulting state —
never reaching into how the reducer is written. Nothing renders a screen and nothing touches the
network.

**The state machine — tested, and thoroughly.** It is the deep module of this feature: the
entire asynchronous lifecycle collapsed into a pure transition table, with an interface of
`(state, event) => state` that will not change. The cases worth writing:

- an edit withdraws a confirmation
- an edit clears a failure
- a stale `answered` event is dropped while a newer check is in flight
- an `answered` event arriving with no check in flight is a no-op
- `unknown` and `unavailable` are distinct states and carry distinct copy, word for word
- the copy contains no characters that merely look like ASCII

Prior art: `utils/sign-in.test.ts` — same shape, same discipline, including its assertion on the
exact error strings and its guard against typographic lookalikes.

**The save gate — tested through the buy summary.** The existing suite for the buy view model
gains cases proving the gate is closed for every status except `confirmed`, and that an
otherwise perfect form cannot be saved on an unconfirmed symbol. Prior art:
`components/add-movement/buy-view-model.test.ts`.

**The transport adapter — not tested.** Its only logic is the status-to-outcome mapping, and a
test would assert against a mocked `fetch` that proves the mock, not the endpoint. The real
verification already happened against the deployed function and is recorded in Part 1.

**The screen — not tested.** No component tests exist in this repo, and this feature is not the
place to introduce that infrastructure.

## Out of Scope

- **Venta and Dividendo.** Neither can introduce a new symbol. Venta gates on held shares, so
  its ticker was confirmed by the buy that created the position — structurally incapable of
  being new. Dividendo derives no **Holding**, so it needs no price and cannot open the hole
  this exists to close; `docs/adr/0009` records the reasoning and the residual risk.
- **Reading prices from the `stocks` table.** Its own PRD. Until it lands, holdings are still
  valued from the hardcoded mock map, which means a correctly confirmed `NVDA` will still show
  "Sin precio" — the feature is correct but its payoff is not visible yet.
- **Checking `stocks` before calling the provider.** Every check is a provider round trip, even
  for a ticker already registered. Considered and deferred.
- **Autocomplete, symbol search, suggestions.** The provider returns eleven plausible
  alternatives for `APPL` and the design shows none of them. Confirming what the user typed is a
  different feature from helping them choose.
- **Catching a valid symbol for the wrong company.** `MET` is a real company, and a user reaching
  for Meta gets a confirmed field. Confirmation proves existence, never intent.
- **Making `BRK.B` typeable.** The field still strips non-letters. The endpoint accepts dots, so
  this is now a form-side limitation only.
- **No `figi`.** ADR 0009 names it as the escape hatch if a delisted ticker is ever reassigned to
  an unrelated company. Nothing is built for that.
- **Rate limiting.** The provider's free tier is 60 calls/min, shared with a cron that fires
  every 10 minutes. With one test user this is not close; with a symbol field that re-checks on
  every blur it eventually is.

## Open questions

- **The provider's `name` casing is inconsistent** — `APPLE INC` on the exact hit, `Apple Inc`
  inside the fuzzy list. It is stored as received, so the stock detail screen will show whatever
  Finnhub felt like. Normalizing is a UI decision nobody has made.
- **Abandoned forms leave real rows.** ADR 0009 accepts this: the check writes before the
  movement is saved, so backing out registers a genuine, priced Stock that nobody holds.
  Harmless, and waiting when someone does buy it — but it also means the provider quota is spent
  by typing, not by saving.

## Further Notes

Some of the design's sharper edges only appear when reading the form:

- **Símbolo is the first field, and the gate also needs Monto and Precio below it.** In the
  normal top-to-bottom flow the user cannot reach the save button without having left Símbolo
  long ago, which is why the strict gate costs so little. It bites exactly once, for the user
  who edits the symbol *last* and taps a disabled button that swallows the tap. Accepted.
- The save button holds a one-shot latch that never resets. Any future move toward an optimistic
  gate has to deal with it, or a press that ends in a rejected symbol leaves the button
  permanently unpressable.
- No new domain language came out of this. The states are UI mechanics; `CONTEXT.md`'s **Stock**
  entry and its note that "Símbolo" and `ticker` both name the identifier already cover the
  vocabulary.
