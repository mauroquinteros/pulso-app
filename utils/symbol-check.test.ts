import { describe, expect, it } from "vitest";

import {
  initialSymbolCheckState,
  shouldCheck,
  symbolCheckError,
  SYMBOL_CHECK_ERRORS,
  symbolCheckReducer,
  type SymbolCheckState,
} from "./symbol-check";

const checking: SymbolCheckState = { status: "checking", ticker: "AAPL", requestId: 1 };

/** The state after a check for `ticker` came back with `answer`. */
function answered(ticker: string, answer: "confirmed" | "unknown" | "unavailable"): SymbolCheckState {
  const started = symbolCheckReducer(initialSymbolCheckState, { type: "checkStarted", ticker, requestId: 1 });
  return symbolCheckReducer(started, { type: "answered", requestId: 1, answer });
}

describe("symbolCheckReducer", () => {
  it("starts unchecked", () => {
    expect(initialSymbolCheckState).toEqual({ status: "unchecked" });
  });

  it("a started check remembers its ticker and its id", () => {
    expect(symbolCheckReducer(initialSymbolCheckState, { type: "checkStarted", ticker: "AAPL", requestId: 7 })).toEqual(
      {
        status: "checking",
        ticker: "AAPL",
        requestId: 7,
      },
    );
  });

  it("keeps the ticker the check was about when the answer lands", () => {
    expect(answered("AAPL", "confirmed")).toEqual({ status: "confirmed", ticker: "AAPL" });
    expect(answered("APPL", "unknown")).toEqual({ status: "unknown", ticker: "APPL" });
    expect(answered("AAPL", "unavailable")).toEqual({ status: "unavailable", ticker: "AAPL" });
  });

  it("an edit revokes a confirmation", () => {
    // A confirmation for AAPL must never authorize saving AAPLX.
    expect(symbolCheckReducer(answered("AAPL", "confirmed"), { type: "edited" })).toEqual({ status: "unchecked" });
  });

  it("an edit clears a failure", () => {
    expect(symbolCheckReducer(answered("APPL", "unknown"), { type: "edited" })).toEqual({ status: "unchecked" });
    expect(symbolCheckReducer(answered("AAPL", "unavailable"), { type: "edited" })).toEqual({ status: "unchecked" });
  });

  it("an edit while a check is running abandons it", () => {
    const edited = symbolCheckReducer(checking, { type: "edited" });

    expect(edited).toEqual({ status: "unchecked" });
    // And the answer to the abandoned check cannot resurrect it.
    expect(symbolCheckReducer(edited, { type: "answered", requestId: 1, answer: "confirmed" })).toBe(edited);
  });

  it("an edit from unchecked changes nothing", () => {
    expect(symbolCheckReducer(initialSymbolCheckState, { type: "edited" })).toBe(initialSymbolCheckState);
  });

  it("drops a stale answer while a newer check is in flight", () => {
    // The dangerous ordering: a slow confirming answer for the old text landing
    // after the user has already retyped. Honouring it would open the save gate
    // for a symbol that is no longer in the field.
    const newer = symbolCheckReducer(checking, { type: "checkStarted", ticker: "MSFT", requestId: 2 });

    expect(symbolCheckReducer(newer, { type: "answered", requestId: 1, answer: "confirmed" })).toBe(newer);
    expect(symbolCheckReducer(newer, { type: "answered", requestId: 2, answer: "confirmed" })).toEqual({
      status: "confirmed",
      ticker: "MSFT",
    });
  });

  it("ignores an answer that arrives with no check in flight", () => {
    // Nothing dispatches these today. The guard means a future caller cannot
    // invent a confirmation by getting its sequencing wrong.
    expect(symbolCheckReducer(initialSymbolCheckState, { type: "answered", requestId: 1, answer: "confirmed" })).toBe(
      initialSymbolCheckState,
    );

    const confirmed = answered("AAPL", "confirmed");
    expect(symbolCheckReducer(confirmed, { type: "answered", requestId: 1, answer: "unknown" })).toBe(confirmed);
  });

  it("tells unknown and unavailable apart", () => {
    // Two blocked saves, two different facts: the provider said no, versus we
    // could not ask. Issue 03 shows them as different sentences.
    expect(answered("APPL", "unknown")).not.toEqual(answered("APPL", "unavailable"));
  });
});

