import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import { Colors } from "@/constants/theme";
import type { MovementRow as Row } from "./view-model";

/**
 * One movement in the ledger. Deliberately not a Pressable: the movement-detail
 * screen does not exist yet, and a control that looks tappable but does nothing
 * is worse than a plain row.
 *
 * The amount is the movement's Cash Impact as a magnitude — no sign, no colour.
 */
export function MovementRow({ row }: { row: Row }) {
  const meta = MOVEMENT_TYPE_META[row.type];
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{row.title}</Text>
        <Text style={styles.date}>{row.dateLabel}</Text>
      </View>
      <Text style={styles.amount}>{row.amount}</Text>
    </View>
  );
}

export function MovementSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textBright,
    fontVariant: ["tabular-nums"],
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
