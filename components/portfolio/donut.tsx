import { Colors, HoldingBadgePalette } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { ColorIndex, DonutSegment } from "./view-model";

// Geometry (matches the prototype): 184px rendered over a 140 viewBox, r=54,
// ring thickness 22 (+5 when selected), 2.4 arc gap, unselected dim to 0.28.
const SIZE = 184;
const VIEWBOX = 140;
const CENTER = VIEWBOX / 2;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const THICKNESS = 22;
const SELECTED_EXTRA = 5;
const GAP = 2.4;
const DIM_OPACITY = 0.28;
const HIT_THICKNESS = 34; // expanded invisible hit area → ≥44pt effective target

/** Maps a segment's colorIndex to its stroke color: a badge palette entry, or
 * the two reserved colors (Efectivo, Otros). */
export function segmentColor(colorIndex: ColorIndex): string {
  if (colorIndex === "cash") return Colors.investedBar;
  if (colorIndex === "others") return Colors.textMuted;
  return HoldingBadgePalette[colorIndex % HoldingBadgePalette.length].color;
}

type Props = {
  segments: DonutSegment[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  centerTop: string;
  centerTopColor: string;
  centerBottom: string;
};

/** Presentational Allocation donut: renders arcs from view-model fractions
 * (no allocation math here) with a center readout. Largest segment starts at
 * 12 o'clock, clockwise. */
export function Donut({
  segments,
  selectedKey,
  onSelect,
  centerTop,
  centerTopColor,
  centerBottom,
}: Props) {
  // Accumulate offsets so each arc begins where the previous ended.
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const dashLength = Math.max(seg.fraction * CIRCUMFERENCE - GAP, 0.5);
    const arc = {
      key: seg.key,
      color: segmentColor(seg.colorIndex),
      dash: `${dashLength} ${CIRCUMFERENCE}`,
      offset: -cumulative * CIRCUMFERENCE,
      selected: selectedKey === seg.key,
      dimmed: selectedKey !== null && selectedKey !== seg.key,
    };
    cumulative += seg.fraction;
    return arc;
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <G rotation={-90} originX={CENTER} originY={CENTER}>
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={arc.selected ? THICKNESS + SELECTED_EXTRA : THICKNESS}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
              opacity={arc.dimmed ? DIM_OPACITY : 1}
            />
          ))}
          {/* Expanded invisible hit areas, on top so small arcs stay tappable. */}
          {arcs.map((arc) => (
            <Circle
              key={`hit-${arc.key}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_THICKNESS}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
              onPress={() => onSelect(arc.key)}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.centerTop, { color: centerTopColor }]}>
          {centerTop}
        </Text>
        <Text style={styles.centerBottom}>{centerBottom}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTop: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  centerBottom: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
