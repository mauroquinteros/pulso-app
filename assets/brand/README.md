# Pulso brand assets

The mark is **Latido**: an EKG reduced to one asymmetric beat between two
flatlines. Ink `#04211E` beat on a teal `#00E5CC` disc.

## Files

| File       | What                                        | When                                                             |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------- |
| `mark.svg` | Teal disc + ink beat (the one construction) | Everywhere: sign-in disc, app icon source, light or dark grounds |
| `beat.svg` | Naked teal beat, no disc                    | Dark grounds only (`#04211E` or darker)                          |
| `dot.svg`  | Plain teal disc                             | Below 24px, where the beat cannot resolve                        |

All three share the same `viewBox="0 0 100 100"`. SVG is resolution
independent, so one file covers every size - render `mark.svg` at 64pt for the
sign-in disc, or 60/40/29px for icon contexts, by setting width/height at the
point of use. No per-size copies needed.

## Geometry

- Disc: `circle cx=50 cy=50 r=50`
- Beat: `M10 50 H30 L41 26 L55 70 L63 50 H90`, stroke-width 10, round caps and joins

## Rules

- **One construction.** Teal disc + ink beat. Never outlined, never the ink beat
  on its own. Never recolored, with the single exception below.
- **The sign-in disc carries the CTA gradient.** On the sign-in screen alone the
  disc is filled with `Gradients.avatar` (`#00E5CC` to `#1C9C8F`, 135deg) rather
  than flat `#00E5CC`, so it reads as one object with the teal button under it.
  It is also the one place the mark is allowed to follow a theme token instead
  of a copy of one: the point is that the two match, so the disc should move if
  the button ever does. The beat, the geometry and the clear space are unchanged.
  `mark.svg` itself stays flat - it is the icon source, and the launcher PNGs are
  rendered from it, so a gradient there would drift the app icon away from the
  screen. The exception lives in `LatidoMark`'s `disc` prop, whose default is the
  flat construction, so nothing takes the gradient by accident.
- **Clear space.** Keep one beat-height (the spike, 44 units = 44% of the mark)
  of empty space around the mark.
- **Minimum size.** 24px for `mark.svg`. Below that, use `dot.svg`.
- **Wordmark.** "pulso", Manrope ExtraBold, lowercase, -3% tracking. Mark to
  the left of the word, gap equal to the width of the letter "o".

## Launcher icons

The PNGs under `assets/images/` are rendered from `mark.svg` and committed;
there is no build step. Redoing them by hand means honoring four things the
mark itself does not say:

- **Field.** The mark sits on ink `#04211E`, never on transparency. Expo's icon
  plugin flattens alpha in the source onto **white**, so transparent corners
  come back white rather than ink.
- **Inset.** Mark at 66% of the canvas on iOS. On Android, 44% - the adaptive
  icon foreground is a 108-unit canvas masked to its center 72, so a smaller
  source lands the same size on screen.
- **Alpha.** `icon.png` and `favicon.png` must carry **no alpha channel**; iOS
  rejects an app icon that does. The two Android layers must carry one.
- **Monochrome.** `android-icon-monochrome.png` is the disc with the beat
  punched out of its _alpha_ - Android discards the color and tints the rest.

Sizes: `icon.png` 1024, the Android layers 512, `favicon.png` 48.
