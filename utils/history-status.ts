/**
 * The History's read lifecycle, as a pure state machine. Pure in the same sense
 * as the simbolo reducer: it imports nothing async, so an entirely asynchronous
 * behaviour can be tested by feeding it events.
 *
 * A History is one thing, not a collection of parts (CONTEXT.md), so the four
 * states below are about the whole of it. They are deliberately not collapsed
 * into an empty array: `[]` would mean *still reading*, *this Perfil has
 * recorded nothing* and *the read failed* all at once, and the last two are
 * different screens.
 *
 * Two rules live here rather than in the component, so that neither depends on
 * a caller remembering to apply it: an answer that is no longer the one being
 * waited on is dropped (`answered`), and the id that decides it is minted here
 * (`readStarted`) rather than by whoever happens to be on screen.
 *
 * See .scratch/history-persistence/PRD.md and
 * docs/adr/0006-movements-in-three-tables-read-all-or-nothing.md.
 */

import type { Movement } from "@/types/models";

/**
 * `unread` is deliberately not `unknown` - that reads as "something went wrong
 * and the app cannot cope", the opposite of its meaning - and not `idle`, which
 * is ambiguous between "not started" and "finished and resting". The names are
 * the tenses of ADR 0006's own verb.
 */
export type HistoryStatus =
  | "unread" // nobody has tried to read it yet
  | "reading" // three selects in flight
  | "ready" // the History is in hand
  | "failed"; // a fault; error + Reintentar

/**
 * Why one of the three selects did not arrive. Carried so that a fault can be
 * told apart from another fault: a 401 is a session that has gone bad and a 0
 * is a request that never left the phone, and "Revisa tu conexion" is honest
 * advice for exactly one of them.
 *
 * The screen shows none of this - it says the same sentence either way. It
 * exists because ADR 0006 calls a failed read a *fault*, and a fault nobody can
 * name is a fault nobody can fix.
 */
export interface HistoryFailure {
  /** Which of the three selects failed, so a per-table RLS problem is visible. */
  table: string;
  status: number;
  code: string | null;
  message: string;
}

/**
 * What a read can come back as. All-or-nothing is in the shape: there is no
 * member carrying both a failure and some movements, so a partial History
 * cannot be expressed, let alone stored. `lib/history.ts` maps every outcome of
 * the three selects onto one of these.
 */
export type HistoryAnswer = { ok: true; movements: Movement[] } | { ok: false; failures: HistoryFailure[] };

export interface HistoryState {
  status: HistoryStatus;
  /**
   * Which read the status belongs to. It lives in the state rather than in a
   * ref on the component because the component unmounts the moment a session
   * ends - a counter that restarts at 0 there would hand the next Perfil's read
   * the same id as the previous Perfil's answer, which is exactly the answer
   * that must be dropped.
   */
  readId: number;
  /** The History itself. Empty in every status but `ready`. */
  movements: Movement[];
}

export type HistoryEvent =
  | { type: "readStarted" }
  | { type: "answered"; readId: number; answer: HistoryAnswer }
  | { type: "forgotten" };

export const initialHistoryState: HistoryState = { status: "unread", readId: 0, movements: [] };

export function historyReducer(state: HistoryState, event: HistoryEvent): HistoryState {
  switch (event.type) {
    case "readStarted":
      return { status: "reading", readId: state.readId + 1, movements: [] };

    case "answered":
      // The race is resolved here, not by the caller, and it covers the case
      // that matters: a Perfil signs out (or retries) while three selects are in
      // flight, the answer lands afterwards, and applying it would show one
      // Perfil's History to whoever is holding the phone now. The same guard
      // makes an answer arriving with no read in flight a no-op.
      if (state.status !== "reading" || state.readId !== event.readId) return state;

      return event.answer.ok
        ? { status: "ready", readId: state.readId, movements: event.answer.movements }
        : { status: "failed", readId: state.readId, movements: [] };

    case "forgotten":
      // One event for two callers, because they ask for the same thing: throw
      // away whatever History is on file and return to "nobody has tried to read
      // it yet". Reintentar is the failed read being forgotten; a Perfil signing
      // out is their History being forgotten. Since the only rule that starts a
      // read is "if the History is unread, read it", both end in a fresh read
      // and neither needs a mechanism of its own.
      return { status: "unread", readId: state.readId, movements: [] };
  }
}
