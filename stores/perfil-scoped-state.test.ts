import { afterEach, describe, expect, it } from "vitest";

import { MOCK_MOVEMENTS } from "@/lib/mock-data";
import type { DepositMovement } from "@/types/models";
import { useMovementsStore } from "./movements";
import { clearPerfilScopedState } from "./perfil-scoped-state";

const sampleDeposit: DepositMovement = {
  id: "test-deposit-1",
  type: "deposit",
  amount: 1250,
  transferFee: 5,
  executionDate: "2025-06-25",
  createdAt: "2025-06-25T00:00:00Z",
};

describe("clearPerfilScopedState", () => {
  // The store is module-level, which is the whole reason this function exists.
  // Leaving it emptied here would be the same bug, one test file over.
  afterEach(() => {
    useMovementsStore.setState({ movements: MOCK_MOVEMENTS });
  });

  it("empties the movements store", () => {
    expect(useMovementsStore.getState().movements).toEqual(MOCK_MOVEMENTS);

    clearPerfilScopedState();

    expect(useMovementsStore.getState().movements).toEqual([]);
  });

  it("empties movements added since the store was created", () => {
    useMovementsStore.getState().addMovement(sampleDeposit);

    clearPerfilScopedState();

    expect(useMovementsStore.getState().movements).toEqual([]);
  });
});
