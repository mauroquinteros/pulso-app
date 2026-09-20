import { create } from "zustand";

import type { Movement } from "@/types/models";
import { historyReducer, initialHistoryState, type HistoryAnswer, type HistoryState } from "@/utils/history-status";

interface MovementsState extends HistoryState {
  /**
   * A Movement Postgres has stored joins the History. Ignored in any status but
   * `ready`, since there is no History for it to join until one is in hand.
   */
  movementSaved: (movement: Movement) => void;
  /**
   * The ticker of the movement just saved, for the row that should announce
   * itself when the form dismisses onto Inicio. Deliberately NOT part of
   * `HistoryState`: it is a one-shot UI cue, not history, and the reducer that
   * owns the History has no business knowing about a highlight.
   *
   * `null` for a deposit or a withdrawal - they touch Efectivo, which has no
   * row of its own to light up.
   */
  lastSavedTicker: string | null;
  /** Consumes the cue, so it plays once and not again on the next mount. */
  savedHighlightShown: () => void;
  /**
   * A Movement Postgres has deleted leaves the History. Same guard as its
   * sibling above, and never optimistic: this is called once the database has
   * answered, not when the user confirms (ADR 0010).
   */
  movementDeleted: (id: string) => void;
  /** Marks a read as begun and hands back its id, to be quoted in the answer. */
  startRead: () => number;
  answerRead: (readId: number, answer: HistoryAnswer) => void;
  /** Throws the History away and returns to `unread`: Reintentar, or a sign-out. */
  forgetHistory: () => void;
}

/**
 * The dumb movements store: the raw `Movement[]` is the single source of truth
 * (derive-don't-store). It holds no derived `Portfolio` and the engine never
 * enters it - derivation lives behind `usePortfolio`.
 *
 * It also holds the History's status, because the two are one fact: an empty
 * `movements` means nothing on its own until you know whether it was read
 * (CONTEXT.md's History entry). The transitions are not written here - they are
 * `utils/history-status.ts`, whose state this store *is*, so that an entirely
 * asynchronous lifecycle stays testable by feeding it events.
 *
 * No seed. It starts empty and `unread`, and stays that way until
 * `RequireHistory` reads the signed-in Perfil's History out of Postgres.
 */
export const useMovementsStore = create<MovementsState>((set, get) => ({
  ...initialHistoryState,
  lastSavedTicker: null,
  movementSaved: (movement) =>
    set((state) => ({
      ...historyReducer(state, { type: "movementSaved", movement }),
      lastSavedTicker: "ticker" in movement ? movement.ticker : null,
    })),
  savedHighlightShown: () => set({ lastSavedTicker: null }),
  movementDeleted: (id) => set((state) => historyReducer(state, { type: "movementDeleted", id })),
  startRead: () => {
    const next = historyReducer(get(), { type: "readStarted" });
    set(next);
    return next.readId;
  },
  answerRead: (readId, answer) => set((state) => historyReducer(state, { type: "answered", readId, answer })),
  forgetHistory: () => set((state) => historyReducer(state, { type: "forgotten" })),
}));
