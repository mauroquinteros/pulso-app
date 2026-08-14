# 01 - The four forms that cannot save yet say "Pronto"

Type: **AFK** - four booleans and the rendering already exists.

## Parent

`.scratch/history-persistence/PRD.md`

## What to build

**Compra**, **Venta**, **Dividendo** and **Retiro** become unreachable from the movement-type
picker, marked with the **"Pronto"** tag. **Depósito** stays live.

The picker already supports this completely: each row carries a `disabled` flag, and a disabled
row renders greyed and unpressable with a **Pronto** tag in place of the chevron. Nothing new is
designed or built - four flags flip.

**Why this ships before the History becomes real.** Once issue 02 lands, the movements store is
authoritative: what is in it is what Postgres holds. A form that writes into that store without
writing to Postgres then produces a **Movement** that survives until the next launch and then
vanishes - leaving **Cash** overstated, and the Compra form's own funds gate trusting the
inflated figure to approve a purchase there is no money for. Landing this first means that
window never exists.

On its own this costs the user nothing. Those four forms already lose everything they record on
relaunch; this only stops the app inviting people to use them.

Each later slice flips its own row back as that form starts persisting.

## Acceptance criteria

- [ ] Compra, Venta, Dividendo and Retiro appear greyed, carry the **Pronto** tag, and cannot be
      opened from the picker
- [ ] Depósito is unchanged - still pressable, still opens its form
- [ ] The picker's section headings and layout are otherwise untouched
- [ ] No route is deleted and no form screen is modified; only reachability changes
- [ ] `npx tsc --noEmit` and the existing test suite pass

## Blocked by

None - can start immediately.
