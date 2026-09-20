# Eliminar un movimiento

**Source:** `.scratch/delete-movement/DESIGN-BRIEF.md` · sketches `001-swipe-row-geometry` y `002-destructive-color` · `docs/adr/0006`, `0007`, `0010`, `0015`

## Problem Statement

El usuario registra sus **Movements** a mano, y a mano se equivoca: tipea un monto
de más, elige el tipo que no era, registra dos veces el mismo depósito, o anota una
compra que al final no ocurrió.

Hoy no puede hacer nada al respecto. La app sabe **crear** Movements y no sabe
deshacerlos: no existe una sola llamada de borrado en la aplicación. Un error queda
grabado para siempre en la **History**, y como **todo** lo demás se deriva de ella
—**Cash**, **Cost Basis**, **Net P&L**, **Total Portfolio Value**, la asignación del
donut— un solo movimiento equivocado envenena todas las cifras de la app, de forma
permanente y sin manera de corregirlo.

El efecto es peor que una cifra errónea: erosiona la confianza en el registro
completo. Si el usuario sabe que hay un error adentro y no puede sacarlo, deja de
creerle a los números que la app deriva.

## Solution

El usuario puede eliminar un **Movement**, de forma permanente, desde los dos
lugares donde lo está mirando.

**En el historial**, desliza la fila de derecha a izquierda y aparece una acción
destructiva. La toca, confirma en un diálogo, y el movimiento desaparece.

**En el detalle** del movimiento hay un control visible que hace lo mismo. Al
confirmar, la pantalla se cierra —ese recibo ya no describe nada— y el usuario
vuelve a donde estaba.

En ambos casos, en cuanto la base de datos confirma el borrado, **todas** las cifras
derivadas se recalculan: no solo desaparece la fila, también se corrigen el
**Cash**, el **Total Portfolio Value**, el P&L y la asignación. El registro vuelve a
ser el que el usuario quiso.

El borrado es **permanente y no se revalida la historia resultante**, en línea con
`ADR-0007`: el registro es la cuenta que el usuario lleva de su propio dinero, y su
exactitud le pertenece a él.

## User Stories

