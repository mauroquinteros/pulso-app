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
- **The check is asynchronous and races.** A response must be matched to the symbol
  it was asked about, or editing the field twice can display the wrong verdict; and
  the save must stay blocked while a check is still in flight.
- **The buy PRD is superseded on this point.** Its user stories 6 and 16 and its
  "Símbolo is free text" constraint no longer describe the app.
