import { ScrollView, StyleSheet, Text } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
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
  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected: chip.selected }}
      style={[styles.chip, chip.selected ? { backgroundColor: bg, borderColor: color } : styles.chipIdle, press.style]}
      {...press.handlers}
    >
      <Text style={[styles.label, { color: chip.selected ? color : Colors.textSecondary }]}>{chip.label}</Text>
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
  chipIdle: {
    backgroundColor: "transparent",
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
