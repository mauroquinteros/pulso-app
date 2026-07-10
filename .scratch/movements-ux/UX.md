# Pulso — Movements View UX Spec (tab Movimientos)

> Sesión grill-with-docs del 2026-07-09. La vista vive en el tab **Movimientos**
> (`app/(tabs)/movements.tsx`, hoy stub). El screenshot de referencia que trajo
> el usuario sirvió de punto de partida, pero **varias de sus decisiones se
> rechazaron explícitamente** durante el grilling (agrupado por mes, búsqueda,
> montos sin fees). Donde este doc contradice al screenshot, **manda este doc**;
> los desvíos están marcados "(cambió vs screenshot)".
>
> Regla de idioma: **todos los textos de UI en español**, excepto los tickers.

## 1. How to use this doc

Design brief settled de la lista de movimientos: **chips de filtro por tipo**
arriba y **lista plana read-only** abajo. De acá salen el PRD y los issues. Los
términos en negrita son del glosario (`CONTEXT.md`) — **Cash Impact** se agregó
en esta sesión.

## 2. Product thesis

El **Home** responde *"¿cuánto tengo y cuánto voy ganando?"*. El **Portafolio**
responde *"¿cómo está compuesto?"*. **Movimientos** responde una tercera
pregunta, distinta de ambas: *"¿qué hice, cuándo, y cómo movió mi efectivo?"*.

Es el **libro mayor** de la app: la lista cruda de hechos de la que todo lo
demás se deriva. Su cifra por fila es el **Cash Impact**, y la suma de todos los
Cash Impact **es** el **Cash**. Esa reconciliación es la razón de ser de la
pantalla.

## 3. Data source (sin tocar el engine)

Todo sale de `useMovementsStore().movements: Movement[]` — el store crudo. **No
se usa `usePortfolio()`** ni se toca `utils/portfolio/`: esta vista no deriva
portafolio, solo formatea movimientos.

## 4. Cash Impact (la cifra de la fila)

**Cash Impact** (glosario, agregado en esta sesión): el cambio que un
**Movement** produce en **Cash**, neto de **Fees** de trading.

| Tipo | Fórmula | Ejemplo (mock) | Fila muestra |
| --- | --- | --- | --- |
| Depósito | `+amount` | `mock-001`: 3000.00 | `$3,000.00` |
| Retiro | `−amount` | `mock-013`: 500.00 | `$500.00` |
| Compra | `−(executionPrice × shares + fee)` | `mock-003`: 182.50 × 2.45321 + 0.15 | `$447.86` |
| Venta | `+(gross − fee − regulatoryFees)` | `mock-009`: 586.50 − 0.15 − 0.03 | `$586.32` |
| Dividendo | `+(grossAmount − tax)` = **Net Dividends** | `mock-011`: 18.50 − 5.55 | `$12.95` |

Notas de dominio (no negociables, salen del glosario y de `ADR-0003`):

- Los **transfer fees** de depósito/retiro **no tocan Cash**. Por eso el Cash
  Impact de un depósito es `amount` limpio (3000.00), **no** `amount +
  transferFee` (3003.99 = **Net Contributions**).
- Los **trading fees** (compra/venta) **sí** tocan Cash, por eso entran en la
  fórmula de Compra y Venta.
- (Cambió vs screenshot) El screenshot muestra montos **brutos** (`Buy VOO
  $102.70` parece principal sin fee). Aquí la fila es siempre el **neto**.

### Presentación: sin signo, sin color

- El Cash Impact se muestra como **magnitud** (sin `+` ni `−`).
- Color **neutro** (`Colors.textBright`) para **todos** los tipos.

Razón: el signo es **100% derivable del tipo** (todo Depósito/Venta/Dividendo
suma; toda Compra/Retiro resta), así que no aporta información. Y el color
verde/rojo en Pulso **ya significa ganancia/pérdida** (Net P&L, Total Return):
pintar una Compra de rojo diría "perdiste $447.86", que es falso — una compra es
tu propio principal cambiando de forma. **La dirección la comunica el tipo.**

(Cambió vs screenshot) El screenshot pinta solo el dividendo en verde con `+`.
Se descarta: ni signo ni color.

> El concepto de dominio **sí** es signado (por eso reconcilia con Cash). Lo que
> no lleva signo es su **presentación**.

## 5. Identidad visual del tipo de movimiento (fuente única)

