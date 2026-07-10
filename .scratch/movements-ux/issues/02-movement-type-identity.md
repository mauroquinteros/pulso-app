# Identidad visual del tipo de movimiento (fuente única) + migración del picker

**Type:** AFK
**Source:** `.scratch/movements-ux/PRD.md` · `.scratch/movements-ux/UX.md` · prototipo `movement-list-design-prototype/`

## What to build

Hoy el icono, los colores y el copy de cada tipo de movimiento están
**hardcodeados dentro de la pantalla del picker** de add-movement. La lista de
movimientos necesita exactamente los mismos, así que este slice los extrae a una
**fuente única** por `MovementType`, y **migra el picker** para que la consuma.

Demoable por sí solo: abres el picker de add-movement y ves los iconos nuevos y
el verde nuevo de Depósito.

**Regla que fija este slice: el icono identifica el tipo, nunca insinúa la
dirección del efectivo.** Hoy `Compra` y `Depósito` comparten `arrow-down` pero
mueven el efectivo en direcciones **opuestas**. En el picker no molesta (hay
subtítulo), pero en una lista densa una flecha se lee como dirección y mentiría.

Del prototipo (encoda label, copy de chip y tokens visuales de una vez):

```
buy        → Compra    / Compras    · cart-outline          · rgba(120,160,255,0.16) · #9DB8FF
sell       → Venta     / Ventas     · pricetag-outline      · rgba(255,140,140,0.14) · #FF9D9D
dividend   → Dividendo / Dividendos · cash-outline          · rgba(0,229,204,0.12)   · #4FE9D6
deposit    → Depósito  / Depósitos  · add-circle-outline    · rgba(0,200,83,0.16)    · #7DE8AA
withdrawal → Retiro    / Retiros    · remove-circle-outline · rgba(142,142,147,0.14) · #B8BCCB
```

**`#7DE8AA` es un token nuevo.** Hoy `Depósito` comparte el teal de `Dividendo`.
El verde nuevo es el **mismo matiz que el token `positive`** (`hsl(145°)`)
llevado al registro pastel (`L 70%`) donde viven los demás badges, con el fondo
derivado del rgb de `positive` — sigue la convención existente (fondo saturado,
texto pastel). **No se reusa `positive` crudo:** es el token de *ganancia*, y
reusarlo re-acoplaría verde↔profit, que es justo lo que esta feature desacopla.

## Acceptance criteria

- [ ] Existe un módulo compartido que mapea cada `MovementType` a `{ label, labelPlural, icon, bg, color }`, con los cinco tipos
- [ ] El picker de add-movement consume ese módulo: **no queda ningún icono, color ni label de tipo hardcodeado** en la pantalla
- [ ] `#7DE8AA` se agrega como token de tema; el token `positive` **no** se reusa como color de badge
- [ ] El picker renderiza `cart-outline`, `pricetag-outline`, `cash-outline`, `add-circle-outline`, `remove-circle-outline`; **no queda ninguna flecha** (`arrow-down` / `arrow-up`)
- [ ] `Depósito` deja de compartir color con `Dividendo`
- [ ] El picker sigue navegando a los mismos cinco formularios, con los mismos títulos y subtítulos
- [ ] El módulo es data pura (sin tests propios: es un mapa, no lógica)
- [ ] `tsc` y lint limpios

## Blocked by

None - can start immediately
