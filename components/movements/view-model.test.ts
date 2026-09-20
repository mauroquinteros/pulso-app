import { MOCK_MOVEMENTS } from "@/fixtures/portfolio";
import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { describe, expect, it } from "vitest";
import { buildMovementsView, movementConfirmLine } from "./view-model";

let seq = 0;
const base = (executionDate: string, createdAt?: string) => ({
  id: `m${seq++}`,
  executionDate,
  createdAt: createdAt ?? `${executionDate}T00:00:00Z`,
});
const deposit = (amount: number, transferFee = 0, executionDate = "2025-01-10"): DepositMovement => ({
  ...base(executionDate),
  type: "deposit",
  amount,
  transferFee,
});
const withdrawal = (amount: number, transferFee = 0, executionDate = "2026-01-08"): WithdrawalMovement => ({
  ...base(executionDate),
  type: "withdrawal",
  amount,
  transferFee,
});
const buy = (
  ticker: string,
  executionPrice: number,
  shares: number,
  fee = 0,
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
  fee = 0,
  regulatoryFees = 0,
  executionDate = "2025-09-22",
): SellMovement => ({
  ...base(executionDate),
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
  executionDate = "2025-11-15",
): DividendMovement => ({
  ...base(executionDate),
  type: "dividend",
  ticker,
  grossAmount,
  tax,
});

describe("buildMovementsView", () => {
  it("orders newest first by executionDate", () => {
    const movements: Movement[] = [
      buy("AAPL", 100, 1, 0, "2025-01-15"),
      dividend("AAPL", 10, 3, "2025-11-15"),
      deposit(1000, 0, "2025-06-01"),
    ];
    const view = buildMovementsView(movements, null);
    expect(view.rows.map((r) => r.dateLabel)).toEqual(["15 nov 2025", "1 jun 2025", "15 ene 2025"]);
  });

  it("breaks a same-day tie with createdAt, newest recorded first", () => {
    // Both executed the 15th; recorded on different days.
    const first: Movement = {
      ...buy("AAPL", 100, 1, 0, "2025-01-15"),
      id: "recorded-first",
      createdAt: "2025-02-01T10:00:00Z",
    };
    const second: Movement = {
      ...buy("VOO", 100, 1, 0, "2025-01-15"),
      id: "recorded-second",
      createdAt: "2025-02-03T10:00:00Z",
    };
    const view = buildMovementsView([first, second], null);
    expect(view.rows.map((r) => r.id)).toEqual(["recorded-second", "recorded-first"]);
  });

  it("places a backdated movement where it happened, not at the top", () => {
    const old: Movement = {
      ...buy("AAPL", 100, 1, 0, "2025-01-15"),
      id: "backdated",
      createdAt: "2026-06-01T10:00:00Z", // recorded much later
    };
    const recent = deposit(500, 0, "2025-12-01");
    const view = buildMovementsView([old, recent], null);
    expect(view.rows[0].id).toBe(recent.id); // December beats January
    expect(view.rows[1].id).toBe("backdated");
  });

  it("returns every movement when no type is selected", () => {
    const view = buildMovementsView(MOCK_MOVEMENTS, null);
    expect(view.state).toBe("ready");
    expect(view.rows).toHaveLength(MOCK_MOVEMENTS.length);
    expect(view.filteredEmptyMessage).toBeNull();
  });

  it("returns only the selected type when one is filtered", () => {
    const view = buildMovementsView(MOCK_MOVEMENTS, "dividend");
    expect(view.state).toBe("ready");
    expect(view.rows.every((r) => r.type === "dividend")).toBe(true);
    expect(view.rows).toHaveLength(2); // AAPL + VOO dividends in the mock
  });

  it("marks an empty portfolio of movements and offers nothing to filter", () => {
    const view = buildMovementsView([], null);
    expect(view.state).toBe("empty");
    expect(view.chips).toHaveLength(0);
    expect(view.rows).toHaveLength(0);
    expect(view.filteredEmptyMessage).toBeNull();
  });

  it("distinguishes a filtered-empty list, naming the type and keeping the chips", () => {
    // There are movements, just none of the selected type.
    const view = buildMovementsView([deposit(1000)], "withdrawal");
    expect(view.state).toBe("filtered-empty");
    expect(view.filteredEmptyMessage).toBe("No tienes retiros");
    expect(view.rows).toHaveLength(0);
    expect(view.chips).toHaveLength(5); // the filter stays escapable
    expect(view.chips.find((c) => c.type === "withdrawal")?.selected).toBe(true);
  });

  it("lists the five chips in taxonomy order with the selected one flagged", () => {
    const view = buildMovementsView(MOCK_MOVEMENTS, "deposit");
    expect(view.chips.map((c) => c.label)).toEqual(["Compras", "Ventas", "Dividendos", "Depósitos", "Retiros"]);
    expect(view.chips.filter((c) => c.selected).map((c) => c.type)).toEqual(["deposit"]);
  });

  it("titles ticker movements with their ticker and cash movements without one", () => {
    const movements: Movement[] = [
      buy("AAPL", 100, 1),
      sell("VOO", 100, 1),
      dividend("AAPL", 10, 3),
      deposit(1000),
      withdrawal(500),
    ];
    const titles = buildMovementsView(movements, null)
      .rows.map((r) => r.title)
      .sort();
    expect(titles).toEqual(["Compra AAPL", "Depósito", "Dividendo AAPL", "Retiro", "Venta VOO"]);
  });

  it("shows each type's Cash Impact as an unsigned magnitude", () => {
    const movements: Movement[] = [
      deposit(3000, 3.99), // transfer fee never touches cash
      withdrawal(500, 1),
      buy("AAPL", 182.5, 2.45321, 0.15), // principal + fee
      sell("AAPL", 195.5, 3, 0.15, 0.03), // net of fees
      dividend("AAPL", 18.5, 5.55), // net of tax
    ];
    const amounts = Object.fromEntries(buildMovementsView(movements, null).rows.map((r) => [r.type, r.amount]));
    expect(amounts).toEqual({
      deposit: "$3,000.00",
      withdrawal: "$500.00",
      buy: "$447.86",
      sell: "$586.32",
      dividend: "$12.95",
    });
  });

  it("never signs an amount, not even for cash leaving the account", () => {
    const rows = buildMovementsView([buy("AAPL", 182.5, 2.45321, 0.15), withdrawal(500, 1)], null).rows;
    for (const row of rows) {
      // The list shows a magnitude: no sign of any kind, in either encoding.
      expect(row.amount).not.toContain("-");
      expect(row.amount).not.toContain("\u2212"); // U+2212
      expect(row.amount).not.toContain("+");
    }
  });

  it("formats the date in Spanish, always with the year, without shifting the day", () => {
    const view = buildMovementsView(
      [
        buy("AAPL", 100, 1, 0, "2025-01-15"),
        withdrawal(500, 1, "2026-01-08"),
        dividend("VOO", 12.3, 3.69, "2025-12-20"),
      ],
      null,
    );
    expect(view.rows.map((r) => r.dateLabel)).toEqual([
      "8 ene 2026",
      "20 dic 2025",
      "15 ene 2025", // the 15th stays the 15th — never the 14th
    ]);
  });

  it("reads a row as one sentence, in the order the layout stacks it", () => {
    const view = buildMovementsView([buy("AAPL", 100, 4.4786, 0, "2025-01-15")], null);
    expect(view.rows[0].a11yLabel).toBe("Compra AAPL, 15 ene 2025, $447.86");
  });

  it("marks only the row whose delete is in flight", () => {
    const first = buy("AAPL", 100, 4.4786, 0, "2025-01-15");
    const second = withdrawal(500, 1, "2026-01-08");

    const view = buildMovementsView([first, second], null, first.id);

    expect(view.rows.map((r) => ({ id: r.id, deleting: r.deleting }))).toEqual([
      { id: second.id, deleting: false },
      { id: first.id, deleting: true },
    ]);
  });

  it("marks no row when nothing is being deleted", () => {
    const view = buildMovementsView([buy("AAPL", 100, 4.4786), withdrawal(500, 1)], null);
    expect(view.rows.every((r) => !r.deleting)).toBe(true);
  });
});

describe("movementConfirmLine", () => {
  it("names the movement the alert is about to destroy", () => {
    expect(movementConfirmLine(buy("AAPL", 100, 4.4786, 0, "2025-01-15"))).toBe("Compra AAPL - 15 ene 2025 - $447.86");
  });

  it("names a cash movement without a phantom ticker", () => {
    expect(movementConfirmLine(withdrawal(500, 1, "2026-01-08"))).toBe("Retiro - 8 ene 2026 - $500.00");
  });

  it("separates with ASCII hyphens, never a lookalike", () => {
    const line = movementConfirmLine(withdrawal(500, 1, "2026-01-08"));
    expect(line).not.toContain("\u2212"); // U+2212
    expect(line).not.toContain("\u2014"); // U+2014
  });
});
