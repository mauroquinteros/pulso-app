import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
import { Colors, Gradients } from "@/constants/theme";

// Illustration strokes, from the design prototype. Muted enough to read as a
// placeholder ledger rather than compete with the CTA.
const OUTLINE = "#2A3163";
const BADGE_OUTLINE = "#3B4380";

/** A ledger sheet with a "add" badge — vector, so it scales and themes cleanly. */
function EmptyLedger() {
  return (
    <Svg
      width={112}
      height={112}
      viewBox="0 0 120 120"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Rect x={30} y={18} width={60} height={84} rx={10} stroke={OUTLINE} strokeWidth={2.5} />
      <Path d="M42 40h36M42 54h36M42 68h24" stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={90} cy={90} r={16} fill={Colors.surface} stroke={BADGE_OUTLINE} strokeWidth={2.5} />
      <Path d="M90 83v14M83 90h14" stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Shown when no movement has ever been recorded. The filter chips are not
 * rendered alongside it — there is nothing to filter. */
export function EmptyState({ onAddMovement }: { onAddMovement?: () => void }) {
  const press = usePressScale(0.97);
  return (
    <View style={styles.wrap}>
      <EmptyLedger />
      <Text style={styles.title}>Todavía no hay movimientos</Text>
      <Text style={styles.body}>Cuando compres, vendas o muevas efectivo, aparecerá acá.</Text>
      <AnimatedPressable style={press.style} {...press.handlers} onPress={onAddMovement}>
        <LinearGradient colors={Gradients.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <Text style={styles.ctaText}>Agregar movimiento</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    maxWidth: 240,
    textAlign: "center",
    marginBottom: 20,
  },
  cta: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.avatarText,
  },
});
