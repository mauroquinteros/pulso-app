# Pulso — Movement Detail UX Spec (`/movement/[id]`)

> Sesión grill-with-docs del 2026-07-10, **actualizada contra el prototipo de
> diseño** `stock-portfolio-design-prototype/project/Pulso Movimiento Detalle.dc.html`.
> La pantalla vive en `app/movement/[id].tsx` (hoy stub) y ya está declarada en el
> `Stack` raíz — la ruta, la navegación y el back ya existen.
>
> **El prototipo confirma toda la semántica de esta sesión** (labels, operadores,
> redondeo, sin hero, `not-found`) e incluso trae ya escrita
> `buildMovementDetailView`. Pero **refina tres decisiones visuales** que esta
> sesión había asumido mal; están marcadas **"(cambió vs grill)"** más abajo y
> **manda el prototipo**.
>
> Es la feature que `.scratch/movements-ux/PRD.md` dejó explícitamente **fuera de
> alcance**, incluida la tensión que aquí se resuelve.
>
> Regla de idioma: **todos los textos de UI en español**, excepto los tickers.

## 1. How to use this doc

Design brief settled del detalle de un movimiento: un **recibo** de solo lectura.
De acá salen el PRD y los issues. Los términos en negrita son del glosario
(`CONTEXT.md`) — **Gross Amount** se agregó en esta sesión.

## 2. Product thesis

La **lista** responde *"¿qué hice y cómo movió mi efectivo?"* — una cifra por
fila, el **Cash Impact**.

El **detalle** responde la pregunta que la fila deja abierta: ***"¿de dónde sale
ese número?"*** — el bruto, las comisiones, los impuestos, y en qué termina de
verdad. Es el recibo del movimiento.

Solo lectura. No se edita ni se borra desde acá.

## 3. Data source

El movimiento se busca por `id` en `useMovementsStore().movements`. **No se toca
el motor** (`utils/portfolio/`) — ver §8, que es donde eso se pone interesante.

## 4. Anatomía de la pantalla

```
‹  Detalle                          ← header PROPIO, idéntico al de add-movement

   ●  Compra AAPL                   ← badge del tipo (52×52) + label + ticker (si tiene)
      15 ene 2025                   ← executionDate

     Acciones              2.45321  ← datos de la operación (sin operadores)
   ─────────────────────────────────
     Precio de ejecución   $182.50
   ─────────────────────────────────
     Monto bruto           $447.71  ← la aritmética del dinero
   ─────────────────────────────────
     Comisión               +$0.15

              (espacio libre)

   ─────────────────────────────────
     Total pagado          $447.86  ← anclado al FONDO de la pantalla
```

**(Cambió vs grill — manda el prototipo):**

- **Header propio, no el nativo del `Stack`.** Es el mismo componente que ya usan
  los cinco formularios de add-movement (botón back circular + título). Se
  **extrae a compartido** y lo consumen ambos.
- **Sin card.** Las líneas van sueltas sobre el fondo, separadas por hairlines de
  1px; la primera sin borde superior. `facts` y `money` se renderizan como **una
  sola lista continua**.
- **El total va anclado al fondo de la pantalla**, empujado por el espacio libre,
  con su propio borde superior y tipografía más pesada — no pegado a las líneas.

- **Sin monto grande arriba (sin hero numérico).** El total ya cierra el recibo;
  repetirlo arriba en una pantalla tan corta es redundancia, no jerarquía. El
  número que venías tocando en la lista **es el total anclado al fondo** (§8), así
  que el recibo *explica* esa cifra y termina en ella — un hero solo la mostraría
  dos veces.
- **El encabezado** es de identidad, no de cifras: badge (icono + colores del
  tipo, de la fuente única del issue 02 de movimientos), label + ticker, y fecha.
  Así la fila y su detalle se ven como la misma cosa.
- **Título: "Detalle".** Corto, y no duplica el "Compra AAPL" que ya está en el
  cuerpo. (Hoy el `Stack` lo declara en inglés, `"Movement Detail"`.)
- Los tipos de efectivo (`Depósito`, `Retiro`) no tienen ticker: el encabezado es
  solo el label + la fecha.

