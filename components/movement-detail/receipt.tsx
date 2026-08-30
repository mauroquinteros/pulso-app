import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import { Colors } from "@/constants/theme";
import type { DetailLine, MovementDetailView } from "./view-model";

/** Badge + type + ticker + date. Identity, never figures — the badge matches the
 * row the user tapped, so the list and its detail read as the same thing. */
export function DetailIdentity({ header }: { header: NonNullable<MovementDetailView["header"]> }) {
  const meta = MOVEMENT_TYPE_META[header.type];
  return (
    <View style={styles.identity}>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Ionicons
          name={meta.icon}
          size={21}
          color={meta.color}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View style={styles.identityText}>
        <Text style={styles.title}>{header.title}</Text>
        <Text style={styles.date}>{header.dateLabel}</Text>
      </View>
    </View>
  );
}

/** One receipt row. `facts` and `money` render identically — together they read
 * as a single continuous list, so the separator belongs to the row, not the group. */
function Row({ line, first }: { line: DetailLine; first: boolean }) {
  return (
    <View style={[styles.row, !first && styles.rowDivided]}>
      <Text style={styles.label}>{line.label}</Text>
      <Text style={styles.amount}>{line.amount}</Text>
    </View>
  );
}

export function Receipt({
  facts,
  money,
  total,
}: {
  facts: DetailLine[];
  money: DetailLine[];
  total: NonNullable<MovementDetailView["total"]>;
}) {
  const lines = [...facts, ...money];
  return (
    <View style={styles.receipt}>
      {lines.map((line, i) => (
        <Row key={line.label} line={line} first={i === 0} />
      ))}
      {/* Pushed to the bottom of the screen: the receipt's conclusion. */}
      <View style={styles.total}>
        <Text style={styles.totalLabel}>{total.label}</Text>
        <Text style={styles.totalAmount}>{total.amount}</Text>
      </View>
    </View>
  );
}

export function NotFound() {
  return (
    <View style={styles.notFound}>
      <Text style={styles.notFoundText}>No encontramos este movimiento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 36,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  receipt: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textBright,
    fontVariant: ["tabular-nums"],
  },
  total: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: "auto", // the free space above it is what anchors it down
    paddingTop: 24,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  notFoundText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
