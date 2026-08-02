import { Colors, HoldingBadge } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HomeView, Tone } from "./view-model";

type Props = {
  assets: HomeView["assets"];
  onPressHolding?: (ticker: string) => void;
};

const toneColor = (tone: Tone) => (tone === "negative" ? Colors.negative : Colors.positive);

export function AssetsCard({ assets, onPressHolding }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Activos</Text>
        <Text style={styles.headerStat}>
          Net P&L <Text style={[styles.headerStatValue, { color: toneColor(assets.netPnlTone) }]}>{assets.netPnl}</Text>
        </Text>
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
      <View style={[styles.badge, { backgroundColor: HoldingBadge.bg }]}>
        <Text style={[styles.badgeText, { color: HoldingBadge.color }]}>{holding.ticker}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.shares}>{holding.shares}</Text>
      </View>
      <View style={styles.right}>
        {holding.priceAvailable && holding.value !== null ? (
          <>
            <Text style={styles.value}>{holding.value}</Text>
            <Text style={[styles.pnl, { color: toneColor(holding.pnlTone) }]}>{holding.pnl}</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerStat: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  headerStatValue: {
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
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  middle: {
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
  pnl: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  noPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
