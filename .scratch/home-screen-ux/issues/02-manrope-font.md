# Load Manrope for exact typography

## Parent

[PRD: Home Screen — Surface the Portfolio Engine Values](../PRD.md)

## What to build

Load the **Manrope** font family across the app so text matches the design. The
prototype (`Pulso Home.dc.html`) specifies Manrope; the current build falls back to
the system font. Bundle Manrope, load it at the root before the UI renders, and map
the existing type scale to it at the weights the design uses (400–800).

## Acceptance criteria

- [ ] Manrope is bundled and loaded at app start; no flash of unstyled or missing text once loaded (splash held until fonts ready, consistent with Expo's font-loading pattern).
- [ ] The type scale (hero, section header, card title, body, label, badge) renders in Manrope at the design's weights.
- [ ] No layout/spacing regression on the Home screen.
- [ ] `tsc` and lint pass.

## Blocked by

None - can start immediately. Orthogonal to issue 01: this touches root layout and the typography tokens, not the view-model or component data flow.