1. Como usuario que registró un movimiento equivocado, quiero poder eliminarlo, para que mis cifras vuelvan a ser correctas.
2. Como usuario que está viendo su historial, quiero deslizar una fila de derecha a izquierda, para revelar la acción de eliminar.
3. Como usuario que reveló la acción, quiero que el botón se quede visible, para poder decidir con calma en vez de contra el reloj.
4. Como usuario que deslizó la fila equivocada, quiero poder cerrarla sin consecuencias, para no borrar nada por accidente.
5. Como usuario con una fila abierta, quiero que un toque en cualquier parte de esa fila la cierre, para salir del estado sin buscar un control específico.
6. Como usuario con una fila abierta, quiero que ese primer toque **no** me lleve al detalle, para que cerrar y navegar no se confundan.
7. Como usuario que desliza otra fila, quiero que la anterior se cierre sola, para no quedar con varias acciones destructivas armadas a la vez.
8. Como usuario que hace scroll, quiero que la fila abierta se cierre, para que el gesto de recorrer la lista no conviva con un botón de borrar expuesto.
9. Como usuario que desliza sin querer mientras hago scroll vertical, quiero que el scroll gane, para que la lista no se sienta frágil.
10. Como usuario que desliza hasta el final del recorrido, quiero que la fila tope y se quede abierta, para que un arrastre largo nunca dispare un borrado por sí solo.
11. Como usuario que toca la acción destructiva, quiero que me pregunten antes, para tener una última oportunidad de arrepentirme.
12. Como usuario frente al diálogo, quiero poder cancelar, para volver exactamente al estado anterior sin que nada cambie.
13. Como usuario que confirma, quiero que el movimiento se elimine de verdad y para siempre, para que no reaparezca después.
14. Como usuario que confirmó, quiero ver que algo está pasando mientras se elimina, para no dudar de si el toque registró.
15. Como usuario esperando el borrado, quiero que la fila no responda a más toques, para no disparar la misma acción dos veces.
16. Como usuario cuyo borrado falló, quiero que el movimiento siga ahí, intacto, para no quedarme sin saber si se borró o no.
17. Como usuario cuyo borrado falló, quiero que me lo digan con una frase clara, para saber que tengo que reintentar.
18. Como usuario cuyo borrado falló, quiero poder reintentarlo de inmediato, para no tener que salir y volver a entrar.
19. Como usuario que eliminó un movimiento, quiero que desaparezca de la lista al instante, para no verlo ahí después de haberlo borrado.
20. Como usuario que eliminó un movimiento, quiero que mi **Cash** se recalcule, para que el efectivo refleje lo que realmente moví.
21. Como usuario que eliminó una compra, quiero que mi **Cost Basis** y mi **Net P&L** se recalculen, para que la posición vuelva a ser la real.
22. Como usuario que eliminó un movimiento, quiero que el **Total Portfolio Value** y el donut de asignación se actualicen, para que Inicio y Portafolio no contradigan a Movimientos.
23. Como usuario que eliminó el último movimiento que tenía, quiero ver el estado vacío real con su invitación a agregar uno, para saber que empiezo de cero y no que algo falló.
24. Como usuario que eliminó el último movimiento de un tipo filtrado, quiero ver el mensaje que nombra ese tipo y poder quitar el filtro, para entender que sigo teniendo movimientos de otros tipos.
25. Como usuario mirando el detalle de un movimiento, quiero un control visible para eliminarlo, para no depender de descubrir un gesto oculto.
26. Como usuario que elimina desde el detalle, quiero que me pregunten con el mismo diálogo que en la lista, para que la app se comporte igual en los dos lugares.
27. Como usuario que confirmó el borrado desde el detalle, quiero que la pantalla se cierre sola, porque ese recibo ya no describe ningún movimiento.
28. Como usuario que llegó al detalle desde el historial, quiero volver al historial, para retomar donde estaba.
29. Como usuario que llegó al detalle desde una acción, quiero volver a esa acción, para no ser expulsado a otra pantalla.
30. Como usuario que vuelve tras eliminar, quiero que la fila ya no esté en la lista que recibo, para no ver un fantasma del movimiento que acabo de borrar.
31. Como usuario que eliminó desde el detalle, quiero no ver ni por un instante un "No encontramos este movimiento", porque yo mismo lo borré y eso se leería como un error.
32. Como usuario que usa lector de pantalla, quiero que la acción destructiva se anuncie con su nombre, para saber qué hace antes de activarla.
33. Como usuario con dedos grandes o pulso irregular, quiero que la acción tenga un área táctil cómoda, para no fallar el toque.
34. Como usuario que reconoce el rojo, quiero que la acción sea inequívocamente destructiva, para no confundirla con cualquier otro botón.
35. Como usuario daltónico, quiero que el ícono comunique "eliminar" por sí solo, para no depender del color.
36. Como usuario que nunca descubrió el gesto de deslizar, quiero poder eliminar igual desde el detalle, para no quedarme sin la función.
37. Como usuario mirando el historial de una acción específica, quiero que sus filas se sigan comportando como hasta ahora, para que no cambie una pantalla que no pedí cambiar.
38. Como usuario, quiero que la fila desaparezca con una transición y no de golpe, para entender que la lista se reacomodó.
39. Como usuario que eliminó un movimiento y cierra la app, quiero que al volver siga eliminado, para confiar en que el borrado fue real.
40. Como **Perfil**, quiero que solo yo pueda eliminar mis **Movements**, para que nadie más toque mi registro.

## Implementation Decisions

### El borrado es duro, y no revalida nada

`ADR-0007` gobierna: un **Movement** puede eliminarse en cualquier momento y la app
**no** comprueba si la **History** resultante sigue siendo coherente. Borrar el
depósito que financió una compra deja el **Cash** en negativo y eso se acepta. La
asimetría con los formularios —que sí rechazan un movimiento ilegal al agregarlo—
es deliberada y ya está registrada.

No se agrega ninguna validación nueva, ninguna advertencia y ningún bloqueo.

### `deleteMovement`: una función para los cinco tipos

Nueva función en el módulo de acceso a la **History**, espejo deliberado de
`saveMovement`. Una sola función para los cinco tipos, con la decisión tipo→tabla
adentro, junto a los mappers que ya la codifican: `ADR-0006` es explícito en que el
reparto en tres tablas es un hecho de almacenamiento que el dominio no sigue. Nadie
quiere `deleteTrade`/`deleteDividend`/`deleteCash`.

Contrato, espejo de `SaveAnswer`:

```ts
type DeleteAnswer = { ok: true } | { ok: false; failure: HistoryFailure }
```

El éxito no lleva payload: a diferencia de un guardado, de un borrado no vuelve
ningún objeto que deba unirse a la **History**. La falla viaja con la misma forma que
ya usan la lectura y el guardado, para que un rechazo de política y un paquete
perdido no lleguen como un mismo valor.

