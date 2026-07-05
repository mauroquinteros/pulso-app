import { Colors } from "@/constants/theme";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Donut, segmentColor } from "./donut";
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

  const toggle = (key: string) =>
    setSelectedKey((prev) => (prev === key ? null : key));

  // Center: the Total by default; a selected row's tinted label + amount when
  // a segment (or the negative-cash legend row) is selected.
  const selectedRow = selectedKey
    ? legend.find((l) => l.key === selectedKey)
    : undefined;
  const centerTop = selectedRow ? selectedRow.label : centerTotal;
  const centerTopColor = selectedRow
    ? segmentColor(selectedRow.colorIndex)
    : Colors.textPrimary;
  const centerBottom = selectedRow ? selectedRow.amount : "Total";

  return (
    <View style={styles.card}>
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

      <Pressable style={styles.legendToggle} onPress={() => setLegendOpen((o) => !o)}>
        <Text style={styles.legendToggleText}>
          {legendOpen ? "Ocultar leyenda" : "Ver leyenda"}
        </Text>
        <Text
          style={[
            styles.chevron,
            { transform: [{ rotate: legendOpen ? "180deg" : "0deg" }] },
          ]}
        >
          ▾
        </Text>
      </Pressable>

      {legendOpen && (
        <View style={styles.legend}>
          {legend.map((row) => (
            <Pressable
              key={row.key}
              style={[
                styles.legendRow,
                selectedKey === row.key && styles.legendRowSelected,
              ]}
              onPress={() => toggle(row.key)}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: segmentColor(row.colorIndex) },
                ]}
              />
              <Text style={styles.legendLabel}>{row.label}</Text>
              <Text
                style={[
                  styles.legendPct,
                  row.negative && styles.legendNegative,
                ]}
              >
                {row.pct ?? row.amount}
              </Text>
            </Pressable>
          ))}
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
  chevron: {
    fontSize: 11,
    color: Colors.textSecondary,
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
