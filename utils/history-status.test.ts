import { describe, expect, it } from "vitest";

import type { DepositMovement } from "@/types/models";
import { historyReducer, initialHistoryState, type HistoryState } from "./history-status";

const deposit: DepositMovement = {
  id: "a3f1c0d2-0000-4000-8000-000000000001",
  type: "deposit",
  amount: 1250,
  transferFee: 5,
  executionDate: "2026-06-25",
  createdAt: "2026-06-25T14:02:11.482Z",
};

/** A second deposit, the one a save hands back from Postgres. */
const savedDeposit: DepositMovement = {
  id: "a3f1c0d2-0000-4000-8000-000000000002",
  type: "deposit",
  amount: 300,
  transferFee: 0,
  executionDate: "2026-06-26",
  createdAt: "2026-06-26T09:31:44.107Z",
};

/** The state while the three selects for the first read are in flight. */
const reading = historyReducer(initialHistoryState, { type: "readStarted" });

/** The state after a read that came back with `movements`. */
function read(state: HistoryState = initialHistoryState, movements: DepositMovement[] = [deposit]): HistoryState {
  const started = historyReducer(state, { type: "readStarted" });
  return historyReducer(started, { type: "answered", readId: started.readId, answer: { ok: true, movements } });
}

/** The state after a read in which one of the three selects errored. */
function failed(state: HistoryState = initialHistoryState): HistoryState {
  const started = historyReducer(state, { type: "readStarted" });
  return historyReducer(started, { type: "answered", readId: started.readId, answer: { ok: false, failures: [] } });
}

describe("historyReducer", () => {
  it("starts unread, with no History and nothing pretending to be one", () => {
    expect(initialHistoryState).toEqual({ status: "unread", readId: 0, movements: [] });
  });

  it("a started read is reading, and carries an id to be answered by", () => {
    expect(reading).toEqual({ status: "reading", readId: 1, movements: [] });
  });

  it("a successful answer lands in ready, holding the History", () => {
    expect(read()).toEqual({ status: "ready", readId: 1, movements: [deposit] });
  });

  it("the empty History of a Perfil who has recorded nothing is ready, not failed", () => {
    // The whole reason the status exists: three empty tables are a fact about
    // the user, and the app must say so rather than show an error.
    expect(read(initialHistoryState, [])).toEqual({ status: "ready", readId: 1, movements: [] });
  });

  it("a failed answer lands in failed, with no movements", () => {
    expect(failed()).toEqual({ status: "failed", readId: 1, movements: [] });
  });

  it("a Movement Postgres stored joins the History in hand", () => {
    const ready = read();

    const joined = historyReducer(ready, { type: "movementSaved", movement: savedDeposit });

    expect(joined).toEqual({ status: "ready", readId: 1, movements: [deposit, savedDeposit] });
    // Immutably: the array the engine already derived a Portfolio from is not
    // rewritten underneath it.
    expect(joined.movements).not.toBe(ready.movements);
    expect(ready.movements).toEqual([deposit]);
  });

  it("drops a saved Movement in any status but ready", () => {
    // `movements` has exactly one writer, which is what puts this rule here
    // rather than at the call site: outside `ready` there is no History for a
    // Movement to join, and appending would invent one out of a single row -
    // `unread` and `failed` hold nothing, and an append during `reading` would
    // be overwritten by the answer already in flight.
    for (const state of [initialHistoryState, reading, failed()]) {
      expect(historyReducer(state, { type: "movementSaved", movement: savedDeposit })).toBe(state);
    }
  });

  it("Reintentar returns to unread, which is what starts a fresh read", () => {
    const retried = historyReducer(failed(), { type: "forgotten" });

    expect(retried.status).toBe("unread");
    expect(historyReducer(retried, { type: "readStarted" }).status).toBe("reading");
  });

  it("forgetting a History that was in hand empties it", () => {
    // Sign-out. Leaving the movements behind would show one Perfil's History to
    // whoever signs in next.
    expect(historyReducer(read(), { type: "forgotten" })).toEqual({ status: "unread", readId: 1, movements: [] });
  });

  it("drops an answer for a Perfil who has since signed out", () => {
    // The case that matters most. Three selects are in flight when the session
    // ends; the answer lands afterwards. Applying it would put the previous
    // Perfil's movements on the next one's first screen - and, worse, mark the
    // History `ready`, so no read for the Perfil actually signed in ever fires.
    const signedOut = historyReducer(reading, { type: "forgotten" });

    const late = historyReducer(signedOut, {
      type: "answered",
      readId: reading.readId,
      answer: { ok: true, movements: [deposit] },
    });

    expect(late).toBe(signedOut);
    expect(late.movements).toEqual([]);
    expect(late.status).toBe("unread");
  });

  it("drops an answer for a read the next Perfil's read has replaced", () => {
    // The same answer, arriving a moment later still: the next Perfil signed in
    // and their read is already in flight. The id is minted by the reducer
    // precisely so the two reads cannot share one.
    const signedOut = historyReducer(reading, { type: "forgotten" });
    const nextPerfil = historyReducer(signedOut, { type: "readStarted" });

    expect(nextPerfil.readId).not.toBe(reading.readId);
    expect(
      historyReducer(nextPerfil, {
        type: "answered",
        readId: reading.readId,
        answer: { ok: true, movements: [deposit] },
      }),
    ).toBe(nextPerfil);
  });

  it("drops a failure belonging to an abandoned read", () => {
    // The same guard in the other direction: a stale failure must not throw the
    // current read onto the error screen.
    const signedOut = historyReducer(reading, { type: "forgotten" });
    const fresh = historyReducer(signedOut, { type: "readStarted" });

    expect(
      historyReducer(fresh, { type: "answered", readId: reading.readId, answer: { ok: false, failures: [] } }),
    ).toBe(fresh);
  });

  it("ignores an answer that arrives with no read in flight", () => {
    expect(
      historyReducer(initialHistoryState, { type: "answered", readId: 1, answer: { ok: false, failures: [] } }),
    ).toBe(initialHistoryState);

    const ready = read();
    expect(historyReducer(ready, { type: "answered", readId: 1, answer: { ok: true, movements: [] } })).toBe(ready);
  });

  it("a token refresh cannot start a read, because nothing takes ready back to unread", () => {
    // Not a test of auth-js, but of the rule that makes it irrelevant: the only
    // event that leaves `ready` is `forgotten`, and only a sign-out and
    // Reintentar send it. A refresh, a tab switch, a modal and a return from the
    // background dispatch nothing at all - so the read condition is never met.
    const ready = read();

    expect(ready.status).toBe("ready");
    expect(
      historyReducer(ready, { type: "answered", readId: ready.readId, answer: { ok: false, failures: [] } }).status,
    ).toBe("ready");
  });
});
