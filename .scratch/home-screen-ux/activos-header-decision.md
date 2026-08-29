# Mis Activos: the aggregate header

**Status:** implemented, uncommitted · **Decided:** 2026-08-28

Reached through a 4-variant prototype on the real Inicio route; the prototype
has been deleted and the winner folded into `components/home/assets-card.tsx`.

## Before / after

```
Mis Activos          Net P&L +$83.22 · +24.48%     <- was
   MSFT  0.82413 acc     $423.22  +$83.22 · +24.48%

Mis Activos                                        <- is
Rendimiento no realizado               +$83.22
   MSFT  0.82413         $423.22   +$83.22  +24.48%
```

## What was decided, and why

**1. `Net P&L` -> `Rendimiento no realizado`.** The old label was the only
English on the screen. Naming it after the card above (`Rendimiento total`)
makes the two read as one measure at two scopes rather than as unrelated
figures. Chosen over the bare `No realizado` from `UX.md` §8 because that
would have linked the header to a 13px grey line inside a *collapsed*
breakdown; this links it to a card title.

**2. No aggregate percentage, and therefore no info icon.** The dollars were
always coherent: `+$83.22` is a component of `+$98.82`, part smaller than
whole. The percentage was the only figure that broke that reading - `+24.48%`
against Rendimiento total's `+14.15%`, part *bigger* than whole, because the
bases differ (Cost Basis vs Peak Contributions) and nothing on screen said so.

Naming the two figures alike made this worse, not better: `Net P&L` shared no
vocabulary with `Rendimiento total`, so nobody compared them. The general
lesson - **tie two figures together by name and you inherit responsibility for
every dimension a reader will now assume they share.**

An info popover was prototyped to explain the denominators and then cut: a
tooltip apologising for a number is worse than not printing the number. The
per-holding percentage stays, because on a row it is self-contained.

**3. The header matches the breakdown row's typography** (13/500 label,
13/700 value) rather than this card's old 12px. The two lines are the same
object rendered in two cards, and looking identical is what carries that now
that there is no icon and no percentage.

**4. The breakdown keeps `No realizado` / `Realizado`.** Prefixing each
component with `Rendimiento` inside a card already titled *Rendimiento total*
is noise. The full term is spelled out only in Mis Activos, which stands alone.

**5. `· Net P&L` dropped from the breakdown.** It glossed the term Mis Activos
used to print; nothing on screen speaks English now.

## Deliberately contradicted

- **PRD story 14** asks for "aggregate **Net P&L** and its % over **Cost
  Basis**". The percentage is gone on purpose - see (2). Story 15 (Net P&L as
  the holdings stat rather than a competing headline) still holds.

## Still owed

- **`CONTEXT.md`'s Net P&L entry lists `return` under _Avoid_**, so that Total
  Return keeps sole claim on "Rendimiento". `Rendimiento no realizado` survives
  on the qualified-vs-unqualified logic the doc already applies elsewhere, but
  that is an amendment somebody has to write, not a reading of what is there.
  Until it lands, the glossary contradicts the shipped UI.

## Not adopted

A footnote at the bottom of the card - *"Estos activos suman tu Rendimiento no
realizado"* - mirroring the Rendimiento card's *"Los componentes suman el
rendimiento total"*. It remains the only idea that would explain outright why
the header and the single row show the same figure when you hold one thing.
Never built.
