import { AnimatedPressable, usePressDim } from "@/components/ui/press-feedback";
import { Duration } from "@/constants/motion";
import { Colors } from "@/constants/theme";
import { useExpandChevron } from "@/hooks/use-expand-chevron";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Donut } from "./donut";
import { segmentColor } from "./view-model";
import type { PortfolioView } from "./view-model";

type Props = {
  distribution: PortfolioView["distribution"];
};

/** The Distribución card: owns the selection and legend-open state shared by
 * the donut, its center readout, the hint line and the legend. Tapping an arc
 * or a legend row toggles that segment; deselecting restores the Total. */
export function DistributionCard({ distribution }: Props) {
  const { centerTotal, segments, legend, missingPriceCount } = distribution;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  const toggle = (key: string) => setSelectedKey((prev) => (prev === key ? null : key));
  const legendTogglePress = usePressDim();
  const chevron = useExpandChevron(legendOpen);

  // Center: the Total by default; a selected row's tinted label + amount when
  // a segment (or the negative-cash legend row) is selected.
  const selectedRow = selectedKey ? legend.find((l) => l.key === selectedKey) : undefined;
  const centerTop = selectedRow ? selectedRow.label : centerTotal;
  const centerTopColor = selectedRow ? segmentColor(selectedRow.colorIndex) : Colors.textPrimary;
  const centerBottom = selectedRow ? selectedRow.amount : "Total";

  return (
    <Animated.View style={styles.card} layout={LinearTransition.duration(Duration.base)}>
      <Text style={styles.title}>Distribución</Text>

      <View style={styles.donutWrap}>
        <Donut
          segments={segments}
          selectedKey={selectedKey}
          onSelect={toggle}
          centerTop={centerTop}
          centerTopColor={centerTopColor}
          centerBottom={centerBottom}
        />
      </View>

      {missingPriceCount > 0 && (
        <Text style={styles.missingNote}>
          {missingPriceCount === 1
            ? "1 activo sin precio, excluido de la distribución"
            : `${missingPriceCount} activos sin precio, excluidos de la distribución`}
        </Text>
      )}

      <AnimatedPressable
        style={[styles.legendToggle, legendTogglePress.style]}
        {...legendTogglePress.handlers}
        onPress={() => {
          chevron.animate();
          setLegendOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityLabel={legendOpen ? "Ocultar leyenda" : "Ver leyenda"}
      >
        <Text style={styles.legendToggleText}>{legendOpen ? "Ocultar leyenda" : "Ver leyenda"}</Text>
        <Animated.View style={chevron.style}>
          <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
        </Animated.View>
      </AnimatedPressable>

      {legendOpen && (
        <Animated.View
          style={styles.legend}
          entering={FadeIn.duration(Duration.base)}
          exiting={FadeOut.duration(Duration.press)}
        >
          {legend.map((row) => (
            <LegendRow key={row.key} row={row} selected={selectedKey === row.key} onPress={() => toggle(row.key)} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

type LegendItem = PortfolioView["distribution"]["legend"][number];

/** Dim, where the app's other rows inside a shared card take a fill. The fill is
 * already spoken for here: `legendRowSelected` is the same rgba(255,255,255,0.05)
 * `usePressFill` paints, so a press fill would dress an unselected row as
 * selected for as long as the finger stayed down, and do nothing at all on a row
 * that already was. */
function LegendRow({ row, selected, onPress }: { row: LegendItem; selected: boolean; onPress: () => void }) {
  const press = usePressDim();
  return (
    <AnimatedPressable
      style={[styles.legendRow, selected && styles.legendRowSelected, press.style]}
      {...press.handlers}
      onPress={onPress}
    >
      <View style={[styles.swatch, { backgroundColor: segmentColor(row.colorIndex) }]} />
      <Text style={styles.legendLabel}>{row.label}</Text>
      <Text style={[styles.legendPct, row.negative && styles.legendNegative]}>{row.pct ?? row.amount}</Text>
    </AnimatedPressable>
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  donutWrap: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  missingNote: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  legendToggle: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  legendToggleText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  legend: {
    marginTop: 10,
    gap: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  legendRowSelected: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textBright,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  legendNegative: {
    color: Colors.negative,
  },
});
