# Pulso — Add Movement UX Spec (Vender todo / full exit)

**Feature:** `full-exit`
**Screen:** **Venta** (`Añadir movimiento → Venta`) — an addition to the screen specified by
`.scratch/sell-ux/UX.md`, not a replacement for it
**PRD:** `.scratch/full-exit/PRD.md`
**ADR:** `docs/adr/0014-a-full-exit-sells-the-apps-share-count.md`
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`)

---

## 1. How to use this doc

This spec covers **one control** and the bottom block it lives in. Everything else about the
**Venta** screen — its fields, keyboards, gate, breakdown, copy and save behaviour — is
specified in `.scratch/sell-ux/UX.md` and is unchanged. Where the two disagree about
"Vender todo", this one is current; that brief is a point-in-time record and is not edited.

§10 lists what deliberately does not change, and is the more useful half of this document for a
reviewer.

---

## 2. Product thesis

**The control answers a question the user cannot.**

A bought position's share count is *derived* — `Monto / Precio` — and the **Monto** is never
stored (`0012`). So Pulso's count is not the broker's, and the user has no way to learn the
difference: the derived figure is displayed at full precision in exactly one place in the app,
the `Disponible` helper beside **Acciones** on this screen.

Sell the broker's figure and Pulso keeps the remainder — **Dust**: a one-cent **Holding** that
sits in **Mis Activos** reporting `+100.00%` forever.

So **Vender todo** is *not* a keystroke-saver, and the distinction drives every decision below.
`.scratch/sell-ux/UX.md` §14 #4 refused it as "a trading affordance; for a tracker the user
knows the exact shares" — a premise `0012` falsifies. What the control does is put the app's own
count into the field so the arithmetic comes out right and the position actually closes.

**Consequence for the design:** the app supplies the *quantity*, but the user keeps the
*decision*. The value lands as ordinary editable text. There is no mode, no locked field, no
confirmation step and no full-exit flag on the **Movement**.

---

## 3. Where it lives (settled)

Inside the **fixed bottom block**, below the breakdown, directly above **Guardar movimiento** —
so every action on the screen is in one place and the form's paired-row grid above is left
intact.

```
 ── fixed bottom block (outside the ScrollView) ─────────────

    Monto bruto                              $157.45
    Comisión                                  -$0.47
    Impuestos                                  $0.00
    ────────────────────────────────────────────────
    Total a recibir                          $156.98

    ┌──────────────────────────────────────────────┐
    │                 Vender todo                  │   secondary
    └──────────────────────────────────────────────┘

    (No pudimos guardar tu venta…)                     only on save failure

    ┌──────────────────────────────────────────────┐
    │             Guardar movimiento               │   primary
    └──────────────────────────────────────────────┘
 ────────────────────────────────────────────────────────────
```

Order within the block: **breakdown → Vender todo → save-failure message → Guardar movimiento**.
The failure message stays adjacent to the button it is about.

**It is always rendered.** Never conditional. This block sits outside the scrolling area, so a
control that appears and vanishes here moves **Guardar movimiento** vertically — in the one zone
where a mis-tap writes a **Movement** to Postgres. A permanently present control with a disabled
state costs one dim row on an empty form and buys zero layout shift, plus it tells the user the
feature exists before they have typed anything.

---

## 4. Anatomy & tokens

Full width, matching **Guardar movimiento**'s width and corner radius so the two read as a pair,
and subordinate to it in every other respect.

| | **Vender todo** (secondary) | **Guardar movimiento** (primary) |
|---|---|---|
| Fill | none — border only | `Colors.accent` |
| Border | `1.5` `rgba(0,229,204,0.35)` | none |
| Label color | `Colors.accent` | `#04211E` |
| Label | `15` / `700` | `16` / `800` |
| Radius | `15` | `15` |
| Vertical padding | `14` | `16` |
| Glow / elevation | **none** | teal shadow, `elevation: 6` |
| Gap below | `10` | — |

The teal glow is the primary button's signature and must not be borrowed. Height lands at ~48pt,
clearing the 44pt minimum.

---

## 5. States

| State | When | Treatment |
|---|---|---|
| **Enabled** | a **Símbolo** is typed, the available count is `> 0`, and no save is in flight | border `rgba(0,229,204,0.35)`, label `Colors.accent` |
| **Disabled** | no Símbolo, ticker not held, nothing sellable on the chosen **Fecha**, **or a save is in flight** | border `Colors.border`, label `#4A5070`, no press handler |
| **Pressed** | during a tap | `opacity: 0.6` — **opacity only**, never a transform or size change |

`#4A5070` is the same disabled-label token **Guardar movimiento** already uses, so the two dim
together consistently on an empty form.

**A save in flight disables it too**, exactly as it disables **Guardar movimiento**. The sale's
payload is built before the write is awaited, so a late tap could not corrupt what is stored —
but a failed save promises to leave the form *"exactly as the user left it"*, **Acciones**
included, and a tap that landed during the wait would quietly break that promise. On a
successful save the form is already dismissing, and every control should be inert on the way out.

**No explanatory copy on or under the control.** Where a reason exists it is already said beside
**Acciones** — *"No tienes acciones de NFLX."*, *"No tenías acciones de NFLX en esa fecha."* —
and repeating it here would put the same sentence on screen twice. Note those messages appear
only once the shares field has been **touched**, so a freshly typed unheld ticker leaves the
control dim and unexplained. That is the form's existing error-timing convention — **Guardar
movimiento** is dim and silent in exactly the same state — and this slice does not change it.

