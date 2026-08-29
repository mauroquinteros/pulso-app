import { Colors, HoldingBadge } from "@/constants/theme";
import { Fragment } from "react";
import type { HoldingRow, Tone } from "./types";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  holdings: HoldingRow[];
  onPressHolding?: (ticker: string) => void;
  /** The aggregate under the title. Inicio prints one, Portafolio prints none -
   * which is inherited from the screens as they were, not a reasoned split: the
   * Distribucion legend records Allocations, never Net P&L, so the figure is
   * simply absent from Portafolio.
   * `tone: null` is the withheld case, printed grey: an aggregate over unpriced
   * rows is neither a gain nor a loss. */
  stat?: { label: string; value: string; tone: Tone | null };
};

const toneColor = (tone: Tone) => (tone === "negative" ? Colors.negative : Colors.positive);

/** "Mis Activos": the user's positions, Market Value descending with unpriced
 * last (the view-models order them). Cash never appears here. */
export function AssetsCard({ holdings, onPressHolding, stat }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Activos</Text>
        {stat !== undefined && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: stat.tone === null ? Colors.textSecondary : toneColor(stat.tone) }]}>
              {stat.value}
            </Text>
          </View>
        )}
      </View>
      {holdings.map((h) => (
        <Fragment key={h.ticker}>
          <View style={styles.divider} />
          <HoldingRowView holding={h} onPress={() => onPressHolding?.(h.ticker)} />
        </Fragment>
      ))}
    </View>
  );
}

function HoldingRowView({ holding, onPress }: { holding: HoldingRow; onPress?: () => void }) {
  const tone = toneColor(holding.pnlTone);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={holding.a11yLabel}
    >
      <View style={[styles.badge, { backgroundColor: HoldingBadge.bg }]}>
        <Text style={[styles.badgeText, { color: HoldingBadge.color }]}>{holding.ticker}</Text>
      </View>
      <View style={styles.left}>
        {holding.value !== null ? (
          <Text style={styles.value}>{holding.value}</Text>
        ) : (
          <Text style={styles.noPrice}>Sin precio</Text>
        )}
        <Text style={styles.shares}>{holding.shares}</Text>
      </View>
      {holding.pnl !== null && (
        <View style={styles.right}>
          <Text style={[styles.pnl, { color: tone }]}>{holding.pnl}</Text>
          <Text style={[styles.pnlPct, { color: tone }]}>{holding.pnlPct}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 8,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textLight,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    // The negative margin and the padding cancel out, so the content sits
    // exactly where it did while the highlight behind it reaches 10pt wider on
    // each side. A touch surface flush with its own text reads as a mistake.
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  /** Only a fill, so the row cannot move under the finger. Same value and shape
   * the Distribucion legend uses for a highlighted row. */
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  badge: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 13, not the 11 it carried while the row also spelled the ticker out in
   * white: this is the only place the position is named now. `minWidth` plus
   * padding rather than a fixed 40 so a five-letter ticker cannot overflow. */
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  shares: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  right: {
    alignItems: "flex-end",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textBright,
    fontVariant: ["tabular-nums"],
  },
  pnl: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  /** A step smaller as well as lighter. Stacked, one weight apart was not
   * enough separation - the two figures share a colour and sat at one size. */
  pnlPct: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  noPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
