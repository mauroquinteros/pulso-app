import { describe, expect, it } from "vitest";

import { buildWithdrawalMovement, summarizeWithdrawal, type WithdrawalDeps } from "./withdrawal-view-model";

const deps: WithdrawalDeps = {
  id: () => "wd-1",
};

describe("summarizeWithdrawal", () => {
  it("recibiras is Monto minus Comisión", () => {
    const { recibiras } = summarizeWithdrawal({ amount: "200", transferFee: "1", executionDate: "2025-06-25" }, 1000);
    expect(recibiras).toBe(199);
  });

  it("treats a blank Comisión as 0", () => {
    const { recibiras } = summarizeWithdrawal({ amount: "200", transferFee: "", executionDate: "2025-06-25" }, 1000);
    expect(recibiras).toBe(200);
  });

  it("shows 0 recibiras when Monto is blank, ignoring any fee", () => {
    const { recibiras } = summarizeWithdrawal({ amount: "", transferFee: "5", executionDate: "2025-06-25" }, 1000);
    expect(recibiras).toBe(0);
  });

  it("enables save only when Monto > 0", () => {
    const date = "2025-06-25";
    expect(summarizeWithdrawal({ amount: "", transferFee: "", executionDate: date }, 1000).saveEnabled).toBe(false);
    expect(summarizeWithdrawal({ amount: "0", transferFee: "", executionDate: date }, 1000).saveEnabled).toBe(false);
    expect(summarizeWithdrawal({ amount: "100", transferFee: "", executionDate: date }, 1000).saveEnabled).toBe(true);
  });

  it("flags a Monto entered as 0 as invalid (but blank is not)", () => {
    const date = "2025-06-25";
    expect(summarizeWithdrawal({ amount: "0", transferFee: "", executionDate: date }, 1000).amountInvalid).toBe(true);
    expect(summarizeWithdrawal({ amount: "", transferFee: "", executionDate: date }, 1000).amountInvalid).toBe(false);
  });

  it("rejects a Comisión ≥ Monto and flags it invalid", () => {
    const date = "2025-06-25";
    const atLimit = summarizeWithdrawal({ amount: "100", transferFee: "100", executionDate: date }, 1000);
    expect(atLimit.saveEnabled).toBe(false);
    expect(atLimit.feeInvalid).toBe(true);

    const tooBig = summarizeWithdrawal({ amount: "100", transferFee: "150", executionDate: date }, 1000);
    expect(tooBig.saveEnabled).toBe(false);
    expect(tooBig.feeInvalid).toBe(true);
  });

  it("accepts a Comisión below Monto", () => {
    const ok = summarizeWithdrawal({ amount: "100", transferFee: "5", executionDate: "2025-06-25" }, 1000);
    expect(ok.saveEnabled).toBe(true);
    expect(ok.feeInvalid).toBe(false);
  });

  it("blocks save and flags insufficientFunds when Monto exceeds available Cash", () => {
    const over = summarizeWithdrawal({ amount: "500", transferFee: "1", executionDate: "2025-06-25" }, 267.07);
    expect(over.insufficientFunds).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("allows withdrawing exactly the available Cash", () => {
    const exact = summarizeWithdrawal({ amount: "267.07", transferFee: "1", executionDate: "2025-06-25" }, 267.07);
    expect(exact.insufficientFunds).toBe(false);
    expect(exact.saveEnabled).toBe(true);
  });

  it("does not flag insufficientFunds for a blank Monto", () => {
    const blank = summarizeWithdrawal({ amount: "", transferFee: "", executionDate: "2025-06-25" }, 0);
    expect(blank.insufficientFunds).toBe(false);
  });
});

describe("buildWithdrawalMovement", () => {
  it("maps fields to the withdrawal's fields, with an injected id", () => {
    const movement = buildWithdrawalMovement({ amount: "200", transferFee: "1", executionDate: "2023-10-24" }, deps);
    expect(movement).toEqual({
      id: "wd-1",
      type: "withdrawal",
      amount: 200,
      transferFee: 1,
      executionDate: "2023-10-24",
    });
  });

  it("emits no createdAt, because the form does not own that clock", () => {
    // The form produces the fields for a Movement, not a Movement. `createdAt`
    // is the tiebreaker between two movements sharing an executionDate, and it
    // only breaks ties if one clock supplies it - the database's (ADR 0010).
    const movement = buildWithdrawalMovement({ amount: "200", transferFee: "1", executionDate: "2023-10-24" }, deps);

    expect(movement).not.toHaveProperty("createdAt");
  });

  it("defaults an empty Comisión to 0", () => {
    const movement = buildWithdrawalMovement({ amount: "500", transferFee: "", executionDate: "2025-06-25" }, deps);
    expect(movement.transferFee).toBe(0);
  });
});
