import { Colors } from "@/constants/theme";
import { formatUSD } from "@/utils/format";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  totalPortfolioValue: number;
  marketValue: number;
  cash: number;
};

export function WorthCard({ totalPortfolioValue, marketValue, cash }: Props) {
  const total = marketValue + cash;
  const mvPct = total !== 0 ? ((marketValue / total) * 100).toFixed(1) : "0.0";
  const cashPct = total !== 0 ? ((cash / total) * 100).toFixed(1) : "0.0";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Valor total</Text>
      <Text style={styles.value}>{formatUSD(totalPortfolioValue)}</Text>

      <View style={styles.bar}>
        <View
          style={[
            styles.barSeg,
            { flex: Math.max(marketValue, 0.0001), backgroundColor: Colors.investedBar },
          ]}
        />
        <View
          style={[
            styles.barSeg,
            { flex: Math.max(cash, 0.0001), backgroundColor: Colors.accent },
          ]}
        />
      </View>

      <View style={[styles.row, styles.rowGap]}>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: Colors.investedBar }]} />
          <Text style={styles.legendLabel}>En activos</Text>
          <Text style={styles.legendPct}>{mvPct}%</Text>
        </View>
        <Text style={[styles.amount, { color: Colors.textBright }]}>
          {formatUSD(marketValue)}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: Colors.accent }]} />
          <Text style={styles.legendLabel}>Efectivo</Text>
          <Text style={styles.legendPct}>{cashPct}%</Text>
        </View>
        <Text style={[styles.amount, { color: Colors.accent }]}>
          {formatUSD(cash)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 40,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -1.4,
    lineHeight: 42,
    marginTop: 3,
    marginBottom: 18,
    fontVariant: ["tabular-nums"],
  },
  bar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    gap: 2,
    marginBottom: 13,
  },
  barSeg: {
    height: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowGap: {
    marginBottom: 8,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: "500",
  },
  legendPct: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