Hoy los iconos/colores de tipo viven **hardcodeados** en `app/add-movement/index.tsx`
(arrays `OPERACIONES`/`EFECTIVO`). `FormHeader` no muestra icono. Esta feature
los **extrae a una fuente única** que consumen la lista y el picker.

**Regla:** el icono **identifica el tipo**, nunca insinúa dirección de efectivo.

| Tipo | Singular | Plural (chip) | Icono (Ionicons) | `bg` | `color` |
| --- | --- | --- | --- | --- | --- |
| `buy` | Compra | Compras | `cart-outline` | `rgba(120,160,255,0.16)` | `#9DB8FF` |
| `sell` | Venta | Ventas | `pricetag-outline` | `rgba(255,140,140,0.14)` | `#FF9D9D` |
| `dividend` | Dividendo | Dividendos | `cash-outline` | `rgba(0,229,204,0.12)` | `#4FE9D6` |
| `deposit` | Depósito | Depósitos | `add-circle-outline` | `rgba(0,200,83,0.16)` | `#7DE8AA` |
| `withdrawal` | Retiro | Retiros | `remove-circle-outline` | `rgba(142,142,147,0.14)` | `#B8BCCB` |

**Por qué cambian los iconos del picker.** Hoy `Compra` y `Depósito` comparten
`arrow-down`, pero mueven el efectivo en **direcciones opuestas** (compra saca,
depósito mete). En el picker no molesta (hay subtítulo); en una lista densa una
flecha **se lee como dirección** y mentiría. Iconos por tipo, no direccionales.

**Por qué `#7DE8AA` para Depósito.** Hoy Depósito comparte el teal `#4FE9D6` con
Dividendo. `#7DE8AA` es el **mismo matiz que `Colors.positive`** (`hsl(145°)`)
llevado al registro pastel (`L 70%`) donde viven los demás badges, con `bg`
derivado del rgb de `positive` — sigue la convención existente (fondo saturado,
texto pastel). **No** se usa `Colors.positive` crudo: es el token de *ganancia* y
reusarlo re-acoplaría verde↔profit. **Token nuevo** en `constants/theme.ts`.

Trade-off aceptado: `#7DE8AA` (145°) queda a ~28° del teal de Dividendo (173°).
Se acepta porque los **iconos ya desambiguan** (`add-circle` vs `cash`) — el
color es refuerzo, nunca el único canal (`color-not-only`).

## 6. Anatomía de la fila

```
┌────────────────────────────────────────────────┐
│ (cart)   Compra AAPL                  $447.86  │
│          15 ene 2025                           │
├────────────────────────────────────────────────┤
│ (cash)   Dividendo AAPL                $12.95  │
│          15 nov 2025                           │
├────────────────────────────────────────────────┤
│ (plus)   Depósito                   $3,000.00  │
│          10 ene 2025                           │
└────────────────────────────────────────────────┘
```

- **Badge**: icono + colores del tipo (§5), 40×40 (mismo tamaño que los badges
  de holdings).
- **Título**: `label + ticker` para los tipos con ticker (`Compra AAPL`,
  `Venta AAPL`, `Dividendo AAPL`); **solo el label** para los de efectivo
  (`Depósito`, `Retiro`), que no tienen ticker.
- **Subtítulo**: **solo la fecha**. Nada de `2.45321 acc · $182.50` — ese
  desglose es lo que justificará la futura pantalla de detalle; adelantarlo
  aquí densifica la lista y le quita razón de ser al detalle.
- **Derecha**: **Cash Impact**, sin signo, `Colors.textBright`, `tabular-nums`.
- **La fila NO es tocable.** Sin chevron, sin `Pressable`, sin feedback de
  press. El detalle está fuera de este PRD y un control que se ve tocable y no
  hace nada es un anti-patrón.

## 7. Fecha: `executionDate`, sin hora, sin zona

- La fila muestra **`executionDate`**, nunca `createdAt`.
- Formato **español compacto, siempre con año**: `15 ene 2025`. El año es
  obligatorio porque no hay agrupado por mes y los datos cruzan 2025→2026.
- `date-fns/locale/es` ya está disponible.

**Por qué no hay hora.** `executionDate` es una **fecha de calendario**
(`YYYY-MM-DD`): el `MovementDatePicker` usa `mode="date"` y los 5 view-models lo
tipan así. `createdAt` es el instante UTC de **registro** (auditoría), y el
reducer lo usa **solo como desempate** cronológico — su existencia como
desempate *prueba* que `executionDate` no tiene hora.