## 5. El recibo, por tipo (números reales del mock)

**Un solo patrón para los cinco: base → ajustes firmados → total.**

**En los cinco tipos, el total ES el Cash Impact** — el mismo número que muestra
la fila de la lista. El detalle **nunca** puede contradecir a la lista.

```
Compra AAPL · 15 ene 2025            Venta AAPL · 22 sep 2025
  Acciones            2.45321          Acciones                    3
  Precio de ejecución $182.50          Precio de ejecución   $195.50
  ─────────────────────────────        ─────────────────────────────
  Monto bruto         $447.71          Monto bruto           $586.50
  Comisión             +$0.15          Comisión               −$0.15
  ─────────────────────────────        Tarifas regulatorias   −$0.03
  Total pagado        $447.86          ─────────────────────────────
       = Cash Impact ✓                 Total recibido        $586.32
                                            = Cash Impact ✓

Dividendo AAPL · 15 nov 2025         Depósito · 10 ene 2025
  Monto bruto          $18.50          Total transferido   $3,003.99   ← frontera del banco
  Impuesto             −$5.55          Comisión transfer.     −$3.99
  ─────────────────────────────        ─────────────────────────────
  Total recibido       $12.95          Efectivo agregado   $3,000.00
       = Cash Impact ✓                      = Cash Impact ✓

Retiro · 8 ene 2026
  Recibido en banco   $499.00          ← frontera del banco
  Comisión             +$1.00
  ─────────────────────────────
  Efectivo retirado   $500.00
       = Cash Impact ✓
```

Solo `Compra` y `Venta` tienen el bloque de datos de la operación (acciones,
precio). Los otros tres entran directo a la aritmética.

### Depósito y retiro: la aritmética va invertida

En los otros tres tipos la base es el bruto y el total es lo que tocó el
efectivo. En **depósito y retiro es al revés**: la base es la cifra de la
**frontera del banco**, y el total es el efectivo.

Se lee natural: *"transferí $3,003.99 desde mi banco, $3.99 se lo llevó la
comisión, y me quedaron $3,000 de efectivo."*

Esta inversión es lo que permite que el total sea el **Cash Impact** *sin*
degenerar el recibo. La alternativa —cerrar en el Cash Impact y mandar la
comisión a una nota al pie— dejaría un recibo de **una sola línea**: si el total
es `$3,000.00`, la comisión de `$3.99` no suma a nada, y una línea con operador
que no afecta al total es peor que no tenerla.

Así, los cinco tipos conservan el mismo patrón (**base → ajustes firmados →
total**), la comisión sigue siendo una línea real, y la cifra del banco queda
**visible y etiquetada** en vez de escondida en una nota.

## 6. Labels (settled)

| Concepto | Label | Rol en el recibo |
| --- | --- | --- |
| Bruto de la operación | **Monto bruto** | **Base** de compra, venta y dividendo — un solo término |
| Lo que salió de tu banco (depósito) | **Total transferido** | **Base** del depósito |
| Lo que llegó a tu banco (retiro) | **Recibido en banco** | **Base** del retiro |
| Comisión de trading | **Comisión** | Ajuste |
| Comisión de transferencia | **Comisión de transferencia** | Ajuste |
| Tarifas regulatorias (venta) | **Tarifas regulatorias** | Ajuste |
| Impuesto (dividendo) | **Impuesto** | Ajuste — **sin porcentaje** |
| Total de una compra | **Total pagado** | **Total** = Cash Impact |
| Total de una venta / dividendo | **Total recibido** | **Total** = Cash Impact |
| Total de un depósito | **Efectivo agregado** | **Total** = Cash Impact |
| Total de un retiro | **Efectivo retirado** | **Total** = Cash Impact |

- **"Monto bruto", no "Subtotal" ni "Monto" a secas.** `CONTEXT.md` prohíbe
  *"monto (unqualified)"* bajo **Cash Impact**, y con razón: en una compra hay
  tres montos (447.71 / 0.15 / 447.86). El calificativo es obligatorio.
