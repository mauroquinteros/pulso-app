import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, usePressDim } from "@/components/ui/press-feedback";
import { Colors } from "@/constants/theme";

/** Screen header: back button + screen title. Shared by add-movement forms and movement detail. */
export function ScreenHeader({ title }: { title: string }) {
  const press = usePressDim();
  return (
    <View style={styles.header}>
      <AnimatedPressable
        style={[styles.backBtn, press.style]}
        {...press.handlers}
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Atrás"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
      </AnimatedPressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
});
