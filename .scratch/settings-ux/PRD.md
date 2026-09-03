# PRD — Vista de Ajustes (tab Ajustes)

> Fuente: `.scratch/settings-ux/UX.md` (spec settled, actualizada contra el
> prototipo `.scratch/settings-ux/settings-design-prototype/`). El prototipo es
> la referencia visual pixel-perfect; este PRD fija los contratos de módulos y
> las políticas que el prototipo no muestra. Términos en negrita = glosario
> (`CONTEXT.md`).
>
> **Alcance deliberado:** este PRD entrega **solo UI y datos mock**. El método de
> login queda sin decidir por decisión explícita del usuario. Hoy no hay auth en
> el repo: `@supabase/supabase-js` está en `package.json` pero no hay cliente, ni
> pantalla de login, ni guard de rutas.

## Problem Statement

El usuario ya tiene las cuatro pestañas de la app pobladas salvo una: **Ajustes**
es un stub que solo dice "Settings" centrado en la pantalla. No hay ningún lugar
donde el usuario vea quién es dentro de la app, ni forma de salirse de ella.

Peor: el disco de avatar arriba a la izquierda del Home muestra una **`"P"`
hardcodeada**. O sea, el elemento que todo usuario lee como "yo" en realidad dice
*Pulso*. Es branding disfrazado de identidad, y hoy no hay ninguna fuente de datos
del usuario que pueda corregirlo.

## Solution

Una pantalla de Ajustes mínima y honesta que responde ***"quién soy yo en esta
app, y cómo me salgo?"***:

1. **El Perfil**, como texto suelto sobre el fondo: nombre completo arriba, correo
   debajo. Sin avatar, sin foto, sin etiquetas. Una línea separadora lo divide de
   la acción.
2. **Un botón "Cerrar sesión"**, en el flujo, con estilo neutro (no rojo), que
   pide confirmación con un `Alert` nativo.

Y una **fuente única del Perfil** que alimenta tanto esta pantalla como el disco
del Home, que pasa a mostrar las **iniciales reales** del usuario en vez de la
`"P"`.

Toda la UI en español. Estilo visual del resto de la app (dark navy, Manrope,
título de tab suelto sobre el fondo).

## User Stories

1. As a Pulso user, I want to open the Ajustes tab and see my own name, so that I know which identity the app is showing my portfolio for.
2. As a Pulso user, I want to see my email address under my name, so that I can confirm which account the app is tied to.
3. As a Pulso user, I want my name rendered larger and brighter than my email, so that I read "this person, this is their contact" at a glance without labels.
4. As a Pulso user, I want no "Nombre:" / "Correo:" labels, so that the screen is not padded with words that tell me what I already know.
5. As a Pulso user, I want the screen titled "Ajustes" like the other tabs title themselves, so that the app feels like one product.
6. As a Pulso user, I want a "Cerrar sesión" button, so that I can leave the app when I am done or when someone else needs the device.
7. As a Pulso user, I want that button to look neutral rather than red, so that I never mistake it for a warning about my money.
8. As a Pulso user, I want the button placed in the flow under my profile rather than pinned to the bottom, so that I do not hit it by accident while reaching for the tab bar.
9. As a Pulso user, I want a separator line between my profile and the button, so that information and action read as two different things.
10. As a Pulso user, I want a confirmation dialog when I tap "Cerrar sesión", so that a stray tap does not throw me out of the app.
11. As a Pulso user, I want that dialog to offer "Cancelar" and "Cerrar sesión", so that backing out is as easy as confirming.
12. As a Pulso user, I want the dialog to be the native platform alert, so that it looks and behaves like every other confirmation on my phone.
13. As a Pulso user, I want the Home avatar disc to show my initials instead of a fixed letter, so that the disc means *me* and not the app's brand.
14. As a Pulso user, I want my initials derived from the same name shown in Ajustes, so that the app never spells my identity two different ways.
15. As a Pulso user with two surnames, I want my initials to be my first name plus my first surname ("Mauro Quinteros Rojas" gives "MQ"), so that the disc reads the way I would write my initials.
16. As a Pulso user with a single-word name, I want the disc to still show something sensible, so that the avatar never renders blank.
17. As a Pulso user, I want the empty space below the button left empty, so that the app does not invent features to fill it.
18. As a developer, I want the Perfil to live in exactly one place, so that Home and Ajustes cannot drift apart.
19. As a developer, I want initials computed at display time and never stored, so that there is no second copy of the name to keep in sync.
20. As a developer, I want the mock Perfil to be swappable for a real session with a change in two files, so that adding auth later is not a rewrite.
21. As a developer, I want no new `fontSize` values introduced, so that the type-scale debt already logged does not grow.
22. As a developer, I want no new color token introduced for the sign-out button, so that the palette does not gain a token used once.

