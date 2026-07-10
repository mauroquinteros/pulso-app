# Chips de filtro por tipo + estado vacío filtrado

**Type:** AFK
**Source:** `.scratch/movements-ux/PRD.md` · `.scratch/movements-ux/UX.md` · prototipo `movement-list-design-prototype/`

## What to build

La fila de chips arriba de la lista y el estado vacío que produce filtrar. Cierra
la feature: el usuario ya veía su historial (issue 04), ahora puede acotarlo.

- **Cinco chips**, uno por tipo, con etiqueta en **plural** (`Compras`, `Ventas`,
  `Dividendos`, `Depósitos`, `Retiros`), en el orden de la taxonomía del picker
  (operaciones primero, efectivo después). Scroll horizontal — cinco chips no
  entran en 375px. Sin contadores.
- **No hay chip "Todos".** La selección es **única con toggle**: tocar un chip
  filtra; volver a tocar el chip activo limpia el filtro. Es el mismo gesto que
  el donut del Portafolio — una sola taxonomía de interacción en la app. El
  estado es `MovementType | null`, donde **`null` = sin filtro = todos** (patrón
  estándar de *filter chips* de Material).
- **Chip activo:** fondo y borde del color del tipo. Inactivo: transparente,
  texto secundario, borde neutro.
- **Los chips se ocultan** cuando no existe ningún movimiento (no hay nada que
  filtrar) — ese estado ya lo cubre el vacío real del issue 04.
- **Estado vacío filtrado** (hay movimientos, ninguno del tipo elegido): los
  chips **siguen visibles** (el filtro sigue activo y hay que poder salir),
  mensaje que **nombra el tipo** ("No tienes retiros", no un genérico "Sin
  resultados"), y acción **"Quitar filtro"** como link de texto en el color de
  acento. **Sin** ilustración y **sin** CTA "Agregar movimiento": el usuario no
  quería crear, quería ver.

Ese "Quitar filtro" es el seguro del costo que aceptamos al eliminar el chip
"Todos": sin él, el usuario que filtra un tipo vacío no tiene una salida obvia.

**Persistencia del filtro: no se escribe código.** El filtro vive en un `useState`
de la pantalla y persiste entre cambios de tab **por defecto**, porque el
navegador de tabs no desmonta la pantalla tras la primera visita. Resetear a
"todos" costaría código extra y contradiría la guía `state-preservation`. Se
pierde al reiniciar la app, coherente con el store, que es in-memory.

## Acceptance criteria

- [ ] Cinco chips con etiquetas en plural, en el orden `Compras · Ventas · Dividendos · Depósitos · Retiros`, con scroll horizontal
- [ ] **No existe un chip "Todos"**
- [ ] Tocar un chip filtra la lista a ese tipo; tocar el chip **activo** de nuevo limpia el filtro y muestra todos
- [ ] Tocar otro chip mueve la selección (nunca hay dos activos a la vez)
- [ ] El chip activo se tiñe con el color de su tipo (fondo y borde); los inactivos quedan neutros
- [ ] Los chips **no se renderizan** cuando no hay ningún movimiento
- [ ] Vacío filtrado: los chips permanecen visibles, el mensaje nombra el tipo ("No tienes retiros"), y **"Quitar filtro"** restaura la lista completa
- [ ] El vacío filtrado **no** muestra ilustración ni CTA "Agregar movimiento"
- [ ] El filtro sigue aplicado al salir a otra tab y volver — **verificar en simulador**, es comportamiento por defecto del navigator, no una certeza de memoria
- [ ] Cada chip expone `accessibilityState={{ selected }}` y alcanza un objetivo táctil efectivo de ≥44pt (vía `hitSlop`, ya que el chip mide 36px de alto)
- [ ] `tsc` y lint limpios; la pantalla compone chips + lista sin saltos de layout

## Blocked by

- `04-movements-screen-list.md`
