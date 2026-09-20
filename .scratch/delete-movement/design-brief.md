# Design brief: eliminar un movimiento

> Prompt para **Claude Design** (claude.ai/design). No es un PRD ni un UX.md
> (esos los escriben `to-prd` y `grill-with-docs`). Es el encargo para que la
> herramienta de diseno produzca el prototipo `.dc.html`, que luego vuelve como
> handoff bundle a `.scratch/delete-movement/<nombre>-design-prototype/`.
>
> Regla de idioma: **todos los textos de UI en espanol**, excepto los tickers.

## 0. Como usar este brief

Pega las secciones 1-10 en Claude Design. La seccion 11 (**Fuera de alcance**) y
la 12 (**Deuda que este prototipo genera**) son para nosotros, no para la
herramienta: la 11 evita que el prototipo se expanda, la 12 lista los docs que
hay que corregir cuando esto se implemente.

---

## 1. Punto de partida: extiende un prototipo que ya existe

**No disenes la pantalla desde cero.** Esta feature es una capa sobre una
pantalla ya disenada y ya construida:

- Prototipo base: `.scratch/movements-ux/movement-list-design-prototype/project/Pulso Movimientos.dc.html`
- Prototipo del detalle: `.scratch/movement-detail-ux/stock-portfolio-design-prototype/project/Pulso Movimiento Detalle.dc.html`

Leelos completos antes de empezar. El titulo, los chips de filtro, la card de la
lista, la anatomia de la fila y los dos estados vacios **ya estan resueltos y no
se renegocian**. Lo unico nuevo es la accion de eliminar.

Medio y frame: mismo patron que los dos prototipos anteriores -- `x-dc`,
`x-import` de `./ios-frame.jsx` con `dark="{{ true }}"`, `hint-size="402px,874px"`,
fuente **Manrope**, y una clase `Component extends DCLogic` con un prop
`demoState` de tipo enum para conmutar estados.

## 2. Que se agrega, en una frase

En el historial de movimientos, **deslizar una fila de derecha a izquierda revela
una accion destructiva**; tocarla abre un **dialogo de confirmacion**; al
confirmar, el movimiento se elimina de forma permanente. El **detalle** del
movimiento gana la misma accion en un control visible.

## 3. Tokens y geometria reales (usalos, no inventes)

```
background   #0A0E27     textPrimary   #FFFFFF
surface      #111638     textMuted     #8E8E93
border       #1C224D     textBright    #E8EAF2
accent       #00E5CC     positive      #00C853
                         negative      #FF5252
```

Geometria de la fila, ya construida:

- La lista vive en una **card**: `surface`, `border` 1px, **radio 20**, padding
  horizontal **18px**, padding vertical 4px.
- Fila: badge **40x40** radio 12 | titulo (15px/700) + fecha (12px, `textMuted`)
  | monto a la derecha (15px/700, `textBright`, cifras tabulares).
- Separador entre filas: **1px** `border`. La primera fila **sin** borde superior.
- Padding vertical de la fila: **14px**. Sin chevron (decision explicita).

## 4. El problema visual central: la card tiene esquinas redondeadas

El patron canonico (iOS Mail, Gmail) asume filas **full-bleed**: el boton entra
desde el borde de la pantalla y no hay nada que lo recorte. **En Pulso la fila
vive dentro de una card con radio 20 y 18px de padding horizontal**, asi que el
boton que entra desde la derecha choca con esa geometria.

**RESUELTO en el sketch 001** (`.planning/sketches/001-swipe-row-geometry/`).
No lo reabras: construilo asi.

**El panel vive DENTRO de la card, recortado por el radio 20, con 88px de ancho.**

- El contenido de la fila se desliza a la izquierda; el panel se revela detras,
  dentro de los limites de la card, y el radio 20 lo recorta en la primera y en la
  ultima fila.
- `ReanimatedSwipeable` lo da gratis: su contenedor ya trae `overflow:hidden`
  (documentado en su prop `containerStyle`), asi que basta un `borderRadius`.
- El clipeo contra la esquina **se lee como intencional**, que era la duda.

Descartadas, con su razon:

- **Fila full-bleed al deslizar** (104px, rompiendo el inset de la card): parte la
  card por dentro mientras hay una fila abierta.
- **La card entera como riel**: desaparece la respuesta a "que fila estoy
  borrando".

## 5. El color destructivo

**En Pulso el rojo significa perdida, no peligro.** `negative #FF5252`
(`constants/theme.ts:6`) se usa para P&L negativo y para errores de validacion, asi
que reusarlo para "eliminar" le da un segundo significado. Por eso la pregunta se
llevo a un sketch en vez de contestarse de memoria.

Dos aclaraciones, para que nadie reabra esto con datos viejos:

