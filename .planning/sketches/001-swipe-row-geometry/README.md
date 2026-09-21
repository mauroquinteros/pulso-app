---
sketch: 001
name: swipe-row-geometry
question: "¿Cómo se revela la acción destructiva si las filas viven dentro de una card con radio 20 y padding 18px, en vez de ser full-bleed?"
winner: "A"
tags: [layout, gesture, movements]
---

# Sketch 001: Geometría del swipe-to-delete

## ★ Veredicto: gana A - la acción vive dentro de la card

El panel se revela dentro de los límites de la card y lo recorta el radio 20.
Ancho **88px**, con "Eliminar" legible bajo el icono.

Gana por tres razones que se refuerzan:

1. **Es gratis.** `ReanimatedSwipeable` trae `overflow:hidden` en su contenedor
   (documentado en su prop `containerStyle`), así que basta un `borderRadius` para
   que el clipeo salga solo. Cero código de recorte.
2. **No rompe la composición.** La card sigue siendo una card mientras hay una
   fila abierta; B la parte por dentro durante el gesto.
3. **No pierde la referencia.** C revelaba la acción deslizando la card entera, y
   con eso desaparecía la respuesta a "¿qué fila estoy borrando?".

El costo aceptado es el ancho: 88px contra los 104px de B.

## Design Question

El patrón canónico (iOS Mail, Gmail) asume filas **full-bleed**: el panel de acción
entra desde el borde de la pantalla y no hay nada que lo recorte. En Pulso las
filas viven **dentro de una card** (`surface #111638`, borde 1px, radio 20, padding
horizontal 18px), así que el panel choca con esa geometría.

¿Dónde vive el panel: dentro de la card, rompiendo su inset, o afuera?

## How to View

```
open .planning/sketches/001-swipe-row-geometry/index.html
```

Arrastra las filas con el mouse, o usa los botones de abajo del frame.

## Variants

- **A: Dentro de la card** - El panel se revela adentro y lo recorta el radio 20.
  Es el **camino de menor resistencia**: `ReanimatedSwipeable` trae
  `overflow:hidden` en su contenedor (documentado en `containerStyle`), así que
  con `borderRadius` el clipeo sale gratis. Panel angosto (88px): la card ya come
  18px por lado.
- **B: Fila full-bleed al deslizar** - El contenido se desliza más allá del padding
  y el panel llega al borde de la card (104px). Más cerca del patrón nativo, el
  botón respira. Costo: durante el gesto la fila abierta pierde el inset que
  comparte con sus vecinas.
- **C: La card entera es el riel** - Se desliza toda la card y el panel vive
  afuera. El radio nunca estorba. **Costo grave: no se sabe qué fila se borra.**
  Está para cerrar la pregunta, no porque compita.

## What to Look For

1. **Mira la primera y la última fila, no las del medio.** El radio 20 solo muerde
   en las esquinas: una fila del medio se ve idéntica en A y en B. Los botones
   "Abrir 1a fila" y "Abrir última fila" existen para eso.
2. **¿El panel recortado de A se lee como intencional o como un bug?** Es la
   pregunta central. Si la esquina redondeada del botón rojo parece un error de
   render, A queda descartada aunque sea gratis.
3. **En B, ¿la card se ve "rota" mientras hay una fila abierta?** La fila abierta
   deja de alinear con las otras.
4. **Ancho del panel:** 88px (A) vs 104px (B). ¿Entra "Eliminar" legible, o el
   icono tiene que ir solo? Si va solo, necesita `accessibilityLabel`.

## Anotaciones

- El botón "Anotar" de la toolbar marca los límites de card, fila y panel.
- La mecánica del gesto replica `ReanimatedSwipeable` con sus defaults reales:
  umbral de arrastre 10px (`dragOffsetFromRightEdge`), snap a la mitad del panel
  (`rightThreshold`), y fricción en el overshoot (`overshootFriction: 8`).
- **Una sola fila abierta a la vez** y **primer tap cierra** ya están implementados:
  son requisitos del brief, no variables de diseño.

## Lo que este sketch NO decide

- El **color** del panel (usa `--danger-new` de placeholder) → eso es el sketch 002.
- El **diálogo de confirmación** y los estados `Eliminando` / `Error` → eso es el
  prototipo de alta fidelidad, no un sketch.
- **Cómo se siente el gesto.** Esto es un mouse en un browser. El umbral, el
  rubber-banding y la velocidad son propiedades del dedo y solo se validan en el
  device.
