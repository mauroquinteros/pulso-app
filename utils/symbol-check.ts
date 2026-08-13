/**
 * The Símbolo field's confirmation lifecycle, as a pure state machine. Pure in
 * the same sense as the sign-in reducer: it imports nothing async, so an
 * entirely asynchronous behaviour can be tested by feeding it events.
 *
 * `unchecked` is deliberately not called `idle` - the field can be full of text
 * and still be in it. It covers an empty field, a field being typed into, and a
 * field whose confirmation an edit just revoked.
 *
 * Two rules live here rather than in the screen, so that neither depends on a
 * caller remembering to apply it: an answer that is no longer the one in flight
 * is dropped (`answered`), and whether a blur is worth a request at all
 * (`shouldCheck`).
 *
 * See .scratch/resolve-stock/PRD.md (Part 2) and
 * docs/adr/0009-a-buy-is-blocked-until-its-symbol-is-confirmed.md.
 */

/**
 * What a check can come back as. Three outcomes rather than a boolean, because
 * "the provider says no" and "we could not ask" ask the user to do different
 * things - one means fix your typing, the other means your typing is fine.
 * `lib/resolve-stock.ts` maps every HTTP outcome onto one of these.
 */
export type SymbolAnswer = "confirmed" | "unknown" | "unavailable";

export type SymbolCheckState =
  | { status: "unchecked" }
  | { status: "checking"; ticker: string; requestId: number }
  | { status: "confirmed"; ticker: string }
  | { status: "unknown"; ticker: string }
  | { status: "unavailable"; ticker: string };

export type SymbolCheckEvent =
  | { type: "edited" }
  | { type: "checkStarted"; ticker: string; requestId: number }
  | { type: "answered"; requestId: number; answer: SymbolAnswer };

/**
 * Two failures, two sentences, for the same reason `SIGN_IN_ERRORS` splits its
 * own: they ask the user to do different things. `unknown` means *fix your
 * typing*; `unavailable` means *your typing is fine, try again*. Telling someone
 * on one bar of signal that AAPL was not found sends them to delete and retype
 * the one thing on screen that is already right.
 *
 * Only `unavailable` says "vuelve a intentar", because only it is worth
 * retrying: blurring again re-checks it, while a symbol the provider does not
 * know will answer the same way every time.
 */
export const SYMBOL_CHECK_ERRORS: Record<"unknown" | "unavailable", string> = {
  unknown: "No encontramos ese símbolo.",
  unavailable: "No pudimos verificar el símbolo. Vuelve a intentar.",
};

export const initialSymbolCheckState: SymbolCheckState = { status: "unchecked" };

export function symbolCheckReducer(state: SymbolCheckState, event: SymbolCheckEvent): SymbolCheckState {
  switch (event.type) {
    case "edited":
      // Any keystroke revokes whatever was on file. Without this, a
      // confirmation for AAPL would keep authorizing a field that now says
      // AAPLX. It also clears a failure, which is what makes the red go away as
      // soon as the user starts correcting the symbol.
      return state.status === "unchecked" ? state : { status: "unchecked" };

    case "checkStarted":
      return { status: "checking", ticker: event.ticker, requestId: event.requestId };

    case "answered":
      // The race is resolved here, not by the caller. Two checks can be in
      // flight after a quick edit and the ordering genuinely inverts: a
      // rejection costs one provider call and a confirmation costs two, so a
      // slow confirming answer can land after a fast rejection - the dangerous
      // direction, because it is the one that opens the save gate for a symbol
      // no longer in the field. The same guard makes an answer arriving with no
      // check in flight a no-op.
      return state.status === "checking" && state.requestId === event.requestId
        ? { status: event.answer, ticker: state.ticker }
        : state;
  }
}

/**
 * What the field should say, or nothing. Which states count as failures is a
 * rule about this machine, so it lives here for the same reason the race and
 * `shouldCheck` do - the screen should not have to remember that `unchecked`
 * and `checking` are silent.
 *
 * `unchecked` covers a revoked answer, which is what makes the first keystroke
 * after a failure clear the message with no separate clearing event.
 */
export function symbolCheckError(state: SymbolCheckState): string | null {
  return state.status === "unknown" || state.status === "unavailable" ? SYMBOL_CHECK_ERRORS[state.status] : null;
}

/**
 * Is this blur worth a request? Yes when there is no answer on file for the
 * text currently in the box.
 *
 * That one sentence produces all three behaviours the form needs: a confirmed
 * symbol blurred again does not re-fire, a rejected symbol does not re-fire
 * (the user's move there is to edit, which fires naturally on the next blur),
 * and an `unavailable` symbol *does* re-fire, because no answer exists - which
 * is what makes retrying work with no extra affordance on screen.
 *
 * `checking` is not an answer, but a second request for a symbol already being
 * checked would only duplicate the first one.
 *
 * The caller passes the ticker already normalized, so the comparison here is
 * between two spellings of the same shape.
 */
export function shouldCheck(state: SymbolCheckState, ticker: string): boolean {
  // An empty field is the existing "Ingresa un símbolo." error's business, and
  // the endpoint would refuse it anyway.
  if (ticker === "") return false;

  switch (state.status) {
    case "unchecked":
      return true;
    case "unavailable":
      return true;
    case "checking":
    case "confirmed":
    case "unknown":
      return state.ticker !== ticker;
  }
}
