# 04 - The Perfil comes from the session

Type: **AFK**

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

Make the two places that already show a **Perfil** show the *real* one.

Today both read `MOCK_PROFILE`: the Ajustes screen prints a hardcoded name and
email, and the Home avatar disc derives its initials from that same fiction. After
this slice they read the signed-in session, and the app stops lying about who is
using it.

**Derive, do not store.** A single function turns a session into `{ name, email }`
by reading `session.user`. Nothing is written anywhere and no `profile` field is
added to the session store - that would be a second copy of a fact the JWT already
owns. This is the same rule `initialsFrom` already follows one level down:
initials are computed at display time and never stored.

**The Perfil lives in `user_metadata`.** There is no `profiles` table and no
database trigger - the classic fragile point ("user created but profiles row
missing") is avoided by not having the row. Google populates the name itself on
first sign-in. Migrating to a table later is additive, because the two consumers
stay isolated in two files.

**Never put anything trusted in `user_metadata`.** It is client-writable via
`updateUser({ data })`. Harmless for a display name; roles, permissions or
allowlists would have to live in a table behind RLS.

**A missing name must not crash.** If the provider returns no name, `initialsFrom("")`
already returns `""` without exploding, so the failure mode is a blank avatar
disc - ugly, not fatal. The "¿Cómo te llamas?" screen that would fix it properly
is deferred and out of scope here.

**`MOCK_PROFILE` loses both of its consumers in this slice, so it goes.** This
change is what orphans it. `MOCK_MOVEMENTS` stays - it still seeds the movements
store, which this slice does not touch.

This is the cheapest possible proof the JWT is real: a real name and a real email
appearing on two screens that already exist, with no new UI built to show them.

## Acceptance criteria

- [ ] Ajustes shows the signed-in account's real full name and real email
- [ ] The Home avatar disc shows initials derived from that same name
- [ ] The name is derived from the session at display time and stored nowhere
- [ ] The session store gains no `profile` field
- [ ] No `profiles` table and no trigger are created
- [ ] Signing in with a different Google account changes both screens with no other action
- [ ] An account with no name renders a blank avatar disc and does not crash
- [ ] `MOCK_PROFILE` is removed, and `MOCK_MOVEMENTS` is left untouched
- [ ] `npm test`, `tsc` and `eslint` are green

## Blocked by

- `02-real-session-from-google-sign-in.md`
