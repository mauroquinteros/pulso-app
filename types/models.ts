export type MovementType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';

export interface BaseMovement {
  id: string;
  user_id: string;
  type: MovementType;
  executed_at: string;
  created_at: string;
}

export interface BuyMovement extends BaseMovement {
  type: 'buy';
  ticker: string;
  execution_price: number;
  shares: number;
  fee: number;
}

export interface SellMovement extends BaseMovement {
  type: 'sell';
  ticker: string;
  shares: number;
  execution_price: number;
  fee: number;
  regulatory_fees: number;
}

export interface DividendMovement extends BaseMovement {
  type: 'dividend';
  ticker: string;
  gross_amount: number;
  tax: number;
}

export interface DepositMovement extends BaseMovement {
  type: 'deposit';
  amount: number;
  transfer_fee: number;
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
// mapper function will be needed to coerce DB NULLs to 0 for non-nullable fields
// (e.g. regulatory_fees, transfer_fee) and map the flat row to the correct subtype.
export const isBuyMovement = (m: Movement): m is BuyMovement => m.type === 'buy';
export const isSellMovement = (m: Movement): m is SellMovement => m.type === 'sell';
export const isDividendMovement = (m: Movement): m is DividendMovement => m.type === 'dividend';
export const isDepositMovement = (m: Movement): m is DepositMovement => m.type === 'deposit';
export const isWithdrawalMovement = (m: Movement): m is WithdrawalMovement => m.type === 'withdrawal';

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  totalInvested: number;
  totalFees: number;
  totalDividends: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalFees: number;
  totalDividends: number;
  holdings: Holding[];
}