- La regla de `movements-ux/UX.md` que prohibia verde y rojo en esta pantalla
  **fue retirada** (2026-09-16). Ya no gobierna: no la cites.
- El precedente de Settings **no dice lo que parece**. Pinta "Cerrar sesion" en
  neutro, pero su comentario aclara por que: *"in Pulso red means loss, and signing
  out is not one - nothing is destroyed, you just log back in."* Evito el rojo
  porque cerrar sesion **no destruye nada**, no por tratarse de una accion
  peligrosa. Eliminar un movimiento si destruye, asi que ese precedente **no
  prohibe** el rojo aqui.

**RESUELTO en el sketch 002** (`.planning/sketches/002-destructive-color/`).
No lo reabras: construilo asi.

**El panel usa `negative #FF5252`, el token que ya existe. Sin token nuevo.**

- Se probo un `danger` propio (`#E5484D`, crimson) y **murio en pantalla**: al lado
  de `#FF5252` son practicamente el mismo color. Un token que nadie distingue no
  compra nada y cuesta una entrada mas en `theme.ts`.
- Se probo un panel neutro y se descarto por señal: deja de leerse como
  destructivo, y `destructive-emphasis` pide color semantico.
- Lo que hace defendible reusar el rojo: un **icono de basurero sobre un panel
  revelado por un gesto** es un contexto que ninguna cifra de P&L comparte. El rojo
  queda sobrecargado, pero no ambiguo.

Regla que viaja con la decision y **no se negocia**: el color no puede ser el unico
canal (`color-not-only`). El icono de basurero es obligatorio. Si "Eliminar" no
entra en 88px, el icono va solo **con `accessibilityLabel`**.

## 6. El gesto

- Direccion: **derecha a izquierda**. No compite con el swipe-back de iOS, que va
  al revés y nace del borde izquierdo.
- **Umbral de arrastre** antes de que el gesto empiece, para que el scroll
  vertical gane siempre (`drag-threshold`, `gesture-conflicts`).
- **Una sola fila abierta a la vez.** Deslizar otra cierra la anterior.
- **Scroll o tap fuera cierran** la fila abierta.
- Con la fila abierta, el **primer tap cierra**; no navega al detalle. La fila ya
  es `Pressable` y navega a `/movement/[id]`, asi que tap y swipe conviven en el
  mismo control y el conflicto tiene que quedar resuelto.
- **Swipe completo: solo revela.** Llega al ancho del panel, topa con friccion y
  se queda abierto. **No dispara el alert ni borra.** Para eliminar hay que tocar
  el boton.

  Esto se evaluo contra el full-swipe de iOS Mail y se descarto con razon, asi que
  **no lo reintroduzcas**:

  1. **El beneficio es exactamente un tap.** Revelar + tocar boton + confirmar son
     3 interacciones; full-swipe + confirmar son 2. Se paga codigo de gesto a
     medida y un umbral invisible para ahorrar uno.
  2. **Esta dimensionado para una frecuencia que esta app no tiene.** El full-swipe
     de Mail se amortiza porque se borran decenas de correos por sesion. Borrar un
     **Movement** es raro y correctivo: se corrige un registro mal tipeado de vez
     en cuando.
  3. **No seria "el estandar de iOS", aunque lo parezca.** El full-swipe de Apple
     *ejecuta la accion de inmediato* y va emparejado con recuperabilidad (Mail
     manda a Papelera, y se deshace). No va con un modal. Aqui el borrado es duro
     (`ADR-0007`) y la compuerta es la confirmacion, asi que la condicion que hace
     funcionar el patron de Apple no esta. "Swipe completo -> modal" es un hibrido,
     no una convencion.
  4. **Crearia un modo oculto**: el mismo gesto con dos resultados segun una
     distancia que nadie ve.

  Si algun dia se quiere, es **aditivo**: se monta encima sin invalidar la
  geometria ni el color ya decididos.
- Area tactil del boton **>= 44x44pt**. Si es solo icono, lleva
  `accessibilityLabel` (`aria-labels`).
- El gesto es invisible por naturaleza (`swipe-clarity`). No lo resolvemos con un
  tutorial ni con un chevron: lo resuelve el **boton visible del detalle**
  (seccion 8), que es la via descubrible.

  Esto no es opcional. La regla **"No Gesture-Only Actions"** es de severidad
  **Critical** — *"Don't rely solely on hidden gestures for core actions"* — y su
  ejemplo de buena practica es literalmente *"Swipe to delete + visible Delete
  button"*. Si la seccion 8 se recortara, el swipe quedaria como unica via de
  borrado y la feature incumpliria una regla critica.

## 7. Confirmacion: alert nativo, no modal propio

