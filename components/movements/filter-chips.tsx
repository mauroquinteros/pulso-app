import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
import { Duration, Ease } from "@/constants/motion";
import { MOVEMENT_TYPE_META } from "@/constants/movement-type";
import { Colors } from "@/constants/theme";
import type { MovementType } from "@/types/models";
import type { MovementChip } from "./view-model";

// The chip reads 36pt tall; hitSlop lifts the effective target to 44pt.
const HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

type Props = {
  chips: MovementChip[];
  onToggle: (type: MovementType) => void;
};

/**
 * One chip per movement type. There is no "Todos" chip: tapping the active chip
 * clears the filter, the same toggle gesture the portfolio donut uses. No chip
 * selected means no filter, the standard filter-chip pattern.
 */
export function FilterChips({ chips, onToggle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {chips.map((chip) => (
        <Chip key={chip.type} chip={chip} onPress={() => onToggle(chip.type)} />
      ))}
    </ScrollView>
  );
}

function Chip({ chip, onPress }: { chip: MovementChip; onPress: () => void }) {
  const { bg, color } = MOVEMENT_TYPE_META[chip.type];
  const press = usePressScale(0.94);

  // Selecting used to swap three colours in a single frame, which reads as the
  // screen redrawing rather than as a filter engaging.
  const selected = useSharedValue(chip.selected ? 1 : 0);
  useEffect(() => {
    selected.value = withTiming(chip.selected ? 1 : 0, { duration: Duration.base, easing: Ease.standard });
  }, [chip.selected, selected]);

  // The fill is a layer whose opacity moves, not a colour that interpolates.
  // `bg` is an `rgba()` and its unselected twin would be the same hue at zero
  // alpha - deriving that meant parsing the string, which is both fragile (a
  // `bg` written as hex would come back unchanged, killing the transition with
  // no error) and how this crashed once, by reaching a plain function from
  // inside a worklet. Fading a statically coloured layer needs neither.
  const fill = useAnimatedStyle(() => ({ opacity: selected.value }));

  // Safe to interpolate: both ends are opaque, so nothing travels through the
  // black that a transparent end would drag it toward.
  const outline = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selected.value, [0, 1], [Colors.border, color]),
  }));
  const labelSkin = useAnimatedStyle(() => ({
    color: interpolateColor(selected.value, [0, 1], [Colors.textSecondary, color]),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected: chip.selected }}
      style={[styles.chip, outline, press.style]}
      {...press.handlers}
    >
      <Animated.View style={[styles.fill, { backgroundColor: bg }, fill]} pointerEvents="none" />
      <Animated.Text style={[styles.label, labelSkin]}>{chip.label}</Animated.Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexGrow: 0,
  },
  content: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
