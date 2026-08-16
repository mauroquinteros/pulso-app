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

/**
 * A Stock's share price together with the market moment that price belongs to.
 * The two are one thing and never travel apart (CONTEXT.md): a price with no
 * moment cannot be judged Stale, and a moment with no price says nothing at all.
 * The schema says the same in a constraint - `price_and_quote_time_travel_together`.
 *
 * `quotedAt` is carried even though nothing reads it yet. Lighting the Stale
 * signal later has to be a pure function over data already in hand rather than a
 * re-read, so the moment is kept from the first day the price is (ADR 0011).
 */
export interface Quote {
  price: number;
  quotedAt: string;
}

/**
 * The traded thing a Holding is a holding of: a company or fund, identified by
 * its ticker and carrying a name and a Quote (CONTEXT.md). Shared, never owned -
 * `AAPL` is the same Stock for every Perfil, so nothing here says whose it is.
 *
 * The Quote is not optional. The read filters on `price is not null`, so a Stock
 * the app holds always has one and an unpriced Stock is simply absent from the
 * map - falling through the same missing-price path `valueHolding` has always
 * had. The guarantee lives in the query, so no branch has to keep it true
 * (ADR 0011).
 */
export interface Stock {
  ticker: string;
  name: string;
  quote: Quote;
}

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
