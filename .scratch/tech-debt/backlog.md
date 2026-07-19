# Tech-debt backlog

Deferred, cross-cutting findings (not tied to one feature). Surfaced during the
2026-07 full-codebase review. Bugs get fixed on their own branches; these are
larger or design-sensitive and wait for a deliberate pass.

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