- **El impuesto no muestra su porcentaje.** Es derivable (`5.55 ÷ 18.50 = 30%`)
  pero no está en el modelo. Si el bróker retiene un porcentaje raro, calcularlo
  imprimiría `29.98%` y se vería roto.
- **Los labels de los totales están en pasado**, porque describen un hecho ya
  ocurrido: "Total transferido", no "Monto a transferir" (que se lee como campo
  de formulario).

## 7. Operadores `+` / `−` en las líneas de ajuste

**La misma "Comisión" suma o resta según el tipo:**

| | Base | Comisión | Total (= Cash Impact) |
| --- | --- | --- | --- |
| Compra | 447.71 | **suma** `+` | 447.86 |
| Retiro | 499.00 | **suma** `+` | 500.00 |
| Venta | 586.50 | **resta** `−` | 586.32 |
| Depósito | 3,003.99 | **resta** `−` | 3,000.00 |
| Dividendo | 18.50 | **resta** `−` (impuesto) | 12.95 |

La dirección **no es derivable de la etiqueta** — depende de si el total es *lo
que pagas* o *lo que recibes*. Por eso las líneas de ajuste llevan el operador
explícito.

**Esto NO contradice la decisión de la lista** (donde el monto va sin signo).
Allá el signo era **100% derivable del tipo** → redundante → ruido. Acá el
operador **no es derivable** → es justo la información que falta → señal. Mismo
principio, conclusión opuesta.

- Solo las **líneas de ajuste** llevan operador. La **base y el total van sin
  signo**, como en la lista.
- Las **líneas de datos** (acciones, precio) nunca llevan operador: no son
  aritmética.
- El menos es **U+2212** (`−`), la convención de la app, nunca un guion ASCII.
- **Sin color.** Nada acá es ganancia ni pérdida (misma razón que en la lista).

## 8. Redondeo: el total ES el Cash Impact; el bruto se DERIVA de él

**La decisión menos obvia del spec. Está medida, no supuesta.**

El recibo tiene que cumplir **dos cosas a la vez**, y son las dos que el usuario
puede verificar por su cuenta:

1. **El total = el número de la fila** (el **Cash Impact**). Si no, el detalle
   contradice a la lista.
2. **Las líneas suman el total.** Si no, el usuario suma con el dedo y no le da.

El obstáculo es que hay **dos brutos**:

```
8,821.705   ← el que el motor USA   (executionPrice × shares, crudo)
8,821.71    ← el que round2 daría   (redondeado a centavos)
```

Si mostráramos `round2(precio × acciones)` **y** el total del Cash Impact, el
recibo no cuadraría:

```
Compra: 10.975 acciones × $803.80, comisión $0.88

  Monto bruto     $8,821.71     ← round2(precio × acciones)
  Comisión           +$0.88
  ─────────────────────────
  Total pagado    $8,822.58     ← del Cash Impact... pero 8,821.71 + 0.88 = 8,822.59  ✗
```

**Frecuencia medida por fuzzing: 10 de 500,000 (0.002%).** Raro, pero el fallo es
visible **dentro de una misma pantalla**.

### La solución: derivar el bruto desde el total

**El total es el Cash Impact, siempre. El "Monto bruto" mostrado no se calcula
como `precio × acciones`, sino restando/sumando los fees al total:**

```
Compra:  bruto = total − comisión
Venta:   bruto = total + comisión + tarifas regulatorias
```

```
  Monto bruto     $8,821.70     ← derivado: 8,822.58 − 0.88
  Comisión           +$0.88
  ─────────────────────────
  Total pagado    $8,822.58     ✓ cuadra, y es el mismo número de la lista
```

Se cumplen **las dos** condiciones, por construcción. El centavo inevitable tiene
que caer en algún lado, y lo empujamos **al lugar más difícil de ver**: en ese
0.002%, el "Monto bruto" mostrado queda 1¢ debajo de `precio × acciones`. Para
notarlo habría que multiplicar `10.975 × $803.80` a mano y comparar — mucho más
rebuscado que sumar dos números que están en pantalla.

