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
 * The stock detail passes two extras the Movimientos tab never does:
 *
 * - `sharesLabel` joins the date ("12 oct 2023 · 0.5 acc").
 * - `buyTone` is the buy's cheap-vs-expensive mark against today's price:
 *   `"up"`/`"down"` draw a coloured line at the left edge plus a small arrow
 *   (redundant on purpose — the arrow carries the meaning without the colour);
 *   `"neutral"` and `null` draw nothing but still reserve the line's inset so
 *   the rows stay aligned. `undefined` (the tab) reserves nothing. The mark is
 *   separate from the amount, which stays unsigned and uncoloured: green/red
 *   here mean "bought cheap/expensive vs. today", never gain/loss on the money.
 */
export function MovementRow({
  row,
  onPress,
  sharesLabel,
  buyTone,
}: {
  row: Row;
  onPress?: () => void;
  sharesLabel?: string | null;
  buyTone?: "up" | "down" | "neutral" | null;
}) {
  const meta = MOVEMENT_TYPE_META[row.type];
  const marked = buyTone === "up" || buyTone === "down";
  const markColor = buyTone === "up" ? Colors.positive : Colors.negative;
  return (
    <Pressable
      style={[
        styles.row,
        buyTone !== undefined && styles.rowInset,
        marked && { borderLeftColor: markColor },
      ]}
      onPress={onPress}
    >
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{row.title}</Text>
        <Text style={styles.date}>
          {sharesLabel ? `${row.dateLabel} · ${sharesLabel}` : row.dateLabel}
        </Text>
      </View>
      <View style={styles.amountGroup}>
        <Text style={styles.amount}>{row.amount}</Text>
        {marked && (
          <Text style={[styles.arrow, { color: markColor }]}>
            {buyTone === "up" ? "↑" : "↓"}
          </Text>
        )}
      </View>
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
  /** Transparent by default so unmarked rows keep the marked rows' alignment. */
  rowInset: {
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    paddingLeft: 13,
  },
  amountGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textBright,
    fontVariant: ["tabular-nums"],
  },
  arrow: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 14,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