## Implementation Decisions

### La fuente única del Perfil

- Se introduce el tipo **`Profile`**: `{ name: string; email: string }`.
- El nombre es **un solo campo** (`name: "Mauro Quinteros"`), **no** `firstName` +
  `lastName`. Los proveedores de identidad entregan un `full_name`; partirlo al
  guardar solo movería el problema del render a la escritura y lo congelaría mal.
- El tipo se llama `Profile`, **no `User`** — el glosario registra **Perfil**
  precisamente para no decir "usuario" a secas, y `Movement.userId` ya usa ese
  nombre para otra cosa (un id, no una identidad mostrable).
- Los datos mock viven en una **constante exportada** (`MOCK_PROFILE`), junto al
  resto de la data falsa, **no** en un store de zustand.
- **Por qué constante y no store:** un store existe para estado que muta.
  `stores/movements.ts` tiene `addMovement`; el Perfil no tiene ninguna mutación —
  no se edita el nombre ni el correo desde la app. Un store sin acciones es una
  constante con ceremonia encima. Y cuando llegue auth, el Perfil vendrá de la
  sesión (vía un hook tipo `useSession()`), así que el store tampoco sobreviviría:
  sería una tercera cosa a reemplazar.

### Derivación de iniciales

- Módulo puro **`initialsFrom(name: string): string`**. Es el único cómputo real
  de la feature.
- **Regla:** primera letra de la primera palabra + primera letra de la **segunda**
  palabra, ignorando el resto, en mayúsculas.
- `"Mauro Quinteros Rojas"` da **`"MQ"`** (no `"MQR"`) — es como un peruano escribe
  sus iniciales.
- Un nombre de una sola palabra devuelve **una sola letra**.
- **Caso feo conocido y aceptado:** apellidos con partícula (`"Mauro de la Cruz"`
  da `"MD"`). No se implementa heurística de partículas.
- Las iniciales **se derivan al mostrar, nunca se guardan**. No hay campo
  `initials` en `Profile`.

### Pantalla de Ajustes

- **No se renombra** la pantalla ni el archivo. Se evaluó pasar a "Perfil" (porque
  hoy no contiene ni un ajuste y `ADR-0002` cierra las puertas a moneda e idioma) y
  el usuario lo rechazó: piensa agregar más cosas ahí. Se mantienen la ruta actual,
  la etiqueta "Ajustes" y el ícono de engranaje.
- Estructura, de arriba a abajo, dentro de `SafeAreaView edges={["top"]}` (patrón
  de las otras tabs): título → nombre → correo → línea separadora → botón → vacío.
- **El Perfil va suelto sobre el fondo, sin tarjeta.** Esto es una **excepción
  consciente** a la regla no escrita del repo (títulos sueltos, contenido siempre
  en tarjetas: worth-card, return-card, assets-card, distribution-card). Con dos
  líneas de texto y nada más, una tarjeta es una caja casi vacía; la línea
  separadora ya cumple la función de dividir información de acción. Decidido
  viendo el prototipo renderizado.
