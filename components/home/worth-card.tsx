import { Colors } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import type { HomeView } from "./view-model";

type Props = {
  worth: HomeView["worth"];
};

export function WorthCard({ worth }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Valor total</Text>
      <Text style={styles.value}>{worth.total}</Text>

      <View style={styles.bar}>
        <View
          style={[
            styles.barSeg,
            { flex: worth.invested.flex, backgroundColor: Colors.investedBar },
          ]}
        />
        <View
          style={[
            styles.barSeg,
            { flex: worth.cash.flex, backgroundColor: Colors.accent },
          ]}
        />
      </View>

      <View style={[styles.row, styles.rowGap]}>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: Colors.investedBar }]} />
          <Text style={styles.legendLabel}>{worth.invested.label}</Text>
          <Text style={styles.legendPct}>{worth.invested.pct}</Text>
        </View>
        <Text style={[styles.amount, { color: Colors.textBright }]}>
          {worth.invested.amount}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: Colors.accent }]} />
          <Text style={styles.legendLabel}>{worth.cash.label}</Text>
          <Text style={styles.legendPct}>{worth.cash.pct}</Text>
        </View>
        <Text style={[styles.amount, { color: Colors.accent }]}>
          {worth.cash.amount}
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
