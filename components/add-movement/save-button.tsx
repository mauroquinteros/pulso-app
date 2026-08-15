import { useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

/**
 * The "Guardar movimiento" primary button shared by every add-movement form.
 *
 * `pending` is the form saying that an insert is in flight and Postgres has not
 * answered yet (ADR 0010). The spinner is laid *over* the label rather than
 * swapped for it, so the button cannot resize mid-save - the same slot trick
 * the Compra form's Símbolo field uses.
 */
export function SaveButton({
  canSave,
  pending = false,
  onPress,
}: {
  canSave: boolean;
  pending?: boolean;
  onPress: () => void | Promise<void>;
}) {
  // The ref, not `pending`, is what stops the second of two taps landing in the
  // same frame: `pending` only reaches this button on the next render, by which
  // time both handlers have already run.
  const pressed = useRef(false);

  const handlePress = async () => {
    if (pressed.current) return;
    pressed.current = true;

    try {
      await onPress();
    } finally {
      // This latch used to be one-way, which was correct while saving always
      // dismissed the form. A save that can fail leaves the form open, so a
      // latch that never reset would leave the user looking at their own
      // unsaved deposit behind a permanently dead button. Resetting after a
      // save that *succeeded* costs nothing: that form stays `pending` while it
      // dismisses, and `disabled` keeps the button inert on the way out.
      pressed.current = false;
    }
  };

  return (
    <Pressable
      style={[styles.button, { backgroundColor: canSave ? Colors.accent : "#161B3D" }, canSave && styles.buttonActive]}
      onPress={handlePress}
      disabled={!canSave || pending}
    >
      <Text style={[styles.buttonText, { color: canSave ? "#04211E" : "#4A5070" }, pending && styles.labelSaving]}>
        Guardar movimiento
      </Text>
      {pending && (
        <View style={[StyleSheet.absoluteFill, styles.pendingSlot]}>
          <ActivityIndicator size="small" color="#04211E" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonActive: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  labelSaving: {
    opacity: 0,
  },
  pendingSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
});
