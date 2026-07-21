# Ajustes: pantalla de Perfil + cerrar sesión

**Type:** AFK
**Source:** `.scratch/settings-ux/PRD.md` · `.scratch/settings-ux/UX.md` ·
prototipo `.scratch/settings-ux/settings-design-prototype/project/Pulso Ajustes.dc.html`

## What to build

El tab **Ajustes** es hoy un stub que muestra la palabra "Settings" centrada en
la pantalla. Este slice lo reemplaza por la pantalla real, que responde
***"quién soy yo en esta app, y cómo me salgo?"*** y nada más.

**El prototipo es la verdad visual pixel-perfect.** Donde este issue y el
prototipo difieran, manda el prototipo.

### Estructura

De arriba a abajo, dentro de `SafeAreaView edges={["top"]}` (patrón de las otras
tabs):

```
Ajustes                     <- titulo suelto sobre el fondo, 28 / 800 / -0.6
Mauro Quinteros             <- 21px, peso fuerte, textPrimary
mauro@ejemplo.com           <- 13px, textSecondary
─────────────────────       <- linea separadora, 1px, color border
[    Cerrar sesion    ]     <- boton neutro, en el flujo
                            <- vacio intencional
```

### El Perfil va suelto, sin tarjeta

Esto es una **excepción consciente** a la regla no escrita del repo (los títulos
de pantalla van sueltos, el contenido siempre va en tarjetas: worth-card,
return-card, assets-card, distribution-card — no hay otra excepción hoy).

Se acepta aquí por dos razones que solo se ven renderizadas: con **dos líneas de
texto y nada más** una tarjeta es una caja casi vacía, y la línea separadora ya
cumple lo que la tarjeta venía a cumplir — dividir la **información** de la
**acción**.

**Sin avatar, sin foto, sin iniciales** en esta pantalla. El disco de iniciales es
del Home y solo del Home.

**Sin etiquetas** ("Nombre:", "Correo:"). Las etiquetas del recibo de movimiento
existen porque **las cifras son ambiguas** — un monto puede ser el **Gross
Amount**, el **Cash Impact** o el total, y el glosario prohíbe "monto" sin
calificar justo por eso. Un correo se explica solo. La jerarquía (grande/primario
arriba, chico/apagado abajo) ya comunica la relación.

### Cero tokens y cero tamaños nuevos

Los tres tamaños ya existen en el repo: el 28/800/-0.6 del título es el de los
otros tabs, el 21 del nombre es el del `ScreenHeader`, el 13 del correo es el del
buscador del Home. **No se introduce ningún `fontSize` nuevo** — la deuda de
type-scale sprawl ya está registrada en `.scratch/tech-debt/backlog.md`.

### El botón "Cerrar sesión"

Estilo **neutro**: superficie `surface`, borde `border`, radio, ancho completo,
texto en `accent` (teal), peso fuerte.

**No usa `Colors.negative`.** En Pulso ese token no significa "peligro" sino
**pérdida**: es el color de un **Net P&L** negativo, del **Total Return** y del
detalle de cada movimiento. Es el mismo razonamiento que el repo ya dejó escrito
para `depositGreen` ("that token means *gain*, and a deposit is not a profit"),
espejado: **un cierre de sesión no es una pérdida**. En una app de finanzas un
rojo grande se lee por medio segundo como "algo pasó con tu dinero". Cerrar sesión
tampoco es destructivo de verdad — no borra nada y se vuelve a entrar iniciando
sesión. El rojo se reserva para lo irreversible.

**Tampoco se crea un token `danger`** siguiendo el patrón de `depositGreen`: sería
un token para un botón en una pantalla.

**Va en el flujo**, debajo de la línea separadora. **No anclado al fondo**: ahí
quedaría pegado a la barra de tabs, que es la zona más fácil de tocar por
accidente en un móvil.

### La confirmación

