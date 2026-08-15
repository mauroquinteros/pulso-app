import { useMovementsStore } from "@/stores/movements";

/**
 * Empties every store whose contents belong to a Perfil.
 *
 * Stores are module-level, so they outlive the screens that read them. Lend
 * your phone, sign out, let someone sign in as themselves: the guard flips,
 * `(tabs)` mounts, and their first screen is *your* Total Portfolio Value and
 * *your* holdings. CONTEXT.md says two Perfiles share nothing and that "nothing
 * in the app reconciles them" - a store that survives sign-out reconciles them
 * by accident.
 *
 * One function rather than a call per store at each call site, so the next
 * Perfil-scoped store has an obvious place to be added.
 *
 * Emptying the movements is not enough on its own: the History's status has to
 * go back to `unread` with them. The only rule that starts a read is "if the
 * History is `unread`, read it", so a store left on `ready` would land the next
 * Perfil on an empty portfolio that no read ever fires for - their own History
 * sitting in Postgres, unasked for.
 */
export function clearPerfilScopedState() {
  useMovementsStore.getState().forgetHistory();
}
