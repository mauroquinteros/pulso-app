# Sketch Manifest

## Design Direction

Pulso es un tracker de portafolio personal, **dark mode only**, UI en español, con
una dirección visual **ya cerrada**: 12 prototipos de Claude Design en `.scratch/`
fijaron tipografía (Manrope), paleta (`constants/theme.ts`) y la anatomía de cada
pantalla. Estos sketches **no exploran estilo** — la paleta y la tipografía se
toman como dadas y no se negocian.

Lo que exploran es **geometría y semántica**: dos decisiones de la feature
"eliminar un movimiento" que el brief
(`.scratch/delete-movement/DESIGN-BRIEF.md`) identificó como genuinamente
abiertas, y que un prototipo de alta fidelidad no puede resolver porque son
disyuntivas, no refinamientos.

## Reference Points

- **iOS Mail / Gmail** — el patrón canónico de swipe-to-delete, y la razón del
  problema: ambos asumen filas full-bleed, que es justo lo que Pulso no tiene.
- **`.scratch/movements-ux/movement-list-design-prototype/`** — la pantalla base
  sobre la que esto se monta. Manda sobre cualquier invención.
- **`app/(tabs)/settings.tsx`** — el único precedente de acción destructiva en la
  app (`Alert.alert`, y el comentario que explica por qué "Cerrar sesión" no va
  en rojo).

## Constraints (no negociables)

- Tokens de `constants/theme.ts`. Ninguna paleta nueva salvo el candidato a
  `danger`, que es precisamente lo que decide el sketch 002.
- Stack: React Native + Expo. `react-native-gesture-handler@2.28.0` y
  `react-native-reanimated@4.1.1` ya instalados; `ReanimatedSwipeable` es el
  camino de menor resistencia y **al menos una variante debe seguirlo**.
- `ADR-0007`: el borrado es duro y no revalida la historia.
- `ADR-0010`: **sin borrado optimista** — la fila sobrevive hasta que la base
  responde.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | swipe-row-geometry | ¿Cómo se revela la acción destructiva si las filas viven dentro de una card con radio 20 y padding 18px, en vez de ser full-bleed? | **A** - dentro de la card, clipeada por el radio 20, 88px | layout, gesture, movements |
| 002 | destructive-color | ¿Qué color lleva la acción destructiva, si `#FF5252` ya significa *pérdida* y esta pantalla tiene prohibido el rojo? | **A** - reusar `negative #FF5252`, sin token nuevo | color, semantics, movements |

## Decisiones que salen de estos sketches

1. **El panel destructivo vive dentro de la card**, recortado por el radio 20, 88px
   de ancho. `ReanimatedSwipeable` lo da gratis: su contenedor ya trae
   `overflow:hidden`.
2. **El color es `negative #FF5252`**, el que ya existe. `#E5484D` se descartó por
   indistinguible en pantalla; el neutro, por no comunicar peligro.
3. **Sin consecuencia documental.** `movements-ux/UX.md` §12 prohibía verde y rojo en
   esta pantalla, pero el usuario retiró esa regla (2026-09-16) por ser una decisión
   vieja. No hay nada que enmendar. Sigue vigente, en cambio, que el **Cash Impact**
   de cada fila se muestra sin signo y sin color.
