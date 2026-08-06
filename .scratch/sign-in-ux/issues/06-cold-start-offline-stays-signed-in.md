# 06 - Cold start in airplane mode stays signed in

Type: **HITL** - a human has to toggle airplane mode and cold-start a real
build. If the check fails, the fix is a design decision, not a mechanical one.

## Parent

`.scratch/sign-in-ux/PRD.md`

## What to build

Probably nothing. That is the point.

**This is a verification, not a feature.** Staying signed in offline is the
*default* behaviour of the client configured in issue 02, and it costs zero
lines: `persistSession` writes the session to AsyncStorage, a cold start reads it
back with no network, and the access token is a JWT of roughly an hour that
nothing validates locally against the server. If the token is still fresh, the app
opens signed in offline without a single call. If it expired, the refresh attempt
fails, and the *correct* outcome is a retryable error that leaves the session
alone - `autoRefreshToken` plus the AppState listener retry on the next
foreground, which is exactly "update when the internet comes back", also without
writing anything.

The opposite behaviour - redirecting to sign-in when offline - is the option that
would **cost** code: you would have to detect the failed refresh and deliberately
destroy a session that is sitting right there, to produce the worst possible
outcome (a user stranded on a screen whose only button needs the network they do
not have).

**So the real question is not "what do we build" but "does the library take the
free behaviour away from us?"** There is a known trap where `startAutoRefresh()`
failing offline can wipe the stored session - a **network** failure being
conflated with a **revoked** token. Recent `auth-js` distinguishes a retryable
fetch error from an `invalid_grant`, so it may already be fixed in the installed
version. **This cannot be settled by reading the code. Only by trying it.**

If the check passes, close this issue with no diff and a note saying so.

If it fails, design the fix against the observed failure - not against a
remembered one - and keep it as small as the observation warrants.

**Honesty about what "signed in offline" buys today:** it gets the user past the
login, but until movements are cached the app has nothing to show. The offline
state is therefore **a signed-in user looking at an empty portfolio**. That is
still strictly better than being stranded on the sign-in screen, and it is
precisely the hole a movements cache is meant to fill later.

## Acceptance criteria

- [ ] With a valid saved session, enabling airplane mode and cold-starting the app lands on the tabs, not the sign-in screen
- [ ] The saved session survives the offline launch - it is not wiped by a failed refresh
- [ ] Returning to the foreground with connectivity restored refreshes the token with no user-visible error and no forced sign-in
- [ ] The result is recorded on this issue either way: passed with no code, or failed with the observed behaviour written down
- [ ] If a fix was needed, it is scoped to the observed failure and nothing more
- [ ] `npm test`, `tsc` and `eslint` are green

## Blocked by

- `02-real-session-from-google-sign-in.md`
