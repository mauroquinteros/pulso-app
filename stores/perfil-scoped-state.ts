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
 * Empty, not back to `MOCK_MOVEMENTS`: the seed only happens when the store is
 * created, so signing out and back in walks into the first-run wall - no
 * movements and no Cash. That is the real behaviour arriving early, not a
 * regression, and fixing it is a different piece of work.
 */
export function clearPerfilScopedState() {
  useMovementsStore.setState({ movements: [] });
}
