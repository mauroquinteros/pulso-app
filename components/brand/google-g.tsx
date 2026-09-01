import Svg, { Path } from "react-native-svg";

/**
 * Google's G at their geometry and their 48x48 viewBox, drawn in ONE colour.
 *
 * This departs from Google's Sign in with Google branding, which requires their
 * four-colour mark on a white, light-grey or black surface and permits no
 * custom fill. The Pulso Sign In design asks for the teal CTA the rest of the
 * app uses, and a four-colour logo does not survive that ground - so the mark
 * follows the button. It is a deliberate trade of their guidelines for the
 * app's consistency, not an oversight, and it is the whole of the deviation:
 * the geometry is still theirs, untouched.
 */
export function GoogleG({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill={color}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65zM24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48zM10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19zM24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
    </Svg>
  );
}
