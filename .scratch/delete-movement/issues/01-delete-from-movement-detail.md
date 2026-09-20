# Eliminar un movimiento desde su detalle

**Type:** AFK
**Source:** `.scratch/delete-movement/PRD.md` · `.scratch/delete-movement/design-brief.md` · prototipo `stock-portfolio-design-prototype/project/Pulso Movimiento Detalle Eliminar.dc.html` · `docs/adr/0006`, `0007`, `0010`

## What to build

El camino completo de borrado, de punta a punta, por la vía más simple: el
**detalle** de un **Movement**. Es el tracer bullet de la feature — cruza acceso a
datos, reducer, store, ciclo de vida y UI — y todo lo que venga después lo reusa.

Hoy la app no sabe borrar: no existe una sola llamada de borrado en el cliente. Las
políticas por **Perfil** ya están en las tres tablas, así que no hace falta migración.

**El diseño está resuelto en el prototipo.** Léelo completo antes de empezar.

### El acceso a datos

Una función nueva para eliminar un **Movement**, espejo deliberado de la que guarda:
**una sola función para los cinco tipos**, con la decisión tipo→tabla adentro, junto a
los mappers que ya la codifican — `ADR-0006` es explícito en que el reparto en tres
tablas es un hecho de almacenamiento que el dominio no sigue. Hace falta extraer un
seam que dé **la tabla** desde el tipo, porque un borrado necesita la tabla pero ni la
fila ni el mapper.

```ts
type DeleteAnswer = { ok: true } | { ok: false; failure: HistoryFailure }
```

El éxito no lleva payload: a diferencia de un guardado, de un borrado no vuelve ningún
objeto que deba unirse a la **History**. La falla viaja con la misma forma que ya usan
la lectura y el guardado.

**Regla de idempotencia, hermana de la rama de id duplicado del guardado: borrar una
fila que ya no está es éxito, no fallo.** Llegó al mismo mundo que un borrado que sí
borró — el movimiento no existe. Reportarlo como fallo invita a reintentar sobre nada y
a dudar de un borrado que ocurrió.

### El reducer

Un evento nuevo en la máquina de estados de la **History**:

```ts
| { type: "movementDeleted"; id: string }
```

Con las mismas reglas que ya rigen al evento de guardado, y por el mismo motivo —que
`movements` y `status` son un solo hecho y el reducer es el único escritor del arreglo:
solo aplica en `ready`, quita por id de forma **inmutable**, y un id que no está es
no-op devolviendo el mismo objeto de estado. La acción del store es un envoltorio
delgado sobre el evento.

### El ciclo de vida

Un hook que devuelve `{ deleting, deleteFailed, remove }`, misma forma que el backlog
prescribe para su hermano del guardado. **Sin remoción optimista** (`ADR-0010`): el
**Movement** no sale del store al confirmar, sale cuando la base responde.

### La pantalla, según el prototipo

El **total sigue anclado al fondo**; el control cuelga **debajo** de él, separado por su
propio borde superior. No se mueve el total ni se reorganiza el recibo.

El control es un botón de alto cómodo con esquinas redondeadas, superficie y borde
teñidos de rojo sobre el fondo, ícono de basurero y la etiqueta **"Eliminar
movimiento"**, con etiqueta de accesibilidad propia.

**Mientras el borrado está en vuelo:** la etiqueta pasa a **"Eliminando..."**, el
spinner ocupa el lugar del ícono, el botón se atenúa y **el recibo entero baja de
opacidad**. El control deja de aceptar toques y lo refleja en su estado de
accesibilidad.

**Desde el error se puede volver a pedir el borrado** sin salir de la pantalla.

### La confirmación

Alert nativo de iOS. Título **`¿Eliminar este movimiento?`** y **cuerpo que nombra lo
que se borra**, con el formato `Compra AAPL - 15 ene 2025 - $447.86` (título del
movimiento, fecha de ejecución y total, separados por guiones ASCII).

