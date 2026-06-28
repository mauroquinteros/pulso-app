# Pulso — Compra UX Spec (ALT: derived-shares breakdown)

**Status:** alternative design proposal — for comparison against `.scratch/buy-ux/UX.md` (the
implemented "Acciones as a field" layout). Same logic, different presentation.
**Scope:** the **Compra** screen only — UI/layout change, no logic change.
**Companion to:** `.scratch/buy-ux/UX.md` (the baseline) and `.scratch/buy-ux/PRD.md`.
**Reference:** Hapi's "Limit Buy" screen, where **Est. shares** is a small read-only line in a
summary breakdown (Amount → Limit price · Est. shares · Clearing fee · Total), not an input.
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).

---

## 1. The one idea

The only thing this spec changes vs the baseline `UX.md`: **Acciones stops being an
input-styled box and becomes a read-only line in a breakdown section near the bottom.**

Everything else — the view-model (`summarizeBuy` / `buildBuyMovement`), validation, save-gate,
funds check, the cash-side `BuyMovement` model — is **identical**. This is a presentation
change, not a logic change.

### Why

In the baseline, **Acciones** is a read-only box sitting side-by-side with the **Precio**
input, with the same border/weight. That's a **false affordance**: it looks editable but
isn't. Users expect to tap it and can't.

Acciones is a **consequence** of what the user enters (`Monto / Precio`), not an input. The
layout should say so. Hapi's pattern proves it out: the derived shares live in a subordinate
**desglose** under the hero Amount, formatted as `label … value`, visually lighter than the
real inputs.

---

## 2. The interaction model (unchanged)

The user still decides exactly three things plus metadata:

- **Símbolo** (input)
- **Monto comprado** (input — the hero)
- **Precio de ejecución** (input)
- **Comisión** (input, optional)
- **Fecha** (input)

From those, the screen **derives and displays** (read-only):

- **Acciones** = `Monto / Precio`
- **Total a pagar** = `Monto + Comisión`

The rule that drove this redesign: **everything the user types is a "box"; everything the app
computes is a "line".** No computed value is ever styled as an editable field.

---

## 3. Layout (proposed)

```
┌────────────────────────────┐
│ ‹   Compra                 │   header: back → picker
│                            │
│ Símbolo                    │
│ ┌────────────────────────┐ │   input (box)
│ │ AAPL                   │ │
│ └────────────────────────┘ │
│                            │
│ Monto comprado  Disp. $X   │   input (box) — hero
│ ┌────────────────────────┐ │
│ │ $ 200.00               │ │
│ └────────────────────────┘ │
│                            │
│ Precio de ejec.    Fecha   │   inputs (boxes), side-by-side
│ ┌──────────┐  ┌───────────┐│
│ │ $ 551.50 │  │08/01/2026 │ │
│ └──────────┘  └───────────┘│
│                            │
│ Comisión                   │   input (box), full or half width
│ ┌──────────┐               │
│ │ $ 0.15   │               │
│ └──────────┘               │
│                            │
│ ───────── desglose ─────── │   thin divider
│ Acciones            0.36264 │   DERIVED line (label … value)
│ Comisión            +$0.15  │   echo of the fee in the breakdown
│ ──────────────────────────  │
│ Total a pagar      $200.15 │   bold total line
│                            │
│            … (espacio) …    │
│ ┌────────────────────────┐ │
│ │    Guardar movimiento   │ │   sticky primary button
│ └────────────────────────┘ │
└────────────────────────────┘
```

Notes:
- **Acciones** and **Total a pagar** are `label … value` rows (right-aligned value, tabular
  nums), styled like the reference's breakdown — muted labels, the **Total** row bold.
- The breakdown sits **above** the sticky button (mirrors the baseline's bottom summary, just
  expanded into a small list instead of a single hero figure).
- **No input box for shares anywhere.** Acciones only ever appears as a breakdown line.

### Open layout sub-question (for the comparison, not decided here)

Where does **Total a pagar** go — inside the breakdown list (as drawn above) or kept as the
big centered hero figure from the baseline (`UX.md §6`)?
- **(a) In the breakdown** (drawn above) — closest to Hapi; total is the bold last row.
- **(b) Hero figure** (baseline) — big centered "TOTAL A PAGAR $200.15" above the button, with
  Acciones as a small line just under the inputs.

Both are compatible with this spec's one idea (shares = line, not box).

---

## 4. Naming nuance vs Hapi

Hapi says **"Est. shares"** (*estimated*) because it places a **future order** — the real fill
price can move, so shares are an estimate. **Pulso records a buy that already happened**: the
user knows the exact execution price, so `shares = Monto / Precio` is **exact, not estimated**.

→ Label it **"Acciones"** (or "Acciones compradas"), **not** "Acciones est.". Copying Hapi's
"Est." would import uncertainty that doesn't exist when logging a past trade.

---

## 5. Live behavior (unchanged from baseline)

- The **Acciones** line updates live as Monto/Precio change (`Monto / Precio`).
- The **Total a pagar** updates live as Monto/Comisión change (`Monto + Comisión`).
- Before Monto/Precio are valid, the derived lines read `—` or `0` (a muted placeholder), never
  a misleading partial value.
- Insufficient-funds: same strict gate — the **Total a pagar** row turns red, the inline error
  "Solo tienes $X disponible." shows, and **Guardar movimiento** is disabled.

---

## 6. What does NOT change

- The view-model contract (`BuySummary { shares, total, saveEnabled, tickerInvalid,
  amountInvalid, priceInvalid, insufficientFunds }`) — already exposes `shares`, so the
  breakdown line is a pure read of existing data. **No view-model edit.**
- Validation & save-gate (`UX.md §9`).
- `BuyMovement` shape and the engine (`shares` derived at full precision; `cash -= Monto + fee`).
- Símbolo behavior (free text, force-uppercase, no search).
- Comisión empty by default; no fee ceiling.
- Tokens, date picker, save loop (haptic + dismiss), state/data source.

---

## 7. Trade-offs (baseline vs this alt)

| | Baseline (`UX.md`) — Acciones as field | This alt — Acciones as breakdown line |
|---|---|---|
| Affordance honesty | weaker (read-only box looks editable) | **stronger** (computed = line, never a box) |
| Visual hierarchy | Precio and Acciones compete (equal weight) | Monto is the clear hero; Acciones subordinate |
| Familiarity | custom | **matches Hapi**, the app the user trusts |
| Shares visibility | prominent (own box) | still visible, just right-weighted |
| Implementation cost | already built | small: move one value from a box to a line |
| Risk | faux-input confusion | breakdown can feel "denser" near the button |

---

## 8. Out of scope

Same as `UX.md §17`. This spec adds nothing functional — it only repositions the derived
**Acciones** and (optionally) reshapes the bottom summary into a breakdown.
