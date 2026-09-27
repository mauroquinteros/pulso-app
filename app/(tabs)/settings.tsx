import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
import { Colors } from "@/constants/theme";
import { deleteCurrentPerfil } from "@/lib/delete-perfil";
import { signOutFromThisDevice } from "@/lib/sign-out";
import { useSessionStore } from "@/stores/session";
import { profileFrom } from "@/utils/profile";

export default function SettingsScreen() {
  const signOutPress = usePressScale(0.97);
  const deletePress = usePressScale(0.97);
  const [deleting, setDeleting] = useState(false);
  const session = useSessionStore((state) => state.session);
  const profile = profileFrom(session);

  const askSignOut = () =>
    Alert.alert("¿Cerrar sesión?", undefined, [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: signOutFromThisDevice },
    ]);

  const deletePerfil = async () => {
    const user = session?.user;
    if (!user) return;

    setDeleting(true);
    try {
      const result = await deleteCurrentPerfil(user);
      if (result === "deletedLocalCleanupFailed") {
        Alert.alert(
          "Tu perfil fue eliminado",
          "No pudimos cerrar la sesión en este dispositivo. Intenta cerrar sesión nuevamente.",
        );
      } else if (result === "failed") {
        Alert.alert("No pudimos eliminar tu perfil", "Inténtalo nuevamente.");
      }
    } catch {
      Alert.alert("No pudimos eliminar tu perfil", "Inténtalo nuevamente.");
    } finally {
      setDeleting(false);
    }
  };

  const askDeletePerfil = () =>
    Alert.alert(
      "¿Eliminar tu perfil?",
      "Se eliminarán permanentemente tu perfil y todos tus movimientos. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar perfil", style: "destructive", onPress: deletePerfil },
      ],
    );

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
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      <View style={styles.divider} />

      {/* Neutral, not `negative`: in Pulso red means *loss*, and signing out is
          not one - nothing is destroyed, you just log back in. It stays in the
          flow instead of anchored to the bottom, clear of the tab bar. */}
      <AnimatedPressable
        style={[styles.signOut, signOutPress.style, deleting && styles.disabled]}
        {...signOutPress.handlers}
        onPress={askSignOut}
        disabled={deleting}
      >
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </AnimatedPressable>

      <AnimatedPressable
        style={[styles.deletePerfil, deletePress.style, deleting && styles.disabled]}
        {...deletePress.handlers}
        onPress={askDeletePerfil}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Eliminar mi perfil"
        accessibilityState={{ disabled: deleting, busy: deleting }}
      >
        {deleting ? <ActivityIndicator size="small" color={Colors.negative} /> : null}
        <Text style={styles.deletePerfilText}>{deleting ? "Eliminando..." : "Eliminar mi perfil"}</Text>
      </AnimatedPressable>
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
  deletePerfil: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,82,82,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.34)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  deletePerfilText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.negative,
  },
  disabled: {
    opacity: 0.55,
  },
});
