import { afterEach, describe, expect, it } from "vitest";

import type { DepositMovement } from "@/types/models";
import { initialHistoryState } from "@/utils/history-status";
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
  // The store is module-level, so a test that leaves movements behind is a test
  // that hands them to the next one.
  afterEach(() => {
    useMovementsStore.setState(initialHistoryState);
  });

  it("starts with no History and no claim to have read one", () => {
    // No seed: an empty portfolio on screen is now the Perfil's own, or nothing
    // at all. `unread` is what makes RequireHistory fetch theirs.
    expect(useMovementsStore.getState().movements).toEqual([]);
    expect(useMovementsStore.getState().status).toBe("unread");
  });

  it("addMovement appends immutably without mutating the previous array", () => {
    const before = useMovementsStore.getState().movements;

    useMovementsStore.getState().addMovement(sampleDeposit);

    const after = useMovementsStore.getState().movements;
    expect(after).not.toBe(before);
    expect(before).toHaveLength(0);
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1]).toBe(sampleDeposit);
  });

  it("a read hands back an id, and a different one for the read after it", () => {
    // The id is minted in the store rather than by the component that starts the
    // read, so that a Perfil signing out mid-read cannot have their answer
    // applied to the next Perfil's.
    const first = useMovementsStore.getState().startRead();

    expect(useMovementsStore.getState().status).toBe("reading");

    useMovementsStore.getState().forgetHistory();
    const second = useMovementsStore.getState().startRead();

    expect(second).not.toBe(first);
  });

  it("a successful answer puts the History in the store", () => {
    const readId = useMovementsStore.getState().startRead();

    useMovementsStore.getState().answerRead(readId, { ok: true, movements: [sampleDeposit] });

    expect(useMovementsStore.getState().status).toBe("ready");
    expect(useMovementsStore.getState().movements).toEqual([sampleDeposit]);
  });

  it("a failed answer stores no movements", () => {
    const readId = useMovementsStore.getState().startRead();

    useMovementsStore.getState().answerRead(readId, { ok: false, failures: [] });

    expect(useMovementsStore.getState().status).toBe("failed");
    expect(useMovementsStore.getState().movements).toEqual([]);
  });
});
