import { Colors, HoldingBadge } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HoldingRow, Tone } from "./view-model";

type Props = {
  holdings: HoldingRow[];
  onPressHolding?: (ticker: string) => void;
};

const toneColor = (tone: Tone) => (tone === "negative" ? Colors.negative : Colors.positive);

/** "Mis Activos": positions ordered by Market Value (view-model order), each
 * row with its badge, ticker, shares, Market Value and Net P&L. Cash lives in
 * the Distribución card, never here. */
export function AssetsCard({ holdings, onPressHolding }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Mis Activos</Text>
      {holdings.map((h) => (
        <HoldingRowView key={h.ticker} holding={h} onPress={() => onPressHolding?.(h.ticker)} />
      ))}
    </View>
  );
}

function HoldingRowView({ holding, onPress }: { holding: HoldingRow; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: HoldingBadge.bg }]}>
        <Text style={[styles.badgeText, { color: HoldingBadge.color }]}>{holding.ticker}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.shares}>{holding.sharesLabel}</Text>
      </View>
      <View style={styles.right}>
        {holding.priceAvailable && holding.value !== null ? (
          <>
            <Text style={styles.value}>{holding.value}</Text>
            <Text style={[styles.pnl, { color: toneColor(holding.pnlTone) }]}>
              {holding.pnl} · {holding.pnlPct}
            </Text>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
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
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  noPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
