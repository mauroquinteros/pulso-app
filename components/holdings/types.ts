/** The shape "Mis Activos" renders, built by both the Inicio and the Portafolio
 * view-models: the two screens list the same Holdings the same way. */

export type Tone = "positive" | "negative";

export interface HoldingRow {
  ticker: string;
  shares: string; // plain count, max 5 decimals, no suffix
  value: string | null; // Market Value; null when the ticker has no price
  pnl: string | null; // "+$240.18"
  pnlPct: string | null; // "+8.73%"
  pnlTone: Tone;
  /** What VoiceOver reads for the whole row, spelling out the units the layout
   * lets the screen drop. */
  a11yLabel: string;
}
