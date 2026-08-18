# A confirmed Stock rides back on the confirmation

`resolve-stock` upserts the **Stock** it confirms and already answers with the whole of it — `{ ticker, name, price, quotedAt }`. `lib/resolve-stock.ts` discarded that body and returned the bare verdict string, so the app fetched a price, wrote it to Postgres, and then rendered "Sin precio" for the **Holding** it had fetched it for.

Nothing fixed that until the app was backgrounded and brought back, because `useReadStocks` fires on the tabs mounting and on returning from the background, and `router.dismissTo("/")` dismisses a modal over tabs that never unmounted. The gap hit exactly one case — **the first buy of a symbol not yet in `stocks`** — which is how a portfolio gets built.

So `resolveStock` returns `{ answer, stock }`, and the blur handler merges the Stock into `useStocksStore` in the same `.then` that dispatches the verdict.

## Why not simply re-read the table

Re-reading `stocks` after a confirmation was chosen first and reversed. The argument that decided it: **the confirmation is a save gate and a re-read is not.**

`saveEnabled` requires `symbolStatus === "confirmed"`, so the answer that unlocks the button is the same answer that carries the Stock — same tick, before React re-renders. It is not *possible* to save a buy whose Stock is missing from the store. A re-read is a second request fired after the confirmation, gated on nothing, and it can lose the race to a user who types quickly; closing that race then needs reasoning about how long the remaining fields take to fill, which is an argument about typing speed standing in for a guarantee.

It is also less machinery, not more: no second network call, no "skip if the ticker is already in the map" guard, and no question about whether a failed re-read should raise the refresh banner.

## Considered Options

- **Re-read the whole `stocks` table after the buy is saved.** Reuses a tested path and freshens every Quote while it is at it. Rejected per above; the freshening is incidental to the buy and the foreground read already provides it.
- **Re-read at the símbolo blur instead of at save.** Buys a head start — the user still has to type Monto and Precio, both of which `saveEnabled` requires — but a head start is not a guarantee, and it was the only thing standing between this and the visible "Sin precio" flicker on Inicio.
- **Leave it; the next foreground fixes it.** Cheapest, and defensible under ADR 0011's rule that a missing Stock costs a **Market Value**, not a wrong one. Rejected because it gives a **Quote**'s absence a fourth cause that is none of the three in `CONTEXT.md`: *the app had this Quote and threw it away*.

## Consequences

- **`stockConfirmed` must not touch `status`, and its silence is load-bearing.** `stores/stocks.ts` guarantees that "nothing can unsay a failure before another one lands", by construction rather than by test — an earlier version blanked the refresh banner on every read and announced a fault, unannounced it, then announced it again. A confirmation that set `status: "ready"` would clear the banner because somebody typed a symbol into a form. It merges the map and leaves the status alone, which is also what the field means: `status` is how the last **read** came out, and a confirmation is not a read.
- **`showsRefreshFailed`'s `quotedCount === 0` guard now has a hole in it.** That test is a proxy for "no read has ever succeeded, so there is no Quote we are failing to refresh". This is the first thing that can make the map non-empty without a successful read: a failed launch read, then a confirmed symbol, then a saved buy, and Inicio raises "No pudimos actualizar los precios" over a portfolio whose only price is seconds old. Rare — it needs a failed read and a buy in the same session — and the sentence is not false, since the read did fail. Accepted rather than grown into a "has a read ever succeeded" fact in the store, and recorded here because the guard's reasoning no longer matches what it measures.
- **A Stock with no price degrades exactly as a re-read would.** When the quote fetch fails twice, `resolve-stock` writes `{ticker, name}` and answers `price: null`; there is nothing to hand over, and a re-read would have filtered the row out too. Both are right, and for the right reason — there genuinely is no **Quote**, which is `CONTEXT.md`'s third cause and a real absence.
- **`utils/symbol-check.ts` does not change.** `SymbolAnswer` stays the plain string union and the blur handler splits the two results, so the reducer, its race guard and its tests are untouched. No stale-answer guard is needed on the store write either: a Stock is shared and owned by nobody, and the worst race is a slightly staler map winning.
- **The company name is now in hand and deliberately not rendered.** It arrives with the Stock, and the buy form still shows only the teal tick (see `0009`, which documents what that leaves open). This is a discard, not an oversight, and reversing it costs one `<Text>` in the slot the símbolo error already occupies.
- **This does not touch what `0011` deferred.** That was *reading `stocks` before calling Finnhub* to avoid the provider round trip, and it stays deferred for its own reasons — a write-once `name`, and a delisted symbol confirming forever. Nothing here reads the table.
