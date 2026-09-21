---
sketch: 002
name: destructive-color
question: "¿Qué color lleva la acción destructiva, si #FF5252 ya significa *pérdida* y esta pantalla tiene prohibido el rojo?"
winner: "A"
tags: [color, semantics, movements]
---

# Sketch 002: Color de la acción destructiva

## ★ Veredicto: gana A - reusar `negative #FF5252`

Sin token nuevo. La acción destructiva usa el rojo que la app ya tiene.

**B murió en pantalla.** `#E5484D` y `#FF5252` se separan en un swatch pero no en
un botón: puestos lado a lado son prácticamente el mismo color. Un token nuevo que
nadie distingue no compra nada y cuesta una entrada más en `theme.ts`.

**C se descartó por señal.** El panel neutro deja de leerse como destructivo, y
`destructive-emphasis` pide color semántico para acciones peligrosas.

**Lo que hace defendible a A** es el contraargumento que el propio sketch levanta:
un **icono de basurero sobre un panel revelado por un gesto** es un contexto que
ninguna cifra de P&L comparte. El rojo queda sobrecargado, pero no ambiguo — nadie
va a leer "estás perdiendo plata" en un botón con un tacho de basura.

Condición que viaja con la decisión: **el color nunca es el único canal**
(`color-not-only`). El icono es obligatorio; si el texto "Eliminar" no entra,
el icono necesita `accessibilityLabel`.

## Design Question

En Pulso el rojo **ya está ocupado**: `negative #FF5252` significa *pérdida* (P&L,
rendimiento) y errores de validación. Y `movements-ux/UX.md` prohíbe verde y rojo
en la pantalla de Movimientos, porque ahí "no hay ganancias ni pérdidas".

¿La acción destructiva reusa ese rojo, estrena un token propio, o va neutra
apoyándose en el icono?

## How to View

```
open .planning/sketches/002-destructive-color/index.html
```

Dos pestañas: **los 3 lado a lado**, y **la colisión con P&L** (la que importa).

## Variants

- **A: Reusar `negative` (#FF5252)** - Cero tokens nuevos. Acepta que el rojo
  signifique dos cosas y confía en que el contexto (icono de basurero, panel
  revelado por gesto) desambigüe.
- **B: Token `danger` nuevo (#E5484D)** - Crimson, deliberadamente separado del rojo
  de P&L. Pérdida y destrucción dejan de compartir pigmento. Cuesta un token más.
- **C: Neutro + icono (#2A3163)** - El peso semántico lo lleva el basurero. Respeta
  la prohibición de rojo en esta pantalla al pie de la letra.

## What to Look For

1. **Ve primero a la pestaña "La colisión con P&L".** El usuario no ve el botón
   aislado: lo ve minutos después de mirar su pérdida en rojo. Con el bloque de
   P&L a la vista, ¿el rojo de A se lee como *peligro* o como *estás perdiendo
   plata*?
2. **¿Distingues A de B en pantalla?** #E5484D y #FF5252 se parecen mucho más
   renderizados que en un swatch. Si no los distingues, **B no compra nada** y
   paga con un token extra: gana A por simple, o C por claro.
3. **Entrecierra los ojos en C.** Si el panel gris azulado deja de leerse como
   destructivo, C falla `destructive-emphasis` (la guía pide color semántico para
   acciones peligrosas).
4. **Botón "Icono solo / con texto"** - Con 88px de ancho (variante A del sketch
   001), ¿entra "Eliminar" legible? Si el icono va solo, necesita
   `accessibilityLabel` obligatorio.

## El argumento que casi se pierde

El precedente más cercano es Settings, que pinta "Cerrar sesión" **neutro**. Es
tentador leerlo como "Pulso no usa rojo para acciones destructivas", pero el
comentario del código dice otra cosa:

> *Neutral, not `negative`: in Pulso red means \*loss\*, and signing out is not one
> - nothing is destroyed, you just log back in.*

Evitó el rojo **porque cerrar sesión no destruye nada**. Eliminar un movimiento sí.
Así que ese precedente **no prohíbe** el rojo acá — distingue *pérdida de dinero* de
*destrucción de un registro* y deja abierto si merecen el mismo pigmento.

## Lo que este sketch NO decide

- La **geometría** del panel (ancho, clipeo, posición) → sketch 001.
- El **diálogo de confirmación**, y los estados `Eliminando` / `Error` → prototipo de
  alta fidelidad.
- El color del botón en la **pantalla de detalle**, que no está dentro de una card
  y puede tolerar un tratamiento distinto.