La app tiene **una sola** convencion de confirmacion destructiva, y es
`Alert.alert` nativo, **solo titulo y sin cuerpo**, con `Cancelar` primero:

```
"¿Cerrar sesion?"   [Cancelar]  [Cerrar sesion (destructive)]
```

Seguila. **Dibuja el alert nativo de iOS tal cual se ve** (no un modal
custom): es la convencion, no se puede reestilizar, y desviarse significa
introducir un componente nuevo.

Copy propuesto, **en espanol**:

- Titulo: `¿Eliminar este movimiento?`
- Botones: `Cancelar` (cancel) + `Eliminar` (destructive)

**Una desviacion que se evaluo:** la convencion es solo-titulo, pero borrar un
movimiento es mas consecuente que cerrar sesion, y es irreversible. El argumento a
favor del cuerpo: el usuario deslizo una fila en una lista densa y puede haber
deslizado la equivocada, y el cuerpo es la ultima oportunidad de verlo. El argumento
en contra: rompe la unica convencion que la app tiene.

> **RESUELTO por el prototipo** (`stock-portfolio-design-prototype/`). **Gana el
> cuerpo**: el alert lleva titulo *y* cuerpo, nombrando el movimiento con el formato
> `Compra AAPL - 15 ene 2025 - $447.86`. No lo reabras.

Di explicitamente que **no hay "Deshacer"**. Se evaluo y se descarto: el borrado
es duro en la base (`ADR-0007`), asi que un undo obligaria a retener la fila o a
re-insertarla. La confirmacion es la unica red.

## 8. La accion en el detalle del movimiento

La pantalla `/movement/[id]` es un recibo de solo lectura: header `ScreenHeader`
con back y titulo "Detalle", encabezado de identidad (badge 52x52 + label +
fecha), lineas de hairline, y **el total anclado al fondo de la pantalla**,
empujado por el espacio libre.

Ese total anclado es el problema: ocupa el lugar donde normalmente iria un boton
destructivo.

> **RESUELTO por el prototipo** (`stock-portfolio-design-prototype/`). **Gana la
> opcion 2**: el total se queda anclado al fondo y el boton cuelga debajo, con su
> propio borde superior. La opcion 1 quedo construida en el prototipo como variante
> alternativa, pero no es la elegida. No lo reabras.

Las dos variantes que se compararon:

1. **Icono de basurero arriba a la derecha del header.** Idioma iOS, no toca la
   composicion del recibo ni compite con el total. Hoy el header solo tiene back,
   asi que gana un slot derecho.
2. **Boton de texto debajo del total.** Mas descubrible y mas explicito; cuesta
   que hay que decidir si el total sigue anclado al fondo o si el boton lo
   desplaza.

Requisito de separacion: la accion destructiva va **visualmente separada** del
resto del contenido (`destructive-emphasis`, `destructive-nav-separation`). Abre
el mismo alert de la seccion 7.

Al confirmar, **vuelve atras en la pila** -- no navega a una ruta fija. Este detalle
es alcanzable desde **dos** sitios: el historial de la tab y el historial por ticker
del detalle de una accion. "Ir a Movimientos" expulsaria de su contexto a quien llego
desde una accion; volver atras aterriza en Movimientos en el caso comun y en la accion
en el otro.

**Orden de las operaciones:** primero se deja la pantalla, despues se aplica la
remocion. Al reves, el recibo se re-renderiza sin su movimiento y muestra "No
encontramos este movimiento" por un instante.

## 9. Estados que el prototipo tiene que mostrar

`ADR-0010` prohibe el borrado optimista: **la fila no desaparece al confirmar,
desaparece cuando la base de datos responde.** Eso hace visible un estado
intermedio que hay que disenar. Usa el enum `demoState`:

| `demoState` | Que se ve |
| --- | --- |
| `Fila cerrada` | La lista normal, sin nada revelado. El estado de partida. |
| `Fila deslizada` | Una fila abierta con la accion revelada. El estado que resuelve la seccion 4. |
| `Confirmando` | El alert nativo encima de la lista, con la fila abierta debajo. |
| `Eliminando` | Confirmado, esperando a la base. La fila **sigue ahi**: atenuada, no tocable, con indicador de progreso. Disena esto. |
| `Error al eliminar` | La base rechazo. La fila vuelve intacta y el error se comunica. La app ya tiene el idioma: un banner que entra con fade desde arriba (`refresh-failed-banner`). Reusalo, no inventes un toast. Copy: `No se pudo eliminar. Intenta de nuevo.` |
| `Ultimo movimiento eliminado` | Se borro el unico movimiento que quedaba: la lista pasa al **estado vacio real** que ya existe (ilustracion + "Todavia no hay movimientos" + CTA "Agregar movimiento") y **los chips desaparecen**. |
| `Ultimo de su tipo eliminado` | Habia un filtro activo y se borro el ultimo de ese tipo: pasa al **vacio filtrado** que ya existe (`No tienes retiros` + "Quitar filtro") y **los chips siguen visibles**. |

