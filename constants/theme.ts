export const Colors = {
  background: "#0A0E27",
  surface: "#111638",
  accent: "#00E5CC",
  positive: "#00C853",
  negative: "#FF5252",
  textPrimary: "#FFFFFF",
  textSecondary: "#8E8E93",
  border: "#1C224D",
  // Keep these for backward compat with any existing references:
  tint: "#00E5CC",
  icon: "#8E8E93",
  tabIconDefault: "#8E8E93",
  tabIconSelected: "#00E5CC",

  /** Depósito's badge tint: `positive`'s hue (145°) lifted into the pastel
   * register the other badges live in. Deliberately NOT `positive` itself —
   * that token means *gain*, and a deposit is not a profit. */
  depositGreen: "#7DE8AA",

  // Home redesign tokens (Pulso Home.dc.html)
  avatarText: "#04211E",
  investedBar: "#5B63A0", // "En activos" swatch + composition segment
  textMuted: "#5A6080",
  textLight: "#C5C9DA",
  textBright: "#E8EAF2",
};

/** Gradient stops from the design (Pulso Home.dc.html), consumed by
 * expo-linear-gradient. */
export const Gradients = {
  card: ["#141A42", "#0F1433"] as const, // worth-card surface, 165deg
  avatar: [Colors.accent, "#1C9C8F"] as const, // avatar disc, 135deg teal
};

/** The one holding-badge tint, used by every ticker badge (Home, Portafolio,
 * stock detail). Deliberately NOT per-ticker: the badge already spells the
 * ticker out, so its color carries no information, and deriving it from a row
 * position made the same ticker change color between screens. */
export const HoldingBadge = { bg: "rgba(0,229,204,0.14)", color: "#4FE9D6" };

/** Donut segment colors, assigned by segment position. Only the Distribución
 * donut and its legend use these — there the color IS the key that ties a
 * slice to its legend row, so no two drawn segments may share one. That makes
 * the length load-bearing: it must be >= MAX_HOLDING_SEGMENTS (5). First two
 * match the design.
 *
 * The 5th is rose, not green: the ring already leans blue/purple so a warm hue
 * separates best, and green would read as *gain* next to `positive`. */
export const HoldingBadgePalette: { bg: string; color: string }[] = [
  { bg: "rgba(0,229,204,0.14)", color: "#4FE9D6" },
  { bg: "rgba(120,160,255,0.16)", color: "#9DB8FF" },
  { bg: "rgba(255,184,108,0.16)", color: "#FFC078" },
  { bg: "rgba(190,140,255,0.16)", color: "#C9A2FF" },
  { bg: "rgba(255,105,170,0.16)", color: "#FF9EC4" },
];
