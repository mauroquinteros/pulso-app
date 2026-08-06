import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

/**
 * The one Supabase client, constructed here and nowhere else. The client owns
 * the session - a second instance would be a second owner of the same fact.
 *
 * `detectSessionInUrl` is off because that flag exists for web redirect flows,
 * where the session arrives in the URL fragment. The native Google sheet hands
 * back an id token directly, so there is no URL to read.
 */
/**
 * Where the persisted session lives in AsyncStorage. Declared rather than left
 * to the library's default so that signing out can reach it: the client keeps
 * its own copy of this as a `protected` field, and sign-out has to delete the
 * entry by hand when the network is down. See `signOut` in the Ajustes screen.
 */
export const AUTH_STORAGE_KEY = "pulso-auth";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

// Auto-refresh runs on a timer, and timers do not run reliably once the app is
// backgrounded. Driving it off the foreground transition instead is what keeps
// a returning user's token fresh; without it the refresh silently stops and the
// session expires while the app is away.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
