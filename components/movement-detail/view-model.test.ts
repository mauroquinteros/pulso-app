import { buildMovementsView } from "@/components/movements/view-model";
import { MOCK_MOVEMENTS } from "@/lib/mock-data";
import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { cashImpact } from "@/utils/portfolio/cash";
import { describe, expect, it } from "vitest";
import { buildMovementDetailView, type DetailLine } from "./view-model";

let seq = 0;
const base = (executionDate: string) => ({
  id: `m${seq++}`,
  userId: "u",
  executionDate,
  createdAt: `${executionDate}T00:00:00Z`,
});
const buy = (
  ticker: string,
  executionPrice: number,
  shares: number,
  fee: number,
  executionDate = "2025-01-15",
): BuyMovement => ({
  ...base(executionDate),
  type: "buy",
  ticker,
  executionPrice,
  shares,
  fee,
});
const sell = (
  ticker: string,
  executionPrice: number,
  shares: number,
  fee: number,
  regulatoryFees: number,
): SellMovement => ({
  ...base("2025-09-22"),
  type: "sell",
  ticker,
  executionPrice,
  shares,
  fee,
  regulatoryFees,
});
const dividend = (
  ticker: string,
  grossAmount: number,
  tax: number,
): DividendMovement => ({
  ...base("2025-11-15"),
  type: "dividend",
  ticker,
  grossAmount,
  tax,
});
const deposit = (amount: number, transferFee: number): DepositMovement => ({
  ...base("2025-01-10"),
  type: "deposit",
  amount,
  transferFee,
});
const withdrawal = (
  amount: number,
  transferFee: number,
): WithdrawalMovement => ({
  ...base("2026-01-08"),
  type: "withdrawal",
  amount,
  transferFee,
});

/** Reads back a figure the view-model rendered: "$8,821.70" | "+$0.88" | "-$5.55".
 * The invariants are asserted on the STRINGS the screen shows, never on values
 * recomputed inside the test — otherwise they would prove nothing. */
