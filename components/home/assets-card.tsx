import { Colors, HoldingBadgePalette } from "@/constants/theme";
import type { ValuedHolding } from "@/types/models";
import {
  formatSharesLabel,
  formatSignedPercent,
  formatSignedUSD,
  formatUSD,
} from "@/utils/format";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  holdings: ValuedHolding[];
  netPnl: number;
  netPnlPercent: number;
  onPressHolding?: (ticker: string) => void;
};

export function AssetsCard({
  holdings,
  netPnl,
  netPnlPercent,
  onPressHolding,
}: Props) {
  const statColor = netPnl < -0.005 ? Colors.negative : Colors.positive;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Activos</Text>
        <Text style={styles.headerStat}>
          Net P&L{" "}
          <Text style={[styles.headerStatValue, { color: statColor }]}>
            {formatSignedUSD(netPnl)} · {formatSignedPercent(netPnlPercent)}
          </Text>
        </Text>
      </View>
      {holdings.map((h, i) => (
        <HoldingRow
          key={h.ticker}
          holding={h}
          palette={HoldingBadgePalette[i % HoldingBadgePalette.length]}
          onPress={() => onPressHolding?.(h.ticker)}
        />
      ))}
    </View>
  );
}

function HoldingRow({
  holding,
  palette,
  onPress,
}: {
  holding: ValuedHolding;
  palette: { bg: string; color: string };
  onPress?: () => void;
}) {
  const pnlColor =
    (holding.netPnl ?? 0) < -0.005 ? Colors.negative : Colors.positive;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: palette.bg }]}>
        <Text style={[styles.badgeText, { color: palette.color }]}>
          {holding.ticker}
        </Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.shares}>{formatSharesLabel(holding.shares)}</Text>
      </View>
      <View style={styles.right}>
        {holding.priceAvailable && holding.marketValue !== null ? (
          <>
            <Text style={styles.value}>{formatUSD(holding.marketValue)}</Text>
            <Text style={[styles.pnl, { color: pnlColor }]}>
              {formatSignedUSD(holding.netPnl ?? 0)} ·{" "}
              {formatSignedPercent(holding.netPnlPercent ?? 0)}
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
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
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
