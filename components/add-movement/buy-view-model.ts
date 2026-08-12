import type { BuyMovement } from "@/types/models";
import { normalizeTicker, parseAmount, roundShares } from "@/utils/input";
import type { SymbolCheckState } from "@/utils/symbol-check";

export interface BuyInput {
  ticker: string;
  amount: string; // "Monto comprado" — principal invested (cash that buys shares)
  executionPrice: string;
  fee: string;
  executionDate: string; // YYYY-MM-DD
}

export interface BuySummary {
  /** Derived acciones = Monto / Precio (0 when Monto or Precio is blank/≤0). */
  shares: number;
  /** Total a pagar = Monto + Comisión; what leaves Cash (0 when Monto is blank/≤0). */
  total: number;
  /** Parsed Comisión (0 when blank) — the breakdown's "Comisión" line. */
  fee: number;
  /** Monto > 0 — drives the teal accent on the Monto field. */
  amountPositive: boolean;
  /** Precio > 0 — drives the teal accent on the Precio field. */
  pricePositive: boolean;
  /** Save-gate: símbolo confirmed and ticker≠"" and amount>0 and price>0 and fee≥0 and total ≤ available Cash. */
  saveEnabled: boolean;
  /** The ticker is empty (after trim/uppercase) — drives the error once touched. */
  tickerInvalid: boolean;
  /** A Monto was entered but is ≤ 0 — error once the field is touched. */
  amountInvalid: boolean;
  /** A Precio was entered but is ≤ 0 — error once the field is touched. */
  priceInvalid: boolean;
  /** Total a pagar exceeds the available Cash — blocks save. */
  insufficientFunds: boolean;
}

export interface BuyDeps {
  id: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/**
 * Derived shares from the cash-side input: Monto / Precio, rounded to the
 * app-wide 5-decimal share precision (0 unless both > 0).
 */
function deriveShares(amount: number, price: number): number {
  return amount > 0 && price > 0 ? roundShares(amount / price) : 0;
}

/**
 * Pure summary of the buy form: the derived acciones, the live "Total a pagar"
 * figure, and the save-gate. The user buys by **Monto** (principal), so shares are
 * derived (`Monto / Precio`) rather than typed. Total a pagar is Monto + Comisión —
 * the cash-side debit, since computeCash does `cash -= executionPrice × shares + fee`
 * and `executionPrice × shares == Monto`, so the whole total (fee included) leaves Cash.
 * It previews the engine; it does not re-implement it. With Monto blank/≤0 the total
 * is $0.00. The funds gate is strict: the whole total must fit within the available
 * Cash, which the caller passes in.
 *
 * The símbolo's confirmation status arrives the same way, from the state machine in
 * `utils/symbol-check.ts`. Both are state derived elsewhere and handed in, and they
 * sit together so that "can this be saved" has exactly one expression rather than a
 * partial answer here and a correction in the screen. That gate is strict too: a
 * symbol still being checked does not open it, because accepting a tap and *then*
 * rejecting the save is a worse moment to learn the symbol is wrong than the field
 * turning red while the user is still looking at it.
 */
export function summarizeBuy(
  input: BuyInput,
  availableCash: number,
  symbolStatus: SymbolCheckState["status"],
): BuySummary {
  const amount = parseAmount(input.amount);
  const price = parseAmount(input.executionPrice);
  const fee = parseAmount(input.fee);

  const shares = deriveShares(amount, price);
  const total = amount > 0 ? amount + fee : 0;

  const tickerInvalid = normalizeTicker(input.ticker) === "";
  const amountInvalid = input.amount !== "" && amount <= 0;
  const priceInvalid = input.executionPrice !== "" && price <= 0;
  const insufficientFunds = total > 0 && total > availableCash;

  const saveEnabled =
    symbolStatus === "confirmed" && !tickerInvalid && amount > 0 && price > 0 && fee >= 0 && total <= availableCash;

  return {
    shares,
    total,
    fee,
    amountPositive: amount > 0,
    pricePositive: price > 0,
    saveEnabled,
    tickerInvalid,
    amountInvalid,
    priceInvalid,
    insufficientFunds,
  };
}

/**
 * Maps validated form input to a typed BuyMovement. The cash-side Monto is converted
 * to shares (`Monto / Precio`) and rounded to the app-wide 5-decimal share precision, so
 * `executionPrice × shares` reconciles back to the Monto to within that rounding (a
 * fraction of a cent). System fields (id, createdAt) come from injected generators
 * so the result is deterministic and unit-testable; the ticker is stored uppercase and an
 * empty Comisión defaults to 0.
 */
export function buildBuyMovement(input: BuyInput, deps: BuyDeps): BuyMovement {
  const amount = parseAmount(input.amount);
  const price = parseAmount(input.executionPrice);

  return {
    id: deps.id(),
    type: "buy",
    ticker: normalizeTicker(input.ticker),
    executionPrice: price,
    shares: deriveShares(amount, price),
    fee: input.fee === "" ? 0 : parseAmount(input.fee),
    executionDate: input.executionDate,
    createdAt: deps.now(),
  };
}
