# Tech-debt backlog

Deferred, cross-cutting findings (not tied to one feature). Surfaced during the
2026-07 full-codebase review. Bugs get fixed on their own branches; these are
larger or design-sensitive and wait for a deliberate pass.

---

## Efectivo and Otros are near-identical colors in the same donut

**Type:** bug (minor) · **Status:** backlog · **Raised:** 2026-07-18

**Problem.** The two reserved segment colors are `investedBar #5B63A0` (91,99,160)
and `textMuted #5A6080` (90,96,128) — the same desaturated blue-purple, apart
only in the blue channel. Both render in the same donut whenever there are 6+
priced holdings and positive cash, so Efectivo and Otros are hard to tell apart
in the ring and in the legend.

Same class as the palette-wrap bug (fixed 2026-07-18), but milder: these two are
distinguishable-ish and always sit at the end of the ring. Worth a pass when
someone next touches the donut palette.

**Constraint.** The ring already leans blue/purple (periwinkle, lavender, plus
these two). Whatever replaces one of them should move away from that family.

---

## Ordering belongs to the backend, not the view-models

**Type:** refactor · **Status:** backlog (blocked on backend) · **Raised:** 2026-07-18

**Problem.** `buildPortfolioView` sorts holdings by Market Value desc client
side. Once a real backend lands (`hooks/use-portfolio.ts` is the intended swap
point, today on `MOCK_PRICES`), ordering should come down with the data. If the
backend ever paginates, sorting client side becomes actively wrong — it would
order only the current page and present it as a ranking.

**Not urgent, and now safe to defer:** the reason this was entangled with the
badge bug is gone. Colors no longer derive from row position, so the backend can
change the order freely without any visual churn.

**Open question for when this lands:** presentation order is not purely a
backend concern — a donut wants biggest-first, a "recent movements" list wants
chronological. Decide whether the API grows per-screen ordering params (leaks
presentation into the API) or the client keeps a thin presentation sort.

---

## Define and adopt a type scale (font-size sprawl)

**Type:** design-system / refactor · **Status:** backlog · **Raised:** 2026-07-18

**Problem.** 129 hardcoded `fontSize` declarations across ~all components use
**17 distinct sizes** with no defined scale. The small range is the worst: the
six consecutive integers **11, 12, 13, 14, 15, 16 are all used heavily** (96 of
129 = 74%), and the difference between adjacent steps (12 vs 13, 14 vs 15) is
imperceptible. Plus one-off display sizes (10, 17, 21, 27, 32, 36, 40).

**Not the issue:** odd sizes like 11px are *not* the problem — iOS/Apple HIG
uses 11/13/15/17. The issue is the absence of a scale, not parity.

**Also fixes dead code.** `constants/typography.ts` already defines tokens
(`heroValue`, `sectionHeader`, `cardTitle`, `body`, `label`, ...) but only
`tabLabel` is consumed — every component hardcodes `fontSize` instead. A real
scale belongs there, which also resolves that unused-tokens finding.

**Approach (when picked up).**
1. Define a token scale in `constants/typography.ts` (e.g. collapse 11-16 to
   ~3 steps + a fixed set of display sizes). Choose the scale deliberately
   (iOS-like 11/13/15/17, or a 4pt-based set) with the user.
2. Snap the 129 sites to the tokens, screen by screen.
3. Verify visually per screen (changing sizes shifts layouts) + `tsc`.

**Scope warning:** cross-cutting, touches nearly every component, layout-
sensitive. Deliberate task with visual verification, NOT a drive-by edit.

---

## A failed History read is a dead end - no way to sign out

**Type:** UX / recoverability · **Status:** backlog · **Raised:** 2026-08-14

**Problem.** `RequireHistory` renders the failure screen *instead of* `<Tabs>`,
so a failed read takes the whole tab navigator off screen - including **Ajustes**,
which holds the only "Cerrar sesión" in the app. The only control left is
**Reintentar**.

For a transient failure that is correct and enough: airplane mode, tap Reintentar
once connectivity is back, done (observed working on 2026-08-14). For a
**persistent** one it is a trap. A revoked or malformed session, a broken RLS
policy or a project outage all produce a read that keeps failing, and the one
action that would fix a session problem - signing out and back in - is
unreachable. The escape is deleting and reinstalling the app.

**Why it is plausible rather than theoretical.** The leading hypothesis for the
intermittent failure seen on 2026-08-14 is a **401 during the sign-out then
sign-in transition**. If that is right, the failure mode most likely to recur is
precisely the one whose only remedy sits behind the screen it hides.

**Approach (when picked up).**
1. Add a secondary, quiet **Cerrar sesión** action to the failure screen - text
   button under **Reintentar**, not a second gradient pill competing with it.
2. It must not import the Ajustes screen: lift `signOut` into a module both can
   call, or the failure screen pulls a whole tab in behind it.
3. Consider whether a `401` in `HistoryFailure` should end the session by itself
   rather than offer the button - decide once the logging from `readHistory`
   shows whether 401 is actually what happens.

**Raised during:** issue 02 of `history-persistence`, flagged twice before
proceeding to issue 03. Deliberately not fixed there - it is recoverability, not
the read path.
