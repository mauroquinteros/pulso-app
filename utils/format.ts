import { format, parseISO } from 'date-fns';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatUSD(amount: number): string {
  return usdFormatter.format(amount);
}

export function formatShares(shares: number): string {
  return parseFloat(shares.toFixed(5)).toString();
}

export function formatDate(date: Date | string): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy');
}

export function formatPercent(value: number): string {
  if (value === 0) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** Signed currency with the sign before the symbol: "+$354.40" / "−$10.13". */
export function formatSignedUSD(amount: number): string {
  const sign = amount < -0.005 ? '−' : '+';
  return `${sign}${usdFormatter.format(Math.abs(amount))}`;
}

/** Signed percentage: "+7.88%" / "−4.10%". */
export function formatSignedPercent(value: number): string {
  const sign = value < -0.005 ? '−' : '+';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/** Share quantity with the "acc" (acciones) suffix: "15.07666 acc". */
export function formatSharesLabel(shares: number): string {
  return `${formatShares(shares)} acc`;
}
