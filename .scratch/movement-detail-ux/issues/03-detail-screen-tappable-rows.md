# Pantalla de detalle + filas de la lista tocables

**Type:** AFK
**Source:** `.scratch/movement-detail-ux/PRD.md` · `.scratch/movement-detail-ux/UX.md` · prototipo `stock-portfolio-design-prototype/`

## What to build

Cierra la feature: reemplaza el stub de `app/movement/[id].tsx` con el recibo
real, **y hace que las filas de la lista naveguen a él**. Demoable de punta a
punta — tocas un movimiento y ves de qué está hecho.

Van juntas a propósito: la pantalla sola no sería alcanzable (salvo deep link), y
las filas tocables sin la pantalla llevarían a un stub — que es exactamente el
anti-patrón que la feature de movimientos evitó.

### La pantalla

```
‹  Detalle                          ← header compartido (issue 01)

   ●  Compra AAPL                   ← badge del tipo (52×52) + label + ticker
      15 ene 2025                   ← executionDate

     Acciones              2.45321
   ─────────────────────────────────
     Precio de ejecución   $182.50
   ─────────────────────────────────
     Monto bruto           $447.71
   ─────────────────────────────────
     Comisión               +$0.15

              (espacio libre)

   ─────────────────────────────────
     Total pagado          $447.86  ← anclado al FONDO de la pantalla
```

- Todo se renderiza desde `buildMovementDetailView(...)` (issue 02) **verbatim**:
  los componentes no derivan ni formatean nada.
- **Encabezado de identidad**: badge (icono + colores del tipo, de la fuente única
  creada en la feature de movimientos; 52×52, más grande que el 40×40 de la
  lista), label + ticker, y la fecha debajo. Así la fila y su detalle se ven como
  la misma cosa.
- **Sin card.** Las líneas van sueltas sobre el fondo, separadas por hairlines de
  1px; la primera **sin** borde superior. `facts` y `money` se pintan como **una
  sola lista continua** (la primera línea de `money` no lleva borde si no hubo
  `facts`).
- **El total va anclado al fondo de la pantalla**, empujado por el espacio libre,
  con su propio borde superior y tipografía más pesada.
- **Sin monto grande arriba (sin hero numérico).** El número que el usuario tocó
  en la lista **es** el total del fondo; un hero lo mostraría dos veces.
- **Sin verde ni rojo**: nada acá es ganancia ni pérdida.
- **`not-found`**: mensaje seco y centrado, "No encontramos este movimiento". Sin
  ilustración y sin CTA.
- El `Stack` deja de dibujar su header nativo para esta ruta (hoy declara el
  título en inglés, `"Movement Detail"`); el header compartido lo reemplaza, con
  el título **"Detalle"**.

### Las filas de la lista se vuelven tocables

La feature de movimientos las hizo **deliberadamente NO tocables**, y lo dejó
escrito en el código: *"a control that looks tappable but does nothing is worse
than a plain row"*. Esa razón desaparece con este issue.

La fila pasa a ser `Pressable` y navega a `/movement/[id]`. **Sin chevron**,
copiando el patrón que ya usa Home: sus filas de activos navegan a
`/stock/[ticker]` sin chevron. Un chevron por fila en un historial largo es ruido
visual.

## Acceptance criteria

- [ ] Tocar una fila en Movimientos abre el detalle de **ese** movimiento; el back regresa a la lista
- [ ] La fila responde al tap (feedback de press); **sin chevron**
- [ ] El comentario del código que justificaba las filas no-tocables se retira (ya no aplica)
- [ ] El stub de la pantalla de detalle desaparece; renderiza el recibo real
- [ ] La pantalla usa el **header compartido** (issue 01) con el título **"Detalle"**; el `Stack` ya no dibuja su header nativo para esta ruta ni deja el título en inglés
- [ ] El badge del encabezado usa el icono y los colores de la **fuente única del tipo**, no valores hardcodeados
- [ ] Las líneas se renderizan **verbatim** desde el view-model (los strings no se re-formatean en el componente)
- [ ] `facts` y `money` se ven como una lista continua: hairlines de 1px entre líneas, la primera sin borde superior
- [ ] El **total queda anclado al fondo** de la pantalla, con su borde superior y tipografía más pesada
- [ ] Los cinco tipos renderizan correctamente (compra y venta con el bloque de acciones/precio; los otros tres sin él)
- [ ] `not-found` muestra el mensaje seco, sin ilustración ni CTA
- [ ] Sin derivación ni formateo en los componentes; sin verde/rojo; textos en español
- [ ] `tsc` y lint limpios; `npm test` en verde

## Blocked by

- `01-shared-screen-header.md`
- `02-movement-detail-view-model.md`
