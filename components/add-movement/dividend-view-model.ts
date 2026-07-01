import type { DividendMovement } from "@/types/models";
import { normalizeTicker, parseAmount } from "@/utils/input";

export interface DividendInput {
  ticker: string;
  grossAmount: string;
  tax: string;
  executedAt: string; // YYYY-MM-DD
}

export interface DividendSummary {
  /** Monto bruto — the dividend paid before tax (0 when blank/≤0). */
  gross: number;
  /** gross − Impuestos; what lands in Cash (0 when gross is 0). */
  total: number;
  /** Save-gate: ticker≠"" and gross>0 and tax≥0 and tax≤gross. */
  saveEnabled: boolean;
  /** The ticker is empty (after trim/uppercase) — drives the error once touched. */
  tickerInvalid: boolean;
  /** A Monto bruto value was entered but is ≤ 0 — error once the field is touched. */
  grossInvalid: boolean;
  /** Impuestos exceeds the gross — a negative net dividend, blocks save. */
  taxExceedsGross: boolean;
}

export interface DividendDeps {
  id: () => string;
  userId: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/**
 * Pure summary of the dividend form: the live "Monto bruto" / "Total a recibir" figures and the
 * save-gate. Dividendo is amount-first — the user records the gross cash paid and the withholding
 * tax, and the net is derived. Total a recibir is gross − Impuestos — the cash-side credit, since
 * computeCash does `cash += grossAmount − tax`. It previews the engine; it does not re-implement
 * it. With Monto bruto blank/≤0 the figures are $0.00. Unlike Venta there is no held-shares gate:
 * a dividend is income, not a trade against a position. The one guard is domain honesty — tax
 * cannot exceed the gross (a negative net dividend is never a real event).
 */
export function summarizeDividend(input: DividendInput): DividendSummary {
  const grossValue = parseAmount(input.grossAmount);
  const tax = parseAmount(input.tax);

  const gross = grossValue > 0 ? grossValue : 0;
  const total = gross > 0 ? gross - tax : 0;

  const tickerInvalid = normalizeTicker(input.ticker) === "";
  const grossInvalid = input.grossAmount !== "" && grossValue <= 0;
  const taxExceedsGross = gross > 0 && tax > gross;

  const saveEnabled = !tickerInvalid && gross > 0 && tax >= 0 && tax <= gross;

  return {
    gross,
    total,
    saveEnabled,
    tickerInvalid,
    grossInvalid,
    taxExceedsGross,
  };
}

/**
 * Maps validated form input to a typed DividendMovement. System fields (id, userId, createdAt)
 * come from injected generators so the result is deterministic and unit-testable; the ticker is
 * stored uppercase and empty Impuestos defaults to 0. The UI label "Impuestos" maps to the model
 * field `tax` (the withholding tax — a dividend has no `fee`).
 */
export function buildDividendMovement(
  input: DividendInput,
  deps: DividendDeps,
): DividendMovement {
  return {
    id: deps.id(),
    userId: deps.userId(),
    type: "dividend",
    ticker: normalizeTicker(input.ticker),
    grossAmount: parseAmount(input.grossAmount),
    tax: input.tax === "" ? 0 : parseAmount(input.tax),
    executedAt: input.executedAt,
    createdAt: deps.now(),
  };
}
