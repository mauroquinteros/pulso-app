import { describe, expect, it } from "vitest";

import { MOCK_MOVEMENTS } from "@/lib/mock-data";
import type { DepositMovement } from "@/types/models";
import { useMovementsStore } from "./movements";

const sampleDeposit: DepositMovement = {
  id: "test-deposit-1",
  type: "deposit",
  amount: 1250,
  transferFee: 5,
  executionDate: "2025-06-25",
  createdAt: "2025-06-25T00:00:00Z",
};

describe("useMovementsStore", () => {
  it("seeds with MOCK_MOVEMENTS", () => {
    expect(useMovementsStore.getState().movements).toEqual(MOCK_MOVEMENTS);
  });

  it("addMovement appends immutably without mutating the previous array", () => {
    const before = useMovementsStore.getState().movements;

    useMovementsStore.getState().addMovement(sampleDeposit);

    const after = useMovementsStore.getState().movements;
    expect(after).not.toBe(before);
    expect(before).toHaveLength(MOCK_MOVEMENTS.length);
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1]).toBe(sampleDeposit);
  });
});