describe("shouldCheck", () => {
  it("fires when there is no answer on file", () => {
    expect(shouldCheck(initialSymbolCheckState, "AAPL")).toBe(true);
  });

  it("does not re-fire for a symbol already confirmed", () => {
    // Leaving and re-entering the field costs nothing.
    expect(shouldCheck(answered("AAPL", "confirmed"), "AAPL")).toBe(false);
  });

  it("does not re-fire for a symbol already rejected", () => {
    // The answer will not change. The user's move here is to edit.
    expect(shouldCheck(answered("APPL", "unknown"), "APPL")).toBe(false);
  });

  it("re-fires after an unavailable result", () => {
    // No answer exists, so the retry falls out of the rule rather than needing
    // a button of its own.
    expect(shouldCheck(answered("AAPL", "unavailable"), "AAPL")).toBe(true);
  });

  it("fires when the box no longer holds the symbol on file", () => {
    expect(shouldCheck(answered("AAPL", "confirmed"), "MSFT")).toBe(true);
    expect(shouldCheck(answered("APPL", "unknown"), "AAPL")).toBe(true);
  });

  it("does not fire a second request for a symbol already being checked", () => {
    expect(shouldCheck(checking, "AAPL")).toBe(false);
    expect(shouldCheck(checking, "MSFT")).toBe(true);
  });

  it("never fires on an empty field", () => {
    expect(shouldCheck(initialSymbolCheckState, "")).toBe(false);
    expect(shouldCheck(answered("AAPL", "unavailable"), "")).toBe(false);
  });
});

describe("symbolCheckError", () => {
  it("says the symbol was not found, word for word", () => {
    expect(symbolCheckError(answered("APPL", "unknown"))).toBe("No encontramos ese símbolo.");
  });

  it("says the check itself failed, word for word", () => {
    expect(symbolCheckError(answered("AAPL", "unavailable"))).toBe(
      "No pudimos verificar el símbolo. Vuelve a intentar.",
    );
  });

  it("distinguishes the two failures", () => {
    // The whole reason both states exist. One means fix your typing; the other
    // means your typing is fine. Collapsing them sends a user with bad signal
    // to correct a symbol that was already correct.
    expect(SYMBOL_CHECK_ERRORS.unknown).not.toBe(SYMBOL_CHECK_ERRORS.unavailable);
  });

  it("only the retryable failure invites a retry", () => {
    expect(SYMBOL_CHECK_ERRORS.unavailable).toContain("Vuelve a intentar");
    expect(SYMBOL_CHECK_ERRORS.unknown).not.toContain("Vuelve a intentar");
  });

  it("is silent in every state that is not a failure", () => {
    expect(symbolCheckError(initialSymbolCheckState)).toBeNull();
    expect(symbolCheckError(checking)).toBeNull();
    expect(symbolCheckError(answered("AAPL", "confirmed"))).toBeNull();
  });

  it("a keystroke after a failure clears the message", () => {
    // Criterion: the first keystroke clears both the border and the message.
    // It falls out of `edited` rather than needing a clearing event of its own.
    const failed = answered("APPL", "unknown");
    expect(symbolCheckError(failed)).not.toBeNull();
    expect(symbolCheckError(symbolCheckReducer(failed, { type: "edited" }))).toBeNull();
  });

  it("the copy holds no characters that merely look like ASCII", () => {
    // Written as escapes rather than pasted glyphs, so each assertion says out
    // loud which character it means - the lookalikes are indistinguishable from
    // their ASCII twins in an editor, and a careless find-and-replace swaps one
    // for the other silently. The accents in "simbolo" are real Spanish and are
    // deliberately absent from this list.
    const lookalikes = [
      "\u2212", // minus sign, not the ASCII hyphen-minus
      "\u2018", // left single quote
      "\u2019", // right single quote
      "\u201C", // left double quote
      "\u201D", // right double quote
      "\u2013", // en dash
      "\u2014", // em dash
      "\u00A0", // non-breaking space
    ];

    for (const message of Object.values(SYMBOL_CHECK_ERRORS)) {
      for (const lookalike of lookalikes) {
        expect(message).not.toContain(lookalike);
      }
    }
  });
});
