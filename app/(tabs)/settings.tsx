import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";
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
 *
 * No clearing of the Perfil's data here either, for the same reason: dropping
 * the session is what empties the stores, in the auth listener in
 * `stores/session.ts`. Doing it from this button would only cover the sessions
 * that end by being tapped away.
 */
async function signOut() {
  // Grab the token before the session goes, because revoking it needs it.
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;

  // Leaving must not wait on the network, and calling `signOut()` first would
  // make it: auth-js POSTs /logout to revoke the refresh token *before* it
  // touches local storage, with no timeout, and `_removeSession()` - the only
  // thing that fires `SIGNED_OUT` - runs after that request settles. So a slow
  // connection buys seconds of a screen where nothing happens, and a dead one
  // returns early and leaves you signed in. (Verified in @supabase/auth-js
  // 2.98.0: `GoTrueClient._signOut` and `GoTrueAdminApi.signOut`.)
  //
  // Dropping the persisted entry first inverts that. The call below then finds
  // no token to revoke, skips the network entirely, and fires `SIGNED_OUT` in
  // milliseconds - on a plane exactly as fast as on wifi.
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  await supabase.auth.signOut({ scope: "local" });

  // Revoke on the way out, unawaited and unchecked. The human has already left;
  // whether the server heard about it changes nothing they can see. If this
  // fails the refresh token simply expires on its own, which is what local
  // scope leaves behind in any case.
  if (jwt) {
    void supabase.auth.admin.signOut(jwt, "local").catch(() => {});
  }
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