**Trampa evitada:** convertir una fecha de calendario de UTC a local **corre el
día** (`new Date("2025-01-15")` → 14 ene en Lima). Una fecha de calendario no
tiene zona horaria. No se convierte nada.

> `utils/format.ts` tiene un `formatDate` **muerto** (nadie lo usa, formato
> inglés `MMM d, yyyy`). Esta vista es su primer consumidor potencial; el PRD
> decide si se repurpone o se agrega un formateador nuevo.

**Registrado:** `docs/adr/0004-execution-date-is-a-calendar-date.md`. El campo se
**renombró de `executedAt` a `executionDate`** en esa decisión: el sufijo `-At`
prometía un timestamp e invitaba a la conversión UTC→local. Convención que fija
el ADR: **`-Date` = fecha de calendario, `-At` = instante**. En Supabase,
`execution_date` debe ser `date`, **no** `timestamptz`.

## 8. Orden de la lista

**`executionDate` desc, con `createdAt` desc como desempate.** Es exactamente el
criterio del motor (`compareChronological` en `utils/portfolio/reducer.ts`),
invertido. No se inventa un orden nuevo.

Consecuencia: un movimiento **backdateado** (registrado hoy, ejecutado en enero)
aparece en enero, no arriba. Correcto: la lista ordena por *cuándo pasó*, no por
*cuándo lo registraste*.

## 9. Chips de filtro

```
[ Compras ] [ Ventas ] [ Dividendos ] [ Depósitos ] [ Retiros ]
                             ▲ activo
```

- **5 chips. No hay chip "Todos".** (Cambió vs screenshot.)
- **Selección única con toggle**: tocar filtra; volver a tocar el chip activo
  limpia el filtro. Es el mismo gesto que el donut del Portafolio — una sola
  taxonomía de interacción en la app.
- Estado: `selectedType: MovementType | null`; **`null` = sin filtro = todos**
  (patrón estándar de *filter chips* de Material).
- **Orden**: sigue la taxonomía del picker — operaciones primero
  (`Compras · Ventas · Dividendos`), efectivo después (`Depósitos · Retiros`).
  (Cambió vs screenshot, que arranca con Depósitos.)
- Etiquetas en **plural**. Scroll horizontal (5 chips no entran en 375px).
- Sin contadores en los chips.
- A11y: `accessibilityState={{ selected }}` y área táctil ≥44pt.

**Costo aceptado:** sin chip "Todos", el estado "viendo todos" es **implícito**
(ningún chip encendido) y la salida del filtro es "vuelve a tocar el chip
activo". Se mitiga con el chip activo claramente encendido y con el rescate
explícito del vacío filtrado (§10b).

### Persistencia

**No se hace nada.** El filtro persiste durante la sesión **gratis**: `Tabs` de
expo-router no desmonta la pantalla tras la primera visita, así que un `useState`
sobrevive el cambio de tab. Resetear a "todos" **costaría código extra**
(`useFocusEffect`), y sería contrario a la guía `state-preservation` (volver a
una pantalla restaura sus filtros).

Se pierde al reiniciar la app — coherente con el store, que es *in-memory* y
vuelve al seed. Persistir entre reinicios (AsyncStorage + `persist` de zustand)
está **fuera de alcance** y sería incoherente mientras los datos se resetean.

*(Verificar en simulador: es config del navigator, no una certeza de memoria.)*

## 10. Estados

