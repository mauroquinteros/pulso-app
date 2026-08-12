# A buy cannot be saved until its symbol is confirmed to exist

The **Símbolo** field validates against the market-data provider as soon as the
user leaves it, while they fill the next field. Until the symbol comes back
confirmed, **Guardar movimiento** is blocked. A symbol the provider does not know
cannot be recorded at all.

This **reverses a documented decision**. The buy PRD states plainly: _"Symbol is
free text. No search / autocomplete / symbol master list in v1"_, and _"I want to
type any symbol freely, so that I can record a buy even for a symbol the app
doesn't have a price for yet."_ Anyone reading that PRD and then the form would
conclude the code had drifted. It did not; the reasoning changed.

## What changed

The PRD was written when prices came from a hardcoded map and the app had one
user. Two things made free text expensive:

- **The failure is silent and permanent.** A user who types `APPL` saves a valid
  buy, derives a holding with no price, and sees "Sin precio" forever. Nothing in
  the app ever tells them why, and their **Total Portfolio Value** is quietly
  missing a position. With invited users rather than one owner who knows every
  ticker they hold, this stops being hypothetical.
- **There is now a `stocks` table to be wrong.** Under `0008` a typed symbol
  becomes a row that a scheduled job re-fetches every day, forever, for a company
  that does not exist.

Validating at the moment of entry fixes both at once, and the validation call
**upserts the confirmed Stock as it goes** — so a typo can never enter `stocks` by
construction, and the holding the user is about to create already has a price
rather than waiting for the next daily run.

## Dividends are deliberately not covered

Considered when the endpoint was built, and rejected. **Dividendo** has a **Símbolo**
field too, and the first instinct was that one rule should cover both forms.

It should not. A dividend is cash income, not a position: it derives no **Holding**, so
it needs no price, so it cannot open the hole this decision exists to close. And a
dividend presupposes a buy — nobody is paid by a company they never held, and that buy
already confirmed the symbol and put the **Stock** in the table. Validating again asks a
question that has been answered, and pays for it twice: a provider round trip on every
dividend, and the refusal of the acquired-company dividend, which is the *realistic*
case rather than the theoretical one the consequences below accept.

What that leaves standing: **the app does not enforce "buy first."** The dividend form
has no held-shares gate, deliberately — a dividend does not consume a position, and one
can land for a ticker since sold. So `APPL` is still typeable there. The damage is
bounded and different in kind: **Efectivo**, **Net Dividends** and portfolio **Total
Return** all stay correct, because none of them is scoped by ticker. What breaks is
attribution — `AAPL`'s **Total Return of a stock** silently under-counts by that
dividend, and a phantom `APPL` holds it. The movement itself is visible in the list and
an edit fixes it, which is precisely what the buy case is not.

If that ever needs closing, the check for a dividend is **not** this endpoint. It is
"is this ticker already in `stocks`" — answered locally, with no provider call, and
without refusing the delisted company the user genuinely held.

## Considered Options

- **Warn but let it save.** Preserves the PRD's promise literally and protects the
  historical case below. Rejected: a user who ignores the warning lands in exactly
  the silent permanent hole the change exists to close.
- **Block only on a definite "no such symbol"**, letting an unreachable provider
  through unvalidated. Rejected as a distinction without a difference _here_:
  saving a movement already requires the network, because the movement is written
  to Postgres. Were an offline write queue ever built, this would need revisiting —
  the rule would then be the difference between "the provider says no" and "we
  could not ask", and those two must never render the same.
- **An override for the rejected case.** Rejected: it hands the typo user the same
  escape hatch that the block exists to deny them.

## Consequences

- **A genuinely historical buy of a delisted company is refused.** If a user held a
  company that has since been acquired, the provider no longer knows the symbol and
  Pulso will not record the movement — in an app whose premise is an honest
  history. Accepted for v1: nobody in the test group holds one, and the failure is
  loud rather than silent. `0002` already cannot model the acquisition that caused
  it.
- **Saving a buy now depends on a third party being reachable.** Not just on the
  app's own backend.
- **A ticker is not a stable identifier and this design assumes it is.** A delisted
  symbol can be reassigned to an unrelated company; because `stocks` is keyed by the
  symbol string, an old holding and a new company's price would merge into one
  position and produce a confidently wrong **Market Value**. Nothing is built for
  this. `/stock/symbol` returns a `figi` — a stable instrument identifier — which is
  the cheap escape hatch if it ever matters.
- **Abandoned forms leave real rows in `stocks`.** Validation writes before the
  movement is saved, so a user who backs out has registered a genuine, priced
  **Stock** that nobody holds. Harmless, and waiting when someone does buy it.
- **Confirmation proves existence, never intent.** `MET` is a real company, so a user
  reaching for Meta gets a confirmed field and a confidently wrong **Holding** — and
  unlike a typo that lands nowhere, this one never announces itself with a missing
  price. `GOOG`/`GOOGL` and `VOO`/`VOOG` are the same trap between two real listings.
  Nothing here can close that gap: the app cannot know which company was meant, and
  refusing to guess is the honest position. The recourse is the one `0007` already
  provides — edit the movement. Written down because a reader will otherwise assume
  this check is stronger than it is.
- **The check is asynchronous and races.** A response must be matched to the symbol
  it was asked about, or editing the field twice can display the wrong verdict; and
  the save must stay blocked while a check is still in flight.
- **The lookup is restricted to US listings, and that restriction upholds `0002`.**
  Unfiltered, a search for `AAPL` also returns the Toronto, Mexican, Romanian and
  Santiago listings of the same company — all quoting in their own currency. One of
  those entering `stocks` would have Pulso multiply a peso price by a share count
  and label the result USD, with `priceAvailable: true`. `0002` fixes the whole app
  to USD with no FX; the exchange filter is what makes that true at the boundary
  rather than merely assumed. Today this is protected only by accident: the Símbolo
  field strips non-letters, so `AAPL.MX` cannot be typed — the same reason `BRK.B`
  cannot. Relaxing that regex without the filter in place would open it silently.
- **"Confirmed" means an exact symbol match, never a non-empty result.** The
  provider's symbol search is **fuzzy**: `APPL` returns eleven suggestions — `AAPL`,
  `AMAT`, `APP` — and not one of them is `APPL`. A "did we get results?" check would
  therefore wave through the single most likely typo in the app, which is the exact
  failure this decision exists to prevent. The confirmation is `result.symbol` equal
  to what the user typed.
- **The buy PRD is superseded on this point.** Its user stories 6 and 16 and its
  "Símbolo is free text" constraint no longer describe the app. The dividend PRD's
  identical constraint still stands — see above.
