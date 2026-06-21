# Scope boundaries (v1)

Pulso v1 deliberately excludes several real-but-uncommon events to stay simple. Recorded here so they aren't re-litigated, and aren't mistaken for accidental gaps.

## Out of scope

- **USD only.** All amounts — deposits, prices, fees, values — are USD. No currency conversion or FX, even though Hapi is a gateway from local currency (e.g. PEN) into US markets.
- **No standalone account fees.** Every fee attaches to a buy, sell, deposit, or withdrawal. Hapi's $4.99/month inactivity fee is not modeled.
- **No corporate actions.** Stock splits, reverse splits, mergers, and spinoffs are not modeled.
- **No share transfers (ACATS).** Shares enter only via a buy and leave only via a sell.

## Consequences

- If Hapi ever charges an inactivity fee, the app's **Cash** will drift from the real Hapi balance, since no movement absorbs it.
- If a held ticker splits, its share count and **Average Cost** will diverge from reality until manually corrected.
- Externally transferred-in shares have no cost basis in the app.

Revisit any of these when a real holding actually triggers it.
