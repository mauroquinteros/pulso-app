# 03 - A Dividendo is written to Postgres

Type: **AFK** - client only. The dividends table, its policies, its index and its
`updated_at` trigger were applied in the first migration; no migration is part of this.

## Parent

`.scratch/dividend-ux/PRD.md`

## What to build

**Dividendo** opens from the movement picker, and **Guardar movimiento** writes to the
dividends table. The save waits for the answer and nothing is optimistic: the **Movement**
that joins the **History** is built from the row the database stored, so `createdAt` comes
from the database's clock rather than from whichever phone recorded the payment (ADR 0010).
Then the modal dismisses with a haptic and Inicio re-derives - **Efectivo** rises by the net
and **Dividendos netos** grows - and the dividend is still there after a restart.

A save in flight leaves the button inert. A save that fails says so, keeps every field
exactly as typed, does not dismiss, and writes nothing. A save retried after a lost response
cannot record the dividend twice.

**Why this matters.** The form has been finished since its own slice and its Guardar leads
nowhere - it commits to an in-memory store that Postgres never hears about, and the write
path refuses any Movement that is not a deposit, a withdrawal or a buy. The picker row still
wears its *Pronto* tag, so the form cannot even be opened. **Net Dividends** is a headline
component of **Total Return** and has never been shown a real value in the running app.

**The read side needs no work.** `computeCash` nets a dividend into **Efectivo**, Inicio
renders **Dividendos netos**, the stock detail renders **Dividendos**, and the movements list
renders any row from its **Cash Impact**. All of it re-derives the moment a stored dividend
reaches the store.

**The dividends table has no `type` column.** It is single-purpose, unlike the two tables the
write path already knows, both of which send one - so this payload must omit it or the insert
is refused for an unknown column. `created_at` is omitted as always, so the column default
fires.

The clock-disagreement retry and the duplicate-id read-back already generalise and are reused
untouched; the read-back follows the movement to its own table.

The builder stops supplying a clock. It produces the *fields* of a Movement rather than a
Movement, exactly as the deposit and buy builders do, and its bespoke deps collapse into the
shared movement deps.

**Símbolo stays free text with no check of any kind** - re-decided when this slice was
planned, and recorded in the ADR 0009 amendment. The form's one gate remains tax <= gross.

**This is the third copy of the save lifecycle, and sharing it is deliberately deferred** so
this slice touches no working form. The standing record is in `.scratch/tech-debt/backlog.md`,
whose trigger is the next form after this one.

## Acceptance criteria

- [ ] The **Dividendo** row in OPERACIONES is active (no *Pronto*) and opens the form; Venta and
      Retiro keep their tags and stay unopenable
- [ ] The write path admits a dividend, and its blanket refusal narrows to **Venta alone**
- [ ] Saving a dividend inserts into the dividends table and awaits the answer before dismissing
- [ ] The insert payload carries **no `type` column**, which that table does not have
- [ ] The Movement that joins the History is mapped from the row the database returned, carrying
      the database's `createdAt`
- [ ] The id is minted once per form session, so a second tap or a retry after a lost response
      carries the same id
- [ ] A duplicate id reads the stored row back from the **dividends** table and reports success
- [ ] A failed save keeps Símbolo, Monto bruto, Impuestos and Fecha as typed, shows a failure
      message, does not dismiss, and writes nothing
- [ ] The save button is inert while a save is in flight
- [ ] **Símbolo** remains free text with no gate; the only gate is tax <= gross
- [ ] The **Fecha** chosen is stored as that calendar date, unshifted by the device's timezone
- [ ] On save the modal dismisses to Inicio, where **Efectivo** and **Dividendos netos** have
      moved by the net with no manual refresh
- [ ] Verified on a device **and** against the live table: `created_at == updated_at`,
      `execution_date` a bare calendar date, `user_id` filled by the column default
- [ ] Verified on a device: the dividend survives a restart
- [ ] Verified on a device: airplane mode refuses without dismissing, and the retry that follows
      produces **one** row, not two

## Blocked by

None - can start immediately. `01-dividend-view-model.md` and `02-dividend-form-and-picker.md`
are built; this finishes the first criterion of `02`, unticked since the form shipped.

## Notes

`movement_dividends` has never had a single row inserted. Its RLS insert policy, its `user_id`
default and its `updated_at` trigger have existed since the first migration and none has ever
fired. Every other part of this slice is a copy of code known to work; that table is the one
genuine unknown, and no unit test can reach it - which is why the last three criteria are
device-and-database rather than test-only.
