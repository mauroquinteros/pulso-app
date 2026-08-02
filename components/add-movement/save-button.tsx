import { useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Colors } from "@/constants/theme";

/** The "Guardar movimiento" primary button shared by every add-movement form. */
export function SaveButton({ canSave, onPress }: { canSave: boolean; onPress: () => void }) {
  const pressed = useRef(false);

  const handlePress = () => {
    if (pressed.current) return;
    pressed.current = true;
    onPress();
  };

  return (
    <Pressable
      style={[styles.button, { backgroundColor: canSave ? Colors.accent : "#161B3D" }, canSave && styles.buttonActive]}
      onPress={handlePress}
      disabled={!canSave}
    >
      <Text style={[styles.buttonText, { color: canSave ? "#04211E" : "#4A5070" }]}>Guardar movimiento</Text>
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
});
