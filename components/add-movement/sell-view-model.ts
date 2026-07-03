import type { SellMovement } from "@/types/models";
import { normalizeTicker, parseAmount } from "@/utils/input";

export interface SellInput {
  ticker: string;
  shares: string;
  executionPrice: string;
  fee: string;
  regulatoryFees: string;
  executedAt: string; // YYYY-MM-DD
}

export interface SellSummary {
  /** Acciones × Precio — gross proceeds (0 when shares/price blank/≤0). */
  gross: number;
  /** gross − Comisión − Impuestos; what lands in Cash (0 when gross is 0). */
  total: number;
  /** Parsed Comisión (0 when blank) — the breakdown's "Comisión" line. */
  fee: number;
  /** Parsed Impuestos (0 when blank) — the breakdown's "Impuestos" line. */
  regulatoryFees: number;
  /** Acciones > 0 — drives the teal accent on the Acciones field. */
  sharesPositive: boolean;
  /** Precio > 0 — drives the teal accent on the Precio field. */
  pricePositive: boolean;
  /** Save-gate: ticker≠"" and shares>0 and shares≤available and price>0 and fee≥0 and regFees≥0. */
  saveEnabled: boolean;
  /** The ticker is empty (after trim/uppercase) — drives the error once touched. */
  tickerInvalid: boolean;
  /** An Acciones value was entered but is ≤ 0 — error once the field is touched. */
  sharesInvalid: boolean;
  /** A Precio was entered but is ≤ 0 — error once the field is touched. */
  priceInvalid: boolean;
  /** Acciones exceeds the held shares for the ticker — over-sell, blocks save. */
  insufficientShares: boolean;
}

export interface SellDeps {
  id: () => string;
  userId: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/**
 * Pure summary of the sell form: the live "Monto bruto" / "Total a recibir" figures and the
 * save-gate. Venta is the inverse of Compra: the user enters Acciones (a quantity out of a
 * held position) and the proceeds are derived. Total a recibir is gross − Comisión − Impuestos
 * — the cash-side credit, since computeCash does `cash += executionPrice × shares − fee −
 * regulatoryFees`. It previews the engine; it does not re-implement it. With Acciones or Precio
 * blank/≤0 the figures are $0.00. The gate is strict: you can only sell what you hold, so the
 * caller passes in the available shares for the typed ticker (0 if not held).
 */
export function summarizeSell(
  input: SellInput,
  availableShares: number,
): SellSummary {
  const shares = parseAmount(input.shares);
  const price = parseAmount(input.executionPrice);
  const fee = parseAmount(input.fee);
  const regulatoryFees = parseAmount(input.regulatoryFees);

  const priced = shares > 0 && price > 0;
  const gross = priced ? shares * price : 0;
  const total = gross > 0 ? gross - fee - regulatoryFees : 0;

  const tickerInvalid = normalizeTicker(input.ticker) === "";
  const sharesInvalid = input.shares !== "" && shares <= 0;
  const priceInvalid = input.executionPrice !== "" && price <= 0;
  const insufficientShares = shares > 0 && shares > availableShares;

  const saveEnabled =
    !tickerInvalid &&
    shares > 0 &&
    shares <= availableShares &&
    price > 0 &&
    fee >= 0 &&
    regulatoryFees >= 0;

  return {
    gross,
    total,
    fee,
    regulatoryFees,
    sharesPositive: shares > 0,
    pricePositive: price > 0,
    saveEnabled,
    tickerInvalid,
    sharesInvalid,
    priceInvalid,
    insufficientShares,
  };
}

/**
 * Maps validated form input to a typed SellMovement. System fields (id, userId, createdAt)
 * come from injected generators so the result is deterministic and unit-testable; the ticker
 * is stored uppercase and empty Comisión/Impuestos default to 0. The UI label "Impuestos"
 * maps to the model field `regulatoryFees` (a sell has no `tax`).
 */
export function buildSellMovement(
  input: SellInput,
  deps: SellDeps,
): SellMovement {
  return {
    id: deps.id(),
    userId: deps.userId(),
    type: "sell",
    ticker: normalizeTicker(input.ticker),
    shares: parseAmount(input.shares),
    executionPrice: parseAmount(input.executionPrice),
    fee: input.fee === "" ? 0 : parseAmount(input.fee),
    regulatoryFees:
      input.regulatoryFees === "" ? 0 : parseAmount(input.regulatoryFees),
    executedAt: input.executedAt,
    createdAt: deps.now(),
  };
}
