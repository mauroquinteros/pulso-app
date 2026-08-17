/**
 * The reconciliation corpus: one hand-authored History, the Stocks that price
 * it, and the Portfolio the engine derives from the two. Read by tests only -
 * nothing here ships, which is why it sits outside every directory that does.
 *
 * It is a fixture and not a mock: nothing is stubbed or faked, these are real
 * Movements run through the real engine. It existed to seed the app before the
 * History was persisted; the store has no seed now, and what it is kept for is
 * narrower and worth stating, because it looks like data nobody needs.
 *
 * Three invariants can only be proved over a History that holds every kind of
 * Movement at once, and this is the only one that does - thirteen of them across
 * all five types, with a partial sell and a full exit: that the running sum of
 * every Movement's Cash Impact equals Cash, that Inicio's figures reconcile with
 * each other, and that Allocations sum to 100%. Narrow fixtures built per test
 * cannot show any of them, because each one is a claim about the whole.
 *
 * So it is deliberately not trimmed to what a passing test needs. MSFT is bought
 * and then wholly sold so a fully-exited position keeps contributing Realized
 * P&L while listing as no Holding, and it carries no price for exactly that
 * reason - a Stock with no shares has nothing to value.
 */

import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { assemblePortfolio, type StockMap } from "@/utils/portfolio/valuation";

// ---------------------------------------------------------------------------
// MOCK_MOVEMENTS
// ~15 realistic movements across AAPL, VOO, MSFT
// Broker: Hapi — fees match their standard schedule
// ---------------------------------------------------------------------------

export const MOCK_MOVEMENTS: Movement[] = [
  // --- Deposits (2) --------------------------------------------------------
  {
    id: "mock-001",
    type: "deposit",
    amount: 3000.0,
    transferFee: 3.99,
    executionDate: "2025-01-10",
    createdAt: "2025-01-10T10:00:00Z",
  } satisfies DepositMovement,
  {
    id: "mock-002",
    type: "deposit",
    amount: 2000.0,
    transferFee: 3.99,
    executionDate: "2025-03-05",
    createdAt: "2025-03-05T09:30:00Z",
  } satisfies DepositMovement,

  // --- AAPL buys (3) -------------------------------------------------------
  {
    id: "mock-003",
    type: "buy",
    ticker: "AAPL",
    executionPrice: 182.5,
    shares: 2.45321,
    fee: 0.15,
    executionDate: "2025-01-15",
    createdAt: "2025-01-15T14:00:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-004",
    type: "buy",
    ticker: "AAPL",
    executionPrice: 178.3,
    shares: 10.5,
    fee: 0.1,
    executionDate: "2025-03-20",
    createdAt: "2025-03-20T13:45:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-005",
    type: "buy",
    ticker: "AAPL",
    executionPrice: 191.0,
    shares: 5.12345,
    fee: 0.15,
    executionDate: "2025-07-08",
    createdAt: "2025-07-08T15:10:00Z",
  } satisfies BuyMovement,

  // --- VOO buys (2) --------------------------------------------------------
  {
    id: "mock-006",
    type: "buy",
    ticker: "VOO",
    executionPrice: 445.2,
    shares: 2.0,
    fee: 0.15,
    executionDate: "2025-02-03",
    createdAt: "2025-02-03T10:30:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-007",
    type: "buy",
    ticker: "VOO",
    executionPrice: 452.8,
    shares: 1.5,
    fee: 0.1,
    executionDate: "2025-08-14",
    createdAt: "2025-08-14T11:00:00Z",
  } satisfies BuyMovement,

  // --- MSFT buy (1) --------------------------------------------------------
  {
    id: "mock-008",
    type: "buy",
    ticker: "MSFT",
    executionPrice: 415.6,
    shares: 3.0,
    fee: 0.15,
    executionDate: "2025-04-10",
    createdAt: "2025-04-10T09:55:00Z",
  } satisfies BuyMovement,

  // --- AAPL sell (partial) -------------------------------------------------
  {
    id: "mock-009",
    type: "sell",
    ticker: "AAPL",
    executionPrice: 195.5,
    shares: 3.0,
    fee: 0.15,
    regulatoryFees: 0.03,
    executionDate: "2025-09-22",
    createdAt: "2025-09-22T14:20:00Z",
  } satisfies SellMovement,

  // --- MSFT sell (full — ticker exits portfolio) ---------------------------
  {
    id: "mock-010",
    type: "sell",
    ticker: "MSFT",
    executionPrice: 425.0,
    shares: 3.0,
    fee: 0.15,
    regulatoryFees: 0.02,
    executionDate: "2025-10-30",
    createdAt: "2025-10-30T15:45:00Z",
  } satisfies SellMovement,

  // --- AAPL dividend -------------------------------------------------------
  {
    id: "mock-011",
    type: "dividend",
    ticker: "AAPL",
    grossAmount: 18.5,
    tax: 5.55, // 30% WHT: 18.50 * 0.30
    executionDate: "2025-11-15",
    createdAt: "2025-11-15T08:00:00Z",
  } satisfies DividendMovement,

  // --- VOO dividend --------------------------------------------------------
  {
    id: "mock-012",
    type: "dividend",
    ticker: "VOO",
    grossAmount: 12.3,
    tax: 3.69, // 30% WHT: 12.30 * 0.30
    executionDate: "2025-12-20",
    createdAt: "2025-12-20T08:00:00Z",
  } satisfies DividendMovement,

  // --- Withdrawal (1) ------------------------------------------------------
  {
    id: "mock-013",
    type: "withdrawal",
    amount: 500.0,
    transferFee: 1.0,
    executionDate: "2026-01-08",
    createdAt: "2026-01-08T16:00:00Z",
  } satisfies WithdrawalMovement,
];

// ---------------------------------------------------------------------------
// MOCK_STOCKS
// Authored Stocks, read by nothing in the running app - the app reads the
// `stocks` table (ADR 0011). They are kept because MOCK_PORTFOLIO_SUMMARY is
// derived from them, and that summary is what makes the reconciliation
// invariants provable. MSFT is absent - it was fully sold, so it holds no
// shares to value.
// ---------------------------------------------------------------------------

const MOCK_STOCKS: StockMap = {
  AAPL: { ticker: "AAPL", name: "Apple Inc.", quote: { price: 198.4, quotedAt: "2026-02-13T21:00:00Z" } },
  VOO: { ticker: "VOO", name: "Vanguard S&P 500 ETF", quote: { price: 458.6, quotedAt: "2026-02-13T21:00:00Z" } },
};

// ---------------------------------------------------------------------------
// MOCK_PORTFOLIO_SUMMARY
// Derived end-to-end by the portfolio engine from MOCK_MOVEMENTS + MOCK_STOCKS.
// No hand-computed values: holdings (AAPL, VOO) and every portfolio figure come
// from assemblePortfolio. MSFT is fully exited, so its realized P&L flows into
// Total Return without listing as a holding.
// ---------------------------------------------------------------------------

export const MOCK_PORTFOLIO_SUMMARY = assemblePortfolio(MOCK_MOVEMENTS, MOCK_STOCKS);
