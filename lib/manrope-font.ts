import { cloneElement, isValidElement } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

/**
 * Applies Manrope as the app-wide default font for every <Text>.
 *
 * React 19 removed defaultProps resolution for function components, so the old
 * `Text.defaultProps` hack was a silent no-op and text fell back to the system
 * font. Manrope also ships one file PER weight (Manrope_700Bold, ...), so a bare
 * `fontWeight` is not enough — the weight must be resolved to the matching family
 * name or the glyphs revert to the system font.
 *
 * This interposes `Text.render` (which runs for every <Text>) so the resolution
 * happens once, globally, with no per-component change. The original `fontWeight`
 * is kept in the style: glyphs Manrope does not ship (arrows like -> or the
 * up/down marks) fall back to the system font, and without the weight that
 * fallback renders thin. The resolved Manrope family already matches the weight,
 * so keeping both does not double-bold.
 *
 * Trade-off: this leans on a React Native internal (`Text.render`). If a future
 * RN release changes it, this bails and text simply reverts to the system font —
 * a visible failure fixed in this one file, never a crash.
 */
const WEIGHT_TO_FAMILY: Record<string, string> = {
  "400": "Manrope_400Regular",
  normal: "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
  bold: "Manrope_700Bold",
  "800": "Manrope_800ExtraBold",
};

type RenderFn = (...args: unknown[]) => unknown;
type Renderable = { render?: RenderFn };

let applied = false;

export function applyManropeDefaultFont(): void {
  if (applied) return;
  applied = true;

  const target = Text as unknown as Renderable;
  const original = target.render;
  if (typeof original !== "function") return; // RN internal moved — bail, no crash

  target.render = function (this: unknown, ...args: unknown[]) {
    const element = original.apply(this, args);
    if (!isValidElement<{ style?: StyleProp<TextStyle> }>(element)) return element;

    const flat = StyleSheet.flatten(element.props.style) ?? {};
    const fontFamily = WEIGHT_TO_FAMILY[String(flat.fontWeight ?? "400")] ?? "Manrope_400Regular";

    // fontFamily first so `flat` keeps its own fontWeight (and any explicit
    // fontFamily) on top — the family sets Manrope, the weight stays for fallbacks.
    return cloneElement(element, { style: [{ fontFamily }, flat] });
  };
}
