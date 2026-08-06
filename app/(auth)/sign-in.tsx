import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";

/**
 * Deliberately plain. This screen exists to prove the path closes end to end:
 * one button, a real native sheet, a real session. Issue 03 replaces it with the
 * designed screen and its three outcomes (cancelled, offline, generic), so
 * nothing about this layout is meant to survive - building it twice is the thing
 * to avoid.
 */
export default function SignInScreen() {
  const handlePress = async () => {
    const idToken = await signInWithGoogle();

    // Dismissed the sheet. Silent by design, and issue 03 keeps it that way.
    if (!idToken) {
      return;
    }

    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });

    // Temporary, for this slice only: issue 03 turns this into the error slot.
    // Without it a rejected token fails silently and the screen just sits there.
    if (error) {
      console.error("signInWithIdToken failed:", error.status, error.message);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text style={styles.label}>Continuar con Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  button: {
    width: "100%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: Colors.border,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