---

## 6. Copy

| Element | Spanish | Notes |
|---|---|---|
| Label | **Vender todo** | Never "Vender máximo" / "Máx" — those are quantity words, the trading-affordance register this control is deliberately not in |
| Accessible label | **Vender todo, {n} acciones** | Carries the count the visible label omits |

**The visible label carries no figure.** Tapping puts the count in **Acciones**, and `Disponible`
already states it beside that field — a third copy would be noise. The *accessible* label does
carry it, because a VoiceOver user cannot glance at the field to learn what the control did.

---

## 7. Behavior on tap

1. **Acciones** is filled with the available count, rendered exactly as `Disponible` renders it.
2. The shares field is marked **touched**.
3. A light haptic impact fires — matching the form's existing haptic on a successful save.
4. **Monto bruto** and **Total a recibir** populate immediately, directly above the control.

Step 4 is the point: the field being filled is off-screen at the bottom of the form, so the
breakdown *is* the feedback. The user sees the consequence of the tap beside the finger that
made it.

**On (2):** a filled value is always `> 0` and within the available count, so no error can fire at
the moment of the tap. The only effect is that a *later* bad edit reports itself at once instead
of waiting for the field to blur.

**Afterwards the value is just a number.** Edit it down to a partial sale and nothing objects.
Change the **Fecha** and it is *not* recomputed: the gate refuses the dangerous direction (an
over-sell, with the date-qualified message the form already has) and permits the harmless one — a
sale that is simply no longer the whole position. Re-filling on date change would mean
remembering that the value came from this control, which is the mode §2 rules out.

---

## 8. The backdated case

The control fills **the most the chosen date can sell**, not today's holding — the same figure the
save gate compares against and the same one `Disponible` shows. Filling anything else could
populate a value the form immediately rejects, and a control that produces an invalid field is
worse than no control.

| History | **Fecha** | Fills | Why |
|---|---|---|---|
| Jan buy 10 | today | `10` | closes the position |
| Jan buy 10, Mar buy 5 | **Feb** | `10` | everything held in February; 5 remain open today |
| Jan buy 10, Mar sell 4 | **Feb** | `6` | capped, so March's sale still has shares behind it |

Row 2 is the case where the label simplifies: the sale does not close the position *today*. Row 3
is the case that justifies the control most — `6` depends on a replay the user cannot see and
could not work out by hand.

---

## 9. Accessibility

- Accessible label per §6, including the share count.
- Touch target ~48pt tall, full width — comfortably over the 44pt minimum.
- Disabled state carries the disabled accessibility state, not just a dimmed color, so it is
  announced as unavailable rather than read as a live button.
- Pressed feedback is opacity-only, so nothing reflows under a finger or a screen reader cursor.
- The control is not the only route to a full exit — the count stays visible in `Disponible` and
  the field stays typable, so nothing here is gesture-only or tap-only.

---

## 10. What does NOT change

- **Every field**: **Símbolo**, **Acciones**, **Precio de ejecución**, **Comisión**, **Impuestos**,
  **Fecha** — same labels, keyboards, defaults, sanitisers and layout.
- **The `Disponible` helper** stays exactly where it is, with the same copy. It is the
  informational half; the control is the action half.
- **The save gate**, and all of its messages, including the date-qualified variants.
- **The breakdown** — **Monto bruto**, **Comisión**, **Impuestos**, **Total a recibir** — and its
  fee-exceeds-gross error.
- **Save behaviour**: the write still waits for Postgres, still stamps `createdAt` from the
  database clock, still leaves the form intact on failure (`0010`).
- **The stored `SellMovement`.** No new field, no flag. A sale made with this control is
  indistinguishable from one typed by hand.
- **The other four movement forms.** Only a sell consumes a quantity the app derived.

---

## 11. Settled decisions (recap)

1. **Meaning** → a **claim** that the sale takes everything it may; **mechanism** → a plain
   editable fill. No mode, no lock, no flag.
2. **Fills** → the date-aware available count, never today's holding.
3. **Placement** → fixed bottom block, directly above **Guardar movimiento**; all actions in one
   place, field grid untouched.
4. **Always rendered**, disabled when there is nothing to sell **or a save is in flight** —
   never conditional, so the save button cannot move.
5. **Label** → `Vender todo`, no figure; the accessible label carries the count.
6. **Styling** → secondary: border-only, no glow, subordinate to the primary CTA.
7. **On tap** → fill, mark touched, light haptic; the breakdown is the visible feedback.
8. **Stale fills** → left alone. The gate blocks the over-sell; the under-sell is permitted.
9. **Disabled copy** → none; the **Acciones** messages already say why.

---

## 12. Out of scope (this spec)

- **Any change to share precision.** The 5 dp → 4 dp proposal was analysed and set aside; `0014`
  records why.
- **Storing the Monto**, or capturing the broker's share count at buy time — either would remove
  the divergence at its source. Both are their own slices; `0012` defers the first.
- **Clearing existing Dust automatically.** The control makes the corrective sale easy to record;
  it does not record one.
- **A "Comprar todo" counterpart** or any equivalent on the four other forms.
- **The fully-exited position becoming unreachable** after a clean close — already in the
  tech-debt backlog, sharpened by this slice but not addressed by it.
- **A confirmation step** before a full exit. The sale is reviewed in the breakdown and committed
  by a separate button; a dialog between them would be a third gate on a two-gate screen.
- **Component / RNTL tests** for the control's rendering, states, haptic or accessible label. No
  harness is installed and this slice does not add one.
