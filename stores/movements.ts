import { create } from "zustand";

import { MOCK_MOVEMENTS } from "@/lib/mock-data";
import type { Movement } from "@/types/models";

interface MovementsState {
  movements: Movement[];
  addMovement: (movement: Movement) => void;
}

/**
 * The dumb movements store: the raw `Movement[]` is the single source of truth
 * (derive-don't-store). It holds no derived `Portfolio` and the engine never
 * enters it — derivation lives behind `usePortfolio`. Seeded with mock data;
 * in-memory only (a restart returns to the seed).
 */
export const useMovementsStore = create<MovementsState>((set) => ({
  movements: MOCK_MOVEMENTS,
  addMovement: (movement) =>
    set((state) => ({ movements: [...state.movements, movement] })),
}));
