import { afterEach, describe, expect, it } from "vitest";

import type { DepositMovement } from "@/types/models";
import { initialHistoryState } from "@/utils/history-status";
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

/** A Perfil signed in, with their History read and in hand. */
function signedInWithHistory() {
  const readId = useMovementsStore.getState().startRead();
  useMovementsStore.getState().answerRead(readId, { ok: true, movements: [sampleDeposit] });
}

describe("clearPerfilScopedState", () => {
  // The store is module-level, which is the whole reason this function exists.
  // Leaving it populated here would be the same bug, one test file over.
  afterEach(() => {
    useMovementsStore.setState(initialHistoryState);
  });

  it("empties the movements store", () => {
    signedInWithHistory();
    expect(useMovementsStore.getState().movements).toEqual([sampleDeposit]);

    clearPerfilScopedState();

    expect(useMovementsStore.getState().movements).toEqual([]);
  });

  it("empties movements added since the History was read", () => {
    signedInWithHistory();
    useMovementsStore.getState().movementSaved({ ...sampleDeposit, id: "test-deposit-2" });

    clearPerfilScopedState();

    expect(useMovementsStore.getState().movements).toEqual([]);
  });

  it("returns the History to unread, so the next Perfil's is read rather than assumed", () => {
    // Emptying alone would leave the store on `ready`, and the only rule that
    // starts a read is "if the History is unread, read it" - so the next Perfil
    // would land on an empty portfolio that no read ever fires for.
    signedInWithHistory();
    expect(useMovementsStore.getState().status).toBe("ready");

    clearPerfilScopedState();

    expect(useMovementsStore.getState().status).toBe("unread");
  });

  it("cancels a read that is still in flight", () => {
    // Signing out mid-read. The answer lands afterwards and must not be applied
    // to whoever is holding the phone by then.
    const readId = useMovementsStore.getState().startRead();

    clearPerfilScopedState();
    useMovementsStore.getState().answerRead(readId, { ok: true, movements: [sampleDeposit] });

    expect(useMovementsStore.getState().status).toBe("unread");
    expect(useMovementsStore.getState().movements).toEqual([]);
  });
});
