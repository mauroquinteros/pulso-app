# 03 - The símbolo field says what went wrong

Type: **AFK** - the copy is pinned word for word and the message slot already
exists for three other fields on this form.

## Parent

`.scratch/resolve-stock/PRD.md` (Part 2)

## What to build

After issue 01 a bad symbol silently refuses to open the save gate. The user is blocked and not
told why. This slice tells them.

**A red border, plus one line of Spanish** in the conditional slot the form already renders
under this exact field — the same slot that holds "Ingresa un símbolo." today, and the same
pattern **Monto comprado** and **Precio de ejecución** already use. It costs no layout, because
the slot occupies space only when there is something to say.

Two failure states, two strings:

| State | Message |
|---|---|
| `unknown` | `No encontramos ese símbolo.` |
| `unavailable` | `No pudimos verificar el símbolo. Vuelve a intentar.` |

### Why they are not the same string

They ask the user to do different things. `unknown` means *fix your typing*. `unavailable`
means *your typing is fine, try again*. A user on one bar of signal who types `AAPL` correctly
and is told the symbol was not found will delete it and retype it, over and over — the app
telling them the one thing on screen that is right is the thing that is wrong.

This is settled precedent in this codebase, not a new opinion: `SIGN_IN_ERRORS` splits its two
failures for the same reason, and its comment says so — *"telling someone to check their
internet when the server is the problem sends them to fix something that is not broken."*
Follow that file's voice: what happened, then what to do.

### Clearing, and retrying

The **first keystroke** clears the red border and the message. The user is already fixing the
value; the form should stop shouting about it. That falls out of the machine from issue 01 —
`edited` returns it to `unchecked` — so this slice only has to render it.

Retrying an `unavailable` symbol needs no button: blurring the field again re-checks it,
because no answer is on file. Retrying an `unknown` symbol deliberately does **not** re-check,
since the answer will not have changed; editing is the way out of that one.

Copy goes in the reducer's error record beside the states, not inline in the screen — same
shape as `SIGN_IN_ERRORS` — and it is asserted word for word in the reducer's tests, including
the guard against characters that only look like ASCII.

## Acceptance criteria

- [ ] `APPL` leaves the field red with "No encontramos ese símbolo." beneath it
- [ ] A failure to reach the provider leaves the field red with "No pudimos verificar el símbolo. Vuelve a intentar."
- [ ] The message renders in the form's existing conditional slot, and pushes nothing around when absent
- [ ] The first keystroke after a failure clears both the border and the message
- [ ] Blurring again after `unavailable` runs a new check; blurring again after `unknown` does not
- [ ] An empty, touched field still shows "Ingresa un símbolo." unchanged
- [ ] The two strings live in an error record beside the states, not inline in the screen
- [ ] The reducer tests assert both strings word for word, and that the copy holds no characters that merely look like ASCII
- [ ] `npm test` and `npm run lint` pass

## Blocked by

- `.scratch/resolve-stock/issues/01-blocked-save-until-symbol-confirms.md`

Independent of issue 02, but both touch the same render path - do not run them in parallel.