`Cancelar` a la izquierda como acción por defecto y **`Eliminar` a la derecha marcada
como destructiva**. Sin "Deshacer" — el borrado es duro (`ADR-0007`).

### El error

Banner superior con el mismo idioma visual que el banner de lectura fallida que la app
ya tiene: superficie y borde teñidos de rojo, entrada con fade desde arriba, y la frase
**`No se pudo eliminar. Intenta de nuevo.`** No se inventa un toast.

### La navegación, y su orden

Al confirmar se **vuelve atrás en la pila**, no se navega a una ruta fija: el detalle es
alcanzable desde el historial de la tab y también desde el historial por ticker, y
mandar a Movimientos expulsaría de su contexto a quien llegó desde una acción.

Primero se deja la pantalla, **después** se aplica la remoción al store. Al revés, el
detalle se re-renderiza sin su movimiento y muestra "No encontramos este movimiento"
por un instante — correcto para algo que nunca existió, desconcertante para algo que el
usuario acaba de borrar.

### Puntuación

El helper del prototipo que imprime cifras con signo emite **U+2212** para los
negativos. **No lo copies.** El repo exige puntuación ASCII en `.ts`/`.tsx` — guion
`-` (U+002D) — y esa regla ya rompió la suite dos veces. Vale para el cuerpo del alert
y para cualquier cifra firmada.

### Sin revalidación

**Nada revalida la historia resultante** (`ADR-0007`). Borrar el depósito que financió
una compra deja el **Cash** en negativo y eso se acepta. Sin advertencias, sin bloqueos.

## Acceptance criteria

- [ ] Existe una función de borrado que acepta los cinco tipos de **Movement** y decide la tabla internamente
- [ ] Borrar un **Movement** que ya no está en la base responde éxito, no fallo
- [ ] Un fallo real viaja con tabla, status, code y message, igual que la lectura y el guardado
- [ ] El reducer quita el **Movement** por id y deja intacto el arreglo anterior
- [ ] El evento de borrado se descarta en todo estado que no sea `ready`, devolviendo el mismo objeto
- [ ] Un id ausente es no-op
- [ ] Eliminar el único **Movement** deja la **History** en `ready` y vacía, no en fallo
- [ ] Hay tests del reducer que cubren los cinco puntos anteriores, en el archivo que ya prueba esa máquina de estados
- [ ] El total del recibo sigue anclado al fondo y el control de borrado queda debajo, con su propio borde superior
- [ ] El control tiene área táctil >= 44x44pt, ícono de basurero y etiqueta de accesibilidad
- [ ] El alert muestra título **y** cuerpo, nombrando el movimiento con su título, fecha y total
- [ ] `Cancelar` es la acción por defecto y `Eliminar` está marcada como destructiva
- [ ] Cancelar no cambia absolutamente nada
- [ ] Durante el borrado la etiqueta dice "Eliminando...", el spinner reemplaza al ícono, el recibo se atenúa y el control no acepta toques
- [ ] El **Movement** sale del store solo después de que la base confirma
- [ ] Si falla, el **Movement** sigue ahí, aparece el banner con la frase acordada, y se puede reintentar sin salir
- [ ] Al confirmar se vuelve atrás en la pila; llegando desde el historial se aterriza en el historial, llegando desde una acción se aterriza en esa acción
- [ ] En ningún momento se ve "No encontramos este movimiento" tras un borrado propio
- [ ] Tras el borrado, **Cash**, **Cost Basis**, **Net P&L**, **Total Portfolio Value** y la asignación reflejan la **History** sin ese **Movement**
- [ ] No se relee la **History** desde el backend
- [ ] Todo el copy nuevo usa puntuación ASCII; no aparece U+2212 en el código
- [ ] `tsc` y lint limpios; `npm test` en verde

## Blocked by

None - can start immediately.
