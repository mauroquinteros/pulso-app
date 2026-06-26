import { describe, expect, it } from "vitest";

import {
  buildDepositMovement,
  summarizeDeposit,
  type DepositDeps,
} from "./deposit-view-model";

const deps: DepositDeps = {
  id: () => "dep-1",
  userId: () => "mock-user-001",
  now: () => "2025-06-25T12:00:00Z",
};

describe("summarizeDeposit", () => {
  it("efectivo is Monto minus Comisión", () => {
    const { efectivo } = summarizeDeposit({
      amount: "1250",
      transferFee: "5",
      executedAt: "2025-06-25",
    });
    expect(efectivo).toBe(1245);
  });

  it("treats a blank Comisión as 0", () => {
    const { efectivo } = summarizeDeposit({
      amount: "1250",
      transferFee: "",
      executedAt: "2025-06-25",
    });
    expect(efectivo).toBe(1250);
  });

  it("shows 0 efectivo when Monto is blank, ignoring any fee", () => {
    const { efectivo } = summarizeDeposit({
      amount: "",
      transferFee: "5",
      executedAt: "2025-06-25",
    });
    expect(efectivo).toBe(0);
  });

  it("enables save only when Monto > 0", () => {
    const date = "2025-06-25";
    expect(
      summarizeDeposit({ amount: "", transferFee: "", executedAt: date })
        .saveEnabled,
    ).toBe(false);
    expect(
      summarizeDeposit({ amount: "0", transferFee: "", executedAt: date })
        .saveEnabled,
    ).toBe(false);
    expect(
      summarizeDeposit({ amount: "100", transferFee: "", executedAt: date })
        .saveEnabled,
    ).toBe(true);
  });
});

describe("buildDepositMovement", () => {
  it("maps fields to a typed DepositMovement with injected system fields", () => {
    const movement = buildDepositMovement(
      { amount: "1250", transferFee: "5", executedAt: "2023-10-24" },
      deps,
    );
    expect(movement).toEqual({
      id: "dep-1",
      userId: "mock-user-001",
      type: "deposit",
      amount: 1250,
      transferFee: 5,
      executedAt: "2023-10-24",
      createdAt: "2025-06-25T12:00:00Z",
    });
  });

  it("defaults an empty Comisión to 0", () => {
    const movement = buildDepositMovement(
      { amount: "500", transferFee: "", executedAt: "2025-06-25" },
      deps,
    );
    expect(movement.transferFee).toBe(0);
  });
});
