import { describe, expect, it } from "vitest";

import { formatShares } from "@/utils/format";
import { maxSellableAsOf } from "@/utils/portfolio/reducer";

import { buildBuyMovement } from "./buy-view-model";
import {
  buildSellMovement,
  summarizeSell,
  type SellDeps,
} from "./sell-view-model";

const deps: SellDeps = {
  id: () => "sell-1",
  userId: () => "mock-user-001",
  now: () => "2025-06-25T12:00:00Z",
};

const base = { ticker: "GOOG", executionDate: "2025-06-25" };

describe("summarizeSell", () => {
  it("gross is Acciones × Precio", () => {
    const { gross } = summarizeSell(
      {
        ...base,
        shares: "2",
        executionPrice: "349.60",
        fee: "0.10",
        regulatoryFees: "0.02",
      },
      6,
    );
    expect(gross).toBe(699.2);
  });

  it("total a recibir is gross minus Comisión and Impuestos", () => {
    const { total } = summarizeSell(
      {
        ...base,
        shares: "2",
        executionPrice: "349.60",
        fee: "0.10",
        regulatoryFees: "0.02",
      },
      6,
    );
    expect(total).toBe(699.08);
  });

  it("treats blank Comisión and Impuestos as 0 (total equals gross)", () => {
    const { total } = summarizeSell(
      {
        ...base,
        shares: "2",
        executionPrice: "100",
        fee: "",
        regulatoryFees: "",
      },
      6,
    );
    expect(total).toBe(200);
  });

  it("shows 0 gross and 0 total when Acciones is blank", () => {
    const { gross, total } = summarizeSell(
      {
        ...base,
        shares: "",
        executionPrice: "100",
        fee: "1",
        regulatoryFees: "1",
      },
      6,
    );
    expect(gross).toBe(0);
    expect(total).toBe(0);
  });

  it("shows 0 gross when Precio is blank", () => {
    const { gross, total } = summarizeSell(
      {
        ...base,
        shares: "2",
        executionPrice: "",
        fee: "1",
        regulatoryFees: "",
      },
      6,
    );
    expect(gross).toBe(0);
    expect(total).toBe(0);
  });

  it("enables save only when ticker, Acciones (≤ available) and Precio are all valid", () => {
    expect(
      summarizeSell(
        {
          ...base,
          shares: "",
          executionPrice: "",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).saveEnabled,
    ).toBe(false);
    expect(
      summarizeSell(
        {
          ...base,
          ticker: "",
          shares: "2",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).saveEnabled,
    ).toBe(false);
    expect(
      summarizeSell(
        {
          ...base,
          shares: "2",
          executionPrice: "",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).saveEnabled,
    ).toBe(false);
    expect(
      summarizeSell(
        {
          ...base,
          shares: "2",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).saveEnabled,
    ).toBe(true);
  });

  it("flags an empty ticker as invalid (whitespace-only too)", () => {
    expect(
      summarizeSell(
        {
          ...base,
          ticker: "",
          shares: "2",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).tickerInvalid,
    ).toBe(true);
    expect(
      summarizeSell(
        {
          ...base,
          ticker: "   ",
          shares: "2",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).tickerInvalid,
    ).toBe(true);
    expect(
      summarizeSell(
        {
          ...base,
          shares: "2",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).tickerInvalid,
    ).toBe(false);
  });

  it("flags an Acciones value entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeSell(
        {
          ...base,
          shares: "0",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).sharesInvalid,
    ).toBe(true);
    expect(
      summarizeSell(
        {
          ...base,
          shares: "",
          executionPrice: "100",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).sharesInvalid,
    ).toBe(false);
  });

  it("flags a Precio entered as 0 as invalid (but blank is not)", () => {
    expect(
      summarizeSell(
        {
          ...base,
          shares: "2",
          executionPrice: "0",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).priceInvalid,
    ).toBe(true);
    expect(
      summarizeSell(
        {
          ...base,
          shares: "2",
          executionPrice: "",
          fee: "",
          regulatoryFees: "",
        },
        6,
      ).priceInvalid,
    ).toBe(false);
  });

  it("blocks save and flags insufficientShares when Acciones exceeds held shares", () => {
    const over = summarizeSell(
      {
        ...base,
        shares: "10",
        executionPrice: "100",
        fee: "",
        regulatoryFees: "",
      },
      6.08298,
    );
    expect(over.insufficientShares).toBe(true);
    expect(over.saveEnabled).toBe(false);
  });

  it("treats a not-held ticker (available 0) as over-sell", () => {
    const notHeld = summarizeSell(
      {
        ...base,
        shares: "1",
        executionPrice: "100",
        fee: "",
        regulatoryFees: "",
      },
      0,
    );
    expect(notHeld.insufficientShares).toBe(true);
    expect(notHeld.saveEnabled).toBe(false);
  });

  it("allows selling exactly the held shares (full exit)", () => {
    const exact = summarizeSell(
      {
        ...base,
        shares: "6.08298",
        executionPrice: "100",
        fee: "",
        regulatoryFees: "",
      },
      6.08298,
    );
    expect(exact.insufficientShares).toBe(false);
    expect(exact.saveEnabled).toBe(true);
  });

  it("does not flag insufficientShares for a blank form", () => {
    const blank = summarizeSell(
      { ...base, shares: "", executionPrice: "", fee: "", regulatoryFees: "" },
      0,
    );
    expect(blank.insufficientShares).toBe(false);
  });

  describe("fees exceeding gross (a negative Total a recibir)", () => {
    it("blocks save and flags feesExceedGross when Comisión + Impuestos > gross", () => {
      // 1 share at $1 = $1 gross, but a $5 fee => total -$4.
      const over = summarizeSell(
        { ...base, shares: "1", executionPrice: "1", fee: "5", regulatoryFees: "" },
        6,
      );
      expect(over.total).toBe(-4);
      expect(over.feesExceedGross).toBe(true);
      expect(over.saveEnabled).toBe(false);
    });

    it("counts both fee and regulatoryFees against gross, not just fee", () => {
      // 1 share at $10 = $10 gross; $6 fee + $5 impuestos = $11 => total -$1.
      const over = summarizeSell(
        { ...base, shares: "1", executionPrice: "10", fee: "6", regulatoryFees: "5" },
        6,
      );
      expect(over.total).toBe(-1);
      expect(over.feesExceedGross).toBe(true);
      expect(over.saveEnabled).toBe(false);
    });

    it("allows fees exactly equal to gross (total $0 is honest, not a debit)", () => {
      const even = summarizeSell(
        { ...base, shares: "1", executionPrice: "10", fee: "6", regulatoryFees: "4" },
        6,
      );
      expect(even.total).toBe(0);
      expect(even.feesExceedGross).toBe(false);
      expect(even.saveEnabled).toBe(true);
    });

    it("does not flag feesExceedGross on a blank form (no gross yet)", () => {
      const blank = summarizeSell(
        { ...base, shares: "", executionPrice: "", fee: "5", regulatoryFees: "" },
        6,
      );
      expect(blank.feesExceedGross).toBe(false);
    });
  });
});

describe("buildSellMovement", () => {
  it("maps fields to a typed SellMovement with injected system fields", () => {
    const movement = buildSellMovement(
      {
        ticker: "GOOG",
        shares: "2",
        executionPrice: "349.60",
        fee: "0.10",
        regulatoryFees: "0.02",
        executionDate: "2023-10-24",
      },
      deps,
    );
    expect(movement).toEqual({
      id: "sell-1",
      userId: "mock-user-001",
      type: "sell",
      ticker: "GOOG",
      shares: 2,
      executionPrice: 349.6,
      fee: 0.1,
      regulatoryFees: 0.02,
      executionDate: "2023-10-24",
      createdAt: "2025-06-25T12:00:00Z",
    });
  });

  it("stores the ticker uppercase and trimmed", () => {
    const movement = buildSellMovement(
      {
        ...base,
        ticker: "  goog ",
        shares: "1",
        executionPrice: "100",
        fee: "",
        regulatoryFees: "",
      },
      deps,
    );
    expect(movement.ticker).toBe("GOOG");
  });

  it("defaults empty Comisión and Impuestos to 0", () => {
    const movement = buildSellMovement(
      {
        ...base,
        ticker: "AAPL",
        shares: "3",
        executionPrice: "190",
        fee: "",
        regulatoryFees: "",
      },
      deps,
    );
    expect(movement.fee).toBe(0);
    expect(movement.regulatoryFees).toBe(0);
  });
});

describe("selling the full position shown as Disponible", () => {
  // A position bought through the form (shares = Monto / Precio) used to be
  // stored at full float precision while "Disponible" showed only 5 decimals,
  // so typing exactly what was shown was rejected as an over-sell. With shares
  // standardised at 5 dp everywhere, the displayed figure IS the held amount.
  it("closes a derived fractional position (no over-sell block)", () => {
    const buy = buildBuyMovement(
      {
        ticker: "NVDA",
        amount: "500",
        executionPrice: "123.7",
        fee: "",
        executionDate: "2025-01-01",
      },
      { id: () => "buy-x", userId: () => "u", now: () => "2025-01-01T00:00:00Z" },
    );
    const available = maxSellableAsOf([buy], "NVDA", "2025-06-01");
    const shown = formatShares(available); // what the Acciones helper displays

    const summary = summarizeSell(
      {
        ticker: "NVDA",
        shares: shown,
        executionPrice: "130",
        fee: "",
        regulatoryFees: "",
        executionDate: "2025-06-01",
      },
      available,
    );

    expect(summary.insufficientShares).toBe(false);
    expect(summary.saveEnabled).toBe(true);
  });
});
