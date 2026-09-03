# A buy's total is derived from its shares, never from the Monto typed

The buy form takes a **Monto** — the cash the user wants to spend — and a **Precio**, and derives the share count from the two: `Monto / Precio`, rounded to five decimals by `roundShares`. The stored row holds `shares` and `execution_price` and nothing else, so the Monto is not a fact the app keeps. The trade principal is recovered by multiplying the two stored figures back together.

Those are not the same number. Rounding moves the share count by up to `0.000005`, so the recovered principal sits up to `0.000005 × executionPrice` away from the Monto — a fraction of a cent on a $7 share, **three and a half cents** on a $7,000 one. Read that as "only expensive shares matter" and you will draw the wrong conclusion; the section below measures what actually happens.

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

### The visible case is the benign one

The example above is the **legible** failure: you at least see $1,000.02 refused against $1,000.00, and the refusal makes sense once you look. The everyday failure shows two identical numbers with a refusal between them, and it is far more common.

Measured over every price from $1.00 to $4,000.00, with the Monto typed equal to the available Cash — **118,926 of them, about 30%, print a total identical to Disponible and still refuse the buy.** Under $1,000 a share it is **49.7%**.

The reason is arithmetic. The drift becomes _visible_ at two decimals only when `0.000005 × price` exceeds half a cent, which needs a share over $1,000. Below that it is always sub-half-cent, so `formatUSD` hides it completely — and it lands above the Monto roughly half the time. `$232.14`, `$445.30`, `$98.76` and `$27.41` all do it:

```
$232.14 share, Monto $1,000.00, Cash $1,000.00
1000 / 232.14 = 4.307745...  ->  4.30775 shares
true total    = 232.14 x 4.30775 = $1,000.001085
shown         = $1,000.00        refused against $1,000.00
```

This is the number that justifies the decision. A reader who sees only the $7,000 example will conclude the problem is exotic and may undo it.

## Considered Options

- **Leave `total = Monto + fee`.** The form stays literally faithful to what the user typed. Rejected on its two symptoms: the gate green-lights a buy that overdraws **Cash**, and the form and the receipt print different totals for the same movement. The justification in the code — _"`executionPrice × shares == Monto`"_ — was simply false, and stating it in a comment is what let it survive.
- **Round the shares down, so Monto is a true ceiling.** Genuinely attractive: the cost could then never exceed what was typed, so the gate could not be wrong in the dangerous direction whatever it was computed from, and no user is ever blocked from typing a round number. Rejected because **it pulls against the deferred fix below** — see the first consequence. It is the right answer only if storing the Monto is off the table permanently, and it is not.
- **Store the Monto, and stop deriving the principal at all.** The correct answer, and the one a reader will reach for. Deferred rather than taken because the surface is a slice, not a change: a migration (a nullable column plus a CHECK that it belongs to buys, mirroring `regulatory_fees_belong_to_sells`), `TradeRow`/`mapTradeRow`, `BuyMovement`, the buy branch of `cashImpact`, `buildBuyMovement`/`summarizeBuy`, and **`deriveHoldingFacts`** — which accumulates `costTotal += m.executionPrice * m.shares`, so **Cost Basis** and **Average Cost** run through the same product — plus eleven test files and the reconciliation corpus in `fixtures/portfolio.ts`.

## Consequences

- **The two rounding rules pull in opposite directions, and this is the trap.** Round-to-nearest minimises the gap between a stored Monto and `shares × price`; round-down maximises it. Take round-down now and store the Monto later and the row holds `grossAmount = $1,000.00` beside `shares × price = $999.95` — a **five**-cent internal contradiction, worse than the two-cent one this decision exists to remove. Anyone "fixing" the rounding to make Monto a ceiling must first decide that the Monto will never be stored.
- **Deferring costs nothing structural, so there is no urgency to reverse it.** The obvious argument for doing it now — that there are zero buy rows to backfill — does not hold: backfilling `grossAmount = shares × price` is trivial and yields exactly the figures the app already derives. What is lost by waiting is the user's typed intent on rows written in the meantime, and nothing else.
- **A user can be blocked from typing a round number.** With $1,000 of **Cash** and an expensive share, Monto $1,000 is refused. That is the decision working: the buy really does cost more than $1,000.
- **The insufficient-funds message names the relationship, not the figures** — "El total a pagar supera tu efectivo." Both numbers are already on screen (Disponible sits above the field; Total a pagar is pinned below, outside the ScrollView), so repeating them is duplication. The defect in the old message was never missing numbers; it pointed at the Monto when the thing that does not fit is the total.
- **The total is rounded to the cent, so the figure the gate compares is the figure on screen.** Left raw it carries sub-cent precision `formatUSD` hides, and the form would print "Total a pagar $1,000.00" beside "Disponible $1,000.00" and refuse anyway — the contradiction measured above. Rounding buys that at the price of the opposite error: a buy may now overdraw **Cash** by _under half a cent_. That is the better half of the trade, because a refusal nobody can explain is worse than a residue nobody can see.
- **That residue surfaced once, and was fixed at its source rather than at the formatter.** `computeCash` summed raw Cash Impacts and rounded once at the end, so the sub-cent overdraw survived into the balance as `-0` — `Math.round` keeps the sign of what it rounds away — and **Efectivo rendered as "-$0.00"**. `computeCash` now rounds each impact before summing, which is what every other consumer of `cashImpact` already did; the detail receipt, the movements list and the stock detail all round it before showing it. A signed zero is a wrong _value_, not a formatting quirk, and patching `formatUSD` would have left it travelling into every figure derived from Cash.
- **A Monto too small to buy any shares is refused.** The gate tests `shares > 0` rather than `amount > 0 && price > 0`, which it implies. A cent against a $7,000 listing derives `0.0000014` shares and rounds to none at all, so both old terms were true while the buy acquired nothing — the form offered to save a purchase of nothing for $0.00. It now says "El monto es muy pequeño para ese precio."
- **The reconciliation invariant moved, and came out stronger.** Cash is no longer a rounded sum of raw impacts but the sum of rounded ones, so it is now literally the total of the per-row figures the movements list prints, rather than approximately so. Nothing about what is _stored_ changed; what moved is where the cents are taken. One seam remains: an impact landing on an exact half-cent still prints a cent more in the list than it moves in the balance, because `round2` sends ties toward +Infinity while the display rounds them away from zero. Pre-existing, and tracked in `docs/tech-debt/backlog.md`.
