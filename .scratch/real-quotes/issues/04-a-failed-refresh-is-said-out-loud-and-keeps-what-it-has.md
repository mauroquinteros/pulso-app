# 04 - A failed refresh is said out loud, and keeps the prices it already has

Type: **AFK** - the wording is decided and the placement has precedent.

## Parent

`.scratch/real-quotes/PRD.md`

## What to build

When a **Quote** refresh fails, the app keeps the Quotes it already has and **says the refresh
failed**.

This is a fourth situation, and the whole issue is about not confusing it with the other three. A
Quote can be **not yet read**, **impossible to obtain**, or absent because the **Stock** has none
- three different sentences, all of them about a Quote the app does not have. A failed refresh is
none of those: the app **has** a Quote and could not find out whether a newer one exists.

So the two obvious reactions are both wrong. Throwing the Quotes away would report a fault as an
absence - one dropped packet would blank a portfolio that was correct a second earlier, and under
issue 05 that means the headline stops printing entirely. Saying nothing is worse in a quieter
way: it presents a Quote of unknown age as current, which is the exact hazard the **Stale Price**
entry exists to name.

Keep the prices, show a banner.

**This needs no market calendar, and that is deliberate.** Announcing that an attempt failed is a
fact about the **app**. **Stale Price** is a judgement about a Quote the app has, measured against
market activity rather than against the clock - a Friday close read on a Sunday morning is not
stale, and deciding that requires knowing when the market was open, including holidays. None of
that is needed here and none of it should creep in. The banner says the prices could not be
updated. It does not say how old they are.

The store rule is the load-bearing half: a failed read must leave previously-held Stocks
untouched, rather than replacing them with nothing. That rule is what the store test in issue 02
was scaffolded for.

One judgement call worth making explicitly: a user holding **nothing** has no prices to be stale,
so the banner should not appear for them. A failed refresh with an empty portfolio is not news.

## Acceptance criteria

- [ ] A failed refresh leaves the Stocks already in hand exactly as they were
- [ ] A failed refresh shows a banner saying the prices could not be updated
- [ ] The banner does not state or imply the age of the prices on screen
- [ ] A later successful refresh clears the banner and replaces the Stocks
- [ ] A user with no **Holdings** sees no banner
- [ ] A failed **first** read - nothing previously in hand - is unchanged from issue 02 and does
      not show this banner, since there is nothing it is failing to refresh
- [ ] The wording is distinguishable from the History's "no pudimos cargar tus movimientos", which
      names a different failure
- [ ] A store test covers a failed re-read leaving previously-held Stocks untouched
- [ ] Verified on a device with a **Holding** present: break connectivity, foreground the app, see
      the banner with the prices still shown
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

- `.scratch/real-quotes/issues/03-prices-are-asked-for-again-when-the-app-comes-back.md`

## Closed

The store half is covered: a failed read leaves the Stocks already in hand
untouched, asserted directly. The banner's decision is a pure function and is
tested across every combination that matters.

**The banner itself has never been rendered.** It needs a Holding on screen and a
failed refresh, so it waits with the rest for the Compra form. Note the anti-flicker
guarantee moved into the store afterwards - only an answer moves the status, so a
refresh in flight cannot blank the banner - which removed the `useRef` this issue
originally shipped.
