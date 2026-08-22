# 03 - A Dividendo is written to Postgres

Type: **AFK** - client only; the dividends table, its policies, its index and its
`updated_at` trigger are already applied and need no migration.

## Parent

`.scratch/dividend-ux/PRD.md`

## What to build

**Dividendo** opens from the movement picker, and **Guardar movimiento** writes to the
dividends table. The save waits for Postgres and nothing is optimistic: the **Movement**
that joins the **History** is built from the row the database stored, so `createdAt`
arrives from the database's clock rather than from whichever phone recorded the payment.
A save in flight leaves the button inert; a save that fails says so and leaves every
field exactly as typed.

**Why this matters.** The form has been finished since its own slice and its Guardar
leads nowhere - it commits to an in-memory store that Postgres never hears about, and
`saveMovement` refuses a dividend outright. The picker row still wears its *Pronto* tag,
so the form cannot even be opened. **Net Dividends** is a headline component of **Total
Return**, broken out deliberately so dividend earnings can be seen apart from price
gains, and it has had nothing to derive from since the app was built.

**The read side is already finished and needs no work.** `computeCash` nets a dividend
into **Efectivo** as `grossAmount - tax`, Inicio renders **Dividendos netos** as a
component of **Total Return**, the stock detail renders **Dividendos** in its per-ticker
block, and the movements list renders any row generically from its **Cash Impact**. All
of it has been waiting for a dividend to arrive. The moment `movementSaved` receives the
stored row, every figure re-derives with no further change.

**The dividends table has no `type` column.** It is single-purpose, unlike
`movement_trades` and `movement_cash`, whose branches both send one. Its insert payload
must omit `type` or PostgREST refuses the unknown column. `created_at` is omitted as
always, so the column default fires (ADR 0010).

The clock-disagreement retry and the duplicate-id read-back that already guard the cash
and trade inserts cover this one unchanged - the read-back follows the movement to its
own table.

The builder stops supplying a clock. `buildDividendMovement` produces the *fields* of a
Movement rather than a Movement, exactly as the deposit and buy builders already do, and
`DividendDeps` collapses into the shared `MovementDeps`.

**Símbolo stays free text with no check of any kind.** Not an omission - re-examined
when this slice was planned and rejected, because the only local check available reads a
map filtered to Stocks the database can *price*, so its absence cannot tell a typo from
a failed price read, a Stock with no quote, or an acquired company. See the amendment in
`docs/adr/0009-a-buy-is-blocked-until-its-symbol-is-confirmed.md`. The form's one gate
remains tax <= gross.

**This is the third copy of the deposit screen's save lifecycle, and it is deferred
deliberately** rather than shared, so this slice touches no working form. The standing
record moved out of the closed buy issue and into
`.scratch/tech-debt/backlog.md` ("The save lifecycle is copied per form"), whose trigger
is the next form after this one.

## Acceptance criteria

- [ ] The **Dividendo** row in the OPERACIONES group is active (no *Pronto*) and opens the form;
      Venta and Retiro keep their tags and stay unopenable
- [ ] `saveMovement`'s refusal narrows to `sell` alone, and `WritableMovement` admits a dividend
- [ ] Saving a dividend inserts into the dividends table and awaits the answer before the form
      dismisses
- [ ] The insert payload carries **no `type` column**, which that table does not have
- [ ] The Movement that joins the History is mapped from the row the database returned, carrying
      the database's `createdAt`
- [ ] The id is minted once per form session, so a second tap or a retry after a lost response
      carries the same id
- [ ] A duplicate id reads the stored row back from the **dividends** table and reports success
- [ ] A failed save leaves Símbolo, Monto bruto, Impuestos and Fecha as typed, shows a failure
      message, and writes nothing
- [ ] The save button is inert while a save is in flight
- [ ] Sells are still refused by the write path
- [ ] The **Fecha** chosen is stored as that calendar date, unshifted by the device's timezone
- [ ] **Símbolo** remains free text with no gate; the only gate is tax <= gross
- [ ] On save the modal dismisses to Inicio, where **Efectivo** and **Dividendos netos** have
      moved by the net with no manual refresh
- [ ] Verified on a device **and** against the live table: `created_at == updated_at`,
      `execution_date` a bare calendar date, `user_id` filled by the column default
- [ ] Verified on a device: airplane mode refuses without dismissing, and the retry that follows
      produces **one** row, not two

## Blocked by

Nothing. `01-dividend-view-model.md` and `02-dividend-form-and-picker.md` are built; this
finishes the first criterion of `02`, which has been unticked since the form shipped.

## Notes

`movement_dividends` has never had a single row inserted. Its RLS insert policy, its
`user_id` default and its `updated_at` trigger have existed since the first migration and
none has ever fired. Every other part of this slice is a copy of code known to work; that
table is the one genuine unknown, and no unit test can reach it - which is why the last
two criteria are device-and-database rather than test-only.
