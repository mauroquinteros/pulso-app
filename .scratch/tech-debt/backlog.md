# Tech-debt backlog

Deferred, cross-cutting findings (not tied to one feature). Surfaced during the
2026-07 full-codebase review. Bugs get fixed on their own branches; these are
larger or design-sensitive and wait for a deliberate pass.

---

## Donut: the palette wraps before the segment cap, so two slices share a color

**Type:** bug · **Status:** backlog · **Raised:** 2026-07-18

**Problem.** `HoldingBadgePalette` has **4** entries and `segmentColor` wraps
with `colorIndex % 4` (`components/portfolio/donut.tsx`). But the donut draws up
to **6** holding segments (`MAX_HOLDING_SEGMENTS = 6`):

- 5-6 priced holdings -> no grouping, indices 0..5. The 5th wraps onto color 0,
  the 6th onto color 1.
- 7+ priced holdings -> grouped into the top 5, indices 0..4. The 5th wraps
  onto color 0.

So from **5 priced holdings on**, two slices render the same color and the
legend shows two rows with the same swatch. In the donut the color IS the only
key tying a slice to its legend row, so this destroys the mapping the legend
exists to provide. (`cash` and `others` use reserved colors and are unaffected.)

**Fix.** The palette needs at least 6 entries, keeping them distinguishable at
the ~10px swatch size and on the dark surface. Picking 2 more colors that hold
up against the existing 4 is a design call, not a mechanical edit.

**Note.** The badge-color divergence between screens was a *separate* problem,
fixed by collapsing every holding badge to the single `HoldingBadge` tint. The
donut deliberately kept its per-segment colors — there color encodes, it does
not decorate.

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
