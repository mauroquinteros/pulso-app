export type MovementType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';

export interface BaseMovement {
  id: string;
  userId: string;
  type: MovementType;
  executedAt: string;
  createdAt: string;
}

export interface BuyMovement extends BaseMovement {
  type: 'buy';
  ticker: string;
  executionPrice: number;
  shares: number;
  fee: number;
}

export interface SellMovement extends BaseMovement {
  type: 'sell';
  ticker: string;
  shares: number;
  executionPrice: number;
  fee: number;
  regulatoryFees: number;
}

export interface DividendMovement extends BaseMovement {
  type: 'dividend';
  ticker: string;
  grossAmount: number;
  tax: number;
}

export interface DepositMovement extends BaseMovement {
  type: 'deposit';
  amount: number;
  transferFee: number;
}

export interface WithdrawalMovement extends BaseMovement {
  type: 'withdrawal';
  amount: number;
  fee: number;
}

export type Movement =
  | BuyMovement
  | SellMovement
  | DividendMovement
  | DepositMovement
  | WithdrawalMovement;

// TODO: When Supabase integration is added, a mapRowToMovement(row: SupabaseRow): Movement
// mapper function will be needed to (a) translate snake_case DB columns
// (execution_price, executed_at, …) into these camelCase domain fields — snake_case
// must not leak past this boundary — and (b) coerce DB NULLs to 0 for non-nullable
// fields (e.g. regulatoryFees, transferFee), mapping the flat row to the correct subtype.
export const isBuyMovement = (m: Movement): m is BuyMovement => m.type === 'buy';
export const isSellMovement = (m: Movement): m is SellMovement => m.type === 'sell';
export const isDividendMovement = (m: Movement): m is DividendMovement => m.type === 'dividend';
export const isDepositMovement = (m: Movement): m is DepositMovement => m.type === 'deposit';
export const isWithdrawalMovement = (m: Movement): m is WithdrawalMovement => m.type === 'withdrawal';

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  costBasis: number;
  realizedPnl: number;
  totalFees: number;
  totalDividends: number;
}

export interface PortfolioSummary {
  costBasis: number;
  totalFees: number;
  totalDividends: number;
  holdings: Holding[];
}
