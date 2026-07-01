/**
 * Helpers for raw text typed into the add-movement form fields. The pipeline is
 * sanitize (UI, on every keystroke) → parse (view-model, at compute time):
 * `sanitizeDecimal` keeps the field visually valid as the user types, and
 * `parseAmount` turns the final text into a domain number.
 */

/** Keep only digits and a single decimal point (UI-level input cleaning). */
export function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/** Parse a decimal string; blank/garbage → 0. */
export function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/** Normalize a free-text ticker to its canonical form (uppercase, trimmed). */
export function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}
