import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

interface SessionState {
  /**
   * Three-valued, and all three carry weight:
   *
   * - `undefined` - not yet known. The client reads AsyncStorage asynchronously
   *   on cold start, so there is a real window before the answer exists.
   *   Collapsing this into `null` would flash the sign-in screen on every launch
   *   for an already signed-in user.
   * - `null` - known to be signed out.
   * - `Session` - signed in.
   */
  session: Session | null | undefined;
}

/**
 * A read-only mirror of the session the Supabase client already owns.
 *
 * It holds the session and nothing else - no `profile`, no `isLoggedIn`. The
 * client is the authority and `getSession()` always tells the truth, so
 * anything kept here is a second copy of a fact that is not ours: it must stay a
 * mirror or it becomes a competing authority. Same reasoning that removed
 * `Movement.userId` from the domain.
 *
 * Note there is no setter in the interface. App code cannot write this store;
 * the listener below is its only writer.
 */
export const useSessionStore = create<SessionState>(() => ({
  session: undefined,
}));

// The store's only writer. `onAuthStateChange` fires `INITIAL_SESSION` once the
// client has finished reading storage - with the session or with `null` - which
// is what moves `session` off `undefined` on cold start. Sign-in, sign-out and
// token refresh all arrive through this same callback.
supabase.auth.onAuthStateChange((_event, session) => {
  useSessionStore.setState({ session });
});
