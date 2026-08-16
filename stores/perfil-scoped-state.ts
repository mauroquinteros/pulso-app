import { useMovementsStore } from "@/stores/movements";
import { useStocksStore } from "@/stores/stocks";

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

  // The Stocks go too - for freshness, not for privacy, and the distinction has
  // to be said out loud or the next reader concludes a Quote is Perfil-scoped
  // and one day adds an owner filter to a shared table. A Stock is shared and
  // owned by nobody: the next Perfil learning that AAPL trades at $198 learns
  // nothing whatever about the previous one, so nothing leaks by keeping them.
  //
  // They are dropped anyway because of what a *kept* Quote would mean in a
  // session whose own read fails: it would be valued as current with nothing
  // able to say otherwise, collapsing "could not be obtained" into "here is your
  // Market Value" at the one moment the difference matters (ADR 0011). So this
  // function no longer means "clear the stores" - it means "clear the
  // Perfil-scoped stores, and the Stocks besides".
  useStocksStore.getState().forgetStocks();
}
