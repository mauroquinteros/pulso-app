import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";
import { clearPerfilScopedState } from "@/stores/perfil-scoped-state";
import { useSessionStore } from "@/stores/session";
import { profileFrom } from "@/utils/profile";

/**
 * Ends the session on this phone, and nowhere else.
 *
 * `scope: "local"` because closing a session here must not close the Perfil's
 * sessions on its other devices - "Cerrar sesión" is about this phone.
 *
 * No navigation, deliberately. Dropping the session fires `SIGNED_OUT`, the
 * mirror in `useSessionStore` goes null, the guard in `app/_layout.tsx` inverts,
 * and Expo Router takes `(tabs)` out of the tree and clears the history itself.
 * A `router.replace` here would be a second, competing answer to "where am I".
 */
async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "local" });

  // Signing out has to work on a plane, and by itself the call above does not:
  // auth-js revokes the refresh token *before* it touches local storage and
  // returns early when that request fails, so with no connection you ask the
  // server, get nothing, and stay signed in. (Verified in @supabase/auth-js
  // 2.98.0, `GoTrueClient._signOut`: a dead network is an
  // `AuthRetryableFetchError` with status 0, which is not among the 401/403/404
  // it forgives, so `_removeSession()` - the only thing that fires `SIGNED_OUT`
  // - never runs.)
  //
  // Dropping the persisted session ourselves and asking again finishes the job:
  // the second call finds no token to revoke, skips the network entirely, and
  // removes the session. The refresh token is left unrevoked, which is what
  // local scope leaves behind anyway - it expires on its own.
  if (error) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await supabase.auth.signOut({ scope: "local" });
  }

  clearPerfilScopedState();
}

export default function SettingsScreen() {
  const profile = profileFrom(useSessionStore((state) => state.session));

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
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
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
