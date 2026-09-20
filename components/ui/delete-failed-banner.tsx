import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Duration } from "@/constants/motion";
import { Colors } from "@/constants/theme";

/**
 * A delete the database refused. Same language as Inicio's refresh banner - a
 * strip at the top of the screen, arriving from and leaving by the edge it lives
 * against - tinted red, because unlike a stale price this is a thing the user
 * asked for that did not happen.
 *
 * It floats rather than taking space in the flow, which is the one place it
 * departs from its sibling: a failed delete leaves the screen exactly as it was,
 * and a banner that pushed the receipt down would make a failure look like a
 * change. `top` is what keeps it clear of each screen's own header.
 *
 * Not a toast. It stays until the user asks again, because the sentence it
 * carries is an instruction - retry - and an instruction that times out is an
 * instruction half the people who needed it never read.
 */
export function DeleteFailedBanner({ top }: { top: number }) {
  return (
    <Animated.View
      style={[styles.banner, { top }]}
      entering={FadeInUp.duration(Duration.enter)}
      exiting={FadeOutUp.duration(Duration.base)}
      accessibilityRole="alert"
    >
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={Colors.negative}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.text}>No se pudo eliminar. Intenta de nuevo.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,82,82,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.42)",
    borderRadius: 14,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#FF8A8A",
  },
});
