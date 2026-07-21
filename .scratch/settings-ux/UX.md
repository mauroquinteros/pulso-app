# Pulso — Ajustes UX Spec (`app/(tabs)/settings.tsx`)

> Sesion grill-with-docs (2026-07-19). La pantalla vive en
> `app/(tabs)/settings.tsx` (hoy stub de 20 lineas con `ThemedView`/`ThemedText`
> centrado) y **ya esta en la barra de tabs** como cuarta pestana, etiquetada
> "Ajustes" (`components/ui/tab-bar.tsx:33`).
>
> **Alcance deliberado:** esta sesion disena **solo la UI**. El metodo de login
> (Google OAuth / email+password / magic link) queda **sin decidir** por decision
> explicita del usuario — se define despues, junto con de donde sale la data real.
> Hoy **no hay auth en el repo**: `@supabase/supabase-js` esta en `package.json`
> pero no hay cliente, ni pantalla de login, ni guard de rutas.
>
> Esta sesion **si toca `CONTEXT.md`**: agrega el termino **Perfil** — la primera
> entrada de *identidad* en un glosario que hasta hoy era enteramente de dinero —
> y marca **"cuenta"** como ambiguo.
>
> **Verdad visual:** el prototipo en
> `.scratch/settings-ux/settings-design-prototype/project/Pulso Ajustes.dc.html`.
> Donde el prototipo y este doc difieran, **manda el prototipo** (ver §3.2).
>
> Regla de idioma: **todos los textos de UI en espanol**.

## 1. How to use this doc

Design brief settled de la pantalla de Ajustes. De aca sale el PRD y despues los
issues. Los terminos en negrita son del glosario (`CONTEXT.md`).

## 2. Product thesis

Ajustes responde ***"quien soy yo en esta app, y como me salgo?"***

Nada mas. No hay preferencias, ni toggles, ni opciones: `ADR-0002` deja la app en
**solo USD** y en un solo idioma, asi que los ajustes tipicos no estan pendientes
— estructuralmente no existen todavia.

Solo lectura, con una unica accion. No se edita el nombre ni el correo desde aca.

### La pantalla se llama "Ajustes", no "Perfil"

Se evaluo renombrarla a "Perfil" (la etiqueta, el archivo y el icono), porque hoy
la pantalla no contiene **ni un solo ajuste** y "Ajustes" promete algo que no
entrega.

**Rechazado por el usuario:** piensa agregar mas cosas ahi en el futuro, ademas de
ver la info del perfil. Con eso el nombre no miente, solo va adelantado. Se
mantienen `settings.tsx`, la etiqueta "Ajustes" y el icono de engranaje.

**Consecuencia asumida:** la tarjeta unica de hoy asume un solo bloque de
contenido. Cuando se sepa que mas entra, hay que revisar la estructura.

## 3. Anatomia de la pantalla

De arriba a abajo, dentro de `SafeAreaView edges={["top"]}` (patron de las otras
tabs):

```
┌─────────────────────────────┐
│  Ajustes                    │  <- titulo suelto sobre el fondo
│                             │
│  Mauro Quinteros            │  <- Perfil suelto, sin tarjeta
│  mauro@ejemplo.com          │
│  ───────────────────────    │  <- linea separadora
│                             │
│  ┌───────────────────────┐  │
│  │    Cerrar sesion      │  │  <- boton, en el flujo
│  └───────────────────────┘  │
│                             │
│         (vacio)             │
└─────────────────────────────┘
```

El vacio de abajo **no es un defecto que haya que rellenar**. La pantalla tiene
poco contenido porque la app hace pocas cosas.

### 3.1 Titulo

`Ajustes`, texto suelto sobre el fondo. Mismo patron que "Movimientos"
(`app/(tabs)/movements.tsx:31`) y "Portafolio" (`app/(tabs)/holdings.tsx:23`).

### 3.2 Bloque del Perfil

> **Actualizado contra el prototipo (2026-07-19).** La sesion de grill habia
> settled una **tarjeta** `surface` + `border`. El prototipo lo dibujo **suelto**
> y el usuario confirmo esa version: *"no me gusto que lo agrupe en tarjetas"*.
> El prototipo es la verdad visual.

**Texto suelto sobre el fondo**, sin tarjeta, seguido de una **linea separadora**
(`border-top: 1px solid` con `border`) que lo divide del boton.

El argumento original por la tarjeta era la regla no escrita del repo — titulos
sueltos, contenido siempre en tarjetas (worth-card, return-card, assets-card,
distribution-card), sin excepciones. **Se acepta la excepcion aqui**, por dos
razones que solo se ven renderizadas:

