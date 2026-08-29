import { Colors } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HomeView, Tone } from "./view-model";

type Props = {
  assets: HomeView["assets"];
  onPressHolding?: (ticker: string) => void;
  /** What to print where a price-dependent figure would have gone. */
  withheldLabel: string;
};

const toneColor = (tone: Tone) => (tone === "negative" ? Colors.negative : Colors.positive);

export function AssetsCard({ assets, onPressHolding, withheldLabel }: Props) {
  // A withheld aggregate carries no tone: the rows it sums are unpriced, so
  // there is no gain or loss to color.
  const statColor = assets.netPnl === null ? Colors.textSecondary : toneColor(assets.netPnlTone);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Activos</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Rendimiento no realizado</Text>
          <Text style={[styles.statValue, { color: statColor }]}>{assets.netPnl ?? withheldLabel}</Text>
        </View>
      </View>
      {assets.holdings.map((h) => (
        <HoldingRow key={h.ticker} holding={h} onPress={() => onPressHolding?.(h.ticker)} />
      ))}
    </View>
  );
}

function HoldingRow({ holding, onPress }: { holding: HomeView["assets"]["holdings"][number]; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.shares}>{holding.shares}</Text>
      </View>
      <View style={styles.right}>
        {holding.priceAvailable && holding.value !== null ? (
          <>
            <Text style={styles.value}>{holding.value}</Text>
            <View style={styles.pnlRow}>
              <Text style={[styles.pnl, { color: toneColor(holding.pnlTone) }]}>{holding.pnl}</Text>
              <Text style={[styles.pnlPct, { color: toneColor(holding.pnlTone) }]}>{holding.pnlPct}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.noPrice}>Sin precio</Text>
        )}
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  ticker: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
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
  pnlRow: {
    flexDirection: "row",
    alignItems: "baseline",
    // Space instead of the U+00B7 that used to join them: two signed figures at
    // one weight read as a single token, and the separator was what made it one.
    gap: 8,
    marginTop: 1,
  },
  pnl: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pnlPct: {
    fontSize: 12,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  noPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
