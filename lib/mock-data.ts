import type {
  BuyMovement,
  DepositMovement,
  DividendMovement,
  Movement,
  Profile,
  SellMovement,
  WithdrawalMovement,
} from "@/types/models";
import { assemblePortfolio, type PriceMap } from "@/utils/portfolio/valuation";

// ---------------------------------------------------------------------------
// MOCK_PROFILE
// The user's identity until auth exists. A constant, not a store: the Perfil
// never mutates from inside the app, and once auth lands it will come from the
// session instead.
// ---------------------------------------------------------------------------

export const MOCK_PROFILE: Profile = {
  name: "Mauro Quinteros",
  email: "mauro@ejemplo.com",
};

// ---------------------------------------------------------------------------
// MOCK_MOVEMENTS
// ~15 realistic movements across AAPL, VOO, MSFT
// Broker: Hapi — fees match their standard schedule
// ---------------------------------------------------------------------------

export const MOCK_MOVEMENTS: Movement[] = [
  // --- Deposits (2) --------------------------------------------------------
  {
    id: "mock-001",
    userId: "mock-user-001",
    type: "deposit",
    amount: 3000.0,
    transferFee: 3.99,
    executionDate: "2025-01-10",
    createdAt: "2025-01-10T10:00:00Z",
  } satisfies DepositMovement,
  {
    id: "mock-002",
    userId: "mock-user-001",
    type: "deposit",
    amount: 2000.0,
    transferFee: 3.99,
    executionDate: "2025-03-05",
    createdAt: "2025-03-05T09:30:00Z",
  } satisfies DepositMovement,

  // --- AAPL buys (3) -------------------------------------------------------
  {
    id: "mock-003",
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
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
    userId: "mock-user-001",
    type: "withdrawal",
    amount: 500.0,
    fee: 1.0,
    executionDate: "2026-01-08",
    createdAt: "2026-01-08T16:00:00Z",
  } satisfies WithdrawalMovement,
];

// ---------------------------------------------------------------------------
// MOCK_PRICES
// Hardcoded current prices for the mock-data phase. MSFT is absent — it was
// fully sold, so it holds no shares to value.
// ---------------------------------------------------------------------------

export const MOCK_PRICES: PriceMap = {
  AAPL: 198.4,
  VOO: 458.6,
};

// ---------------------------------------------------------------------------
// MOCK_PORTFOLIO_SUMMARY / MOCK_HOLDINGS
// Derived end-to-end by the portfolio engine from MOCK_MOVEMENTS + MOCK_PRICES.
// No hand-computed values: holdings (AAPL, VOO) and every portfolio figure come
// from assemblePortfolio. MSFT is fully exited, so its realized P&L flows into
// Total Return without listing as a holding.
// ---------------------------------------------------------------------------

export const MOCK_PORTFOLIO_SUMMARY = assemblePortfolio(
  MOCK_MOVEMENTS,
  MOCK_PRICES,
);

export const MOCK_HOLDINGS = MOCK_PORTFOLIO_SUMMARY.holdings;
