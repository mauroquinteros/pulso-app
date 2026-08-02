# The buy/withdrawal cash gate checks current Cash, not Cash as-of the execution date

A **Movement** can be **backdated** (see `0004`): its `executionDate` may be any
past calendar day. The **sell** form guards its shares field with
`maxSellableAsOf(movements, ticker, executionDate)` — an _as-of-date_ check: you
cannot sell shares you did not yet hold **on that date**. The **buy** and
**withdrawal** forms deliberately do **not** do the analogous thing for cash.
They gate the spend against **current Cash** (today's Buying Power,
`usePortfolio().cash`), with no `cashAsOf` equivalent.

This is intentional, not an oversight. A review flagged the asymmetry as a bug
("no as-of-date cash gate on buy/withdrawal"); we investigated and rejected it.

## Why the shares gate needs the date but the cash gate does not

The distinction is **order-dependence of the derived figures**.

- **Shares feed a chronological figure: Realized P&L.** Realized P&L is
  `(sale price − Average Cost at time of sale) × shares sold`, and Average Cost
  is built by walking movements in date order. So a sell dated _before_ its buy
  is not a harmless reordering — it computes an Average Cost of 0 and fabricates
  the entire proceeds as gain. The order genuinely changes the number. The
  as-of-date gate (and the reducer's oversell clamp) exist to prevent exactly
  that.

- **Cash is an order-independent running sum.** **Cash Impact** per movement is
  fixed by the movement's type and figures, never by its neighbours: deposit
  `+amount`, withdrawal `−amount`, buy `−(price × shares + fee)`, sell
  `+(gross − fee − regulatoryFees)`, dividend `+net`. The sum of these equals
  **Cash** regardless of the order they are added in. Backdating a buy to before
  its funding deposit drives cash negative _at an instant in the reconstructed
  past_, but the **final Cash, holdings, Realized P&L and Total Return all stay
  correct**. Nothing downstream is wrong.

So an as-of-date cash gate would protect no derived figure. It would only forbid
recording a historically-insolvent instant — a data-entry nicety, not a
correctness guarantee — at the cost of a `cashAsOf` walk that mirrors
`maxSellableAsOf` with none of its justification.

## Consequences

- **Buy and withdrawal keep gating against `usePortfolio().cash`.** This is by
  design; do not "fix" it into a date-qualified gate.
- **A backdated spend can exceed the cash held on its execution date.** Accepted.
  The final numbers remain coherent; the app is a reconstruction tool, and the
  bank-boundary truth (**Net Contributions**) and **Cash** both reconcile once
  the full history is entered.
- **If a strict solvency-at-every-instant rule is ever wanted,** it is a new
  product decision (a data-quality warning on backdated entry), not a bug fix —
  and it belongs to buy/withdrawal _and_ would need to be weighed against the
  backdating-is-normal stance of `0004`.
- **The shares side is unchanged.** `maxSellableAsOf` and the oversell clamp stay
  exactly as they are; this ADR draws the line, it does not move it.
