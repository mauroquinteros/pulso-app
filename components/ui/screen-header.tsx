import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

/** Screen header: back button + screen title. Shared by add-movement forms and movement detail. */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Atrás"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
      </Pressable>
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
  backBtnPressed: {
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
});
