/**
 * The three row mappers, one per table. With `lib/history.ts` they are the only
 * code in the app that knows a table exists (ADR 0006).
 *
 * They are the snake_case boundary: a column name goes in, a camelCase domain
 * field comes out, and nothing past this file spells a Movement the way
 * Postgres does (CLAUDE.md). They are pure, so they are tested without a
 * database and reused by the write path, which maps back the row Postgres
 * returned rather than the object the form built (ADR 0010).
 *
 * `execution_date` is passed through as the string it arrives as. It is a
 * calendar date - the day the movement happened - and converting it through a
 * `Date` would move it a day in either direction depending on where the phone
 * is (ADR 0004). `created_at` is the opposite: an instant, from the database's
 * clock, kept as the reducer's chronological tiebreaker.
 */

import type { BuyMovement, DepositMovement, DividendMovement, SellMovement, WithdrawalMovement } from "@/types/models";

/**
 * `movement_trades`. `regulatory_fees` is the schema's only nullable column,
 * since only a sell has one.
 */
export interface TradeRow {
  id: string;
  type: "buy" | "sell";
  execution_date: string;
  ticker: string;
  shares: number;
  execution_price: number;
  fee: number;
  regulatory_fees: number | null;
  created_at: string;
}

export interface DividendRow {
  id: string;
  execution_date: string;
  ticker: string;
  gross_amount: number;
  tax: number;
  created_at: string;
}

export interface CashRow {
  id: string;
  type: "deposit" | "withdrawal";
  execution_date: string;
  amount: number;
  transfer_fee: number;
  created_at: string;
}

export function mapTradeRow(row: TradeRow): BuyMovement | SellMovement {
  const trade = {
    id: row.id,
    executionDate: row.execution_date,
    createdAt: row.created_at,
    ticker: row.ticker,
    shares: row.shares,
    executionPrice: row.execution_price,
    fee: row.fee,
  };

  // A buy has no regulatory fees at all - not zero of them - so the NULL the
  // database holds for one becomes an absent field rather than a `0` on a type
  // with nowhere to put it. `?? 0` guards the sell branch, the only place the
  // column is ever read.
  return row.type === "buy"
    ? { ...trade, type: "buy" }
    : { ...trade, type: "sell", regulatoryFees: row.regulatory_fees ?? 0 };
}

export function mapDividendRow(row: DividendRow): DividendMovement {
  return {
    id: row.id,
    type: "dividend",
    executionDate: row.execution_date,
    createdAt: row.created_at,
    ticker: row.ticker,
    grossAmount: row.gross_amount,
    tax: row.tax,
  };
}

export function mapCashRow(row: CashRow): DepositMovement | WithdrawalMovement {
  return {
    id: row.id,
    type: row.type,
    executionDate: row.execution_date,
    createdAt: row.created_at,
    amount: row.amount,
    transferFee: row.transfer_fee,
  };
}