Requiere extraer un seam que dé **la tabla** a partir del tipo, porque un borrado
necesita la tabla pero ni la fila ni el mapper — hoy las tres cosas viven juntas en
la función que arma el destino de un guardado.

**Regla de idempotencia, hermana de la rama de id duplicado del guardado: borrar una
fila que ya no está es éxito, no fallo.** Un borrado que no encontró nada que borrar
llegó al mismo mundo que uno que borró: el movimiento no existe. Reportarlo como
fallo invita al usuario a reintentar sobre nada y a dudar de un borrado que sí
ocurrió.

### `movementDeleted`: el reducer es el único escritor de la History

Evento nuevo en la máquina de estados de la **History**:

```ts
| { type: "movementDeleted"; id: string }
```

Reglas, calcadas de las que ya rigen a `movementSaved` y por el mismo motivo —que
`movements` y `status` son un solo hecho y el reducer es el único escritor del
arreglo:

- Solo aplica en `ready`. Fuera de ahí no hay **History** de la cual quitar nada, y
  una remoción durante `reading` sería pisada por la respuesta ya en vuelo. El
  evento se descarta devolviendo el mismo estado.
- Quita por id, **inmutablemente**: el arreglo del que el motor ya derivó un
  portafolio no se reescribe por debajo.
- Un id que no está es no-op, devolviendo el mismo objeto de estado.

La acción del store es un envoltorio delgado sobre este evento, como las que ya
existen.

### "La data refrescada" significa el store, no una relectura

Al confirmar la base, el movimiento sale del store — y con eso **todo** lo derivado
se recalcula solo, porque el store es la única entrada del motor. No solo desaparece
la fila del historial: se recalculan **Cash**, **Cost Basis**, **Net P&L**,
**Realized P&L**, **Total Portfolio Value** y la asignación del donut, en Inicio,
Portafolio y el detalle de cada acción.

**No se vuelve a leer la History desde el backend.** Sería redundante —el store ya
es la fuente— y contrario a `ADR-0006`, que define la lectura como un acto
todo-o-nada de tres selects: reejecutarlo tras cada borrado cambia un hecho conocido
por un viaje de red que puede fallar y dejar al usuario en pantalla de error después
de un borrado exitoso.

### Sin remoción optimista

`ADR-0010` gobierna la escritura: la fila **no** desaparece al confirmar, desaparece
cuando la base responde. Entre una cosa y la otra hay un estado visible que hay que
diseñar y construir: la fila sigue en su sitio, atenuada, sin responder a toques y
con indicación de progreso.

Vale registrar **por qué esto es más barato que en el guardado**: de las tres líneas
que hacen peligroso copiar el bloque de guardado, ninguna aplica a un borrado. No hay
id que acuñar una vez por sesión —el **Movement** ya tiene el suyo y no hay insert,
así que no hay historia de duplicados—; no vuelve ningún objeto a unirse al store, de
modo que no hay `createdAt` que pueda venir del reloj equivocado. Lo que sobrevive de
`ADR-0010` para un borrado es una sola frase: **no lo saques del store hasta que la
base diga que sí.**

### Un hook compartido, no una máquina de estados

El ciclo —confirmar, eliminar, aplicar o fallar— vive en un hook consumido por los
**dos** call sites, con la forma que el backlog ya prescribe para su hermano del
guardado: `{ deleting, deleteFailed, remove }`.

Es un hook y no un módulo puro **a propósito**. Se evaluó extraerlo como máquina de
estados testeable en aislamiento y se descartó: no se va a testear (ver *Testing
Decisions*), así que "extraer para testear" sería una excusa, no una razón. Lo que
justifica compartirlo es más simple: hay dos call sites, y en este repo el bloque
equivalente de guardado empezó en dos copias y hoy está en cinco.

**No se tocan los formularios existentes.** La entrada del backlog sobre el ciclo de
guardado pide explícitamente que esa conversión sea su propio commit sin cambio de
comportamiento, para que una regresión sea atribuible a quien la causó.

### El gesto: revela, nunca ejecuta

Deslizar de derecha a izquierda revela la acción. **El swipe completo no dispara
nada**: topa contra el ancho del panel con fricción y queda abierto. Para eliminar
hay que tocar el botón.

Se evaluó el full-swipe de iOS Mail y se descartó: su beneficio es exactamente un tap,
está dimensionado para una frecuencia que esta app no tiene (borrar un **Movement** es
raro y correctivo), y no sería "el estándar de iOS" —el de Apple ejecuta de inmediato
emparejado con recuperabilidad, no con un modal, y acá el borrado es duro. Además
crearía un modo oculto: el mismo gesto con dos resultados según una distancia
invisible. Es aditivo si alguna vez se quiere.

