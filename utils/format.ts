import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatUSD(amount: number): string {
  return usdFormatter.format(amount);
}

export function formatShares(shares: number): string {
  return parseFloat(shares.toFixed(5)).toString();
}

/**
 * A Movement's `executionDate` as compact Spanish text, always with its year:
 * "15 ene 2025". The year is not optional — the movements list has no month
 * headers and a history spans years.
 *
 * Takes the `YYYY-MM-DD` string only, never a Date: `executionDate` is a
 * calendar date, not an instant (see docs/adr/0004). `parseISO` resolves it to
 * local midnight, so the rendered day can never shift backwards — which
 * `new Date("2025-01-15")` (UTC midnight) would do west of UTC.
 */
export function formatDate(executionDate: string): string {
  return format(parseISO(executionDate), "d MMM yyyy", { locale: es });
}

export function formatPercent(value: number): string {
  if (value === 0) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Signed currency with the sign before the symbol: "+$354.40" / "-$10.13". */
export function formatSignedUSD(amount: number): string {
  const sign = amount < -0.005 ? "-" : "+";
  return `${sign}${usdFormatter.format(Math.abs(amount))}`;
}

/** Signed percentage: "+7.88%" / "-4.10%". */
export function formatSignedPercent(value: number): string {
  const sign = value < -0.005 ? "-" : "+";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}
