# PRD — Add Movement: Dividend (Dividendo)

**Feature:** `dividend-ux`
**Companion to:** `.scratch/dividend-ux/UX.md` (the design brief — this PRD cites it, doesn't repeat it).
**Mirrors:** `.scratch/sell-ux/PRD.md` (same patterns, simpler single-deduction model) and
`.scratch/buy-movement/PRD.md` (the slice that made Compra durable — this is the same move for Dividendo).
**Implements:** `docs/adr/0010-a-movement-is-saved-only-when-the-database-says-so.md` on a fourth form.
**Respects:** `0002` (USD only, no FX), `0003` (cash-side amounts), `0004` (executionDate is a calendar
date), `0006` (three tables, read all-or-nothing), `0009` (a buy is blocked until its symbol is confirmed —
**and its amendment, which leaves Dividendo's Símbolo ungated**).
**Depends on:** the engine's existing `dividend` support, and the deposit and buy slices, which
built the write path this one extends.
**Language:** UI is **Spanish**; canonical concepts are English (`CONTEXT.md`).
**Currency:** USD only (`docs/adr/0002-scope-boundaries-v1.md`).

**Revision (2026-08-21).** This PRD was written when nothing was persisted and it put
persistence out of scope — "in-memory; Supabase later." Later is now. The form it specified was
built and works; what it lacks is a **Guardar movimiento** that leads anywhere. The sections
below have been brought up to date rather than replaced: the user stories, gates and figures it
settled all still stand, and what has been added is the write path, the failure path, and the
picker row that makes the form reachable at all.

---

## Problem Statement

A Pulso user can move cash, buy shares, and sell shares, but cannot yet record **income from
their holdings**. The type picker shows **Dividendo** under OPERACIONES as "Pronto" — tapping it
does nothing. Until dividends exist, the only way money enters the account is a Depósito or a
Venta; **Net Dividends** — a headline component of **Total Return**, deliberately broken out so
the user can see dividend earnings separately from price gains — has nothing to derive from and
reads $0 forever. The investing loop is missing its income leg.

**And the form behind that tag has been finished for months.** It confirms nothing it should not,
derives the net correctly, gates on the one thing that matters, and its **Guardar movimiento**
leads nowhere: it commits to an in-memory store that Postgres never hears about, and the write
path refuses outright any **Movement** that is not a deposit, a withdrawal or a buy. So the
picker's *Pronto* tag is honest — a dividend recorded today would be gone at the next launch.

Two consequences follow, and both are about **Efectivo** rather than about dividends:

- **The only income the app can keep is a sale.** A user whose holdings pay them quarterly
  watches **Efectivo** drift further from their real Buying Power with every payment, and the
  Compra form's funds gate trusts that figure — so a wrong Efectivo does not merely misreport,
  it silently refuses buys the user can actually afford, or waves through ones they cannot.
- **Net Dividends cannot be proven.** It is the one component of **Total Return** that has never
  been shown a real value in the running app. The engine computes it, three screens render it,
  and nothing has ever put a number through them.

## Solution

Ship the **Dividendo** form end to end. The user taps `+` → **Dividendo** → types a **Símbolo**,
the **Monto bruto** paid, an optional **Impuestos** withheld, and a **Fecha**. A dividend is
**pure cash income** — there is no quantity and no price to enter — so the form is
**amount-first**: the user records the gross cash and the tax, and the form **derives what lands
in Cash**: **Total a recibir** = `Monto bruto − Impuestos`.

**On save the movement is written to the dividends table and the app waits for the answer.**
Nothing is optimistic. The **Movement** that joins the **History** is built from the row the
database stored, never the one the form built, so its `createdAt` comes from the database's
clock rather than from whichever phone happened to record the payment (ADR 0010). Then the modal
dismisses with a confirming haptic and Home re-derives: **Efectivo** rises by the net and **Net
Dividends** / **Total Return** grow — no manual refresh. A dividend recorded today is still
there next week, on any device the Perfil signs in from.

A save that fails says so and changes nothing: every field stays exactly as typed, the form does
not dismiss, and nothing was written. A save retried after a lost response cannot record the
dividend twice.

Because a dividend is income (not a trade against a position), the form has **no held-shares
gate**: you can record a dividend on any ticker, including one you have since sold. The one
guard is a **domain-honesty gate** — withholding tax is a fraction of the dividend, so the form
**blocks save when Impuestos exceeds Monto bruto** (a negative net dividend is never a real
event and must not reach the engine).

The **Símbolo** field is **free text, forced to uppercase**, with no symbol search and **no check
of any kind** — see the ADR 0009 amendment under Implementation Decisions.

From the user's perspective:

> tap `+` → pick **"Dividendo"** → type **Símbolo / Monto bruto / Impuestos / Fecha** →
> see **"Total a recibir · $X"** update live → **Guardar movimiento** → modal dismisses → Home's
> **Valor total** / **Efectivo** / **Net Dividends** update — and are still right tomorrow.

## User Stories

1. As a Pulso user, I want to tap `+` and choose **Dividendo**, so that I can record a dividend paid on my holdings.
2. As a Pulso user, I want the Dividendo row in the **OPERACIONES** group of the picker to be active (not "Pronto"), so that I can actually open the form.
3. As a Pulso user, I want the Dividendo form to open as a modal with a back affordance to the picker, so that recording a dividend feels like a quick, self-contained task and I can correct a wrong type choice.
4. As a Pulso user, I want a **Símbolo** field, so that I can type the ticker that paid the dividend.
5. As a Pulso user, I want the **Símbolo** field to force uppercase as I type, so that `aapl` and `AAPL` resolve to the same symbol.
6. As a Pulso user, I want to type the symbol freely (no forced search/autocomplete), so that recording a dividend stays as fast as Compra/Venta.
7. As a Pulso user, I want to record a dividend on **any ticker** — including one I no longer hold — so that I can log a payment received after I sold, without the form blocking me.
8. As a Pulso user, I want to record the dividend as a **gross cash amount** (not per-share × shares), so that the form matches how a dividend actually lands — a lump of cash.
9. As a Pulso user, I want a **Monto bruto** field with a `$` prefix and a decimal keypad, so that I can enter the dividend paid before tax.
10. As a Pulso user, I want an **Impuestos** field, so that I can record the withholding tax deducted from the dividend.
11. As a Pulso user, I want **Impuestos** to be optional and default to `0`, so that I don't have to type anything for a tax-free dividend.
12. As a Pulso user, I want **Impuestos** to be **empty by default** (not pre-filled), so that I never save a tax I didn't actually pay.
13. As a Pulso user, I want a live breakdown — **Monto bruto**, **Impuestos** `−`, and **Total a recibir** — so that I see exactly what reaches my Cash and what the tax took.
14. As a Pulso user, I want **Impuestos subtracted** from the gross, so that the total I see matches what actually lands in my Efectivo.
15. As a Pulso user, I want the save **blocked when Impuestos exceeds Monto bruto**, so that I can't record an impossible negative dividend.
16. As a Pulso user, I want a clear message when the tax is too high (**"El impuesto no puede superar el monto bruto."**), so that I understand why I can't save.
17. As a Pulso user, I want a **Fecha** field that defaults to today and is shown as **DD/MM/AAAA**, so that recording today's dividend needs no interaction and past dates are fast.
18. As a Pulso user, I want **future dates blocked**, so that I can't record a dividend that hasn't been paid.
19. As a Pulso user, I want **Guardar movimiento** disabled until Símbolo and Monto bruto (>0) are valid and Impuestos is within range, so that I can't save an incomplete or impossible dividend.
20. As a Pulso user, I want an error on a field (once I leave it) when it's empty/zero/over-taxed, so that I'm told why I can't save.
21. As a Pulso user, I want a confirming haptic on save and the modal to dismiss back to Home, so that the action feels acknowledged and I immediately see the result.
22. As a Pulso user, I want Home to re-derive automatically after I save, so that my **Efectivo** and **Net Dividends** reflect the dividend without a manual refresh.
23. As a Pulso user, I want my dividend income shown separately from price gains (via **Net Dividends** in **Total Return**), so that I can see how much my holdings pay me.
24. As a Pulso user, I want the Dividendo form to look and behave like the Compra/Venta forms, so that recording movements feels consistent.
25. As a Pulso user, I want a dividend I record to **still be there when I reopen the app**, so that my history is a record rather than a session.
26. As a Pulso user, I want a dividend I record on one device to be there when I sign in on another, so that my **History** belongs to my **Perfil** and not to a phone.
27. As a Pulso user, I want the app to **wait for the save to succeed** before telling me it worked, so that a confirming haptic never means something that did not happen.
28. As a Pulso user, I want a failed save to **say so and keep everything I typed**, so that a dropped connection costs me a tap rather than the whole form.
29. As a Pulso user, I want a failed save to **change nothing at all**, so that I never have to wonder whether a half-recorded dividend is sitting in my history.
30. As a Pulso user, I want to be able to **tap Guardar again after a failure** without recording the dividend twice, so that retrying is always safe.
31. As a Pulso user, I want the button to be **inert while the save is in flight**, so that an impatient second tap cannot start a second save.
32. As a Pulso user, I want the **Fecha I chose** to be the date stored, whatever timezone my phone is in, so that a dividend paid on the 3rd is never filed on the 2nd.
33. As a Pulso user, I want my **Efectivo** to include every dividend I have ever recorded, so that the Compra form's funds gate is telling me the truth about what I can afford.

## Implementation Decisions

### Domain & engine (already done — no change is part of this PRD)

- The engine already supports dividends: a **Dividend** movement carries `ticker`,
  `grossAmount`, and `tax` — and **nothing else** (no `fee`, no `regulatoryFees`, no `shares`,
  no `executionPrice`). `computeCash` does `cash += grossAmount − tax` (the net that lands in
  Cash); `deriveHoldingFacts` does `totalDividends += grossAmount − tax`; `computeNetDividends`
  does the same `gross − tax`. This is exactly **Net Dividends** in `CONTEXT.md`.
- **The read side is finished too, and has never seen a dividend.** Inicio renders **Dividendos
  netos** as a component of **Total Return**, the stock detail renders **Dividendos** in its
  per-ticker return block, and the movements list renders any row generically from its **Cash
  Impact** — so a dividend needs no new row type, no new detail case and no new formatting.
  Every one of them re-derives the moment a stored dividend reaches the store.
- **The schema is finished as well.** The dividends table, its RLS policies, its index and its
  `updated_at` trigger were applied in the first migration. **No migration is part of this PRD.**
- **A dividend has a single deduction — `tax` — by deliberate model decision.** The fee field
  was removed from dividends in the fee-structure refactor because a dividend always had
  `fee: 0`. The UI label **"Impuestos"** maps to the real `tax` field here (withholding tax) —
  *not* to `regulatoryFees` as it does on Venta. Re-introducing a separate dividend fee would be
  a model change and would warrant its own ADR; it is out of scope.
- The user records dividend income as a **gross cash amount**, so the form is **amount-first** —
  no shares, no price (contrast Compra's monto-first and Venta's shares-first). The numbers the
  screen must get right: **Monto bruto** = `grossAmount` · **Total a recibir** = `Monto bruto −
  Impuestos` (the cash credit, shown as the live summary). The tax subtracts.

### Modules

- **The write path** — the single module that owns the database, and the only one this slice
  changes in substance. It is deep in the strict sense: **its interface does not change at all.**
  Callers still hand it a Movement and receive an answer; everything below is internal.
  - It learns that a dividend is writable, and its blanket refusal narrows to **Venta alone**.
  - It gains a destination for the dividends table. That table is **single-purpose and has no
    `type` column**, unlike the two the write path already knows, both of which send one — so
    this payload must omit it or the insert is refused for an unknown column. `created_at` is
    omitted as always, so the column default fires and the timestamp is the database's.
  - Everything else already generalises and is reused untouched: the clock-disagreement retry,
    and the duplicate-id read-back, which follows the movement to **its own** table rather than a
    hard-coded one.

- **Dividend view-model** — a pure, deep module, already built and largely unchanged.
  `summarizeDividend` keeps its shape exactly:

  ```ts
  interface DividendSummary {
    gross: number;            // grossAmount (0 when blank/≤0)
    total: number;            // gross − tax; cash credit (0 when gross is 0)
    saveEnabled: boolean;     // ticker≠"" && gross>0 && tax≥0 && tax≤gross
    tickerInvalid: boolean;   // ticker is empty (after trim/uppercase)
    grossInvalid: boolean;    // a Monto bruto was entered but is ≤ 0
    taxExceedsGross: boolean; // tax > gross (blocks save; negative net dividend)
  }
  ```

  What changes is the builder: it **stops supplying a clock**. It produces the *fields* of a
  Movement rather than a Movement, exactly as the deposit and buy builders already do, and its
  bespoke deps collapse into the shared movement deps. Empty Impuestos still defaults to `0`;
  the ticker is still stored **uppercase**.

- **Dividend form screen** — the form itself is built and its layout, gates and breakdown are
  unchanged. What it gains is the awaited save lifecycle: the deps held for the lifetime of the
  form, an in-flight state that makes the button inert, a failure state that surfaces above the
  button, and a success path that puts **the returned row** into the store before dismissing.
  It still reads **nothing** from `usePortfolio` — there is no held-shares gate and no funds
  gate, so it needs no derived figures at all.

- **Type picker** — the **Dividendo** row goes live: its *Pronto* tag is removed and its press
  opens the form. Venta and Retiro keep theirs. This is the change that makes every other one
  reachable, and the PRD's original acceptance criterion for it has been unticked since the
  form shipped.

### Key interactions & contracts

- **Nothing is optimistic, and the stored row is the one that counts.** The store is the sole
  input to the derivation engine, so a dividend Postgres never received would not be a pending
  write — it would be an **Efectivo** that is wrong with nothing on screen saying so, and the
  Compra form's funds gate trusts that figure (ADR 0010).
- **The id is minted once per form session, not once per tap.** This is what makes a retry safe:
  a second attempt carries the first attempt's id, so the database refuses the duplicate rather
  than recording the dividend twice. A duplicate id is therefore **not** a failure — it is this
  save's own first attempt, already stored, and the honest answer is the row it wrote. Reporting
  it as a failure is what would make the human's retry unsafe.
- **A failed save leaves the form exactly as the user left it** — Símbolo, Monto bruto,
  Impuestos and Fecha all still typed — says the save failed, and does not dismiss. There is
  nothing to roll back, because nothing was written.
- **Símbolo is free text with no check of any kind, and this was re-decided here.** Making the
  rows durable is the strongest case yet for closing the typo hole, and ADR 0009 named the fix:
  a local "is this ticker already in `stocks`" check. **That check is not available**, and the
  ADR has been amended to say so. The map it would consult holds only Stocks the database can
  *price*, so a ticker's absence from it carries three meanings — not yet read, could not be
  read, or a real Stock with no Quote — and a gate built on it would refuse genuine dividends
  whenever the price read failed or the company was acquired. The trade runs the wrong way: a
  typo is recoverable by an edit (ADR 0007), a refused real dividend is not.
- **No held-shares gate.** In deliberate contrast to Venta, the dividend form does not look the
  ticker up in holdings and does not bound the amount by a position. A dividend is income, not a
  trade against shares held.
- **Over-tax gate (strict, domain honesty) — still the only gate.** `tax ≤ grossAmount`. When
  `Impuestos > Monto bruto`, the summary sets `taxExceedsGross`, save is disabled, the **Total a
  recibir** turns red, and the inline error **"El impuesto no puede superar el monto bruto."**
  shows under Impuestos.
- **The Fecha chosen is the date stored.** It is a calendar date — the day the cash landed — and
  is never converted through a timezone (ADR 0004). Unlike a buy, mis-dating a dividend derives
  nothing wrong: it touches no **Average Cost** and no **Realized P&L**, so the date decides only
  where the row sorts in Movimientos.
- **Errors are touch-gated.** Field errors (empty ticker, zero/blank gross, over-tax) surface
  only after the field has been touched-then-left — same pattern as the other forms.
- **Live breakdown.** Monto bruto / Total a recibir update on every keystroke; with Monto bruto
  blank they read `$0.00`. **Total a recibir** turns teal when saveable, muted grey when inputs
  are missing, red when over-taxed.
- **Save loop.** Save writes and waits; the returned Movement joins the store; `usePortfolio`
  recomputes; Home reflects the new Efectivo / Net Dividends / Total Return. No toast — haptic +
  dismiss only. The modal dismisses to Home rather than staying open for another entry; a
  "Guardar y agregar otro" is deliberately not built (see Out of Scope).
- **The save lifecycle is copied, not shared — deliberately.** This is its third copy, and the
  buy slice said the third form was where a shared module should earn its place. Deferred so
  this slice touches no working form, and recorded in `docs/tech-debt/backlog.md`, whose
  trigger is the next form after this one. That entry, not a closed issue, is now the standing
  record.

## Testing Decisions

- **What makes a good test here:** assert external behavior — the figures and flags a pure
  module returns for given inputs, and the payload and answer the write path produces for a
  given Movement. Not implementation details, and not the screen.
- **Modules under test:**
  - **The write path's dividend branch.** The highest-value tests in the slice, because this is
    the only new logic. Cover: the payload goes to the dividends table; it carries **no `type`
    column**; it omits `created_at`; the answer is mapped from the returned row; a duplicate id
    reads back from **the dividends table** rather than another one; and a failure is returned as
    an answer, never thrown. The last two are not hypothetical — the buy slice found exactly this
    class of bug here, where the duplicate-id read-back had a table hard-coded.
  - **The dividend view-model**, updated for the builder's new shape: it no longer supplies a
    `createdAt`, and produces the fields of a Movement. The existing summary cases stand
    unchanged — `gross`, `total`, `saveEnabled`, `tickerInvalid`, `grossInvalid`,
    `taxExceedsGross`, uppercase ticker, empty Impuestos defaulting to 0.
- **Not tested, and verified on a device instead:** the form screen. There is still no RNTL in
  the project. What replaces the test is stronger for this slice anyway, because **the dividends
  table has never had a single row inserted** — its insert policy, its `user_id` default and its
  `updated_at` trigger have existed since the first migration and none has ever fired. No unit
  test can reach that. So:
  - Save a real dividend, then read the stored row back from the live database: `created_at ==
    updated_at`, `execution_date` a bare calendar date, `user_id` filled by the column default.
  - Confirm **Efectivo** and **Dividendos netos** on Inicio moved by the net, and that the
    dividend survives a restart.
  - Exercise the failure path in airplane mode: it refuses without dismissing, keeps every
    field, and the retry that follows produces **one** row, not two.
- **Prior art:** `lib/history.test.ts` for the write path and `lib/movement-rows.test.ts` for the
  mappers; `components/add-movement/dividend-view-model.test.ts` for the view-model. Engine
  behavior (Net Dividends, the cash credit) is already covered by `utils/portfolio/cash.test.ts`
  and `reducer.test.ts` and is not re-tested here.

## Out of Scope

- **Any check on Símbolo** — no provider confirmation, no local `stocks` lookup, no holdings
  selector. Re-decided in this slice and recorded in the ADR 0009 amendment; a typo is
  recoverable by an edit, a refused real dividend is not.
- **A shared save lifecycle across the forms.** The third copy is written knowingly; the shared
  module is in the tech-debt backlog with the next form as its trigger.
- **Batch entry** — no "Guardar y agregar otro". Each save dismisses to Home, like every other
  form. Reconsider once the form has been used against a real backlog.
- **Venta and Retiro.** The write path still refuses a sell, and Retiro's screen still commits
  only to the store even though the write path already supports it. Each is its own slice.
- **A separate dividend fee** (`fee` on `DividendMovement`) — the model is tax-only by
  deliberate decision; re-introducing a fee is a model change + ADR, not this PRD.
- **A held-shares gate** for the symbol (free text, ungated, chosen instead — the deliberate
  contrast with Venta).
- **Per-share dividend × shares** entry (record the gross cash directly; no quantity).
- **DRIP** (dividend reinvestment), qualified-vs-ordinary classification, ex-date/record-date
  tracking, FX on foreign dividends. See Further Notes — the no-DRIP premise was checked, not
  assumed.
- **Edit / delete** of movements (create-only, per `0007`).
- **Offline queueing.** A save needs the network; there is no outbox and a failure is reported
  rather than deferred.
- **Component / RNTL tests** (no testing-library installed; not added here).
- Any **engine change, read-side change, or migration** — all three are already in place.

## Further Notes

- **The no-DRIP premise was checked rather than assumed.** This PRD's original claim that "a
  dividend is pure cash income" had never been tested against a real broker, and it is
  load-bearing: if a broker reinvested the payment instead of crediting it, recording it as a
  Dividend would credit **Efectivo** that never arrived while the shares that did arrive went
  missing — wrong twice, in opposite directions, with the reconciliation still balancing because
  both halves carry the same error. Confirmed against **Hapi, which credits cash.** Now recorded
  in `CONTEXT.md` under **Dividend**, which the glossary previously lacked — it defined **Net
  Dividends** but never the thing itself.
- **Dividendo is the amount-first member of the trio.** Compra: user enters Monto → derives
  Acciones. Venta: user enters Acciones → derives Total a recibir. Dividendo: user enters Monto
  bruto → derives Total a recibir (`Monto bruto − Impuestos`). No shares, no price — a dividend
  is pure cash income. (See UX.md §2.)
- **Reconciliation stays intact.** After a dividend of gross `G` with tax `T`: `cash += (G − T)`,
  `marketValue` unchanged, `netContributions` unchanged, `totalReturn += (G − T)` (Net Dividends
  is a Total Return component). The invariant `Cash + Market Value == Net Contributions + Total
  Return` still holds (Δ = `(G − T)` on both sides). See UX.md §4.
- **"Impuestos" is the real `tax` here.** On Venta, "Impuestos" was a label for `regulatoryFees`;
  on Dividendo it maps to the model's `tax` field (withholding tax). Same UI word, different
  underlying field — noted so the two forms aren't conflated.
- **A dividend on a ticker never held is still recordable, and its damage is bounded.**
  **Efectivo**, **Net Dividends** and portfolio **Total Return** all stay correct, because none
  of them is scoped by ticker. What breaks is attribution: that ticker's **Total Return of a
  stock** counts a dividend the user did not mean, and the intended ticker's under-counts. The
  movement is visible in Movimientos and an edit fixes it.
- **Design tokens** are settled and already in the codebase (`constants/theme`, Manrope font,
  teal accent on the primary button) — reuse, don't reinvent.
