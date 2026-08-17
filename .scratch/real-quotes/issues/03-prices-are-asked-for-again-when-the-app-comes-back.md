# 03 - Prices are asked for again when the app comes back

Type: **AFK** - one more trigger on a read that already exists.

## Parent

`.scratch/real-quotes/PRD.md`

## What to build

The **Quote** read fires a second way: when the app returns to the foreground.

Issue 02 reads prices when the tabs mount, which covers a cold start and every sign-in. It does
not cover the commonest thing a phone does - the user switches to something else and comes back
twenty minutes later. Without this, a session left open all morning shows the prices it fetched
when it opened, and since the **Stale Price** signal is deliberately not lit yet, **nothing on
screen would say so**. That is the situation `CONTEXT.md` warns about in as many words: a stale
price looks exactly like a good one.

This is where the **Quote** and the **History** part company, and the contrast is the point. A
History is re-read only when it is genuinely gone, because **Movements** do not change behind the
user's back - so its read triggers on an `unread` status and explicitly not on returning from the
background. A Quote is the opposite: the cron rewrites it every ten minutes through the trading
day, so every time the user comes back is a reason to ask again.

Nothing else changes. The read is the same read, still unfiltered, still gating nothing, still
independent of the History. A refresh that succeeds replaces the Stocks in hand. What happens
when it **fails** is issue 04 - until that lands, a failed refresh behaves exactly as a failed
first read does today.

Note this deliberately does **not** add a timer or a pull-to-refresh gesture. A timer would need
market-hours gating to avoid polling all night for a value that cannot have changed, and market
hours is the calendar work deferred with the Stale signal. A pull would promise control the user
does not have: under ADR 0008 the client only ever selects from `stocks` and can never reach the
provider, so pulling twice inside one cron window returns the identical number and reads as
broken.

## Acceptance criteria

- [ ] Returning the app to the foreground fires the **Quote** read
- [ ] Sending the app to the background fires nothing
- [ ] A successful refresh replaces the Stocks in hand and updates **Market Value** on screen
      without a relaunch
- [ ] The refresh does not gate any screen and does not disturb the **History**
- [ ] No timer and no pull-to-refresh gesture is introduced
- [ ] The listener is cleaned up when the tabs unmount, so signing out does not leave one running
- [ ] Verified on a device: background the app, wait, foreground it, and see the read fire
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

- `.scratch/real-quotes/issues/02-a-holding-is-valued-from-the-stocks-table.md`

## Closed

**Not verified on a device.** The foreground re-read, and the distinction it turns
on - a true background return re-reads, a notification shade or Control Centre pull
does not - are exactly what a device test would exercise and nothing else can. This
repo has no React renderer (`environment: "node"`, `**/*.test.ts` only), so the hook
is covered by neither test nor device.

The `[stocks] read ok:` trace makes it a one-glance check whenever the app is next
run: background it fully and return, expect a new line; pull down the shade and
dismiss, expect none.
