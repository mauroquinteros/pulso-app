# Deslizar para eliminar en el historial

**Type:** AFK
**Source:** `.scratch/delete-movement/PRD.md` · `.scratch/delete-movement/design-brief.md` · prototipo `stock-portfolio-design-prototype/project/Pulso Movimientos Eliminar.dc.html` · sketches `001-swipe-row-geometry`, `002-destructive-color`

## What to build

La segunda vía de borrado, y la que lo vuelve cotidiano: deslizar una fila del
historial de derecha a izquierda revela una acción destructiva que abre el mismo alert
y usa el mismo camino de borrado que ya construyó el issue 01.

**El diseño está resuelto en el prototipo**, incluidos los siete estados del ciclo.
Léelo completo antes de empezar; su clase de lógica trae el gesto entero escrito.

### Infraestructura primero

El proveedor de gestos no está montado en la raíz de la app. La librería está instalada
y enlazada pero **sin un solo uso en JS** — hoy entra solo como dependencia transitiva.
Montarlo es requisito de cualquier swipeable.

### Dónde se monta el swipe

El componente de fila es **compartido**: lo renderiza el historial de la tab y también
el historial por ticker del detalle de una acción, en contenedores distintos. El
swipeable envuelve la fila **en el call site de la tab**, para que el historial por
ticker no herede un gesto que nadie decidió darle.

### El panel

Se revela **dentro** de los límites de la card y el radio lo recorta en la primera y en
la última fila. Ancho fijo de **88px**, superficie en el token de pérdida que ya
existe, con **ícono de basurero y la etiqueta "Eliminar"** — el color nunca es el único
canal. El contenido del panel va en el color de fondo de la app, no en blanco. Lleva
etiqueta de accesibilidad propia.

### El gesto: revela, nunca ejecuta

- **Umbral de 8px, y el desplazamiento horizontal debe superar al vertical.** La
  segunda condición es la que hace que el scroll gane los empates.
- Resistencia al arrastrar hacia el lado equivocado, y al pasarse del ancho del panel.
- Al soltar, abre si se pasó **la mitad** del panel; si no, cierra.
- Una sola fila abierta a la vez: deslizar otra cierra la anterior.
- Hacer scroll cierra la fila abierta.
- Un toque fuera cierra la fila abierta, **con guarda temporal tras un arrastre** para
  que el toque que termina el gesto no cuente además como toque de cierre.
- Con la fila abierta, el **primer toque cierra** y **no** navega al detalle. La fila ya
  es tocable y navega, así que tap y swipe conviven en el mismo control.
- **El swipe completo topa con fricción y queda abierto. No dispara el alert ni borra.**
  Se evaluó el full-swipe de iOS Mail y se descartó con razón escrita en el brief — no
  lo reintroduzcas.

### Los estados del ciclo

**`Eliminando`**: la fila **sigue en su sitio**, su contenido se atenúa y **el monto se
reemplaza por un spinner** — no conviven. El spinner se anuncia como estado a
accesibilidad.

**`Error al eliminar`**: la fila vuelve intacta y aparece el banner superior con el
idioma del banner de lectura fallida y la frase `No se pudo eliminar. Intenta de nuevo.`

**Al confirmar**, la fila **colapsa por altura** en ~200ms, con la opacidad saliendo un
poco antes, y recién entonces desaparece.

Para que "atenuada y no tocable" sea dato declarativo y no lógica en el componente, el
view-model de la lista recibe el id en curso de borrado y lo expone como bandera en la
fila.

### Los dos vacíos, alcanzados por borrado

Ya existen y **no se rediseñan**; lo nuevo es llegar a ellos. Eliminar el último
**Movement** lleva al vacío real y los chips de filtro dejan de dibujarse. Eliminar el
último de un tipo con filtro activo lleva al vacío filtrado, que nombra el tipo y ofrece
quitar el filtro, con los chips visibles.

## Acceptance criteria

- [ ] El proveedor de gestos está montado en la raíz de la app
- [ ] Deslizar una fila de derecha a izquierda revela la acción destructiva
- [ ] El panel mide 88px, queda dentro de la card y el radio lo recorta en la primera y en la última fila
- [ ] El panel usa el token de color ya decidido, lleva ícono de basurero y etiqueta de accesibilidad
- [ ] El área táctil de la acción es >= 44x44pt
- [ ] Un arrastre por debajo de 8px no abre la fila
- [ ] Un arrastre más vertical que horizontal no abre la fila, y el scroll sigue funcionando con normalidad
- [ ] Soltar antes de la mitad del panel cierra; soltar pasada la mitad abre
- [ ] Deslizar una segunda fila cierra la primera
- [ ] Hacer scroll cierra la fila abierta
- [ ] Tocar fuera cierra la fila abierta, y el toque que termina un arrastre no cuenta como cierre
- [ ] Con la fila abierta, el primer toque la cierra y **no** navega al detalle
- [ ] Un swipe completo deja la fila abierta y **no** dispara el alert ni elimina nada
- [ ] Tocar la acción abre el mismo alert del issue 01, con título y cuerpo
- [ ] Durante el borrado la fila sigue visible y atenuada, y el spinner reemplaza al monto
- [ ] Si falla, la fila vuelve intacta y aparece el banner con la frase acordada
- [ ] Al confirmar, la fila colapsa por altura y no desaparece de golpe
- [ ] El view-model expone la fila en curso de borrado como bandera; el componente no deriva ese estado
- [ ] Eliminar el último **Movement** lleva al vacío real y los chips desaparecen
- [ ] Eliminar el último de un tipo filtrado lleva al vacío filtrado, nombrando el tipo, con los chips visibles
- [ ] El historial por ticker del detalle de una acción **no** gana el gesto y se comporta igual que antes
- [ ] Tras el borrado, todas las cifras derivadas reflejan la **History** sin ese **Movement**
- [ ] Todo el copy nuevo usa puntuación ASCII
- [ ] `tsc` y lint limpios; `npm test` en verde

## Blocked by

- `01-delete-from-movement-detail.md`