**`Alert.alert` nativo**, no un modal propio: cero componentes nuevos, cero
estado, nativo en ambas plataformas, y trae `destructive` gratis en iOS.

- Título: `¿Cerrar sesión?`
- Acciones: `Cancelar` (style `cancel`) y `Cerrar sesión` (style `destructive`)

El prototipo codifica la máquina de estados de forma más precisa que la prosa —
dos flags independientes, no un enum:

```js
state = { alertOpen: false, signedOut: false }
askSignOut: () => setState({ alertOpen: true,  signedOut: false })
cancel:     () => setState({ alertOpen: false })
confirm:    () => setState({ alertOpen: false, signedOut: true })
```

En la app real `alertOpen` **no existe** como estado propio — lo administra
`Alert.alert`. Lo que importa del snippet es que **cancelar no deja rastro** y que
**confirmar cierra el diálogo antes de disparar la salida**.

### El final abierto de `signOut()`

**No hay pantalla de login a la cual navegar.** Confirmar no tiene destino: es el
punto de sutura con el feature de auth, que aún no existe (no hay cliente de
Supabase, ni login, ni guard de rutas).

**No inventar** una pantalla de login, un guard, ni un estado de "sesión cerrada".
El botón queda cableado hasta donde llega el alcance de este issue.

### Lo que NO se toca

**La pantalla sigue llamándose "Ajustes"** y su archivo no se renombra. Se evaluó
pasarla a "Perfil" (hoy no contiene ni un ajuste, y `ADR-0002` cierra las puertas
a moneda e idioma) y el usuario lo **rechazó**: piensa agregar más cosas ahí. Se
mantienen la ruta actual, la etiqueta y el ícono de engranaje.

**Sin view-model.** Las otras features tienen uno porque hay derivación real
(fracciones, agrupaciones, tonos, formateo). Aquí entrarían dos strings y saldrían
los mismos dos strings — una función identidad con nombre elegante. La pantalla
consume la constante del Perfil directo.

## Acceptance criteria

- [ ] El tab Ajustes ya no muestra el stub "Settings"
- [ ] El título dice "Ajustes", suelto sobre el fondo, con el mismo estilo que los títulos de Movimientos y Portafolio
- [ ] El nombre y el correo salen de la constante del Perfil del slice 01, no de strings locales
- [ ] El nombre se muestra a 21px en `textPrimary`; el correo a 13px en `textSecondary`
- [ ] El Perfil va suelto sobre el fondo, **sin** tarjeta `surface`
- [ ] Hay una línea separadora de 1px en color `border` entre el correo y el botón
- [ ] No hay etiquetas de campo ("Nombre", "Correo")
- [ ] No hay avatar, foto ni iniciales en esta pantalla
- [ ] No se introduce ningún `fontSize` nuevo al repo
- [ ] No se introduce ningún color token nuevo
- [ ] El botón "Cerrar sesión" usa `surface` + `border` con texto en `accent`
- [ ] El botón **no** usa `Colors.negative`
- [ ] El botón está en el flujo bajo el separador, **no** anclado al fondo
- [ ] Tocar el botón abre un `Alert.alert` nativo titulado "¿Cerrar sesión?"
- [ ] El alert ofrece "Cancelar" (`cancel`) y "Cerrar sesión" (`destructive`)
- [ ] Cancelar cierra el alert sin efecto alguno
- [ ] Confirmar cierra el alert; no navega a ninguna parte (documentado como pendiente de auth)
- [ ] La ruta, la etiqueta "Ajustes" y el ícono de engranaje quedan sin cambios
- [ ] No se crea ningún view-model para esta pantalla
- [ ] La pantalla coincide con el prototipo
- [ ] La suite completa pasa; `tsc` y `eslint` limpios

## Blocked by

- `.scratch/settings-ux/issues/01-profile-source-and-home-initials.md` — la
  pantalla consume la constante del Perfil que nace en ese slice
