# 05 - "Cerrar sesión" actually ends the session

Type: **AFK**

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

The Ajustes screen already has a "Cerrar sesión" button that confirms with a
native alert and then does nothing, because when it was built there was no session
to close and no screen to land on. Both exist now. Wire it up.

**Signing out needs no navigation code.** `signOut()` flips the session to null,
the listener updates the mirror, the route guard inverts, and Expo Router clears
the history itself. The "suture point" the Ajustes PRD left open closes on its
own.

**Scope is local, not global.** Closing the session on this phone should not kill
it on another device.

**It must work with no connection.** The network call can fail; the local session
goes anyway. A user handing their phone over on a plane still gets signed out.

**The same handler tears down Perfil-scoped state.** One named function -
something like `clearPerfilScopedState()`, with a comment saying why - empties
every store whose contents belong to a **Perfil**. Today that is the movements
store, reset to empty. Every future Perfil-scoped store is added to that one
function rather than scattered across call sites.

The scenario that forces it: you lend someone your phone, tap "Cerrar sesión",
they tap "Continuar con Google" and sign in as themselves. The guard flips,
the tabs mount - but the movements store is **module-level** and sign-out never
touched it, so their first screen is *your* **Total Portfolio Value** and *your*
holdings, until a refetch happens to replace it. `CONTEXT.md` forbids this in so
many words: "separate **Movements**, separate holdings, separate **Total
Portfolio Value**. Neither can see the other, and nothing in the app reconciles
them." A store that survives sign-out reconciles them by accident.

**Expect an empty portfolio after signing back in, and do not "fix" it.** The
movements store is seeded with `MOCK_MOVEMENTS` only at creation, so once cleared
it stays empty. Signing out and back in therefore walks straight into the
first-run wall - a new **Perfil** has zero movements *and* zero **Cash**, and the
buy form gates on `total <= Cash`. That is the real behaviour arriving early, not
a regression. Fixing it is a different piece of work.

**Registered constraint for whoever caches movements later:** a store persisted
with zustand's `persist` middleware has **one storage key**, shared across
Perfiles on the same device. That is no longer a flash in memory - it is one
Perfil's movements written to disk and rehydrated on another's next cold start.
Nothing to fix here; the cache does not exist yet. It must not be built naively.

## Acceptance criteria

- [ ] Confirming "Cerrar sesión" ends the session and lands on the sign-in screen
- [ ] No navigation call is written to get there
- [ ] Cancelling the confirmation alert leaves the session untouched
- [ ] Sign-out uses local scope, not global
- [ ] Sign-out completes with no network connection
- [ ] Signing out empties the movements store through one named teardown function that says why it exists
- [ ] Signing out and signing in as a **different** Google account shows an empty portfolio - never the previous account's holdings, not even for a frame
- [ ] Swiping back after signing out does not return to the tabs
- [ ] `npm test`, `tsc` and `eslint` are green

## Blocked by

- `02-real-session-from-google-sign-in.md`