const parseAmount = (rendered: string): number => {
  const negative = rendered.includes("-");
  const digits = parseFloat(rendered.replace(/[^\d.]/g, ""));
  return negative ? -digits : digits;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const pairs = (lines: DetailLine[]) => lines.map((l) => [l.label, l.amount]);

describe("buildMovementDetailView", () => {
  it("builds a buy's receipt: gross, commission added, total paid", () => {
    const view = buildMovementDetailView(buy("AAPL", 182.5, 2.45321, 0.15));

    expect(view.state).toBe("found");
    expect(view.header).toEqual({
      title: "Compra AAPL",
      dateLabel: "15 ene 2025",
      type: "buy",
    });
    expect(pairs(view.facts)).toEqual([
      ["Acciones", "2.45321"],
      ["Precio de ejecución", "$182.50"],
    ]);
    expect(pairs(view.money)).toEqual([
      ["Monto bruto", "$447.71"],
      ["Comisión", "+$0.15"], // a commission ADDS to what a buy costs you
    ]);
    expect(view.total).toEqual({ label: "Total pagado", amount: "$447.86" });
  });

  it("builds a sell's receipt: commission and regulatory fees both deducted", () => {
    const view = buildMovementDetailView(sell("AAPL", 195.5, 3, 0.15, 0.03));

    expect(view.header?.title).toBe("Venta AAPL");
    expect(pairs(view.facts)).toEqual([
      ["Acciones", "3"],
      ["Precio de ejecución", "$195.50"],
    ]);
    expect(pairs(view.money)).toEqual([
      ["Monto bruto", "$586.50"],
      ["Comisión", "-$0.15"], // the same fee SUBTRACTS from what a sell pays you
      ["Tarifas regulatorias", "-$0.03"],
    ]);
    expect(view.total).toEqual({ label: "Total recibido", amount: "$586.32" });
  });

  it("builds a dividend's receipt: gross less withholding tax", () => {
    const view = buildMovementDetailView(dividend("AAPL", 18.5, 5.55));

    expect(view.header?.title).toBe("Dividendo AAPL");
    expect(view.facts).toEqual([]); // no shares, no price
    expect(pairs(view.money)).toEqual([
      ["Monto bruto", "$18.50"],
      ["Impuesto", "-$5.55"],
    ]);
    expect(view.total).toEqual({ label: "Total recibido", amount: "$12.95" });
  });

  it("runs a deposit's arithmetic backwards: from the bank down to the cash", () => {
    const view = buildMovementDetailView(deposit(3000, 3.99));

    expect(view.header?.title).toBe("Depósito"); // no ticker
    expect(view.facts).toEqual([]);
    // The base is what left the bank; the total is what landed as Cash.
    expect(pairs(view.money)).toEqual([
      ["Total transferido", "$3,003.99"],
      ["Comisión", "-$3.99"],
    ]);
    expect(view.total).toEqual({
      label: "Efectivo agregado",
      amount: "$3,000.00",
    });
  });

  it("runs a withdrawal's arithmetic backwards: from the bank up to the cash", () => {
    const view = buildMovementDetailView(withdrawal(500, 1));

    expect(view.header?.title).toBe("Retiro");
    expect(view.facts).toEqual([]);
    expect(pairs(view.money)).toEqual([
      ["Recibido en banco", "$499.00"],
      ["Comisión", "+$1.00"],
    ]);
    expect(view.total).toEqual({
      label: "Efectivo retirado",
      amount: "$500.00",
    });
  });

  it("signs adjustments with an ASCII hyphen, never a unicode minus", () => {
    const view = buildMovementDetailView(sell("AAPL", 195.5, 3, 0.15, 0.03));
    for (const line of view.money.slice(1)) {
      expect(line.amount).not.toContain("\u2212"); // U+2212 is banned app-wide
    }
    expect(view.money[1].amount).toContain("-"); // a plain hyphen
    // The base and the total never carry a sign at all.
    expect(view.money[0].amount).toBe("$586.50");
    expect(view.total?.amount).toBe("$586.32");
  });

  it("reports not-found for a movement that does not exist", () => {
    const view = buildMovementDetailView(undefined);
    expect(view).toEqual({
      state: "not-found",
      header: null,
      facts: [],
      money: [],
      total: null,
    });
  });

  it("drops a zero adjustment rather than printing a signless '+$0.00'", () => {
    // A fee-free buy is reachable: the forms let the fee field be left empty.
    const view = buildMovementDetailView(buy("AAPL", 100, 2, 0));
    expect(view.money).toEqual([]); // the base would only repeat the total
    expect(view.total).toEqual({ label: "Total pagado", amount: "$200.00" });
  });

  // ── The two invariants ────────────────────────────────────────────────────
  // Both are asserted by reading back the strings the view-model renders.

  it("INVARIANT: the lines shown always add up to the total shown", () => {
    for (const movement of MOCK_MOVEMENTS) {
      const view = buildMovementDetailView(movement);
      if (view.money.length === 0) continue; // nothing to add up
      const sum = round2(
        view.money.reduce((total, line) => total + parseAmount(line.amount), 0),
      );
      expect(sum).toBe(parseAmount(view.total!.amount));
    }
  });

  it("INVARIANT: the total is the same figure the movements list shows", () => {
    const rows = buildMovementsView(MOCK_MOVEMENTS, null).rows;
    const rowAmountById = new Map(rows.map((r) => [r.id, r.amount]));

    for (const movement of MOCK_MOVEMENTS) {
      const view = buildMovementDetailView(movement);
      // The detail's total and the list's row are the same string, character for
      // character — the two screens cannot contradict each other.
      expect(view.total!.amount).toBe(rowAmountById.get(movement.id));
    }
  });

  it("ADVERSARIAL: derives the gross from the total so the receipt still adds up", () => {
    // 10.975 × $803.80 = 8,821.705 — a gross landing exactly on a half-cent.
    // The naive implementation shows round2(price × shares) = $8,821.71, and then
    // 8,821.71 + 0.88 = 8,822.59 ≠ the $8,822.58 total. The receipt breaks.
    // Deriving the gross from the total keeps both invariants intact.
    const movement = buy("AAPL", 803.8, 10.975, 0.88);
    const view = buildMovementDetailView(movement);

    expect(pairs(view.money)).toEqual([
      ["Monto bruto", "$8,821.70"], // derived — NOT round2(803.80 × 10.975) = 8,821.71
      ["Comisión", "+$0.88"],
    ]);
    expect(view.total?.amount).toBe("$8,822.58");

    // Invariant 1 holds where the naive version would fail.
    expect(round2(8821.7 + 0.88)).toBe(parseAmount(view.total!.amount));
    // Invariant 2 holds: the total is still exactly the engine's Cash Impact.
    expect(parseAmount(view.total!.amount)).toBe(
      round2(Math.abs(cashImpact(movement))),
    );
  });
});
