# Dividend view-model + tests

**Type:** AFK
**Source:** `.scratch/dividend-ux/PRD.md` · `.scratch/dividend-ux/UX.md`

## What to build

The pure **dividend view-model** — a deep module mirroring the sell view-model
(`components/add-movement/sell-view-model.ts`), but simpler. It owns the live breakdown figures
(Monto bruto, Total a recibir) and the save-gate, and maps validated input to a typed
`DividendMovement`. Unlike the sell view-model it takes **no `availableShares` argument** — a
dividend is income, not a trade against a position, so there is no held-shares gate.

Two functions:

- `summarizeDividend(input)` → the live figures + gate flags
- `buildDividendMovement(input, deps)` → the typed movement (system fields via injected
  generators, like the other forms; empty Impuestos defaults to `0`; ticker stored uppercase)

**Input model:** the user records dividend income as a **gross cash amount** — amount-first, no
shares, no price. The summary shape encodes the validation decisions:

```ts
interface DividendSummary {
  gross: number;            // grossAmount (0 when blank/≤0)
  total: number;            // gross − tax; cash credit (0 when gross is 0)
  saveEnabled: boolean;     // ticker≠"" && gross>0 && tax≥0 && tax≤gross
  tickerInvalid: boolean;   // ticker is empty (after trim/uppercase)
  grossInvalid: boolean;    // a Monto bruto was entered but is ≤ 0
  taxExceedsGross: boolean; // tax > gross (blocks save; would be a negative net dividend)
}
```

The input is the raw string fields (`ticker`, `grossAmount`, `tax`, `executedAt`), same
decimal-parsing approach as the other forms. The ticker is free text — forced to uppercase,
`[A-Z]` only. The UI label "Impuestos" maps to the model field **`tax`** (the withholding tax) —
note this differs from the sell form, where "Impuestos" mapped to `regulatoryFees`.

`buildDividendMovement` produces `{ ticker, grossAmount, tax }` — no model/engine change. The
engine already supports dividends (`computeCash` does `cash += grossAmount − tax`;
`deriveHoldingFacts` does `totalDividends += grossAmount − tax`) — this issue does **not** touch
the engine, and there is **no `fee`** on a dividend.

## Acceptance criteria

- [ ] `summarizeDividend` returns `gross = grossAmount`, and `0` when Monto bruto is blank/≤0
- [ ] `summarizeDividend` returns `total = gross − tax`, and `0` when gross is 0
- [ ] Blank Impuestos is treated as `0` (total equals gross)
- [ ] `saveEnabled` is true only when ticker is non-empty **and** `gross > 0` **and** `tax ≥ 0` **and** `tax ≤ gross`
- [ ] `tickerInvalid` is true when the ticker is empty (after trim/uppercase)
- [ ] `grossInvalid` is true when Monto bruto is entered but is ≤ 0 (blank is not invalid)
- [ ] `taxExceedsGross` is true when `tax > gross` (and gates save); not flagged for a blank form
- [ ] `buildDividendMovement` maps Símbolo / Monto bruto / Impuestos / Fecha to a typed `DividendMovement` with injected system fields; the ticker is stored uppercase; empty Impuestos defaults to `0`
- [ ] Vitest tests mirror `components/add-movement/sell-view-model.test.ts` and cover all the above
- [ ] `npm test` green and `tsc --noEmit` clean

## Blocked by

None - can start immediately.