**Solo aplica a compra y venta**, que son los únicos tipos donde el bruto se
*calcula*. En dividendo, depósito y retiro todos los campos ya vienen exactos a 2
decimales, así que no hay nada que derivar ni que redondear.

### Por qué NO se arregla en el motor

La alternativa "de raíz" era redondear el bruto una vez al nacer el movimiento
(*"liquidar en centavos"*, como hace un bróker real). Se descartó: obligaría a
cambiar `cashImpact` **y** el reducer a la vez. Se probó cambiar solo
`cashImpact`, y **el invariante de reconciliación se rompe** — medido:

```
tres compras de 10.975 × $803.80:
  cashImpact redondeando cada una:  round2(8821.705) × 3   = 26,465.13
  el reducer redondeando la suma:   round2(8821.705 × 3)   = 26,465.12
                                                             ──────────
  delta medido: −0.01   →  Cash + Market Value deja de cuadrar con Aportado + Total Return
```

`Σround2(x) ≠ round2(Σx)`. **Mezclar "redondea temprano" y "redondea tarde" en el
mismo motor es peor que cualquiera de los dos.** El motor conserva su política de
redondear al agregar; el recibo se acomoda a ella derivando su bruto.

> Nota para quien lea el código después: **el "Monto bruto" NO es
> `round2(executionPrice × shares)`.** Se deriva del total. Si lo "arreglas" para
> que se calcule directo, el recibo deja de cuadrar en el 0.002% de los casos —
> y los tests con datos limpios seguirán pasando. Hay un test con el caso
> adversario (`10.975 × $803.80`) que es el cable trampa.

## 9. Fecha

`executionDate`, nunca `createdAt` — igual que la lista, y por lo mismo
(`docs/adr/0004-execution-date-is-a-calendar-date.md`). Formato español compacto
con año (`15 ene 2025`), reusando el formateador que ya existe.

## 10. La lista se vuelve tocable (revierte una decisión del issue 04)

El issue 04 hizo las filas **deliberadamente NO tocables**, y lo dejó escrito:

> *"Deliberately not a Pressable: the movement-detail screen does not exist yet,
> and a control that looks tappable but does nothing is worse than a plain row."*

Esa razón desaparece con esta feature. La fila pasa a ser `Pressable` y navega a
`/movement/[id]`.

**Sin chevron**, copiando el patrón que ya usa Home: sus filas de activos son
`Pressable` y navegan a `/stock/[ticker]` sin chevron. Un chevron por fila en un
historial largo es ruido visual.

## 11. Estado "no encontrado"

Si el `id` no corresponde a ningún movimiento, la pantalla muestra un mensaje
seco: **"No encontramos este movimiento"**. Sin ilustración, sin CTA.

Hoy es casi imposible que ocurra (los movimientos solo se agregan, nunca se
borran, y el mock siembra ids estables), pero **TypeScript obliga a manejar la
rama** (`find()` devuelve `Movement | undefined`). Es exactamente eso y nada más
— no se gasta diseño en un caso que no pasa.

## 12. Formato y convenciones

- Moneda: `formatUSD` (2 decimales, separador de miles), `tabular-nums`.
- **Acciones: el número pelado** (`2.45321`), **sin el sufijo `acc`**. La
  etiqueta de la izquierda ya dice "Acciones" — el sufijo lo diría dos veces en
  la misma línea. (El `acc` de Home existe porque allá la cifra va suelta bajo el
  ticker, sin etiqueta que la nombre.)
- Fecha: `15 ene 2025`.
- Textos de UI en español; **tickers sin traducir**.
- Nada de verde/rojo: no hay ganancias ni pérdidas en esta pantalla.

## 13. Arquitectura de módulos (para el PRD)

Espejo del patrón ya establecido: **view-model puro + componentes tontos + vitest
sobre el view-model**.

- **View-model puro** — `buildMovementDetailView(movement | undefined)`.
  Encapsula toda la política: qué líneas lleva cada tipo, sus labels, los
  operadores, la derivación del bruto de §8, y el estado `not-found`. Único módulo
  con lógica y único testeado. Emite el `type` (no colores/iconos): el componente
  resuelve la identidad visual desde la fuente única.
  **Reusa `cashImpact` del motor** para el total — no reimplementa esa fórmula.
