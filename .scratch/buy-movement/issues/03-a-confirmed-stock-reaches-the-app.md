# 03 - A confirmed Stock reaches the app

Type: **AFK** - a widened answer and one store action; no schema, and no new request.

## Parent

`.scratch/buy-movement/PRD.md`

## What to build

Confirming a **Símbolo** already asks the provider, upserts a real named **Stock** with its price
and the market moment it belongs to, and answers with all of it. Today the app reads the verdict
and throws the rest away. The confirmation boundary now returns **both** - the verdict and the
Stock - and the buy screen merges that Stock into the Stocks store in the same step that
dispatches the verdict.

**Why this matters.** Without it, the first buy of any symbol not already in the table creates a
**Holding** with no **Quote**. It reads *Sin precio* on **Inicio** and stays that way until the
app is sent to the background and brought back, because the Stocks read fires when the tabs mount
and on returning from the background - and dismissing the form returns to tabs that never
unmounted. The app fetched the price, wrote it to Postgres, and declined to keep it.

Because the save gate requires a confirmed símbolo, the answer that unlocks **Guardar** is the
same answer that carries the Stock. There is no window in which a saveable buy has a Stock the app
does not hold. ADR 0013 records why re-reading the whole table was chosen first and reversed.

**The store action must not touch the read status, and its silence is load-bearing.** The store
guarantees by construction that nothing can unsay a failure before another answer lands - an
earlier version raised the refresh banner, blanked it, and raised it again. A confirmation that
set the status to ready would clear that banner because somebody typed a symbol into a form. The
status records how the last *read* came out, and a confirmation is not a read.

**The símbolo state machine does not change.** The answer type stays the plain string union and
the screen splits the two results, so the reducer, its stale-answer race guard and its tests are
untouched. No stale-answer guard is applied to the Stock write either: a Stock is shared and owned
by nobody, and the worst race is a slightly staler map winning, which costs nothing.

A confirmed símbolo the provider had no price for hands over nothing, and that is correct - there
genuinely is no **Quote**, which is a real absence and renders as one.

The confirmed company's **name** now arrives with the Stock and is deliberately **not** rendered.
That is a discard rather than an oversight; ADR 0009 documents what it leaves open.

**One accepted regression, pinned by a test.** Inicio suppresses its refresh-failed banner when
the Stocks map is empty, treating emptiness as a proxy for "no read has ever succeeded, so there
is nothing we are failing to refresh". A confirmation is the first thing that can fill the map
without a successful read, so a failed launch read followed by a confirmed símbolo and a saved buy
raises *No pudimos actualizar los precios* over a portfolio whose only price is seconds old. It is
rare, and the sentence is not false. Pin it with a test so that whoever closes it starts from ADR
0013 rather than from the symptom.

## Acceptance criteria

- [ ] The confirmation boundary returns the confirmed **Stock** alongside the verdict, and nothing
      when the provider confirmed the symbol but had no price
- [ ] The flat response is mapped into a domain Stock carrying its **Quote** - price and market
      moment together, never apart
- [ ] The buy screen merges the confirmed Stock into the Stocks store in the same step that
      dispatches the verdict
- [ ] The store action merges one Stock without displacing those already held
- [ ] The store action leaves the read status untouched in **every** status, `failed` included -
      covered by a test, because the constraint is an absence and nothing in a diff reveals it
- [ ] The símbolo state machine, its race guard and its tests are unchanged
- [ ] A confirmed símbolo with no price stores no Stock, and a Holding of it renders as a real
      absence
- [ ] The company name is not rendered anywhere in the buy form
- [ ] A test pins the accepted banner false positive: a failed status with a non-empty Stocks map
      and at least one **Holding** raises the banner
- [ ] Verified on a device: buying a symbol not already in the stocks table yields a Holding with
      a **Market Value** immediately, with no backgrounding

## Blocked by

- `.scratch/buy-movement/issues/02-a-compra-is-written-to-postgres.md`
