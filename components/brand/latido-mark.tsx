import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { Gradients } from "@/constants/theme";

// The mark's own colors, deliberately not `Colors.accent` / `Colors.avatarText`
// even though they hold these exact values today. assets/brand/README.md: "One
// construction. Teal disc + ink beat. Never outlined, never recolored." A theme
// token is a thing that is allowed to change; the mark is not, and binding the
// two would let a palette edit silently recolor the brand.
const DISC = "#00E5CC";
const INK = "#04211E";

const DISC_GRADIENT_ID = "latidoDisc";

/**
 * Latido, the Pulso mark: an EKG reduced to one asymmetric beat between two
 * flatlines. Geometry transcribed from `assets/brand/mark.svg` - this project
 * has no SVG asset pipeline, and both existing vector components draw with
 * react-native-svg primitives, so the file is the source of truth and this is
 * its faithful copy, not a redraw.
 *
 * `disc` is the one sanctioned departure from the flat construction, and it
 * exists for the sign-in screen alone: there the disc carries the CTA gradient
 * so it reads as one object with the teal button below it. It is the single
 * case where the mark IS allowed to follow a theme token - `Gradients.avatar`
 * rather than a copy of it, because the whole point is that the two match, so
 * the disc should move if the button ever does. Everywhere else, and in
 * `mark.svg` itself, the disc stays flat: that file is the icon source and the
 * launcher PNGs are rendered from it, so a gradient there would drift the app
 * icon. Hence the default.
 */
export function LatidoMark({ size = 64, disc = "flat" }: { size?: number; disc?: "flat" | "gradient" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Pulso">
      {disc === "gradient" && (
        <Defs>
          {/* 0,0 -> 1,1 is the 135deg the design draws every Pulso gradient at. */}
          <LinearGradient id={DISC_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Gradients.avatar[0]} />
            <Stop offset="1" stopColor={Gradients.avatar[1]} />
          </LinearGradient>
        </Defs>
      )}
      <Circle cx={50} cy={50} r={50} fill={disc === "gradient" ? `url(#${DISC_GRADIENT_ID})` : DISC} />
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
