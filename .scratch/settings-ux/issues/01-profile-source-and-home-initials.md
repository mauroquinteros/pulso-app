# Perfil: fuente única + iniciales en el disco del Home

**Type:** AFK
**Source:** `.scratch/settings-ux/PRD.md` · `.scratch/settings-ux/UX.md`

## What to build

Hoy el disco de avatar arriba a la izquierda del Home muestra una **`"P"`
hardcodeada**. O sea, el elemento que todo usuario lee como "yo" en realidad dice
*Pulso*: es branding disfrazado de identidad. Y no hay forma de arreglarlo porque
**no existe ninguna fuente de datos del usuario** en la app.

Este slice introduce el **Perfil** — el término que este feature agregó al
glosario (`CONTEXT.md`) — como la fuente única de la identidad del usuario, y lo
cablea al disco del Home, que pasa a mostrar las **iniciales reales**.

### El tipo y la constante

```ts
type Profile = { name: string; email: string }
```

El nombre es **un solo campo** (`"Mauro Quinteros"`), **no** `firstName` +
`lastName`. Los proveedores de identidad entregan un `full_name`; partirlo al
guardar solo movería el problema del render a la escritura y lo congelaría mal en
la fuente.

Se llama `Profile`, **no `User`** — el glosario registra **Perfil** precisamente
para no decir "usuario" a secas, y `Movement.userId` ya usa ese nombre para otra
cosa (un id, no una identidad mostrable).

Los datos mock viven en una **constante exportada** junto al resto de la data
falsa, **no** en un store de zustand. Un store existe para estado que muta, y el
Perfil no muta: no se edita el nombre ni el correo desde la app. Un store sin
acciones es una constante con ceremonia encima. Además, cuando llegue auth el
Perfil vendrá de la sesión vía un hook, así que el store tampoco sobreviviría.

### El módulo puro

`initialsFrom(name: string): string` — el único cómputo real de todo el feature.

**Regla:** primera letra de la primera palabra + primera letra de la **segunda**
palabra, ignorando el resto, en mayúsculas.

- `"Mauro Quinteros Rojas"` da **`"MQ"`**, no `"MQR"` — es como un peruano escribe
  sus iniciales.
- Un nombre de una sola palabra devuelve **una sola letra**.
- **Caso feo conocido y aceptado:** apellidos con partícula (`"Mauro de la Cruz"`
  da `"MD"`). **No** se implementa heurística de partículas — el test afirma este
  comportamiento a propósito, para que quede documentado y nadie lo "arregle" por
  accidente.

Las iniciales **se derivan al mostrar, nunca se guardan**. `Profile` no tiene
campo `initials`.

### El disco del Home

El header del Home consume el Perfil y renderiza `initialsFrom(profile.name)` en
vez de la letra fija. El gradiente (`Gradients.avatar`) y el token `avatarText`
**no cambian** — solo cambia el texto.

## Acceptance criteria

- [ ] Existe el tipo `Profile` con `name` y `email`, ambos strings, un solo campo de nombre
- [ ] Existe una constante mock exportada con un Perfil de ejemplo, junto al resto de la data falsa
- [ ] No se crea ningún store de zustand para el Perfil
- [ ] `initialsFrom` es una función pura, exportada y testeada con vitest
- [ ] `initialsFrom("Mauro Quinteros")` devuelve `"MQ"`
- [ ] `initialsFrom("Mauro Quinteros Rojas")` devuelve `"MQ"`, no `"MQR"`
- [ ] `initialsFrom("Mauro")` devuelve `"M"`
- [ ] `initialsFrom("mauro quinteros")` devuelve `"MQ"` (siempre mayúsculas)
- [ ] Espacios de más al inicio, al final y entre palabras no rompen el resultado
- [ ] `initialsFrom("")` y un string de solo espacios devuelven `""` sin reventar
- [ ] `initialsFrom("Mauro de la Cruz")` devuelve `"MD"` — comportamiento aceptado, afirmado en el test
- [ ] El disco del Home muestra las iniciales derivadas del Perfil, no una letra fija
- [ ] El gradiente y el color de texto del disco quedan intactos
- [ ] `Profile` no tiene campo `initials`
- [ ] La suite completa pasa; `tsc` y `eslint` limpios

## Blocked by

None - can start immediately