1. Con **dos lineas de texto y nada mas** (sin avatar, sin etiquetas), una tarjeta
   es una caja casi vacia. El chrome pesa mas que el contenido.
2. La linea separadora ya resuelve lo que la tarjeta venia a resolver — separar la
   **informacion** de la **accion** — al costo de un borde en vez de una caja.

**Consecuencia asumida:** el unico elemento con caja en la pantalla pasa a ser el
boton. En el render no molesta.

Contenido: **dos lineas de texto y nada mas.**

| | Contenido | Estilo |
| --- | --- | --- |
| Linea 1 | nombre completo | `textPrimary`, 21px, peso fuerte |
| Linea 2 | correo | `textSecondary`, 13px |

**Sin avatar, sin foto, sin iniciales.** Decision explicita del usuario: en
Ajustes "solamente es un nombre".

**Sin etiquetas** ("Nombre:", "Correo:"). Se evaluo reusar el patron de filas
etiquetadas de `components/movement-detail/receipt.tsx:30`, y se rechazo: ahi las
etiquetas existen porque **las cifras son ambiguas** — un "$1,240.00" puede ser el
**Gross Amount**, el **Cash Impact** o el total, y el glosario prohibe "monto" sin
calificar justo por eso. Un nombre y un correo no tienen ese problema: una cadena
con arroba solo puede ser un correo. La etiqueta le diria al usuario algo que ya
sabe, y duplicaria la tinta en la pantalla mas vacia de la app.

La jerarquia (grande/primario arriba, chico/apagado abajo) ya comunica la relacion
"esta persona, este es su contacto".

**Tamanos:** se reusan los que ya existen — 21px del `ScreenHeader`
(`components/ui/screen-header.tsx`) y 13px del `searchText` del Home
(`components/home/home-header.tsx`). **Cero `fontSize` nuevos**, por la deuda de
type-scale sprawl anotada en `.scratch/tech-debt/backlog.md`.

### 3.3 Boton "Cerrar sesion"

**Ubicacion:** en el flujo, debajo de la tarjeta, con separacion generosa.
**No anclado al fondo** — ahi quedaria pegado a la barra de tabs, que es la zona
mas facil de tocar por accidente en un movil. Anclarlo crearia justo el problema
que el `Alert` viene a prevenir.

**Estilo: neutro.** Superficie `surface` + borde `border`, texto en `accent`
(teal). Ancho completo.

**Por que NO es rojo** — la decision menos obvia de este spec:

El reflejo universal es pintar el destructivo con `Colors.negative` (`#FF5252`).
Pero **en Pulso ese token no significa "peligro": significa "perdida"**. Es el
color de un **Net P&L** negativo, en las filas de holdings, en el **Total Return**
y en el detalle de cada movimiento.

Es exactamente el mismo razonamiento que el proyecto ya dejo escrito en
`constants/theme.ts:20`, en la direccion contraria:

> *"Deposito's badge tint... Deliberately NOT `positive` itself — that token means
> **gain**, and a deposit is not a profit."*

Espejado: **un cierre de sesion no es una perdida.** En una app de finanzas, un
rojo grande puede leerse por medio segundo como "algo malo paso con tu dinero".

Ademas, cerrar sesion **no es destructivo de verdad**: no borra nada, no se pierde
plata, y se vuelve a entrar iniciando sesion otra vez. El rojo se reserva para lo
irreversible, y gastarlo aqui desgasta la senal para cuando de verdad haga falta.

**Descartado tambien:** crear un token nuevo tipo `danger` (siguiendo el patron de
`depositGreen`). Seria un token para **un** boton en **una** pantalla — la
abstraccion de un solo uso que `CLAUDE.md` prohibe.

### 3.4 Confirmacion

Al tocar el boton se abre un **`Alert.alert` nativo**:

- Titulo: `¿Cerrar sesion?`
- Acciones: `Cancelar` (style `cancel`) / `Cerrar sesion` (style `destructive`)

**Por que confirmar, si el boton no es rojo.** Son dos cosas distintas: el **color**
comunica gravedad, la **confirmacion** previene el toque accidental. Y hay un factor
que hoy **no se puede evaluar**: cuanto cuesta volver a entrar depende del metodo de
login, que quedo sin decidir. Con OAuth volver es un tap; con magic link es salir de
la app, abrir el correo y esperar. La asimetria favorece confirmar: si el login
resulta caro, el seguro ya esta puesto; si resulta barato, cuesta un tap que nadie
nota.

**Descartado:** un modal propio dentro del lenguaje visual de la app. `Alert.alert`
es API de plataforma — cero componentes, cero estado, nativo en iOS y Android, y
trae `destructive` gratis en iOS. Reconsiderar el dia que haya tres confirmaciones
distintas.

