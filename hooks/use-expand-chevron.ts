import { LayoutAnimation, Platform, UIManager } from "react-native";
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Duration, Ease } from "@/constants/motion";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** `Presets.easeInEaseOut` rebuilt at `base`, which is the whole reason it is
 * spelled out: the preset runs 300ms, so a card's height and the chevron above
 * it would disagree by 100ms on the same tap. Same create/delete fades. */
const EXPAND_TRANSITION = {
  duration: Duration.base,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

/**
 * A chevron that turns while the section under it opens or closes.
 *
 * Shared because it was not: Rendimiento total animated both halves while
 * Distribucion turned its chevron with a bare style and let its legend appear
 * outright, which is the same control behaving two ways. Copying the first into
 * the second would have left the next one free to drift again.
 *
 * Only the height change asks about reduce motion. `withTiming` consults the
 * system setting itself and jumps the chevron straight to its end angle;
 * `LayoutAnimation` is a legacy RN API with no such wiring, so left alone it
 * would go on animating the section open for someone who asked for no motion.
 *
 * `open` is the state BEFORE the tap: call `animate` from the same handler that
 * flips it, and the initial angle is read once so a section that starts open
 * starts turned.
 */
export function useExpandChevron(open: boolean) {
  const rotation = useSharedValue(open ? 180 : 0);
  const reduceMotion = useReducedMotion();

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animate = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(EXPAND_TRANSITION);
    }
    rotation.value = withTiming(open ? 0 : 180, { duration: Duration.base, easing: Ease.standard });
  };

  return { style, animate };
}
