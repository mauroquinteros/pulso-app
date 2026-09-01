import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

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

/** Reanimated's default spring is bouncier and slower than an acknowledgement
 * should be, so this is stated. ~9% overshoot, peaking around 200ms: enough
 * movement to be seen, not enough to wobble. */
const PRESS_SPRING = { mass: 0.6, damping: 14, stiffness: 220 };

/**
 * The same 0 -> 1 as `usePressProgress`, but sprung in BOTH directions - which
 * is the whole difference, and it exists for one reason: a control that answers
 * by SCALING cannot take the instant press-in. A fill or a dim arriving in one
 * frame reads as a state change, which is what it is. A scale arriving in one
 * frame is not motion at all, it is a jump, and the eye reads it as nothing
 * having happened.
 *
 * Overshoot is left unclamped on purpose. It is what makes the spring feel
 * alive, and every property it drives here absorbs it harmlessly: opacity above
 * 1 is clamped by the renderer, and a scale that dips 0.3% past its target is
 * invisible.
 */
export function usePressSpring() {
  const progress = useSharedValue(0);

  return {
    progress,
    handlers: {
      onPressIn: () => {
        progress.value = withSpring(1, PRESS_SPRING);
      },
      onPressOut: () => {
        progress.value = withSpring(0, PRESS_SPRING);
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
