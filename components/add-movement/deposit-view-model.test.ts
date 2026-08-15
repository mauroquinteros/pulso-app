import { describe, expect, it } from "vitest";

import { buildDepositMovement, summarizeDeposit, type DepositDeps } from "./deposit-view-model";

const deps: DepositDeps = {
  id: () => "dep-1",
};

describe("summarizeDeposit", () => {
  it("aportado is Monto plus Comisión", () => {
    const { aportado } = summarizeDeposit({
      amount: "1250",
      transferFee: "5",
      executionDate: "2025-06-25",
    });
    expect(aportado).toBe(1255);
  });

  it("treats a blank Comisión as 0", () => {
    const { aportado } = summarizeDeposit({
      amount: "1250",
      transferFee: "",
      executionDate: "2025-06-25",
    });
    expect(aportado).toBe(1250);
  });

  it("shows 0 aportado when Monto is blank, ignoring any fee", () => {
    const { aportado } = summarizeDeposit({
      amount: "",
      transferFee: "5",
      executionDate: "2025-06-25",
    });
    expect(aportado).toBe(0);
  });

  it("enables save only when Monto > 0", () => {
    const date = "2025-06-25";
    expect(summarizeDeposit({ amount: "", transferFee: "", executionDate: date }).saveEnabled).toBe(false);
    expect(summarizeDeposit({ amount: "0", transferFee: "", executionDate: date }).saveEnabled).toBe(false);
    expect(summarizeDeposit({ amount: "100", transferFee: "", executionDate: date }).saveEnabled).toBe(true);
  });

  it("flags a Monto entered as 0 as invalid (but blank is not)", () => {
    const date = "2025-06-25";
    expect(summarizeDeposit({ amount: "0", transferFee: "", executionDate: date }).amountInvalid).toBe(true);
    expect(summarizeDeposit({ amount: "", transferFee: "", executionDate: date }).amountInvalid).toBe(false);
  });

  it("accepts any non-negative Comisión, even one larger than Monto", () => {
    const date = "2025-06-25";
    // The fee no longer competes with the amount — it adds on top to form Aportado.
    const big = summarizeDeposit({
      amount: "100",
      transferFee: "150",
      executionDate: date,
    });
    expect(big.saveEnabled).toBe(true);
    expect(big.aportado).toBe(250);

    const small = summarizeDeposit({
      amount: "100",
      transferFee: "5",
      executionDate: date,
    });
    expect(small.saveEnabled).toBe(true);
    expect(small.aportado).toBe(105);
  });
});

describe("buildDepositMovement", () => {
  it("maps fields to the deposit's fields, with an injected id", () => {
    const movement = buildDepositMovement({ amount: "1250", transferFee: "5", executionDate: "2023-10-24" }, deps);
    expect(movement).toEqual({
      id: "dep-1",
      type: "deposit",
      amount: 1250,
      transferFee: 5,
      executionDate: "2023-10-24",
    });
  });

  it("emits no createdAt, because the form does not own that clock", () => {
    // The form produces the fields for a Movement, not a Movement. `createdAt`
    // is the tiebreaker between two movements sharing an executionDate, and it
    // only breaks ties if one clock supplies it - the database's (ADR 0010).
    const movement = buildDepositMovement({ amount: "1250", transferFee: "5", executionDate: "2023-10-24" }, deps);

    expect(movement).not.toHaveProperty("createdAt");
  });

  it("defaults an empty Comisión to 0", () => {
    const movement = buildDepositMovement({ amount: "500", transferFee: "", executionDate: "2025-06-25" }, deps);
    expect(movement.transferFee).toBe(0);
  });
});
