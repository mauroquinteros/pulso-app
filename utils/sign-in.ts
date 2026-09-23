/**
 * The sign-in screen's view-model. Pure: it imports nothing native and nothing
 * async, which is what the adapter seam in `lib/google-sign-in.ts` bought.
 *
 * There is no `pending` state here, because it would never render. The splash
 * holds until the session is known, so this screen's first paint already has the
 * answer.
 *
 * There is no success state either. A token arriving does not move this machine
 * anywhere - the session lands, the guard in `app/_layout.tsx` swaps the tree,
 * and the screen stops existing.
 */

/** Why a sign-in failed, as far as the screen needs to care. */
export type FailureReason = "offline" | "other";
export type SignInProvider = "apple" | "google";

export type SignInState =
  | { status: "idle" }
  | { status: "signing"; provider: SignInProvider }
  | { status: "failed"; message: string };

export type SignInEvent =
  | { type: "tapped"; provider: SignInProvider }
  | { type: "cancelled" }
  | { type: "failed"; reason: FailureReason };

/**
 * Two failures, two sentences. "Vuelve a intentar" in both, because both are
 * worth retrying; only the first line differs, and it differs because telling
 * someone to check their internet when the server is the problem sends them to
 * fix something that is not broken.
 */
export const SIGN_IN_ERRORS: Record<FailureReason, string> = {
  offline: "Sin conexión. Revisa tu internet y vuelve a intentar.",
  other: "No pudimos iniciar sesión. Vuelve a intentar.",
};

export const initialSignInState: SignInState = { status: "idle" };

export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case "tapped":
      // Never two sign-ins at once: a tap while the sheet is already up is
      // ignored. From `failed` this is also what clears the old message - the
      // screen must not show a stale error next to a running attempt.
      return state.status === "signing" ? state : { status: "signing", provider: event.provider };

    case "cancelled":
      // Backing out of the sheet is not an error. The human decided not to sign
      // in and already knows it; a message here would be the app narrating.
      return state.status === "signing" ? { status: "idle" } : state;

    case "failed":
      // Both outcomes are guarded on `signing` so that anything arriving outside
      // an attempt is a no-op rather than a state change. Nothing dispatches
      // these today except the handler that just started one, and that is the
      // point: the rule lives here, not in the caller's discipline.
      return state.status === "signing" ? { status: "failed", message: SIGN_IN_ERRORS[event.reason] } : state;
  }
}