Los dos ultimos estados **ya estan disenados**: no los rehagas, muestra la
transicion hacia ellos.

Movimiento: la fila colapsa al desaparecer (la lista ya corre
`LinearTransition`). Duraciones **150-300ms**, `ease-out` al entrar y salida mas
corta que la entrada. El gesto responde al dedo en tiempo real
(`gesture-feedback`). Nada bloquea el input durante una animacion.

## 10. Restricciones transversales

- **Solo dark mode.** La app no tiene paleta clara ni conmutacion de tema. No
  disenes variante light.
- **Textos en espanol**; tickers sin traducir.
- **Puntuacion ASCII en todo el copy.** Guion `-` (U+002D), nunca `−` (U+2212);
  comillas `'` y `"`, nunca `'` ni `"`. Los acentos y `¿¡` del espanol si van.
  El copy del prototipo termina en `.tsx` y esta regla ya rompio el test suite dos
  veces.
- **Nada de emoji como icono.** SVG inline, un solo grosor de trazo, coherente con
  los iconos Ionicons que ya usa la app.
- Safe areas respetadas; nada bajo el tab bar.
- Contraste **>= 4.5:1** para texto, incluido el del boton destructivo sobre su
  fondo.
- Monto de la fila: sigue **sin signo y sin color**. Eliminar no cambia eso.

---

## 11. Fuera de alcance (no para la herramienta)

- **Editar** un movimiento. `ADR-0007` lo contempla, pero no hay pantalla de edicion
  y esta feature no la abre.
- **Deshacer / toast de undo.** Descartado arriba, con razon.
- **Seleccion multiple / borrado masivo.**
- **Swipe en el historial del detalle de una accion.** `MovementRow` es
  **compartido**: lo renderiza la tab Movimientos (en `Animated.FlatList`) y
  tambien `/stock/[ticker]` (en un `ScrollView` con `.map()`). El swipe se aplica
  **en el call site de la tab**, no dentro del componente, para que el historial
  por ticker no lo herede sin haberlo decidido.
- **Long-press / menu contextual** como via alternativa.
- Tocar el motor (`utils/portfolio/`) o las formulas de **Cash Impact**.

## 12. Deuda que este prototipo genera (no para la herramienta)

Al implementarse, esto contradice documentacion vigente que hay que corregir en
el mismo cambio:

- `.scratch/movement-detail-ux/UX.md` §2 dice literalmente **"Solo lectura. No se
  edita ni se borra desde aca."** Deja de ser cierto con la seccion 8.
- `.scratch/movements-ux/UX.md` §15 lista **"Editar / borrar movimientos"** como
  fuera de alcance. Sigue siendo cierto para *editar*; deja de serlo para *borrar*.
- `.scratch/movements-ux/UX.md` §12 prohibia verde y rojo en esta pantalla.
  **Regla retirada por el usuario (2026-09-16)**: era una decision vieja y ya no
  gobierna. El panel destructivo usa `negative #FF5252` sin necesitar enmienda.
  Acotacion deliberada: se retiro *esa* regla, no el resto del documento — el
  **Cash Impact** por fila se sigue mostrando **sin signo y sin color**, que es una
  decision distinta y sigue vigente (ver §10).
- **El store no tiene borrado.** `stores/movements.ts` expone `movementSaved`,
  `startRead`, `answerRead`, `forgetHistory`; la union `HistoryEvent` de
  `utils/history-status.ts` es `readStarted | answered | movementSaved | forgotten`.
  Falta un caso `movementDeleted`.
- **`lib/history.ts` es insert-only**: solo `readHistory()` y `saveMovement()`. No
  hay ni un `.delete()` en `app/` ni en `lib/`.
- **El backend ya esta listo**: las tres tablas tienen politicas RLS de DELETE
  (`supabase/migrations/20260802012418_remote_schema.sql:171,175,179`).
- **`GestureHandlerRootView` no esta en `app/_layout.tsx`.** `react-native-gesture-handler`
  esta instalado y linkeado pero **sin un solo uso en JS**; hoy entra solo como
  dependencia transitiva. Cualquier swipeable basado en el lo necesita montado.
- `ADR-0015` avisa que el trigger de `user_stocks` dispara **solo en INSERT**, asi
  que eliminar un movimiento puede dejar un link huerfano. Costo: un Quote
  descargado y sin usar, nunca una cifra equivocada. Aceptable, pero que quede dicho.
