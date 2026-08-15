import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { clearPerfilScopedState } from "@/stores/perfil-scoped-state";
import { perfilChanged, perfilIdOf } from "@/utils/perfil-change";

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

/**
 * Which Perfil the last event was for. Module scope, beside the only code that
 * reads or writes it: it is not app state - nothing renders from it, and it must
 * survive the screens that come and go - so putting it in the store would give
 * the store a second writer for a fact no screen wants.
 */
let signedInPerfilId: string | null = null;

// The store's only writer. `onAuthStateChange` fires `INITIAL_SESSION` once the
// client has finished reading storage - with the session or with `null` - which
// is what moves `session` off `undefined` on cold start. Sign-in, sign-out and
// token refresh all arrive through this same callback.
supabase.auth.onAuthStateChange((_event, session) => {
  // Which is why the Perfil's data is emptied here rather than in the "Cerrar
  // sesion" handler that used to do it. That handler cleared a *button press*;
  // this clears the *fact*, so an expired refresh token, a revocation
  // server-side and a sign-out on another device empty the stores too, and no
  // sign-out path added later can forget to. See `utils/perfil-change.ts` for
  // why the id is what is compared.
  //
  // Before the mirror is updated, so that the guard in `app/_layout.tsx` never
  // swaps the tree while the previous Perfil's Movements are still in memory.
  if (perfilChanged(signedInPerfilId, session)) clearPerfilScopedState();
  signedInPerfilId = perfilIdOf(session);

  useSessionStore.setState({ session });
});