Son **dos vacíos distintos** y confundirlos es el error clásico (mostrar "agrega
tu primer movimiento" cuando en realidad tienes 13 y filtraste mal).

**(a) Vacío real** — no existe ningún movimiento (usuario nuevo):
- Los chips **no se dibujan** (no hay nada que filtrar).
- Mensaje + **ilustración** + CTA **"Agregar movimiento"** → `/add-movement`.
- La ilustración la diseña el usuario. Debe ser **vectorial** (`react-native-svg`,
  ya instalado), teñible con tokens del tema. Nada de PNG ni emoji.

**(b) Vacío filtrado** — hay movimientos, ninguno del tipo elegido:
- Los chips **siguen visibles** (el filtro sigue activo; hay que poder salir).
- Mensaje que **nombra el tipo**: `No tienes retiros` (no un genérico "Sin
  resultados").
- Acción **"Quitar filtro"** — el rescate explícito.
- **Sin** ilustración y **sin** CTA "Agregar movimiento": el usuario no quería
  crear, quería ver.

## 11. Estructura de pantalla

```
SafeAreaView (edges: top)
  Título "Movimientos"        (28px / 800, como "Portafolio")
  Chips row                   (scroll horizontal)   ← oculto en vacío real
  Lista de movimientos        ← o estado vacío (a) / (b)
```

Respetar safe areas; el contenido nunca queda bajo el tab bar.

## 12. Formato y convenciones

- Moneda: `formatUSD` (2 decimales, separador de miles), **sin signo**.
- Monto: `Colors.textBright`, `fontVariant: ["tabular-nums"]`.
- Fecha: español compacto con año (`15 ene 2025`), locale `es` de date-fns.
- Textos de UI en español; **tickers sin traducir**.
- Nada de verde/rojo en esta pantalla: no hay ganancias ni pérdidas aquí.

## 13. Arquitectura de módulos (para el PRD)

Espejo del patrón ya establecido (Home, Portafolio): **view-model puro +
componentes tontos + vitest sobre el view-model**.

- **`constants/movement-type.ts` (nuevo)** — fuente única de la identidad visual
  y el copy por `MovementType`: `{ label, labelPlural, icon, bg, color }`.
  Lo consumen la lista **y** `app/add-movement/index.tsx` (que hoy los
  hardcodea). Mezcla copy en español + tokens, por eso módulo propio y no
  `theme.ts` (que hoy es solo color). El token `#7DE8AA` sí va a `theme.ts`.
- **View-model puro** — `buildMovementsView(movements, selectedType)`:
  calcula el **Cash Impact** por movimiento, ordena (§8), filtra (§9), formatea
  (§12) y devuelve el estado como dato declarativo:
  `state: "empty" | "filtered-empty" | "ready"`. Es el único módulo con lógica y
  el único testeado.
- **Componentes presentacionales** — fila, chips row, estados vacíos. Sin
  derivación ni formateo.
- **Recomendación (a confirmar en el PRD): `FlatList`, no `ScrollView`.** Los
  movimientos crecen sin cota (a diferencia de los holdings). La guía de
  performance pide virtualizar listas de 50+ ítems.

## 14. Settled decisions (recap)

1. Alcance: lista plana + chips de filtro. **Sin búsqueda. Sin detalle. Sin editar.**
2. La fila muestra el **Cash Impact** (neto de trading fees), como **magnitud**:
   sin signo, color neutro. La dirección la comunica el tipo.
3. **Sin agrupar por mes.** La fecha va en cada fila. (Cambió vs screenshot.)
4. Fecha = **`executionDate`**, fecha de calendario: **sin hora, sin conversión de
   zona**. `createdAt` nunca se muestra.
5. Orden: `executionDate` desc, `createdAt` desc como desempate (criterio del motor).
6. Iconos **identifican el tipo, no la dirección**; fuente única compartida con
   el picker de `add-movement`.
7. Depósito estrena `#7DE8AA` (pastel derivado de `Colors.positive`), resolviendo
   la colisión de teal con Dividendo.
8. **5 chips, sin "Todos"**, selección única con toggle; `null` = todos.
9. El filtro **persiste durante la sesión** (comportamiento por defecto, cero código).
10. **Dos vacíos distintos**: real (ilustración + CTA) vs filtrado ("No tienes
    retiros" + "Quitar filtro").

## 15. Out of scope (this spec)

- **Pantalla de detalle del movimiento** (`/movement/[id]`) — el usuario la
  quiere, pero **fuera de este PRD**. Mostrará bruto, fees/impuestos y neto.
  Cuando llegue, hay una tensión ya identificada a resolver: en Depósito/Retiro
  el total "del mundo real" (**Net Contributions** `$3,003.99` / recibido en
  banco `$499.00`) **no coincide** con el Cash Impact de la fila (`$3,000.00` /
  `$500.00`). Propuesta pendiente: el detalle cierra siempre en el Cash Impact y
  el fee + out-of-pocket van como líneas de contexto, para que fila y detalle
  nunca se contradigan.
- **Búsqueda** (la lupa del screenshot). No se dibuja el control.
- **Editar / borrar** movimientos.
- **Agrupar por mes** (headers `NOVIEMBRE 2025`).
- **Multi-selección** de filtros.
- **Persistencia entre reinicios** del filtro.
- **Hora de ejecución** (requeriría cambiar el modelo — ver `ADR-0004`).
- Cambiar el motor (`utils/portfolio/`) o el store.
