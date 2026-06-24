# Exact gradients via a gradient library

## Parent

[PRD: Home Screen — Surface the Portfolio Engine Values](../PRD.md)

## What to build

Add `expo-linear-gradient` and replace the two solid-color approximations with the
design's real gradients: the **worth-card** surface (165° between the two deep-blue
card stops) and the **avatar** disc (135° teal). Reuse the existing color tokens as
the gradient stops; nothing else on the screen changes.

## Acceptance criteria

- [ ] `expo-linear-gradient` is added via the Expo installer.
- [ ] The worth-card background renders the 165° gradient between its two card-surface stops.
- [ ] The avatar disc renders the 135° teal gradient.
- [ ] The solid-color approximations are removed where the gradient now applies; the rest of the screen is unchanged.
- [ ] `tsc` and lint pass.

## Blocked by

Issue 01 (Extract & test the Home view-model) — both touch `WorthCard` and the header; land 01 first to avoid edit conflicts.