- **Header compartido (extracción)** — el header del prototipo es **idéntico** al
  que ya usan los cinco formularios de add-movement. Se extrae a un componente
  compartido y lo consumen ambos. Una sola fuente de verdad, igual que se hizo con
  la identidad del tipo de movimiento.
- **Componentes presentacionales** — encabezado de identidad y filas del recibo.
- **No se toca `utils/portfolio/`** ni el store.

Forma indicativa (naming libre, camelCase):

```ts
interface DetailLine {
  label: string;   // "Monto bruto" | "Comisión"
  amount: string;  // "$447.71" | "+$0.15" | "−$5.55"   (operador incluido)
}
interface MovementDetailView {
  state: "found" | "not-found";
  header: { title: string; dateLabel: string; type: MovementType } | null;
  facts: DetailLine[];      // acciones, precio — solo compra/venta, sin operadores
  money: DetailLine[];      // base + ajustes firmados
  total: DetailLine | null; // { label: "Total pagado", amount: "$447.86" }
}
```

**Dos invariantes que los tests deben fijar** (además de un caso por tipo):

1. **El recibo cuadra** — la suma de las líneas mostradas es siempre igual al
   total mostrado, parseando los strings que el view-model emite.
2. **El total es el Cash Impact** — el total mostrado siempre es
   `formatUSD(|cashImpact(movement)|)`, o sea el mismo string que la fila.

Ambos deben ejercitarse con el **caso adversario** `10.975 × $803.80` (comisión
`$0.88`) de §8, que es el único que distingue la implementación correcta de la
ingenua: el detalle debe mostrar bruto `$8,821.70` y total `$8,822.58`. Con los
datos limpios del mock, la implementación ingenua **también pasaría** — por eso
el caso adversario es obligatorio.

## 14. Settled decisions (recap)

1. Recibo de **solo lectura**. No se edita ni se borra.
2. **Sin hero numérico.** Encabezado de identidad (badge + tipo + ticker + fecha)
   y directo al recibo.
3. Un patrón para los cinco tipos: **base → ajustes firmados → total**.
4. **El total ES el Cash Impact en los cinco tipos** — el mismo número que muestra
   la fila. El detalle nunca contradice a la lista.
5. **Depósito y retiro llevan la aritmética invertida**: la base es la cifra de la
   frontera del banco (`Total transferido` $3,003.99 / `Recibido en banco`
   $499.00) y el total es el efectivo. Así el total es el Cash Impact *sin*
   degenerar el recibo a una sola línea.
6. **Operadores `+`/`−`** en las líneas de ajuste, porque la dirección no es
   derivable del label. Base y total, sin signo.
7. **El "Monto bruto" se DERIVA del total** (total ∓ fees), no de
   `precio × acciones` — para que el recibo siempre cuadre *y* el total siga
   siendo el Cash Impact. El motor **no se toca**. (§8, medido.)
7. **"Monto bruto"**, no "Subtotal" ni "Monto" (prohibido por el glosario).
8. Impuesto **sin porcentaje**.
9. Fecha = `executionDate`, siempre.
10. Acciones **sin sufijo `acc`**.
11. Las filas de la lista se vuelven `Pressable` **sin chevron** (como Home).
12. `not-found` = un mensaje seco. Nada más.

## 15. Out of scope (this spec)

- **Editar y borrar** movimientos. (Al no haber borrado, `not-found` es casi
  inalcanzable — ver §11.)
- **Compartir / exportar** el recibo.
- **Navegar al stock** desde el detalle de una compra/venta/dividendo (el
  `/stock/[ticker]` sigue siendo stub).
- **Liquidar en centavos** en el motor (§8). Queda descartado, con la medición que
  lo justifica; si algún día se retoma, hay que cambiar `cashImpact` **y** el
  reducer a la vez, con un bruto compartido, y sería un ADR.
- **Mostrar `createdAt`** al usuario (prohibido por `ADR-0004`).
- Cambiar el motor (`utils/portfolio/`) o el store.
