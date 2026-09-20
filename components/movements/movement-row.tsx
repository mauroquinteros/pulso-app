import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, usePressFill } from "@/components/ui/press-feedback";
import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import { Colors } from "@/constants/theme";
import type { MovementRow as Row } from "./view-model";

/**
 * One movement in the ledger, opening its receipt on tap. No chevron: the Home
 * asset rows navigate the same way without one, and a chevron per row would be
 * noise down a long history.
 *
 * The amount is the movement's Cash Impact as a magnitude — no sign, no colour.
 * The stock detail passes one extra the Movimientos tab never does:
 *
 * - `buyTone` is the buy's cheap-vs-expensive mark against today's price, and
 *   `price` is what one share cost that day. Both ride the right column's second
 *   line, under the amount: the arrow qualifies the price it compares, not the
 *   money, and the two figures share a right edge so they read as a column
 *   against the price at the top of the screen. The tab passes neither.
 *
 * `deleting` runs the other way - the tab passes it and the stock detail never
 * does, because only the tab can delete. While it is set the row stays exactly
 * where it is, dimmed and untouchable, and the spinner takes the amount's place
 * rather than sitting beside it: a figure and a progress indicator in one row
 * would say the delete is both done and not done.
 */
export function MovementRow({
  row,
  onPress,
  buyTone,
  price,
  deleting,
}: {
  row: Row;
  onPress?: () => void;
  buyTone?: "up" | "down" | "neutral" | null;
  price?: string | null;
  deleting?: boolean;
}) {
  const meta = MOVEMENT_TYPE_META[row.type];
  const marked = buyTone === "up" || buyTone === "down";
  const markColor = buyTone === "up" ? Colors.positive : Colors.negative;
  const press = usePressFill();
  return (
    <AnimatedPressable
      style={[styles.row, press.style, deleting && styles.deleting]}
      {...press.handlers}
      onPress={onPress}
      disabled={deleting}
      accessibilityRole="button"
      accessibilityLabel={row.a11yLabel}
      accessibilityState={{ disabled: deleting, busy: deleting }}
    >
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{row.title}</Text>
        <Text style={styles.date}>{row.dateLabel}</Text>
      </View>
      <View style={styles.right}>
        {deleting ? (
          <ActivityIndicator size="small" color={Colors.negative} accessibilityLabel="Eliminando movimiento" />
        ) : (
          <Text style={styles.amount}>{row.amount}</Text>
        )}
        {price !== null && price !== undefined && (
          <View style={styles.priceRow}>
            {marked && <Text style={[styles.arrow, { color: markColor }]}>{buyTone === "up" ? "↑" : "↓"}</Text>}
            <Text style={styles.price}>Precio {price}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
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
    // Cancel out, so the content sits exactly where it did while the highlight
    // behind it reaches 10pt wider on each side. Same trick, same 10, as the
    // "Mis Activos" row: a touch surface flush with its own text reads as a
    // mistake.
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  deleting: {
    opacity: 0.45,
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
  /** Right-aligned so the amount and the price below it share a right edge -
   * the arrow leads its line rather than trailing it, which is what keeps the
   * two figures on one axis. */
  right: {
    alignItems: "flex-end",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  price: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
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
