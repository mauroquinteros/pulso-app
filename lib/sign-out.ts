import AsyncStorage from "@react-native-async-storage/async-storage";

import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";

/**
 * Drops this phone's persisted session and publishes SIGNED_OUT locally.
 *
 * Storage goes first on purpose. auth-js normally revokes over the network
 * before removing the local session, so a dead connection can leave the human
 * staring at a screen they already asked to leave. With no persisted token,
 * local sign-out skips that request and the session listener clears every
 * Perfil-scoped store before the route guard swaps the tree.
 */
export async function forgetLocalSession(): Promise<boolean> {
  let cleared = true;

  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    cleared = false;
  }

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) cleared = false;
  } catch {
    cleared = false;
  }

  return cleared;
}

/** Ends the session on this phone, and nowhere else, without waiting for the network. */
export async function signOutFromThisDevice() {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;

  await forgetLocalSession();

  // Best-effort revocation happens after the phone has already left. Local
  // scope deliberately leaves every other device signed in.
  if (jwt) {
    void supabase.auth.admin.signOut(jwt, "local").catch(() => {});
  }
}