Comportamiento del gesto: umbral de arrastre antes de empezar para que el scroll
vertical gane; una sola fila abierta a la vez; scroll o toque fuera cierran; con la
fila abierta el primer toque cierra y no navega.

### El panel vive dentro de la card, y es rojo

Resuelto en los sketches y cerrado en el brief: el panel se revela **dentro** de los
límites de la card y el radio lo recorta; ancho fijo con área táctil por encima del
mínimo. Sale casi gratis porque el contenedor del swipeable ya recorta su contenido.

El color es el token de pérdida que ya existe. Se probó un token `danger` propio y
resultó indistinguible en pantalla del que ya había; se probó neutro y dejó de leerse
como destructivo. El ícono de basurero es **obligatorio**: el color nunca es el único
canal, y si la etiqueta no entra, el ícono va solo con su etiqueta de accesibilidad.

### El swipe se monta en el call site, no en la fila

El componente de fila es **compartido**: lo renderiza el historial de la tab y
también el historial por ticker del detalle de una acción, en contenedores distintos.
El swipeable envuelve la fila **en el call site de la tab**, para que el historial por
ticker no herede un gesto que nadie decidió darle.

### La confirmación es el alert nativo

Se sigue la única convención de confirmación destructiva que la app tiene: alert
nativo, solo título, con `Cancelar` primero y la acción destructiva marcada como tal.
Copy en español. **No hay "Deshacer"**: se evaluó y se descartó porque el borrado es
duro en la base, así que un undo obligaría a retener la fila o a reinsertarla.

### La navegación del detalle: volver, no ir

Al confirmar desde el detalle, la pantalla **vuelve atrás** en la pila. No navega a
una ruta fija.

Esto importa porque el detalle es alcanzable desde **dos** sitios: el historial de la
tab y el historial por ticker. "Ir a Movimientos" expulsaría de su contexto a quien
llegó desde una acción. Volver atrás aterriza en Movimientos en el caso común, que es
lo pedido, y en la acción en el otro.

**Orden de las operaciones:** primero se deja la pantalla, después se aplica la
remoción al store. Al revés, el detalle se re-renderizaría sin su movimiento y
mostraría "No encontramos este movimiento" por un instante — un mensaje de error
correcto para un movimiento que nunca existió, y desconcertante para uno que el
usuario acaba de borrar a propósito.

### El backend ya está listo; el cliente no

Las tres tablas ya tienen políticas de borrado por **Perfil**. No hace falta
migración. Lo que falta es del lado del cliente: no existe ni una llamada de borrado
en la app, el store no tiene la acción y el proveedor de gestos, aunque instalado y
enlazado, **no está montado en la raíz** — hoy entra solo como dependencia
transitiva. Montarlo es requisito de cualquier swipeable.

### Estados de la lista tras eliminar

Los dos estados vacíos ya existen y **no se rediseñan**; lo nuevo es llegar a ellos
por borrado. Eliminar el último **Movement** lleva al vacío real, con su ilustración
y su invitación a agregar, y los chips de filtro dejan de dibujarse. Eliminar el
último de un tipo con filtro activo lleva al vacío filtrado, que nombra el tipo y
ofrece quitar el filtro, con los chips todavía visibles.

La fila colapsa con la transición de layout que la lista ya corre.

## Testing Decisions

### Qué hace bueno a un test acá

Los tests de este repo prueban **comportamiento externo**, no implementación: se le
dan entradas a una función pura y se afirma sobre lo que devuelve. El reducer de la
**History** se prueba alimentándolo con eventos, sin montar nada y sin mocks, y sus
aserciones incluyen la **identidad del objeto** —que un evento descartado devuelva
exactamente el mismo estado— porque esa es la diferencia observable entre "se ignoró"
y "se recalculó igual".

### Qué se testea

**Solo el reducer**, en el archivo que ya prueba la máquina de estados de la
**History**. Cobertura:

- Un **Movement** eliminado sale de la **History** en hand.
- La remoción es inmutable: el arreglo anterior queda intacto y no se reescribe.
- El evento se descarta en todo estado que no sea `ready`, devolviendo el mismo
  objeto de estado.
- Un id que no está en la **History** es no-op.
- Eliminar el único **Movement** deja una **History** `ready` y vacía — que es una
  **History** legítima, no un fallo. Es la misma distinción que el reducer ya
  defiende para un **Perfil** que no ha registrado nada.

### Prior art

