# 01 - resolve-stock asks for a quote twice before giving up

Type: **AFK** - one retry inside an Edge Function, no schema and no client change.

## Parent

`.scratch/real-quotes/PRD.md`

## What to build

When `resolve-stock` confirms a **Símbolo** it makes a second call for the price. If that second
call fails, it now **waits briefly and asks once more** before accepting that no price is
available. Everything else about the endpoint is unchanged: the confirmation is still the exact
symbol match, the price is still not part of the verdict, and a **Stock** whose quote never
arrives is still written with its name so the next cron pass can price it.

**Why this matters.** Two provider calls are structurally necessary - the live probes recorded
for this project confirm no free endpoint carries name, price and market moment together. The
consequence is that a **Stock** can be created with no price, and today a single transient blip
is enough to do it. The user confirms a símbolo, saves a **Compra**, and their brand-new
**Holding** reads "sin precio" until the cron next runs - ten minutes during market hours, and
until Monday if it happened on a Saturday. That is the same silent hole ADR 0009 exists to
close, arriving through a different door: the symbol was fine, the second call was not.

One retry, not a loop, and with a short pause rather than immediately. The fault clears in
moments or it is not this fault, and if the failure was the provider's rate limit then an
instant retry makes it worse. The History read already uses exactly this shape against a
clock-disagreement refusal, for the same reasoning - follow it.

This does **not** make the price mandatory. The write-anyway branch stays, `price` stays
nullable, and the client's own filter is what guarantees the app never sees an unpriced Stock.
Making the column NOT NULL was considered and rejected; ADR 0011 records why, including that it
is mechanically incompatible with writing the Stock at all.

## Acceptance criteria

- [ ] A failed quote lookup is attempted a second time after a short pause, once only
- [ ] A quote that succeeds on either attempt is written with its market moment, as today
- [ ] A quote that fails both times still writes the **Stock** with its name, price and market
      moment omitted - so a row already holding a good price keeps it
- [ ] The confirmation verdict is unchanged: an exact symbol match confirms, a fuzzy hit does
      not, an unreachable provider is still told apart from an unknown symbol
- [ ] The retry is not attempted when the provider says the symbol is unknown - there is nothing
      to retry
- [ ] Verified manually against the deployed function, the way `resolve-stock` and
      `refresh-stocks` were both verified before
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

None - can start immediately. It shares no code with the rest of this PRD and can ship before or
after any of it.

## Closed

Type-checked with `deno check` - the first time this file has been checked by
anything, since `tsc` cannot read the `Deno` global and the app's config excludes
the directory. Clean, as is `refresh-stocks`, so the retry introduced nothing.

The retry itself is proven by a harness that drove the real extracted functions
against a stubbed `fetch`: exactly two attempts and never a third, ~250ms apart,
one attempt when the first succeeds, `null` after two failures so the write-anyway
branch still fires, and the write still omitting `price` rather than nulling it.

Deployed and confirmed live as the current build. **The live happy path is not
verified**: the endpoint requires a real signed-in user's token, sign-in is Google
OAuth only, and no token is obtainable headlessly. It is also unreachable from the
UI while Compra is "Pronto" - a `curl` with a session token is the only route.
