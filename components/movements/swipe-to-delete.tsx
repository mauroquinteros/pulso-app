import { Ionicons } from "@expo/vector-icons";
import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type ExitAnimationsValues,
} from "react-native-reanimated";

import { Duration, Ease } from "@/constants/motion";
import { Colors } from "@/constants/theme";

/** The panel's width, and so the whole travel of the gesture. */
const PANEL_WIDTH = 88;

/**
 * How far a finger must travel sideways before this claims the touch. Paired
 * with the same number on the vertical axis, which is what makes the list win
 * the ties: a drag that crosses 8pt downwards first fails this gesture outright
 * and goes on scrolling, so a swipe that was really a scroll never opens a row.
 */
const THRESHOLD = 8;

/** Dragging left to right, where there is nothing to reveal. */
const WRONG_WAY = 0.2;

/** Dragging past the panel it already revealed. The friction is the answer to
 * "what does a full swipe do": it makes the end of the travel feel like an end. */
const OVERSHOOT = 0.16;

/**
 * How a deleted row leaves: it collapses to nothing over `base` rather than
 * blinking out, so the list is seen to close up rather than found already
 * closed. The opacity goes first and faster, which is what stops the last few
 * pixels of a squashed row from being the final thing on screen.
 *
 * Only the row's own exit. The gap it leaves is closed by the list's
 * `itemLayoutAnimation`, which every other row rides up on.
 */
const collapse = (values: ExitAnimationsValues) => {
  "worklet";
  return {
    initialValues: { height: values.currentHeight, opacity: 1 },
    animations: {
      height: withTiming(0, { duration: Duration.base, easing: Ease.exit }),
      opacity: withTiming(0, { duration: Duration.press, easing: Ease.exit }),
    },
  };
};

/**
 * Reveals a destructive action behind a row of the history.
 *
 * **It reveals; it never executes.** Dragging all the way across hits the panel's
 * width with friction and stays open - deleting still takes a deliberate tap on
 * the panel and then a confirmation. iOS Mail's full-swipe was considered and
 * turned down: it is paired there with an undo this app cannot offer, since the
 * delete is hard in the database, and it would make one gesture mean two things
 * depending on a distance nobody can see.
 *
 * Open state is controlled from above rather than held here, because the rule is
 * about the list and not about any one row: only one row is open at a time, so
 * only something that can see them all can enforce it.
 */
export function SwipeToDelete({
  open,
  disabled,
  onDragStart,
  onSettled,
  onDelete,
  children,
}: {
  open: boolean;
  /** No new gesture while a delete is in flight - the row is not touchable then. */
  disabled: boolean;
  onDragStart: () => void;
  onSettled: (open: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const tx = useSharedValue(0);
  /** Where the row stood when the finger landed, so a drag that begins on an
   * already-open row carries on from the panel rather than from zero. */
  const from = useSharedValue(0);

  // What closes a row that something else decided about: another row opening, a
  // scroll, a tap elsewhere. The gesture below animates itself on release, so on
  // its own releases this arrives at a value already on its way there.
  useEffect(() => {
    tx.value = withTiming(open ? -PANEL_WIDTH : 0, { duration: Duration.base, easing: Ease.standard });
  }, [open, tx]);

  // Everything below runs on the UI thread - the row has to follow the finger
  // frame for frame, and only the two callbacks out to the screen cross over.
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-THRESHOLD, THRESHOLD])
    .failOffsetY([-THRESHOLD, THRESHOLD])
    .onStart(() => {
      from.value = tx.value;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      const next = from.value + e.translationX;

      if (next > 0) tx.value = next * WRONG_WAY;
      else if (next < -PANEL_WIDTH) tx.value = -PANEL_WIDTH + (next + PANEL_WIDTH) * OVERSHOOT;
      else tx.value = next;
    })
    .onEnd(() => {
      // Past the halfway mark it opens, before it closes - so a short flick that
      // was going to be a scroll cannot leave a delete button armed.
      const settled = tx.value < -PANEL_WIDTH / 2;
      tx.value = withTiming(settled ? -PANEL_WIDTH : 0, { duration: Duration.base, easing: Ease.standard });
      runOnJS(onSettled)(settled);
    });

  const sliding = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <Animated.View style={styles.clip} exiting={collapse}>
      {/* Behind the row, inside the card: the card's own radius is what rounds
          this off on the first and the last row. */}
      <Pressable
        style={styles.panel}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar movimiento"
      >
        <Ionicons
          name="trash-outline"
          size={21}
          color={Colors.background}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.panelLabel}>Eliminar</Text>
      </Pressable>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, sliding]}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: "relative",
    overflow: "hidden",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH, // and never below 44pt, at whatever height the row is
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: Colors.negative,
  },
  /** The app's own background, not white: the panel is a hole cut in the card,
   * and its contents belong to the screen behind it. */
  panelLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: Colors.background,
  },
  /** Opaque, so the row covers the panel rather than floating over it, and
   * padded here rather than on the card so the panel can reach the card's edge. */
  content: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 18,
  },
});
