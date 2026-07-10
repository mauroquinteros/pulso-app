import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

type Props = {
  message: string; // "No tienes retiros" — names the filtered type
  onClear: () => void;
};

/**
 * There are movements, just none of the selected type. No illustration and no
 * "add movement" prompt: the user was not onboarding, they were looking.
 *
 * "Quitar filtro" is the explicit escape — the safety net for dropping the
 * "Todos" chip, which left "tap the active chip again" as the only other way out.
 */
export function FilteredEmpty({ message, onClear }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Text style={styles.clear}>Quitar filtro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  message: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  clear: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.accent,
    marginTop: 6,
  },
});
