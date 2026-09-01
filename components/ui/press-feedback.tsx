import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Duration, Ease } from "@/constants/motion";

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Carried over unchanged from the styles these replaced: `rgba(255,255,255,0.05)`
 * for a fill, `opacity: 0.6` for a dim. Which one a control takes is a rule that
 * predates this file - only the timing is new. */
const FILL_ALPHA = 0.05;
const DIM_DEPTH = 0.4;

/**
 * Press feedback that arrives instantly and leaves over `press`.
 *
 * The asymmetry is the whole point, and it deliberately inverts the app's
 * exit-faster-than-enter rule: an acknowledgement that is late is not an
 * acknowledgement, so press-in is assigned outright rather than animated. It is
 * the release that used to snap - RN drops a `pressed` style in the same frame
 * it applied it - and a highlight vanishing in one frame is the thing that reads
 * as cheap.
 *
 * Pressing again mid-release re-assigns the value and cancels the fade, so a
 * fast double tap cannot leave the highlight behind the finger.
 *
 * Nothing here asks about reduce motion: `withTiming` consults the system
 * setting itself and assigns 0 outright, which gives someone who asked for no
 * motion exactly today's behaviour - on, then off.
 */
export function usePressProgress() {
  const progress = useSharedValue(0);

  return {
    progress,
    handlers: {
      onPressIn: () => {
        progress.value = 1;
      },
      onPressOut: () => {
        progress.value = withTiming(0, { duration: Duration.press, easing: Ease.exit });
      },
    },
  };
}

/** A row inside a shared card. Only a fill, so the row cannot move under the
 * finger and its neighbours stay put. */
export function usePressFill() {
  const { progress, handlers } = usePressProgress();

  const style = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255,255,255,${progress.value * FILL_ALPHA})`,
  }));

  return { handlers, style };
}

/** A standalone object - a card, a button, a tab. The whole thing responds at
 * once, so it dims rather than lighting up. */
export function usePressDim() {
  const { progress, handlers } = usePressProgress();

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * DIM_DEPTH,
  }));

  return { handlers, style };
}