- **Sin view-model.** Todas las features anteriores tienen uno porque hay
  derivación real (fracciones, agrupaciones, tonos, formateo). Aquí entrarían dos
  strings y saldrían los mismos dos strings — una función identidad con nombre
  elegante. La pantalla consume `MOCK_PROFILE` directo.

### Tipografía y color: cero tokens nuevos

- Título: **28 / 800 / -0.6**, idéntico a los títulos de las otras tabs.
- Nombre: **21px**, peso fuerte, `textPrimary` — el tamaño del `ScreenHeader`.
- Correo: **13px**, `textSecondary` — el tamaño del `searchText` del Home.
- **No se introduce ningún `fontSize` nuevo**, por la deuda de type-scale sprawl
  ya registrada en `docs/tech-debt/backlog.md`.

### El botón "Cerrar sesión"

- Estilo **neutro**: superficie `surface`, borde `border`, radio, ancho completo,
  texto en `accent` (teal), peso fuerte.
- **No usa `Colors.negative`.** En Pulso ese token no significa "peligro" sino
  **pérdida**: es el color de un **Net P&L** negativo, del **Total Return** y del
  detalle de cada movimiento. Es el mismo razonamiento que el proyecto ya dejó
  escrito para `depositGreen` ("that token means *gain*, and a deposit is not a
  profit"), espejado: un cierre de sesión no es una pérdida. En una app de
  finanzas, un rojo grande se lee por medio segundo como "algo pasó con tu dinero".
- **Tampoco se crea un token `danger`** siguiendo el patrón de `depositGreen`:
  sería un token para un botón en una pantalla — la abstracción de un solo uso.
- Además, cerrar sesión **no es destructivo de verdad**: no borra nada y se vuelve
  a entrar iniciando sesión. El rojo se reserva para lo irreversible.
- **Va en el flujo**, no anclado al fondo: ahí quedaría pegado a la barra de tabs,
  que es la zona más fácil de tocar por accidente.

### Confirmación

- **`Alert.alert` nativo**, no un modal propio. Cero componentes nuevos, cero
  estado, nativo en ambas plataformas, y trae `destructive` gratis en iOS.
  Reconsiderar el día que haya tres confirmaciones distintas.
- Título: `¿Cerrar sesión?`. Acciones: `Cancelar` (style `cancel`) y
  `Cerrar sesión` (style `destructive`).
- **Por qué confirmar si el botón no es rojo:** el color comunica gravedad, la
  confirmación previene el toque accidental. Además, cuánto cuesta volver a entrar
  depende del método de login, que está sin decidir — con OAuth es un tap, con
  magic link es salir de la app y abrir el correo. La asimetría favorece confirmar.

El prototipo codifica la máquina de estados de la confirmación de forma más precisa
que la prosa (dos flags independientes, no un enum):

```js
state = { alertOpen: false, signedOut: false }
askSignOut: () => setState({ alertOpen: true,  signedOut: false })
cancel:     () => setState({ alertOpen: false })
confirm:    () => setState({ alertOpen: false, signedOut: true })
```

En la app real `alertOpen` no existe como estado propio — lo administra
`Alert.alert`. Lo que importa del snippet es que **cancelar no deja rastro** y que
**confirmar cierra el diálogo antes de disparar la salida**.

### El disco del Home

- El header del Home deja de renderizar la `"P"` hardcodeada y pasa a mostrar
  `initialsFrom(profile.name)`.
- El gradiente (`Gradients.avatar`) y el token `avatarText` **no cambian**. Solo
  cambia el texto.
- Es el único cambio fuera de la pantalla de Ajustes, y existe por el requisito
  explícito de fuente única.

### El final abierto de `signOut()`

- **No hay pantalla de login a la cual navegar.** La acción de confirmar queda sin
  destino: es el punto de sutura con el feature de auth.
- No se inventa una pantalla de login, ni un guard de rutas, ni un estado de
  "sesión cerrada" en la app. El botón queda cableado hasta donde llega el alcance
  de este PRD.

## Testing Decisions

- Un buen test ejercita **comportamiento externo** de un módulo puro: dado un
  input, se afirma sobre el output — nunca sobre detalles internos ni sobre render
  de React Native.
- **Se testea únicamente `initialsFrom`** (vitest, sin React Native). Es el único
  cómputo de la feature. La pantalla de Ajustes, el header del Home y la constante
  `MOCK_PROFILE` son presentacionales o data estática y quedan sin tests.
- **No hay view-model que testear** — ver Implementation Decisions.
- Casos mínimos de `initialsFrom`:
  - dos palabras (`"Mauro Quinteros"`) da `"MQ"`
  - tres o más palabras (`"Mauro Quinteros Rojas"`) da `"MQ"`, **no** `"MQR"`
  - una sola palabra (`"Mauro"`) da `"M"`
  - minúsculas (`"mauro quinteros"`) da `"MQ"` (siempre mayúsculas)
  - espacios de más al inicio, al final y entre palabras no rompen el resultado
  - string vacío o solo espacios devuelve string vacío (el disco no revienta)
  - apellido con partícula (`"Mauro de la Cruz"`) da `"MD"` — **se afirma el
    comportamiento aceptado**, no el ideal, para que quede documentado en el test
- Prior art: los tests de los view-models de `add-movement` y del Home (mismo
  estilo: función pura in/out, tabla de casos).

## Out of Scope

- **El método de login** (Google OAuth / email+contraseña / magic link). Sin
  decidir por elección explícita del usuario.
- **La pantalla de login y el guard de rutas.** No existen; `signOut()` no tiene
  destino.
- **Persistencia de sesión**, tokens, refresh, cliente de Supabase.
- **Editar el Perfil.** La pantalla es de solo lectura.
- **Eliminar cuenta.** No es un botón sino un flujo (confirmación + borrado real +
  decidir qué pasa con los **Movements**), y hoy no hay backend que borrar.
- **Foto de perfil o avatar dentro de Ajustes.** El disco de iniciales es del Home
  y solo del Home.
- **Cualquier ajuste real**: idioma, moneda (`ADR-0002` fija solo USD),
  notificaciones, versión de la app, "Acerca de", términos.
- **Renombrar la pantalla a "Perfil"** o cambiar su ícono.
- **Reestructurar la pantalla para el crecimiento futuro.** El usuario pidió
  explícitamente no diseñar para lo que aún no existe.

## Further Notes

- Esta feature agregó al glosario el término **Perfil** — la primera entrada de
  *identidad* en un `CONTEXT.md` que hasta ahora era enteramente de dinero — y
  marcó **"cuenta"** como ambiguo: choca entre el **Perfil** (quien inicia sesión)
  y la cuenta de Hapi (donde vive el **Cash**). Ambos cambios ya están aplicados.
- **Sin ADR.** Se evaluó contra los tres criterios (difícil de revertir /
  sorprendente sin contexto / resultado de un trade-off real) y ninguna decisión
  califica: todas son baratas de revertir. Las dos con razonamiento no obvio (el
  botón neutro en vez de rojo, y la constante en vez del store) quedan
  documentadas en el `UX.md` y aquí.
- **Cuando llegue auth**, el cambio esperado es reemplazar el import de
  `MOCK_PROFILE` por un hook de sesión en dos lugares (la pantalla de Ajustes y el
  header del Home), y darle destino a la confirmación de `signOut()`. El tipo
  `Profile` y `initialsFrom` deberían sobrevivir sin cambios.
- La pantalla va a verse muy vacía, y eso es correcto: la app hace pocas cosas y
  `ADR-0002` recorta a propósito. El vacío no es un hueco a rellenar.
