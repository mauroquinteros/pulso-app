import { BorderRadius } from "@/constants/layout";
import { Colors, Gradients } from "@/constants/theme";
import { useSessionStore } from "@/stores/session";
import { firstNameFrom, initialsFrom, profileFrom } from "@/utils/profile";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export function HomeHeader() {
  const { name } = profileFrom(useSessionStore((state) => state.session));
  const firstName = firstNameFrom(name);

  return (
    <View style={styles.container}>
      {/* No comma when the provider sent no name: a trailing "Hola," reads as a
          rendering fault rather than as a greeting. */}
      <Text style={styles.greeting} numberOfLines={1}>
        {firstName === "" ? "Hola" : `Hola, ${firstName}`}
      </Text>
      <LinearGradient colors={Gradients.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        <Text style={styles.avatarInitials}>{initialsFrom(name)}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  greeting: {
    // Takes the slack so a long name truncates instead of squashing the disc.
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: Colors.avatarText,
    fontWeight: "800",
    fontSize: 16,
  },
});
