# 02 - A Compra is written to Postgres

Type: **AFK** - client only; the trades table, its constraints and its policies are already
applied.

## Parent

`.scratch/buy-movement/PRD.md`

## What to build

**Compra** opens from the movement picker, and **Guardar movimiento** writes to the trades table.
The save waits for Postgres and nothing is optimistic: the **Movement** that joins the **History**
is built from the row the database stored, so `createdAt` arrives from the database's clock rather
than from whichever phone happened to record the buy. A save in flight leaves the button inert; a
save that fails says so and leaves every field exactly as typed.

**Why this matters.** The form has been finished for weeks and its Guardar leads nowhere - it
commits to an in-memory store that Postgres never hears about, and the write path refuses outright
any Movement that is not a deposit or a withdrawal. The deposit slice made **Cash** real; this is
the first thing that can spend it.

The id is minted **once per form session, not once per tap**, which is what makes a retry after a
lost response safe: the second attempt carries the first attempt's id and the database refuses the
duplicate rather than recording a second buy and doubling **Cost Basis**. A duplicate id is not a
failure - it is this save's own first attempt, already stored, and the honest answer is the row it
wrote. Reporting it as a failure is what would make the human retry unsafe.

`regulatory_fees` is **omitted from the payload** rather than sent as null, so the NULL the schema
requires of a buy is what lands - the column belongs to sells, and the constraint says so.

The clock-disagreement retry and the duplicate-id read-back that already guard the cash insert
cover the trade insert unchanged: a token refused at the gate never reached the table, so there is
nothing to undo.

The builder stops supplying a clock. It produces the *fields* of a Movement rather than a
Movement, exactly as the deposit builder already does.

**This is the second copy of the deposit screen's save lifecycle, duplicated deliberately.** The
third form to need it is where a shared module earns its place; extracting now would drag the
working deposit form into this slice for no benefit today.

## Acceptance criteria

- [x] Compra opens from the picker; Venta, Dividendo and Retiro keep their *Pronto* tags and stay
      unopenable
- [x] Saving a buy inserts into the trades table and awaits the answer before the form dismisses
- [x] `regulatory_fees` is absent from the insert payload, so a buy stores NULL and the schema's
      constraint is satisfied
- [x] The Movement that joins the History is mapped from the row the database returned, carrying
      the database's `createdAt`
- [x] The id is minted once per form session, so a second tap or a retry after a lost response
      carries the same id
- [x] A duplicate id reads the stored row back and reports success rather than reporting a failure
- [x] A failed save leaves Símbolo, Monto, Precio, Comisión and Fecha as typed, shows a failure
      message, and writes nothing
- [x] The save button is inert while a save is in flight
- [x] Sells and dividends are still refused by the write path
- [x] The **Fecha** chosen is stored as that calendar date, unshifted by the device's timezone
- [x] Verified on a device: a recorded buy survives a restart, appears in the movements list with
      its **Cash Impact**, and its receipt adds up to its total

## Blocked by

- `.scratch/buy-movement/issues/01-the-buy-total-is-the-figure-that-leaves-buying-power.md`

## Closing note

Done in `ff559c0`, and verified on a device **and** against the live database.

The rows Postgres holds were read back with `supabase db query --linked`:
`regulatory_fees` is NULL on every buy, `created_at == updated_at` (so the value is the
database's clock on insert and nothing has updated it since), and `execution_date` is a
bare calendar date — `2025-04-03` for a buy recorded in August, unshifted.

The failure path was exercised in airplane mode: the message appeared, every field
survived, and the retry that followed produced **one** row, not two.

The whole portfolio was run through `assemblePortfolio` from the live rows and
reconciles: `Cash + Market Value == Net Contributions + Total Return`, with
`holdingsMissingPrice` at 0 once every ticker is priced.

One thing found while extracting `destinationFor`: the duplicate-id read-back had
`movement_cash` hard-coded, so a retried **buy** would have been answered with whatever
sat in the cash table under that id. It now follows the movement to its own table, and a
test names the case.
