import { Colors } from "@/constants/theme";
import type { GestureResponderEvent } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { DonutSegment } from "./view-model";
import { segmentColor } from "./view-model";

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

// Taps are matched by angle within this radial band (viewBox units), a ~50px
// rendered ring — inside it selects the segment under the finger, the hole and
// the area outside are ignored. Comfortably ≥44pt effective target.
const INNER_HIT = RADIUS - THICKNESS / 2 - 6;
const OUTER_HIT = RADIUS + THICKNESS / 2 + 6;

const GAP_DEG = (GAP / CIRCUMFERENCE) * 360;
const FULL = 0.9999; // a single segment filling the whole ring

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
export function Donut({ segments, selectedKey, onSelect, centerTop, centerTopColor, centerBottom }: Props) {
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

  // Resolve which segment a tap hit by its angle from center — the inverse of
  // polar(), so what you touch is what gets selected. Deterministic: no
  // overlapping hit shapes, no z-order, no transparent-stroke quirks. Taps in
  // the hole or outside the ring are ignored.
  const handlePress = (event: GestureResponderEvent) => {
    const scale = VIEWBOX / SIZE;
    const dx = event.nativeEvent.locationX * scale - CENTER;
    const dy = event.nativeEvent.locationY * scale - CENTER;
    if (Math.hypot(dx, dy) < INNER_HIT || Math.hypot(dx, dy) > OUTER_HIT) return;
    // 0° = 12 o'clock, clockwise (matches polar's angle convention).
    const deg = ((((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360) + 360) % 360;
    let cumulative = 0;
    for (const seg of segments) {
      const sweep = seg.fraction * 360;
      if (deg >= cumulative && deg < cumulative + sweep) {
        onSelect(seg.key);
        return;
      }
      cumulative += sweep;
    }
  };

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
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <View style={styles.centerInner}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.centerTop, { color: centerTopColor }]}>
            {centerTop}
          </Text>
          <Text style={styles.centerBottom}>{centerBottom}</Text>
        </View>
      </View>
      {/* One transparent overlay resolves the tapped segment by angle. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />
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
  // Bounded to the ring's inner hole so the amount shrinks to fit instead of
  // overrunning the arcs (adjustsFontSizeToFit needs a width to shrink toward).
  centerInner: {
    width: 108,
    paddingHorizontal: 8,
    alignItems: "center",
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