El archivo de tests del reducer es el molde exacto: mismos helpers para construir
estados (`reading`, un `read()` exitoso, un `failed()`), mismo estilo de aserción por
igualdad estructural, y el patrón ya escrito de `toBe(state)` para eventos
descartados. Los tests de view-model son el molde para fábricas por tipo de
movimiento, si alguna vez se amplía la cobertura.

### Huecos conocidos y aceptados

Se decidió deliberadamente **no** testear:

- **`deleteMovement`.** Queda sin cubrir la regla de idempotencia —fila ya borrada es
  éxito— que es la regla menos obvia de esta feature y la más probable de romperse en
  un cambio futuro. Testearla exigiría falsear la base, y el único archivo de la suite
  que lo hace declara un presupuesto explícito de dos casos; este sería el tercero.
- **El hook del ciclo de borrado.** No es testeable sin renderer, y se eligió la forma
  de hook precisamente porque no se iba a testear.
- **El view-model.** No recibe cobertura nueva; el marcado de la fila en curso de
  borrado queda verificado a mano.
- **El gesto.** No se prueba automatizadamente. El umbral, el rebote y la velocidad
  son propiedades del dedo y se validan en dispositivo.

## Out of Scope

- **Editar** un **Movement**. `ADR-0007` contempla la edición, pero no existe pantalla
  de edición y esta feature no la abre.
- **Deshacer.** Descartado con razón registrada.
- **Selección múltiple o borrado masivo.**
- **Swipe en el historial por ticker** del detalle de una acción. Comparte el
  componente de fila, pero no el gesto.
- **Long-press o menú contextual** como vía alternativa.
- **Revalidar la History resultante.** Prohibido por `ADR-0007`, no omitido por
  descuido.
- **Refactorizar el ciclo de guardado** de los cinco formularios. Es una entrada de
  backlog con su propio plan y su propio commit.
- Tocar el motor de portafolio o las fórmulas de **Cash Impact**.
- Cambios de esquema o migraciones: las políticas de borrado ya existen.

## Further Notes

**Un link huérfano es posible y aceptable.** El trigger que vincula un **Perfil** con
sus **Stocks** dispara solo al insertar, así que eliminar el último **Movement** de un
ticker puede dejar el vínculo atrás. El costo es una cotización descargada y sin usar,
nunca una cifra equivocada. Registrado en `ADR-0015` y aceptado.

**Eliminar puede hacer desaparecer una posición.** Borrar la última compra de un
ticker lleva sus acciones a cero, y el motor filtra las posiciones por acciones
mayores a cero: el ticker deja de ser un **Holding** y su pantalla de detalle se
vuelve inalcanzable, aunque su **Realized P&L** siga contando. Esto **no es nuevo** ni
lo introduce esta feature — es la entrada de backlog *"A fully exited position
disappears from the app"*, que ya está diagnosticada y diferida con un enfoque
propuesto. El borrado simplemente le abre una segunda puerta. No se resuelve acá.

**Este PRD no lleva etiqueta de triage**: este repo no las usa.

**El diseño está cerrado, entero.** La geometría del panel, su color y el gesto
salieron de los dos sketches. Los estados del ciclo y las dos preguntas que el brief
dejaba abiertas las cerró el bundle de Claude Design que vive en
`stock-portfolio-design-prototype/` dentro de esta misma carpeta:

- **El alert lleva cuerpo** además de título, nombrando lo que se borra con el formato
  `Compra AAPL - 15 ene 2025 - $447.86`.
- **El control del detalle va debajo del total**, que sigue anclado al fondo; el botón
  cuelga debajo con su propio borde superior.
- **`Eliminando`** en la lista: la fila sigue presente, su contenido baja a opacidad
  0.45 y **el monto se reemplaza por un spinner** — no conviven. En el detalle el
  botón pasa a "Eliminando...", el ícono cede su lugar al spinner y **el recibo entero
  baja a 0.55**.
- **`Error al eliminar`**: banner superior con el idioma del banner de lectura fallida,
  y la frase `No se pudo eliminar. Intenta de nuevo.` Desde el error se puede volver a
  pedir el borrado sin salir de la pantalla.
- **La fila colapsa por altura** en ~200ms al desaparecer, con la opacidad saliendo un
  poco antes.
- **El gesto**: umbral de 8px **y** la condición de que el desplazamiento horizontal
  supere al vertical, para que el scroll gane los empates. Resistencia al arrastrar
  hacia el lado equivocado y al pasarse del ancho del panel. Abre si se suelta pasada
  la mitad del panel.

No queda diseño pendiente para esta feature.
