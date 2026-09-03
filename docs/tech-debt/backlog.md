# Tech-debt backlog

Deferred, cross-cutting findings (not tied to one feature). Surfaced during the
2026-07 full-codebase review. Bugs get fixed on their own branches; these are
larger or design-sensitive and wait for a deliberate pass.

## Open items

Tick the box and set the entry's `Status:` in the same commit as the fix. `Status:`
carries the detail (`backlog`, `backlog (blocked on backend)`, `fixed - <date>, <where>`);
the box is the at-a-glance answer to "is this still true?".

- [ ] [A fully exited position disappears from the app](#a-fully-exited-position-disappears-from-the-app) - UX / feature gap
- [ ] [Efectivo and Otros are near-identical colors in the same donut](#efectivo-and-otros-are-near-identical-colors-in-the-same-donut) - bug (minor)
- [ ] [Ordering belongs to the backend, not the view-models](#ordering-belongs-to-the-backend-not-the-view-models) - refactor, blocked on backend
- [ ] [Define and adopt a type scale (font-size sprawl)](#define-and-adopt-a-type-scale-font-size-sprawl) - design-system / refactor
- [ ] [A failed History read is a dead end - no way to sign out](#a-failed-history-read-is-a-dead-end---no-way-to-sign-out) - UX / recoverability
- [ ] [`round2` and `formatUSD` disagree on an exact half-cent](#round2-and-formatusd-disagree-on-an-exact-half-cent-and-there-are-six-round2s) - bug (minor)
- [x] [Stock detail prints Comisiones unsigned](#stock-detail-prints-comisiones-unsigned-so-a-subtracted-fee-reads-as-added) - bug (minor, presentation)
- [ ] [The save lifecycle is copied per form](#the-save-lifecycle-is-copied-per-form-and-each-copy-carries-adr-0010) - design (duplication, correctness-sensitive)
- [ ] [The sign-in button is painted with the divider token](#the-sign-in-button-is-painted-with-the-divider-token) - design (visual hierarchy)

---

## A fully exited position disappears from the app

**Type:** UX / feature gap · **Status:** backlog · **Raised:** 2026-08-22

**Problem.** Selling a whole holding drives its share count to 0, and the engine filters
holdings on `shares > 0` - so a fully exited ticker stops being a **Holding**. It leaves
**Mis Activos** on Inicio and Portafolio, and since those two rows are the only routes to
`/stock/[ticker]`, its detail screen becomes unreachable. Its **Realized P&L** still counts,
folded into the portfolio total, but with no per-stock row to attribute it to. Its buys and
sells remain in **Movimientos**, each still opening its own receipt.

Not a rendering fault: `buildStockDetailView` returns `not-found` for an absent ticker and
the screen says "No encontramos esta acción", but nothing can navigate there. The stock
simply ceases to exist anywhere in the app.

**Why it is worth fixing eventually.** `CONTEXT.md` defines **Total Return of a stock** as
the four-component formula "counting every movement ever recorded for that ticker" - it
answers "how has this stock done for me", as against **Net P&L**'s "how is the position I
still hold doing". It even reasons about exits ("exit fully and the denominator is zero").
So the domain treats a closed position as a first-class thing, while the app makes it
unreachable at the moment the question is most natural: right after closing it.

**Why it was deferred.** Raised and accepted during the sell slice, which is what made full
exits reachable in the first place. The `shares > 0` filter is load-bearing far beyond this
screen - **Cost Basis**, **Market Value**, the allocation percentages and Inicio's donut all
assume `holdings` means *open positions* - so letting closed ones in means answering what a
0-share row does to each. That is a feature with its own design, not a line in a persistence
slice.

**Approach (when picked up).** Prefer leaving `holdings` alone. Give closed positions their
own route instead, reachable from a "vendidas" section or from a sell's receipt, and let the
detail screen render from movements when there is no holding behind the ticker. Decide then
what a closed position's card shows - **Total Return of a stock** is the figure it exists for,
and per `CONTEXT.md` it carries no percentage.

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

---

## `round2` and `formatUSD` disagree on an exact half-cent, and there are six `round2`s

**Type:** bug (minor) · **Status:** backlog · **Raised:** 2026-08-17

**Problem.** `round2` is `Math.round(n * 100) / 100`, and `Math.round` sends a tie
toward **+Infinity** — so `round2(-447.865)` is `-447.86`. The display path rounds the
other way: the movements list and the stock detail both call
`formatUSD(Math.abs(cashImpact(m)))`, and taking the absolute value first lets `Intl`
round the tie **away from zero**, giving `$447.87`. A movement whose Cash Impact lands
on an exact half-cent therefore prints one cent more in the list than it moves in the
balance the list is meant to explain.

Reachable with fractional shares: a buy of 4.47865 shares at $100.00 costs exactly
$447.865. Pre-existing and not introduced by the per-movement rounding in `computeCash`
(2026-08-17), which fixed the *accumulating* residue and the `-0` but leaves ties alone.

**Also.** `round2` is defined identically in six files — `utils/portfolio/cash.ts`,
`valuation.ts`, `reducer.ts`, `components/movement-detail/view-model.ts`,
`components/stock-detail/view-model.ts`, and again in two test files. Only the `cash.ts`
copy normalises anything. So `netContributions` (shown as **Aportado**), `costBasis` and
the rest can each still yield `-0` and render as `-$0.00`, by exactly the route Cash
used to. Fixing the tie in one copy and not the others would make the inconsistency
worse rather than better.

**Why deferred.** The fix is one shared helper that rounds halves away from zero *and*
normalises `-0`, applied in all six places — which changes derived figures across the
engine and wants its own branch and a pass over the reconciliation corpus. Not worth
blocking the Compra form on.

**Where to start.** `utils/portfolio/cash.ts` has the reasoning in its `computeCash`
doc comment, and `docs/adr/0012-a-buy-total-is-derived-from-its-shares.md` explains why
a buy may overdraw by under half a cent in the first place.

---

## Stock detail prints Comisiones unsigned, so a subtracted fee reads as added

**Type:** bug (minor, presentation) · **Status:** fixed - 2026-08-28, `buildReturnBlock` · **Raised:** 2026-08-18

**Problem.** The per-ticker return block formats its four components inconsistently.
`netPnl` and `realized` go through `formatSignedUSD`, but `dividends` and `fees` go
through plain `formatUSD` — so a commission renders as **`$0.15`**, with no sign and
no tone, directly above a **Retorno total** that has subtracted it.

Nothing is miscalculated. `buildReturnBlock` computes
`netPnl + realizedPnl + totalDividends - totalFees`, which is `CONTEXT.md`'s
definition of **Total Return of a stock**, and a fee erodes it by its full amount.

It misleads only when the return is **negative**, which is exactly when it matters:
subtracting a fee from a loss makes the loss larger, so the total moves *away* from
the P&L figure while the fee beside it looks additive. Observed on META — P&L
-$50.22, Comisiones $0.15, Retorno total -$50.37 — and read as "the commission was
added, it should be -$50.07". It is not: -$50.07 would require the fee to *improve*
the return.

**Inconsistent with Inicio**, which already solved this: its own breakdown negates the
figure and signs it (`{ label: "Comisiones", amount: -totalReturn.totalFees }` through
`formatSignedUSD`), rendering **-$10.30** in red. The two screens show the same concept
two ways.

**Fix.** Sign the fee on the stock detail the way Inicio does, and decide whether
`dividends` should be signed too — the implicit rule seems to be "components with a
fixed direction go unsigned", which is what breaks down here. Both are one-line changes
in `buildReturnBlock` plus its tests; the reason it is filed rather than fixed inline is
that it is a copy decision touching a second screen, not a defect in this slice.

**Where to look.** `components/stock-detail/view-model.ts` (`buildReturnBlock`) beside
`components/home/view-model.ts` (the `Comisiones` row).

**Fixed 2026-08-28.** `fees` now goes through `formatSignedUSD(-totalFees)` and
`dividends` through `formatSignedUSD` — every component is signed, as on Inicio, so the
rows visibly add up to the total. The open question ("should dividends be signed too?")
resolved yes: the same pass renamed the block's total from **Retorno total** to
**Rendimiento total**, making it structurally identical to Inicio's breakdown, which
signs all four. The "components with a fixed direction go unsigned" rule is gone, not
patched. Landed alongside the stock detail's label alignment (`P&L no realizada` ->
`No realizado`), which is why the cross-screen copy decision this entry was waiting for
finally had an owner.

---

## The save lifecycle is copied per form, and each copy carries ADR 0010

**Type:** design (duplication, correctness-sensitive) · **Status:** backlog · **Raised:** 2026-08-21

**Problem.** Every form that writes to Postgres holds its own copy of the same save
block: the `deps` in `useState`, `saving`, `saveFailed`, the `if (!canSave || saving)`
guard, the awaited `saveMovement`, the failure branch that leaves every field as typed,
`movementSaved(answer.movement)`, the haptic, and `router.dismissTo("/")`. The copies in
`form.tsx` (Depósito) and `buy.tsx` (Compra) differ in **one expression** — which
`build*Movement` is called. Dividendo makes a third; Venta and Retiro will make five.

**Why it is not ordinary duplication.** That block is where ADR 0010 lives. Three of its
lines are load-bearing and none of them looks it:

- `useState(defaultMovementDeps)` mints the id **once per form session, not per tap**.
  This is the whole of the retry-safety story: a second tap after a lost response carries
  the first attempt's id, so Postgres refuses the duplicate rather than recording the
  movement twice. Move it inside the handler in one copy and that copy silently
  double-writes on retry — no error, no warning, a doubled **Cost Basis** or **Aportado**.
- Nothing is written optimistically, and the Movement that joins the store is built from
  the row the database returned, never the one the form built. A copy that appends its
  own object gets `createdAt` from the phone's clock and breaks the reducer's tiebreaker.
- `saving` is deliberately **not** reset on success, so the button stays inert while the
  form dismisses.

So the risk is not that the copies are tedious. It is that they can diverge in ways that
produce a wrong **History** with nothing on screen saying so, which is the exact failure
class ADR 0010 exists to prevent. Five copies is five places that have to stay right.

**Fix.** One `useMovementSave()` hook returning `{ saving, saveFailed, save }`, taking the
builder as its argument. Each screen keeps what is genuinely its own — its gates, its
fields, and its error sentence ("No pudimos guardar tu compra" vs "...tu dividendo").
Land it as its own commit with Depósito and Compra converted and no behavior change, so
that a regression in a working form is attributable to the commit that caused it rather
than hidden inside a feature slice.

**Why deferred.** Raised while planning the Dividendo persistence slice, and deferred so
that slice touches no working form. The trigger is the next form after it: converting two
screens is cheap, converting four is the cost of waiting.

**Prior record.** The intention was written down once, inside
`.scratch/buy-movement/issues/02-a-compra-is-written-to-postgres.md` — *"the third form
to need it is where a shared module earns its place"* — and then closed with the issue,
which is why nobody could find it. This entry replaces that as the standing record.

**Where to look.** `app/add-movement/form.tsx` and `app/add-movement/buy.tsx` (the two
copies today), `components/add-movement/movement-deps.ts`, and
`docs/adr/0010-a-movement-is-saved-only-when-the-database-says-so.md`.

---

## The sign-in button is painted with the divider token

**Type:** design (visual hierarchy) · **Status:** backlog · **Raised:** 2026-08-31

**Problem.** `app/(auth)/sign-in.tsx` fills its "Continuar con Google" button with
`Colors.border` (`#1C224D`). That token is the app's **divider** colour: of the eight
`backgroundColor: Colors.border` in the codebase, the other seven are all on elements
with `height: 1`. So the only primary CTA on the only unauthenticated screen is painted
in the colour reserved for 1px hairlines.

It measures **1.25:1** against the screen behind it (`#0A0E27`). For scale, the
"Entra a Pulso" title above it is 19.00:1. A button at 1.25:1 barely reads as an object,
which is what makes the screen look unfinished.

It is also the app's only primary CTA that is not teal - `Reintentar`, `Agregar
movimiento` and `Guardar movimiento` all are.

**Why it was deferred.** Both official replacements were built and looked at on device
on 2026-08-31, and both were rejected:

- **Google light** (`#FFFFFF` / stroke `#747775` / text `#1F1F1F`): fills 19.00:1, the
  same as the title, and the pill competed with the headline. "El blanco esta muy fuerte."
- **Google dark** (`#131314` / stroke `#8E918F` / text `#E3E3E3`): fill 1.02:1 by design
  with the 1px stroke drawing the button at 5.97:1. Also rejected on sight.

So the remaining move is not a colour swap - it is a rethink of what this screen's one
action should look like, which is a design task rather than a token fix.

**Constraint for whoever picks it up.** The obvious answer, the app's teal, is not
available: Google's Sign in with Google branding permits only white, light-grey or black
surfaces and forbids custom colours. The three official variants are the ones listed
above. Anything else means not presenting it as a Google button.

**Already true regardless.** The press state was rebuilt during the same pass and kept:
8% white state layer over the base, no longer a `scale 0.97`. If the surface colour ever
changes, that layer changes with it - Material puts the layer in white over dark
surfaces and black over light, so it is derived from the fill, never independent of it.
