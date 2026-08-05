# Pulso brand assets

The mark is **Latido**: an EKG reduced to one asymmetric beat between two
flatlines. Ink `#04211E` beat on a teal `#00E5CC` disc.

## Files

| File | What | When |
| --- | --- | --- |
| `mark.svg` | Teal disc + ink beat (the one construction) | Everywhere: sign-in disc, app icon source, light or dark grounds |
| `beat.svg` | Naked teal beat, no disc | Dark grounds only (`#04211E` or darker) |
| `dot.svg` | Plain teal disc | Below 24px, where the beat cannot resolve |

All three share the same `viewBox="0 0 100 100"`. SVG is resolution
independent, so one file covers every size - render `mark.svg` at 64pt for the
sign-in disc, or 60/40/29px for icon contexts, by setting width/height at the
point of use. No per-size copies needed.

## Geometry

- Disc: `circle cx=50 cy=50 r=50`
- Beat: `M10 50 H30 L41 26 L55 70 L63 50 H90`, stroke-width 10, round caps and joins

## Rules

- **One construction.** Teal disc + ink beat. Never outlined, never recolored,
  never the ink beat on its own.
- **Clear space.** Keep one beat-height (the spike, 44 units = 44% of the mark)
  of empty space around the mark.
- **Minimum size.** 24px for `mark.svg`. Below that, use `dot.svg`.
- **Wordmark.** "pulso", Manrope ExtraBold, lowercase, -3% tracking. Mark to
  the left of the word, gap equal to the width of the letter "o".
