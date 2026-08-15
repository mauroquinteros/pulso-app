/**
 * When a session boundary means a *different Perfil*, and when it means nothing
 * at all. Pure in the same sense as the sign-in reducer: it imports nothing
 * async, so a rule that only ever runs inside an auth callback can be tested by
 * handing it sessions.
 *
 * It exists because the rule cannot be spelled two ways that both look right:
 *
 * - Not by event name. That means enumerating every event that ends a session
 *   and silently missing the one nobody thought of - which is the bug this
 *   replaces, where only the "Cerrar sesion" button cleared anything.
 * - Not by session object. `TOKEN_REFRESHED` hands back a *new* object carrying
 *   the *same* user every time it fires, so an identity comparison would throw
 *   the History away every few minutes and read it again.
 *
 * What is left is the id: it changes when, and only when, the Perfil on this
 * phone is no longer the one whose data is in memory - a button press, an
 * expired refresh token, a revocation server-side, or a sign-out performed on
 * another device, alike.
 */

import type { Session } from "@supabase/supabase-js";

/**
 * Which Perfil a session belongs to, or `null` for none.
 *
 * `null` rather than `undefined` because there is only one thing to say here -
 * *nobody* - and the session store's three-valued `undefined` ("not yet known")
 * has no counterpart in this module: the listener is handed a definite `Session`
 * or a definite `null`, never the window before the answer exists.
 */
export function perfilIdOf(session: Session | null): string | null {
  return session?.user.id ?? null;
}

/**
 * Has the Perfil changed since the last event? Signing out, signing in as
 * someone else, and signing out then in as the same Perfil all answer yes;
 * a token refresh answers no.
 */
export function perfilChanged(previousPerfilId: string | null, session: Session | null): boolean {
  return perfilIdOf(session) !== previousPerfilId;
}
