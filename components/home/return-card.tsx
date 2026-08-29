import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { HomeView, Tone } from "./view-model";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  return: HomeView["return"];
  /** What to print where a price-dependent figure would have gone. */
  withheldLabel: string;
};

const toneColor = (tone: Tone) => (tone === "negative" ? Colors.negative : Colors.positive);

export function ReturnCard({ return: ret, withheldLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const anchorRef = useRef<View>(null);
  const rotation = useSharedValue(0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(open ? 0 : 180, { duration: 200 });
    setOpen((o) => !o);
  };

  // Measure the percentage's on-screen box so the popover can float anchored
  // to it inside a full-screen Modal (which lets a backdrop tap dismiss it).
  const openTip = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get("window").width;
      const bubbleWidth = Math.min(300, screenWidth - 32);
      const left = Math.min(Math.max(x, 16), screenWidth - bubbleWidth - 16);
      setTip({ top: y + height + 8, left, width: bubbleWidth });
    });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // A withheld figure carries no tone: there is no gain or loss to color.
  const totalColor = ret.total === null ? Colors.textSecondary : toneColor(ret.tone);

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <View style={styles.dot} />
            <Text style={styles.title}>Rendimiento total</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.total, ret.total === null && styles.totalWithheld, { color: totalColor }]}>
              {ret.total ?? withheldLabel}
            </Text>
            {ret.percent !== null &&
              (ret.percentTooltip ? (
                <Pressable
                  ref={anchorRef}
                  onPress={openTip}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel="Cómo se calcula el porcentaje"
                  style={styles.pctTip}
                >
                  <Text style={[styles.totalPct, { color: totalColor }]}>{ret.percent}</Text>
                  <Ionicons name="information-circle-outline" size={16} color={totalColor} />
                </Pressable>
              ) : (
                <Text style={[styles.totalPct, { color: totalColor }]}>{ret.percent}</Text>
              ))}
          </View>
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>{open ? "Ocultar" : "Ver desglose"}</Text>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
          </Animated.View>
        </View>
      </Pressable>

      <View style={styles.bridge}>
        <View style={styles.bridgeSide}>
          <Text style={styles.bridgeLabel}>Aportado</Text>
          <Text style={styles.bridgeValueMuted}>{ret.aportado}</Text>
        </View>
        <Text style={styles.bridgeArrow}>→</Text>
        <View style={[styles.bridgeSide, styles.bridgeSideRight]}>
          <Text style={styles.bridgeLabel}>Vale hoy</Text>
          <Text style={[styles.bridgeValue, ret.valeHoy === null && styles.withheld]}>
            {ret.valeHoy ?? withheldLabel}
          </Text>
        </View>
      </View>

      {open && (
        <View style={styles.breakdown}>
          {ret.components.map((c) => {
            const color = c.value === null ? Colors.textSecondary : toneColor(c.tone);
            return (
              <View key={c.label}>
                <View style={styles.compRow}>
                  <Text style={styles.compLabel}>{c.label}</Text>
                  <Text style={[styles.compValue, { color }]}>{c.value ?? withheldLabel}</Text>
                </View>
                {/* No track when the fills are withheld: a bar is a proportion,
                    and the total it would be a proportion of is refused. */}
                {c.fill !== null && (
                  <View style={styles.track}>
                    <View
                      style={{
                        flex: c.fill,
                        backgroundColor: color,
                        opacity: c.tone === "negative" ? 0.8 : 0.85,
                      }}
                    />
                    <View style={{ flex: Math.max(1 - c.fill, 0) }} />
                  </View>
                )}
              </View>
            );
          })}
          <Text style={styles.footnote}>Los componentes suman el rendimiento total</Text>
        </View>
      )}

      <Modal transparent visible={!!tip} animationType="fade" onRequestClose={() => setTip(null)}>
        <Pressable style={styles.tipBackdrop} onPress={() => setTip(null)}>
          {tip && (
            <View style={[styles.tip, { top: tip.top, left: tip.left, width: tip.width }]}>
              <Text style={styles.tipText}>{ret.percentTooltip}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 9,
    marginTop: 5,
  },
  total: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  totalWithheld: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  totalPct: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pctTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tipBackdrop: {
    flex: 1,
  },
  tip: {
    position: "absolute",
    backgroundColor: "#05060F",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },
  tipText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textLight,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  bridge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    marginTop: 13,
  },
  bridgeSide: {
    flex: 1,
  },
  bridgeSideRight: {
    alignItems: "flex-end",
  },
  bridgeLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  bridgeValueMuted: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textLight,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  bridgeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  /** A figure Inicio declines to print: muted, never a gain/loss color. */
  withheld: {
    color: Colors.textSecondary,
  },
  bridgeArrow: {
    color: Colors.positive,
    fontSize: 16,
    fontWeight: "700",
  },
  breakdown: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    gap: 13,
  },
  compRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  compLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: "500",
  },
  compValue: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: {
    flexDirection: "row",
    height: 5,
    backgroundColor: Colors.background,
    borderRadius: 3,
    marginTop: 5,
    overflow: "hidden",
  },
  footnote: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
