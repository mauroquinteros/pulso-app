import { create } from "zustand";

import type { Movement } from "@/types/models";
import { historyReducer, initialHistoryState, type HistoryAnswer, type HistoryState } from "@/utils/history-status";

interface MovementsState extends HistoryState {
  addMovement: (movement: Movement) => void;
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
  addMovement: (movement) => set((state) => ({ movements: [...state.movements, movement] })),
  startRead: () => {
    const next = historyReducer(get(), { type: "readStarted" });
    set(next);
    return next.readId;
  },
  answerRead: (readId, answer) => set((state) => historyReducer(state, { type: "answered", readId, answer })),
  forgetHistory: () => set((state) => historyReducer(state, { type: "forgotten" })),
}));
