import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
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

/**
 * The receipt's destructive control. It hangs BELOW the total rather than beside
 * it: the total is the receipt's conclusion and stays anchored to the bottom of
 * the screen, so the one thing that can undo the whole document sits under its
 * own rule, outside the figures.
 *
 * Deliberately not an icon in the header. A trash glyph up there is one
 * mis-aimed tap away from the back button, and it would say nothing about what
 * it deletes; a labelled button says both.
 *
 * While the delete is in flight the label answers and the spinner takes the
 * icon's place - they never share the row, so the control has one meaning at a
 * time - and the button stops accepting taps rather than queueing a second
 * delete behind the first.
 */
export function DeleteMovementButton({ deleting, onPress }: { deleting: boolean; onPress: () => void }) {
  const press = usePressScale(0.97);
  return (
    <View style={styles.deleteWrap}>
      <AnimatedPressable
        style={[styles.deleteButton, press.style, deleting && styles.deleting]}
        {...press.handlers}
        onPress={onPress}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Eliminar movimiento"
        accessibilityState={{ disabled: deleting }}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={Colors.negative} />
        ) : (
          <Ionicons
            name="trash-outline"
            size={19}
            color={Colors.negative}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
        <Text style={styles.deleteLabel}>{deleting ? "Eliminando..." : "Eliminar movimiento"}</Text>
      </AnimatedPressable>
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
  /** Its own rule, quieter than the total's: this is a footer under the receipt,
   * not another line of it. */
  deleteWrap: {
    marginTop: 12,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#12173A",
  },
  deleteButton: {
    height: 52, // comfortably past the 44pt minimum, at full width
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(255,82,82,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.34)",
  },
  deleting: {
    opacity: 0.55,
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.negative,
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
