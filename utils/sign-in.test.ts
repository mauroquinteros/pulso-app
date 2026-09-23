import { describe, expect, it } from "vitest";

import { initialSignInState, signInReducer, type SignInState } from "./sign-in";

const signing: SignInState = { status: "signing", provider: "google" };

describe("signInReducer", () => {
  it("starts idle", () => {
    expect(initialSignInState).toEqual({ status: "idle" });
  });

  it("a tap from idle starts signing", () => {
    expect(signInReducer(initialSignInState, { type: "tapped", provider: "google" })).toEqual({
      status: "signing",
      provider: "google",
    });
  });

  it("ignores a tap while already signing", () => {
    // Never two sign-ins: the second tap must not start a second sheet.
    expect(signInReducer(signing, { type: "tapped", provider: "apple" })).toBe(signing);
  });

  it("returns to idle on cancel, with no message", () => {
    const state = signInReducer(signing, { type: "cancelled" });

    expect(state).toEqual({ status: "idle" });
    expect(state).not.toHaveProperty("message");
  });

  it("tells offline and generic failures apart, word for word", () => {
    const offline = signInReducer(signing, { type: "failed", reason: "offline" });
    const other = signInReducer(signing, { type: "failed", reason: "other" });

    expect(offline).toEqual({ status: "failed", message: "Sin conexión. Revisa tu internet y vuelve a intentar." });
    expect(other).toEqual({ status: "failed", message: "No pudimos iniciar sesión. Vuelve a intentar." });
    expect(offline).not.toEqual(other);
  });

  it("a tap from failed clears the previous message", () => {
    const failed = signInReducer(signing, { type: "failed", reason: "offline" });

    expect(signInReducer(failed, { type: "tapped", provider: "apple" })).toEqual({
      status: "signing",
      provider: "apple",
    });
  });

  it("ignores outcomes that arrive outside a sign-in", () => {
    // Nothing dispatches these from idle today. The guard means a future caller
    // cannot invent a state by getting its sequencing wrong.
    expect(signInReducer(initialSignInState, { type: "cancelled" })).toBe(initialSignInState);
    expect(signInReducer(initialSignInState, { type: "failed", reason: "offline" })).toBe(initialSignInState);

    const failed = signInReducer(signing, { type: "failed", reason: "other" });
    expect(signInReducer(failed, { type: "cancelled" })).toBe(failed);
  });

  it("keeps the copy free of characters that only look like ASCII", () => {
    // The accents in "conexión" and "sesión" carry meaning and stay. The
    // lookalikes do not: an ellipsis character or a typographic dash here would
    // be invisible in review and impossible to grep for.
    const copy = [
      signInReducer(signing, { type: "failed", reason: "offline" }),
      signInReducer(signing, { type: "failed", reason: "other" }),
    ].map((state) => (state.status === "failed" ? state.message : ""));

    for (const message of copy) {
      expect(message).not.toContain("\u2026"); // ellipsis
      expect(message).not.toContain("\u2014"); // em dash
      expect(message).not.toContain("\u2212"); // minus sign
    }
  });
});
