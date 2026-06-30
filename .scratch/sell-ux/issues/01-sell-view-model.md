# Sell view-model + tests

**Type:** AFK
**Source:** `.scratch/sell-ux/PRD.md` · `.scratch/sell-ux/UX.md`

## What to build

The pure **sell view-model** — a deep module mirroring the buy view-model
(`components/add-movement/buy-view-model.ts`). It owns the live breakdown figures (Monto
bruto, Total a recibir) and the save-gate, and maps validated input to a typed
`SellMovement`. It takes the **available shares** for the ticker as an argument so it stays
pure and unit-testable (the form passes the held shares from `usePortfolio().holdings`).

Two functions:

- `summarizeSell(input, availableShares)` → the live figures + gate flags
- `buildSellMovement(input, deps)` → the typed movement (system fields via injected
  generators, like the other forms; empty Comisión/Impuestos default to `0`; ticker stored
  uppercase)

**Input model:** the user sells by **Acciones** (quantity) — the inverse of Compra's
monto-first. The summary shape encodes the validation decisions:

```ts
interface SellSummary {
  gross: number;             // Acciones × Precio (0 when shares or price blank/≤0)
  total: number;             // gross − Comisión − Impuestos; cash credit (0 when gross is 0)
  saveEnabled: boolean;      // ticker≠"" && shares>0 && shares≤available && price>0 && fee≥0 && regFees≥0
  tickerInvalid: boolean;    // ticker is empty (after trim/uppercase)
  sharesInvalid: boolean;    // shares entered but ≤ 0
  priceInvalid: boolean;     // a Precio was entered but is ≤ 0
  insufficientShares: boolean; // shares > available shares for the ticker
}
```

The input is the raw string fields (`ticker`, `shares`, `executionPrice`, `fee`,
`regulatoryFees`, `executedAt`), same decimal-parsing approach as the other forms. The
ticker is free text — forced to uppercase, `[A-Z]` only. The UI label "Impuestos" maps to
the model field `regulatoryFees` (there is no `tax` on a sell).

`buildSellMovement` produces `{ ticker, shares, executionPrice, fee, regulatoryFees }` — no
model/engine change. The engine already supports sells (`computeCash` does
`cash += executionPrice × shares − fee − regulatoryFees`; `deriveHoldingFacts` adds the
Realized P&L and resets avg cost on a full exit) — this issue does **not** touch the engine.

## Acceptance criteria

- [ ] `summarizeSell` returns `gross = Acciones × Precio`, and `0` when Acciones or Precio is blank/≤0
- [ ] `summarizeSell` returns `total = gross − Comisión − Impuestos`, and `0` when gross is 0
- [ ] Blank Comisión and blank Impuestos are each treated as `0`
- [ ] `saveEnabled` is true only when ticker is non-empty **and** `shares > 0` **and** `shares ≤ availableShares` **and** `price > 0` **and** `fee ≥ 0` **and** `regulatoryFees ≥ 0`
- [ ] `tickerInvalid` is true when the ticker is empty (after trim/uppercase)
- [ ] `sharesInvalid` is true when Acciones is entered but is ≤ 0 (blank is not invalid)
- [ ] `priceInvalid` is true when a Precio is entered but is ≤ 0 (blank is not invalid)
- [ ] `insufficientShares` is true when `shares > availableShares` (and gates save); the not-held case is `availableShares === 0`
- [ ] `buildSellMovement` maps Símbolo / Acciones / Precio / Comisión / Impuestos / Fecha to a typed `SellMovement` with injected system fields; the ticker is stored uppercase; empty Comisión/Impuestos default to `0`
- [ ] Vitest tests mirror `components/add-movement/buy-view-model.test.ts` and cover all the above
- [ ] `npm test` green and `tsc --noEmit` clean

## Blocked by

None - can start immediately.
