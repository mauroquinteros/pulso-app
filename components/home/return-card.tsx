import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { HomeView, Tone } from "./view-model";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  return: HomeView["return"];
};

const toneColor = (tone: Tone) =>
  tone === "negative" ? Colors.negative : Colors.positive;

export function ReturnCard({ return: ret }: Props) {
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(open ? 0 : 180, { duration: 200 });
    setOpen((o) => !o);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const totalColor = toneColor(ret.tone);

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <View style={styles.dot} />
            <Text style={styles.title}>Rendimiento total</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.total, { color: totalColor }]}>
              {ret.total}
            </Text>
            <Text style={[styles.totalPct, { color: totalColor }]}>
              {ret.percent}
            </Text>
          </View>
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>
            {open ? "Ocultar" : "Ver desglose"}
          </Text>
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-down"
              size={12}
              color={Colors.textSecondary}
            />
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
          <Text style={styles.bridgeValue}>{ret.valeHoy}</Text>
        </View>
      </View>

      {open && (
        <View style={styles.breakdown}>
          {ret.components.map((c) => {
            const color = toneColor(c.tone);
            return (
              <View key={c.label}>
                <View style={styles.compRow}>
                  <Text style={styles.compLabel}>
                    {c.label}
                    {c.sub ? (
                      <Text style={styles.compSub}> {c.sub}</Text>
                    ) : null}
                  </Text>
                  <Text style={[styles.compValue, { color }]}>{c.value}</Text>
                </View>
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
              </View>
            );
          })}
          <Text style={styles.footnote}>
            Los componentes suman el rendimiento total
          </Text>
        </View>
      )}
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
  totalPct: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
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
  compSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "400",
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
