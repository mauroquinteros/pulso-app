# A buy's total is derived from its shares, never from the Monto typed

The buy form takes a **Monto** — the cash the user wants to spend — and a **Precio**, and derives the share count from the two: `Monto / Precio`, rounded to five decimals by `roundShares`. The stored row holds `shares` and `execution_price` and nothing else, so the Monto is not a fact the app keeps. The trade principal is recovered by multiplying the two stored figures back together.

Those are not the same number. Rounding moves the share count by up to `0.000005`, so the recovered principal sits up to `0.000005 × executionPrice` away from the Monto — a fraction of a cent on a $7 share, **three and a half cents** on a $7,000 one.

So **"Total a pagar" and the funds gate are computed from `executionPrice × shares + fee`**, the same expression `cashImpact` uses, rather than from `Monto + fee`. Shares keep rounding to nearest. Storing the Monto is **deferred, not rejected**.

## What it looks like when the two diverge

Cash $1,000.00, Precio $7,000.00, Monto $1,000.00:

```
1000 / 7000  = 0.142857142857...
rounded      = 0.14286
actual cost  = 0.14286 x 7000 = $1,000.02
```

The form promised $1,000.00, the gate passed it (`1000 <= 1000`), and **Cash** landed at -$0.02. The receipt printed $1,000.02 for the same movement, because `buildMovementDetailView` already derives a buy's **Gross Amount** from the Cash Impact rather than from `price × shares` — it had to, or the receipt came a cent short of adding up. Two screens, one buy, two totals.

The **Fee** causes the same divergence far more often, and always did: Monto $1,000 with a $1 Comisión against $1,000 of Cash is refused by a message naming $1,000, which is exactly what the user typed. The rounding did not introduce this; it widened it.

## Considered Options

- **Leave `total = Monto + fee`.** The form stays literally faithful to what the user typed. Rejected on its two symptoms: the gate green-lights a buy that overdraws **Cash**, and the form and the receipt print different totals for the same movement. The justification in the code — _"`executionPrice × shares == Monto`"_ — was simply false, and stating it in a comment is what let it survive.
- **Round the shares down, so Monto is a true ceiling.** Genuinely attractive: the cost could then never exceed what was typed, so the gate could not be wrong in the dangerous direction whatever it was computed from, and no user is ever blocked from typing a round number. Rejected because **it pulls against the deferred fix below** — see the first consequence. It is the right answer only if storing the Monto is off the table permanently, and it is not.
- **Store the Monto, and stop deriving the principal at all.** The correct answer, and the one a reader will reach for. Deferred rather than taken because the surface is a slice, not a change: a migration (a nullable column plus a CHECK that it belongs to buys, mirroring `regulatory_fees_belong_to_sells`), `TradeRow`/`mapTradeRow`, `BuyMovement`, the buy branch of `cashImpact`, `buildBuyMovement`/`summarizeBuy`, and **`deriveHoldingFacts`** — which accumulates `costTotal += m.executionPrice * m.shares`, so **Cost Basis** and **Average Cost** run through the same product — plus eleven test files and the reconciliation corpus in `fixtures/portfolio.ts`.

## Consequences

- **The two rounding rules pull in opposite directions, and this is the trap.** Round-to-nearest minimises the gap between a stored Monto and `shares × price`; round-down maximises it. Take round-down now and store the Monto later and the row holds `grossAmount = $1,000.00` beside `shares × price = $999.95` — a **five**-cent internal contradiction, worse than the two-cent one this decision exists to remove. Anyone "fixing" the rounding to make Monto a ceiling must first decide that the Monto will never be stored.
- **Deferring costs nothing structural, so there is no urgency to reverse it.** The obvious argument for doing it now — that there are zero buy rows to backfill — does not hold: backfilling `grossAmount = shares × price` is trivial and yields exactly the figures the app already derives. What is lost by waiting is the user's typed intent on rows written in the meantime, and nothing else.
- **A user can be blocked from typing a round number.** With $1,000 of **Cash** and an expensive share, Monto $1,000 is refused. That is the decision working: the buy really does cost more than $1,000.
- **The insufficient-funds message names the relationship, not the figures** — "El total a pagar supera tu efectivo." Both numbers are already on screen (Disponible sits above the field; Total a pagar is pinned below, outside the ScrollView), so repeating them is duplication. The defect in the old message was never missing numbers; it pointed at the Monto when the thing that does not fit is the total.
- **The reconciliation invariant is unaffected.** Cash is still the running sum of every movement's Cash Impact, because nothing about what is *stored* or *derived* changed — only what the form displays and gates on.
