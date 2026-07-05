import { Colors, HoldingBadgePalette } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
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
const HIT_THICKNESS = 34; // expanded invisible hit band → ≥44pt effective target

const GAP_DEG = (GAP / CIRCUMFERENCE) * 360;
const FULL = 0.9999; // a single segment filling the whole ring

/** Maps a segment's colorIndex to its stroke color: a badge palette entry, or
 * the two reserved colors (Efectivo, Otros). */
export function segmentColor(colorIndex: ColorIndex): string {
  if (colorIndex === "cash") return Colors.investedBar;
  if (colorIndex === "others") return Colors.textMuted;
  return HoldingBadgePalette[colorIndex % HoldingBadgePalette.length].color;
}

/** Point on the ring at `angleDeg` (0° = 12 o'clock, clockwise). */
function polar(angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

/** SVG arc path from `startDeg` to `endDeg`, clockwise. */
function arcPath(startDeg: number, endDeg: number): string {
  const start = polar(startDeg);
  const end = polar(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

type Props = {
  segments: DonutSegment[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  centerTop: string;
  centerTopColor: string;
  centerBottom: string;
};

/** Presentational Allocation donut: renders one arc per view-model fraction
 * (no allocation math here) with a center readout. Each arc is its own path,
 * so a tap selects the segment under the finger. Largest starts at 12
 * o'clock, clockwise. */
export function Donut({
  segments,
  selectedKey,
  onSelect,
  centerTop,
  centerTopColor,
  centerBottom,
}: Props) {
  // Accumulate the angular start of each segment so arcs sit end-to-end.
  let cumulativeDeg = 0;
  const arcs = segments.map((seg) => {
    const startDeg = cumulativeDeg;
    const sweepDeg = seg.fraction * 360;
    cumulativeDeg += sweepDeg;
    return {
      key: seg.key,
      color: segmentColor(seg.colorIndex),
      startDeg,
      sweepDeg,
      full: seg.fraction >= FULL,
      selected: selectedKey === seg.key,
      dimmed: selectedKey !== null && selectedKey !== seg.key,
    };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        {/* Visible arcs, inset by half the gap on each side. */}
        {arcs.map((arc) => {
          const width = arc.selected ? THICKNESS + SELECTED_EXTRA : THICKNESS;
          const opacity = arc.dimmed ? DIM_OPACITY : 1;
          if (arc.full) {
            return (
              <Circle
                key={arc.key}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={width}
                opacity={opacity}
              />
            );
          }
          const inset = Math.min(GAP_DEG / 2, arc.sweepDeg / 2 - 0.01);
          return (
            <Path
              key={arc.key}
              d={arcPath(arc.startDeg + inset, arc.startDeg + arc.sweepDeg - inset)}
              fill="none"
              stroke={arc.color}
              strokeWidth={width}
              opacity={opacity}
            />
          );
        })}
        {/* Expanded invisible hit bands, on top so small arcs stay tappable. */}
        {arcs.map((arc) =>
          arc.full ? (
            <Circle
              key={`hit-${arc.key}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_THICKNESS}
              onPress={() => onSelect(arc.key)}
            />
          ) : (
            <Path
              key={`hit-${arc.key}`}
              d={arcPath(arc.startDeg, arc.startDeg + arc.sweepDeg)}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_THICKNESS}
              onPress={() => onSelect(arc.key)}
            />
          ),
        )}
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
