import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Holding,
  Movement,
  PortfolioSummary,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { isBuyMovement, isSellMovement } from "@/types/models";
import {
  computeAvgCost,
  computeNetDividends,
  computeTotalFees,
} from "@/utils/calculations";

// ---------------------------------------------------------------------------
// MOCK_MOVEMENTS
// ~15 realistic movements across AAPL, VOO, MSFT
// Broker: Hapi — fees match their standard schedule
// ---------------------------------------------------------------------------

export const MOCK_MOVEMENTS: Movement[] = [
  // --- Deposits (2) --------------------------------------------------------
  {
    id: "mock-001",
    user_id: "mock-user-001",
    type: "deposit",
    amount: 3000.0,
    transfer_fee: 3.99,
    executed_at: "2025-01-10",
    created_at: "2025-01-10T10:00:00Z",
  } satisfies DepositMovement,
  {
    id: "mock-002",
    user_id: "mock-user-001",
    type: "deposit",
    amount: 2000.0,
    transfer_fee: 3.99,
    executed_at: "2025-03-05",
    created_at: "2025-03-05T09:30:00Z",
  } satisfies DepositMovement,

  // --- AAPL buys (3) -------------------------------------------------------
  {
    id: "mock-003",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "AAPL",
    execution_price: 182.5,
    shares: 2.45321,
    fee: 0.15,
    executed_at: "2025-01-15",
    created_at: "2025-01-15T14:00:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-004",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "AAPL",
    execution_price: 178.3,
    shares: 10.5,
    fee: 0.1,
    executed_at: "2025-03-20",
    created_at: "2025-03-20T13:45:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-005",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "AAPL",
    execution_price: 191.0,
    shares: 5.12345,
    fee: 0.15,
    executed_at: "2025-07-08",
    created_at: "2025-07-08T15:10:00Z",
  } satisfies BuyMovement,

  // --- VOO buys (2) --------------------------------------------------------
  {
    id: "mock-006",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "VOO",
    execution_price: 445.2,
    shares: 2.0,
    fee: 0.15,
    executed_at: "2025-02-03",
    created_at: "2025-02-03T10:30:00Z",
  } satisfies BuyMovement,
  {
    id: "mock-007",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "VOO",
    execution_price: 452.8,
    shares: 1.5,
    fee: 0.1,
    executed_at: "2025-08-14",
    created_at: "2025-08-14T11:00:00Z",
  } satisfies BuyMovement,

  // --- MSFT buy (1) --------------------------------------------------------
  {
    id: "mock-008",
    user_id: "mock-user-001",
    type: "buy",
    ticker: "MSFT",
    execution_price: 415.6,
    shares: 3.0,
    fee: 0.15,
    executed_at: "2025-04-10",
    created_at: "2025-04-10T09:55:00Z",
  } satisfies BuyMovement,

  // --- AAPL sell (partial) -------------------------------------------------
  {
    id: "mock-009",
    user_id: "mock-user-001",
    type: "sell",
    ticker: "AAPL",
    execution_price: 195.5,
    shares: 3.0,
    fee: 0.15,
    regulatory_fees: 0.03,
    executed_at: "2025-09-22",
    created_at: "2025-09-22T14:20:00Z",
  } satisfies SellMovement,

  // --- MSFT sell (full — ticker exits portfolio) ---------------------------
  {
    id: "mock-010",
    user_id: "mock-user-001",
    type: "sell",
    ticker: "MSFT",
    execution_price: 425.0,
    shares: 3.0,
    fee: 0.15,
    regulatory_fees: 0.02,
    executed_at: "2025-10-30",
    created_at: "2025-10-30T15:45:00Z",
  } satisfies SellMovement,

  // --- AAPL dividend -------------------------------------------------------
  {
    id: "mock-011",
    user_id: "mock-user-001",
    type: "dividend",
    ticker: "AAPL",
    gross_amount: 18.5,
    tax: 5.55, // 30% WHT: 18.50 * 0.30
    executed_at: "2025-11-15",
    created_at: "2025-11-15T08:00:00Z",
  } satisfies DividendMovement,

  // --- VOO dividend --------------------------------------------------------
  {
    id: "mock-012",
    user_id: "mock-user-001",
    type: "dividend",
    ticker: "VOO",
    gross_amount: 12.3,
    tax: 3.69, // 30% WHT: 12.30 * 0.30
    executed_at: "2025-12-20",
    created_at: "2025-12-20T08:00:00Z",
  } satisfies DividendMovement,

  // --- Withdrawal (1) ------------------------------------------------------
  {
    id: "mock-013",
    user_id: "mock-user-001",
    type: "withdrawal",
    amount: 500.0,
    fee: 1.0,
    executed_at: "2026-01-08",
    created_at: "2026-01-08T16:00:00Z",
  } satisfies WithdrawalMovement,
];

// ---------------------------------------------------------------------------
// MOCK_HOLDINGS
// Derived from MOCK_MOVEMENTS using calculation functions.
// Only tickers with net positive shares: AAPL and VOO (MSFT fully sold).
// ---------------------------------------------------------------------------

const aaplMovements = MOCK_MOVEMENTS.filter(
  (m) => "ticker" in m && m.ticker === "AAPL",
);
const vooMovements = MOCK_MOVEMENTS.filter(
  (m) => "ticker" in m && m.ticker === "VOO",
);

const aaplBuyShares = aaplMovements
  .filter(isBuyMovement)
  .reduce((sum, m) => sum + m.shares, 0);
const aaplSellShares = aaplMovements
  .filter(isSellMovement)
  .reduce((sum, m) => sum + m.shares, 0);
const aaplNetShares = Math.round((aaplBuyShares - aaplSellShares) * 1e8) / 1e8;

const vooBuyShares = vooMovements
  .filter(isBuyMovement)
  .reduce((sum, m) => sum + m.shares, 0);
const vooNetShares = vooBuyShares; // no VOO sells

const aaplAvgCost = computeAvgCost(aaplMovements);
const vooAvgCost = computeAvgCost(vooMovements);

export const MOCK_HOLDINGS: Holding[] = [
  {
    ticker: "AAPL",
    shares: aaplNetShares,
    avgCost: aaplAvgCost,
    totalInvested: Math.round(aaplAvgCost * aaplNetShares * 100) / 100,
    totalFees: computeTotalFees(aaplMovements),
    totalDividends: computeNetDividends(aaplMovements),
  },
  {
    ticker: "VOO",
    shares: vooNetShares,
    avgCost: vooAvgCost,
    totalInvested: Math.round(vooAvgCost * vooNetShares * 100) / 100,
    totalFees: computeTotalFees(vooMovements),
    totalDividends: computeNetDividends(vooMovements),
  },
];

// ---------------------------------------------------------------------------
// MOCK_PORTFOLIO_SUMMARY
// Aggregated from MOCK_HOLDINGS and MOCK_MOVEMENTS
// ---------------------------------------------------------------------------

export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalInvested:
    Math.round(
      MOCK_HOLDINGS.reduce((sum, h) => sum + h.totalInvested, 0) * 100,
    ) / 100,
  totalFees: computeTotalFees(MOCK_MOVEMENTS),
  totalDividends: computeNetDividends(MOCK_MOVEMENTS),
  holdings: MOCK_HOLDINGS,
};
