export type MovementType = "buy" | "sell" | "dividend" | "deposit" | "withdrawal";

/**
 * Who is using the app. The single source of the user's identity: one name (a
 * full name, never split into first + last) and an email. Initials are derived
 * at display time, so no `initials` field lives here.
 */
export interface Profile {
  name: string;
  email: string;
}

export interface BaseMovement {
  id: string;
  type: MovementType;
  executionDate: string;
  createdAt: string;
}

export interface BuyMovement extends BaseMovement {
  type: "buy";
  ticker: string;
  executionPrice: number;
  shares: number;
  fee: number;
}

export interface SellMovement extends BaseMovement {
  type: "sell";
  ticker: string;
  shares: number;
  executionPrice: number;
  fee: number;
  regulatoryFees: number;
}

export interface DividendMovement extends BaseMovement {
  type: "dividend";
  ticker: string;
  grossAmount: number;
  tax: number;
}

export interface DepositMovement extends BaseMovement {
  type: "deposit";
  amount: number;
  transferFee: number;
}

export interface WithdrawalMovement extends BaseMovement {
  type: "withdrawal";
  amount: number;
  transferFee: number;
}

export type Movement = BuyMovement | SellMovement | DividendMovement | DepositMovement | WithdrawalMovement;

/**
 * A Movement that does not exist yet: everything a form produces, which is
 * every field but the one only the database can supply. `createdAt` is read
 * from the database's clock, so a form produces the *fields* for a Movement
 * rather than a Movement (ADR 0010).
 *
 * The conditional is load-bearing, not decoration. A plain
 * `Omit<Movement, "createdAt">` distributes over nothing: it collapses the five
 * variants into one wide object where every field is optional and the
 * discriminated union stops discriminating, so `type` no longer narrows and a
 * deposit would typecheck as a buy. Written over a naked type parameter it
 * distributes, and the result is the union of the five Omits.
 */
export type NewMovement<M = Movement> = M extends Movement ? Omit<M, "createdAt"> : never;

export const isBuyMovement = (m: Movement): m is BuyMovement => m.type === "buy";
export const isSellMovement = (m: Movement): m is SellMovement => m.type === "sell";
export const isDividendMovement = (m: Movement): m is DividendMovement => m.type === "dividend";
export const isDepositMovement = (m: Movement): m is DepositMovement => m.type === "deposit";
export const isWithdrawalMovement = (m: Movement): m is WithdrawalMovement => m.type === "withdrawal";

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  costBasis: number;
  realizedPnl: number;
  totalFees: number;
  totalDividends: number;
}

/**
 * A Holding with price-applied figures layered on. When no current price is
 * available for the ticker, the price-applied fields are null and
 * priceAvailable is false (missing-price policy "exclude + flag").
 */
export interface ValuedHolding extends Holding {
  priceAvailable: boolean;
  marketValue: number | null;
  netPnl: number | null;
  netPnlPercent: number | null;
}

/** Total Return broken into its four components, plus the headline and %. */
export interface TotalReturn {
  total: number;
  unrealizedPnl: number;
  realizedPnl: number;
  netDividends: number;
  totalFees: number;
  percent: number;
}

/**
 * The full portfolio: movement facts (deterministic from movements alone) kept
 * distinct from price-applied facts (which need a current-price map).
 */
export interface Portfolio {
  // Movement facts
  cash: number;
  costBasis: number;
  realizedPnl: number;
  totalDividends: number;
  totalFees: number;
  netContributions: number;
  peakContributions: number;
  // Price-applied facts
  marketValue: number;
  totalPortfolioValue: number;
  totalReturn: TotalReturn;
  holdingsMissingPrice: number;
  // Per-ticker holdings carry both layers
  holdings: ValuedHolding[];
}
