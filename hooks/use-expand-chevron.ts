import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Duration, Ease } from "@/constants/motion";

/**
 * The chevron over a section that expands.
 *
 * It used to drive the section's height too, through `LayoutAnimation`. That
 * was a no-op here: RN's own source says LayoutAnimations under Fabric are
 * "unconditionally enabled for Android, and conditionally enabled on iOS", and
 * this app runs `newArchEnabled`. So the chevron turned while the height
 * snapped, on both cards, for as long as the code has existed. The height is
 * Reanimated's job now - `layout` on the card, `entering`/`exiting` on the
 * block - and this is only the arrow.
 *
 * `open` is the state BEFORE the tap: call `animate` from the same handler that
 * flips it. The initial angle is read once, so a section that starts open
 * starts turned. Reduce motion needs no guard - `withTiming` consults the
 * system setting itself.
 */
export function useExpandChevron(open: boolean) {
  const rotation = useSharedValue(open ? 180 : 0);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animate = () => {
    rotation.value = withTiming(open ? 0 : 180, { duration: Duration.base, easing: Ease.standard });
  };

  return { style, animate };
}
