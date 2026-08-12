/**
 * Helpers for raw text typed into the add-movement form fields. The pipeline is
 * sanitize (UI, on every keystroke) → parse (view-model, at compute time):
 * `sanitizeDecimal` keeps the field visually valid as the user types, and
 * `parseAmount` turns the final text into a domain number.
 */

/**
 * Keep only digits and a single decimal point (UI-level input cleaning).
 * `maxDecimals`, when given, caps the fractional part — the shares field passes
 * 5 so the field never shows more precision than the domain keeps (see
 * `roundShares`).
 */
export function sanitizeDecimal(value: string, maxDecimals?: number): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) return cleaned;
  const whole = cleaned.slice(0, dot + 1);
  let fraction = cleaned.slice(dot + 1).replace(/\./g, "");
  if (maxDecimals !== undefined) fraction = fraction.slice(0, maxDecimals);
  return whole + fraction;
}

/**
 * Keep only the letters a ticker can show in the Símbolo field (UI-level input
 * cleaning, on every keystroke). Anything else the user presses — a digit, a
 * dot, a space, an accent — is erased as they type, so the field's contents are
 * always already in the canonical spelling `normalizeTicker` would produce.
 *
 * This is why `BRK.B` cannot be typed. The resolve-stock endpoint accepts dots,
 * so that limitation lives here and nowhere else.
 */
export function sanitizeSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

/** Parse a decimal string; blank/garbage → 0. */
export function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Shares are a 5-decimal quantity everywhere in the app — storage, the
 * "Disponible" display (`formatShares`), and the sell gate all agree at 5 dp, so
 * "sell exactly what you hold" always resolves. Round any derived or parsed
 * share count through this so the three never diverge: a full-precision buy
 * (`Monto / Precio`) shown as 5 dp could not be fully sold, since the typed
 * figure was rejected against the unrounded held amount.
 */
export function roundShares(shares: number): number {
  return Math.round(shares * 1e5) / 1e5;
}

/** Normalize a free-text ticker to its canonical form (uppercase, trimmed). */
export function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}
