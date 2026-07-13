import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import type { Movement, MovementType } from "@/types/models";
import { formatDate, formatShares, formatSignedUSD, formatUSD } from "@/utils/format";
import { cashImpact } from "@/utils/portfolio/cash";

export interface DetailLine {
  label: string;
  amount: string; // "$447.71" | "+$0.15" | "−$5.55" — the operator is baked in
}

export interface MovementDetailView {
  state: "found" | "not-found";
  header: { title: string; dateLabel: string; type: MovementType } | null;
  facts: DetailLine[]; // shares, price — buy/sell only; never signed (not arithmetic)
  money: DetailLine[]; // base + signed adjustments
  total: DetailLine | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A signed adjustment line. Returns null when the value is zero: a "+$0.00"
 * fee is noise, and worse, its sign would contradict the line's real direction. */
const adjustment = (label: string, signedValue: number): DetailLine | null =>
  signedValue === 0 ? null : { label, amount: formatSignedUSD(signedValue) };

/**
 * Pure view-model for the movement detail: turns a Movement into a receipt —
 * base → signed adjustments → total.
 *
 * **The total is always the movement's Cash Impact**, the very figure the
 * movements list shows for that row, so the two screens cannot contradict each
 * other. The engine's `cashImpact` is reused, never reimplemented.
 *
 * Two rules here are not obvious, and both are deliberate (see the movement
 * detail UX spec):
 *
 * 1. **Deposits and withdrawals run the arithmetic backwards.** Their base is the
 *    bank-boundary figure and their total is the cash. That is what lets the
 *    total be the Cash Impact without degenerating the receipt: if the total were
 *    the cash, the transfer fee would add to nothing.
 *
 * 2. **A buy/sell's gross is DERIVED from the total, not from
 *    `executionPrice × shares`.** The engine computes the Cash Impact from the
 *    *raw* gross (e.g. 8,821.705), so displaying `round2(price × shares)`
 *    (8,821.71) alongside a total drawn from it would leave the receipt one cent
 *    short of adding up — in ~0.002% of buys, measured. Deriving the gross keeps
 *    the receipt self-consistent *and* the total equal to the list's figure.
 */
export function buildMovementDetailView(
  movement: Movement | undefined,
): MovementDetailView {
  if (!movement) {
    return {
      state: "not-found",
      header: null,
      facts: [],
      money: [],
      total: null,
    };
  }

  const meta = MOVEMENT_TYPE_META[movement.type];
  const header = {
    title:
      "ticker" in movement ? `${meta.label} ${movement.ticker}` : meta.label,
    dateLabel: formatDate(movement.executionDate),
    type: movement.type,
  };

  // The magnitude of the Cash Impact — the same figure, rounded the same way, as
  // the movements list renders for this row.
  const totalValue = round2(Math.abs(cashImpact(movement)));

  const { facts, money, totalLabel } = buildReceipt(movement, totalValue);

  return {
    state: "found",
    header,
    facts,
    // With no adjustments the base would just repeat the total, so it is dropped.
    money: money.length > 0 ? money : [],
    total: { label: totalLabel, amount: formatUSD(totalValue) },
  };
}

function buildReceipt(
  movement: Movement,
  totalValue: number,
): { facts: DetailLine[]; money: DetailLine[]; totalLabel: string } {
  switch (movement.type) {
    case "buy": {
      const gross = round2(totalValue - movement.fee); // derived, not price × shares
      const adjustments = [adjustment("Comisión", movement.fee)];
      return {
        facts: tradeFacts(movement.shares, movement.executionPrice),
        money: withBase("Monto bruto", gross, adjustments),
        totalLabel: "Total pagado",
      };
    }
    case "sell": {
      const gross = round2(totalValue + movement.fee + movement.regulatoryFees);
      const adjustments = [
        adjustment("Comisión", -movement.fee),
        adjustment("Tarifas regulatorias", -movement.regulatoryFees),
      ];
      return {
        facts: tradeFacts(movement.shares, movement.executionPrice),
        money: withBase("Monto bruto", gross, adjustments),
        totalLabel: "Total recibido",
      };
    }
    case "dividend": {
      // grossAmount and tax are stored to the cent: nothing to derive.
      const adjustments = [adjustment("Impuesto", -movement.tax)];
      return {
        facts: [],
        money: withBase("Monto bruto", movement.grossAmount, adjustments),
        totalLabel: "Total recibido",
      };
    }
    case "deposit": {
      // Backwards: from what left the bank down to the cash that landed.
      const transferred = round2(movement.amount + movement.transferFee);
      const adjustments = [
        adjustment("Comisión de transferencia", -movement.transferFee),
      ];
      return {
        facts: [],
        money: withBase("Total transferido", transferred, adjustments),
        totalLabel: "Efectivo agregado",
      };
    }
    case "withdrawal": {
      // Backwards: from what reached the bank up to the cash that left.
      const receivedAtBank = round2(movement.amount - movement.fee);
      const adjustments = [adjustment("Comisión", movement.fee)];
      return {
        facts: [],
        money: withBase("Recibido en banco", receivedAtBank, adjustments),
        totalLabel: "Efectivo retirado",
      };
    }
  }
}

/** Shares and price are context, not arithmetic — they never carry an operator. */
const tradeFacts = (shares: number, executionPrice: number): DetailLine[] => [
  { label: "Acciones", amount: formatShares(shares) },
  { label: "Precio de ejecución", amount: formatUSD(executionPrice) },
];

/** Base line plus its surviving adjustments. When every adjustment is zero the
 * base equals the total, so the whole block is dropped rather than printed twice. */
function withBase(
  label: string,
  base: number,
  adjustments: (DetailLine | null)[],
): DetailLine[] {
  const present = adjustments.filter((line): line is DetailLine => line !== null);
  if (present.length === 0) return [];
  return [{ label, amount: formatUSD(base) }, ...present];
}
