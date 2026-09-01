import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { Duration, Ease } from "@/constants/motion";

/**
 * How a control answers a finger. Three treatments, and the criterion is what
 * the control IS - not which file it lives in:
 *
 * - `usePressFill`  a row among siblings on one surface. It lights up, because
 *                   it has to separate itself from the rows above and below.
 * - `usePressScale` something you push: a button, or a card behaving like one.
 * - `usePressDim`   responds as a whole but is not pushable - an input box, a
 *                   text link, a toggle, a region too large or a target too
 *                   small for a scale to read on.
 *
 * The scale clause arrived late, and while it was missing every button that was
 * not the FAB or sign-in got a dim by default - which left the two primary CTAs
 * of the app, both full-width pills, behaving differently for no reason anyone
 * could give. Adding a treatment means writing the clause that picks it.
 */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Carried over unchanged from the styles these replaced: `rgba(255,255,255,0.05)`
 * for a fill, `opacity: 0.6` for a dim. Which one a control takes is a rule that
 * predates this file - only the timing is new. */
const FILL_ALPHA = 0.05;
const DIM_DEPTH = 0.4;

/**
 * Press feedback, animated in both directions over `press`.
 *
 * It used to assign the press-in outright, on the argument that an
 * acknowledgement which is late is not an acknowledgement. That was wrong twice
 * over. RN's own `TouchableOpacity` animates its press-in - 150ms in, 250ms out
 * - so the instant version was never the platform idiom; and a change that
 * lands in a single frame is not perceived as a response at all, which is
 * exactly how it read on device. Feedback still BEGINS within a frame of the
 * touch, which is what the guidelines actually ask for; it just no longer
 * finishes there.
 *
 * Pressing again mid-release restarts the animation, so a fast double tap
 * cannot leave the highlight behind the finger.
 *
 * Nothing here asks about reduce motion: `withTiming` consults the system
 * setting itself and assigns the end value outright, which gives someone who
 * asked for no motion the on-then-off this used to do for everyone.
 */
function usePressProgress() {
  const progress = useSharedValue(0);

  return {
    progress,
    handlers: {
      onPressIn: () => {
        progress.value = withTiming(1, { duration: Duration.press, easing: Ease.enter });
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

/**
 * A control you push: a button, or a card that behaves like one. Sprung, so the
 * press-in is movement rather than a jump.
 *
 * `to` is not one value because the ratio is not what the eye reads - the travel
 * is. A full-width pill at 0.97 pulls its sides in about 5pt, while the same
 * 0.97 on a 34pt icon button moves it half a point, which is nothing. So a wide
 * object takes 0.97 and a compact one takes more, and anything small enough that
 * even a large ratio stays under ~2pt is better off dimming.
 */
export function usePressScale(to: number) {
  const { progress, handlers } = usePressSpring();

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - progress.value * (1 - to) }],
  }));

  return { handlers, style };
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