## 4. La fuente unica del Perfil

Requisito explicito del usuario: **una sola fuente de info del usuario**, que sirva
tanto para Ajustes como para el disco del Home.

**Forma:** una constante `MOCK_PROFILE = { name, email }` en `lib/`, con tipo
`Profile`.

**Nombre del tipo:** `Profile`, **no** `User` — el glosario registra **Perfil**
precisamente para no decir "usuario" a secas.

**Por que constante y no store de zustand.** El repo tiene los dos precedentes y
son distintos a proposito: `stores/movements.ts` existe porque los movements
**mutan** (`addMovement`); `lib/mock-data.ts` es data estatica. El Perfil hoy **no
muta** — no se edita el nombre ni el correo desde la app. Un store sin acciones es
una constante con ceremonia encima.

Ademas, cuando llegue auth el Perfil vendra de la sesion (probablemente via un hook
tipo `useSession()`), no de un store alimentado a mano. O sea que el store **tampoco**
sobrevive: seria una tercera cosa que hay que reemplazar igual. Con la constante, el
reemplazo es cambiar un import por un hook en dos archivos.

### 4.1 El nombre es UNO solo

`name: "Mauro Quinteros"` — un solo campo, **no** `firstName` + `lastName`.

Los proveedores de identidad (y el `user_metadata` de Supabase) entregan **un**
`full_name`. Partirlo al guardar solo mueve el problema del render a la escritura, y
encima lo congela mal en la fuente.

**Las iniciales se derivan al mostrar, nunca se guardan.**

## 5. Efecto colateral: el disco del Home

Fuera de la pantalla de Ajustes, pero parte del mismo feature por el requisito de
fuente unica.

El disco del Home (`components/home/home-header.tsx:14`) tiene hoy una **`"P"`
hardcodeada** — o sea, el avatar dice *Pulso*, no dice *quien eres tu*. Es branding
disfrazado de perfil.

Con la fuente unica en su lugar, ese disco pasa a mostrar **las iniciales reales**
derivadas del `name` del **Perfil**. El gradiente (`Gradients.avatar`) y el token
`avatarText` no cambian.

**Regla de derivacion:** primera letra de la primera palabra + primera letra de la
**segunda** palabra, ignorando el resto. Para `"Mauro Quinteros Rojas"` da `"MQ"`,
que es lo que un peruano espera ver.

**Caso feo conocido y aceptado:** apellidos con particula (`"Mauro de la Cruz"` da
`"MD"`). Se acepta; no vale la pena una heuristica de particulas para esto.

## 6. Glosario tocado (`CONTEXT.md`)

Ya aplicado en esta sesion:

**Termino nuevo — Perfil:**
> Who is using the app: a full name and an email address. It is the single source
> of the user's identity — every place that shows the user (the Home avatar disc,
> the Settings screen) reads it, so the same person is never spelled two ways. The
> full name is **one** name, not a first name and a last name held apart; initials
> for the avatar are derived from it at display time, never stored. Deliberately
> holds nothing about money — a Perfil owns **Movements**, but says nothing about
> them.
> _Avoid_: cuenta/account, usuario (unqualified)

**Ambiguedad marcada nueva:**
> **"Cuenta" is banned as a standalone term** — it reads as both the **Perfil**
> (who logs in) and the Hapi brokerage account (where **Cash** and the holdings
> live). Say which one.

## 7. Sin ADR

Se evaluo contra los tres criterios (dificil de revertir / sorprendente sin
contexto / resultado de un trade-off real) y **ninguna decision califica**: todas son
baratas de revertir. Cambiar el color del boton, el patron de etiquetas o pasar de
constante a store es trabajo de minutos.

Las dos decisiones con razonamiento no obvio (el boton neutro en vez de rojo, y la
constante en vez del store) quedan documentadas **aqui**, que es donde corresponde.

## 8. Fuera de alcance

- **El metodo de login.** Sin decidir por eleccion del usuario.
- **A donde va el usuario despues de cerrar sesion.** No hay pantalla de login
  todavia, asi que `signOut()` termina en el aire. Se resuelve con el feature de
  auth.
- **Editar el perfil.** Solo lectura.
- **Eliminar cuenta.** No es un boton sino un flujo (confirmacion + borrado real +
  decidir que pasa con los **Movements**), y hoy no hay backend que borrar.
- **Foto de perfil, avatar o iniciales dentro de Ajustes.**
- **Cualquier ajuste real** (idioma, moneda, notificaciones, version de la app).
