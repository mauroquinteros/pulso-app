import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import { Colors } from "@/constants/theme";
import type { MovementRow as Row } from "./view-model";

/**
 * One movement in the ledger, opening its receipt on tap. No chevron: the Home
 * asset rows navigate the same way without one, and a chevron per row would be
 * noise down a long history.
 *
 * The amount is the movement's Cash Impact as a magnitude — no sign, no colour.
 */
export function MovementRow({ row, onPress }: { row: Row; onPress?: () => void }) {
  const meta = MOVEMENT_TYPE_META[row.type];
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{row.title}</Text>
        <Text style={styles.date}>{row.dateLabel}</Text>
      </View>
      <Text style={styles.amount}>{row.amount}</Text>
    </Pressable>
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
