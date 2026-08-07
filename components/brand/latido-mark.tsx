import Svg, { Circle, Path } from "react-native-svg";

// The mark's own colors, deliberately not `Colors.accent` / `Colors.avatarText`
// even though they hold these exact values today. assets/brand/README.md: "One
// construction. Teal disc + ink beat. Never outlined, never recolored." A theme
// token is a thing that is allowed to change; the mark is not, and binding the
// two would let a palette edit silently recolor the brand.
const DISC = "#00E5CC";
const INK = "#04211E";

/**
 * Latido, the Pulso mark: an EKG reduced to one asymmetric beat between two
 * flatlines. Geometry transcribed from `assets/brand/mark.svg` - this project
 * has no SVG asset pipeline, and both existing vector components draw with
 * react-native-svg primitives, so the file is the source of truth and this is
 * its faithful copy, not a redraw.
 *
 * Flat disc, no gradient and no glow. `Gradients.avatar` is the app's CTA
 * gradient and is used for the Home avatar disc, but the mark is not that disc:
 * the sign-in mark and the app icon come from one file and must not drift.
 */
export function LatidoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Pulso">
      <Circle cx={50} cy={50} r={50} fill={DISC} />
      <Path
        d="M10 50 H30 L41 26 L55 70 L63 50 H90"
        fill="none"
        stroke={INK}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
