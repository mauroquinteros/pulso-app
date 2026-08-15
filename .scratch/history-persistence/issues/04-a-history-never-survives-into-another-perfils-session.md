# 04 - A History never survives into another Perfil's session

Type: **AFK** - the fix and its reasoning are settled; verification is manual but needs no
decision.

## Parent

`.scratch/history-persistence/PRD.md`

## What to build

Clearing a **Perfil**'s data moves from a button to an event, so that every way a session can end
clears it.

Today `clearPerfilScopedState` is called from exactly one place: the "Cerrar sesión" handler in
Ajustes. It is wired to a **button**, not to the **fact**. Any other way a session ends - an
expired refresh token, a token revoked server-side, a sign-out performed on another device -
drops the guard and unmounts the tabs while leaving the store fully populated.

Once issue 02 lands, that is a cross-Perfil data leak. The store holds Perfil A's real
**History** with a status of `ready`; Perfil B signs in, the gate sees `ready`, **no read fires**,
and Perfil B is looking at A's **Movements**, **Efectivo** and holdings. CONTEXT.md states flatly
that two Perfiles "share nothing" and that "nothing in the app reconciles them" - a store that
survives a session boundary reconciles them by accident. This is precisely the scenario
`clearPerfilScopedState`'s own documentation warns about, arriving through a door the guard does
not cover.

**The fix.** Clearing moves into the `onAuthStateChange` listener that already declares itself
the session store's *only writer* - the one place that observes every way a session begins or
ends. It is keyed on **the user id changing**, not on an event name: a name-based check has to
enumerate the events correctly and silently misses any it forgets, while an id comparison covers
a button press, an expiry, a server-side revocation and another device's sign-out alike. Note
that a token refresh hands back a *new session object for the same user*, so the comparison must
be on the id and never on object identity, or every refresh would wipe the History.

The Ajustes handler stops calling it. No future sign-out path can forget to.

**Clearing must reset the History status to `unread`, not merely empty the movements.** Leaving
it at `ready` is the actual mechanism of the leak: the next Perfil arrives, the gate sees a
History it believes is in hand, and never reads. Emptying the array alone would show Perfil B a
`ready` empty portfolio and never fetch their real one - a different bug, equally silent.

## Acceptance criteria

- [x] Perfil-scoped clearing happens in the auth listener, keyed on the user id changing
- [x] The Ajustes sign-out handler no longer calls it directly, and signing out through the
      button still clears everything
- [x] Clearing empties the movements **and** returns the History status to `unread`
- [x] A token refresh - a new session object carrying the same user id - clears nothing and
      triggers no read
- [x] After any session ends, signing in as a different Perfil fetches that Perfil's own History
      rather than reusing what was in memory
- [x] Verified by hand: sign in as A, end the session **without** the Ajustes button (expire or
      revoke the token), sign in as B, and confirm B sees their own History and never A's
- [x] The existing Perfil-scoped-state tests are extended to cover the status reset
- [x] `npx tsc --noEmit` and the full test suite pass

## Blocked by

- `.scratch/history-persistence/issues/02-the-history-is-read-from-its-three-tables.md`

## Closed

Verified on a device by the signal that distinguishes the fix from the bug: after signing out
and back in, a **fresh `read ok` line appears in the log**. That line only exists if the status
was returned to `unread`, and the status is only returned to `unread` if the clearing ran. Had
the leak still been present the status would have stayed `ready`, no read would have fired, and
the previous Perfil's History would have been served to whoever signed in next.

The button path is a real test of the listener now, not a bypass of it: `clearPerfilScopedState`
was removed from the Ajustes handler, so signing out through the button reaches the same code as
an expired token, a revocation server-side, or a sign-out performed on another device.

The rule is keyed on the Perfil id changing rather than on the event name or the session object.
`TOKEN_REFRESHED` hands back a new object carrying the same user every time it fires, so an
identity comparison would have thrown the History away every few minutes - which the tests pin
down explicitly.
