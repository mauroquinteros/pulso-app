import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { MOCK_PROFILE } from "@/lib/mock-data";

/** Nowhere to go yet: there is no login screen, no session and no route guard.
 * This is the seam the auth feature will pick up. */
function signOut() {
  // Deliberately empty until auth exists.
}

export default function SettingsScreen() {
  const askSignOut = () =>
    Alert.alert("¿Cerrar sesión?", undefined, [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: signOut },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      {/* The Perfil sits loose on the background, against the repo's habit of
          carding content: two lines of text rattle around inside a card, and
          the divider below already does what the card came to do - separate
          the information from the action. No labels: an email explains itself. */}
      <View style={styles.profile}>
        <Text style={styles.name}>{MOCK_PROFILE.name}</Text>
        <Text style={styles.email}>{MOCK_PROFILE.email}</Text>
      </View>

      <View style={styles.divider} />

      {/* Neutral, not `negative`: in Pulso red means *loss*, and signing out is
          not one - nothing is destroyed, you just log back in. It stays in the
          flow instead of anchored to the bottom, clear of the tab bar. */}
      <Pressable style={styles.signOut} onPress={askSignOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  profile: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  name: {
    fontSize: 21,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    marginHorizontal: 20,
    marginTop: 22,
    height: 1,
    backgroundColor: Colors.border,
  },
  signOut: {
    marginHorizontal: 20,
    marginTop: 22,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.accent,
  },
});
