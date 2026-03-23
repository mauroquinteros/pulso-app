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
