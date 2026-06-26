# Wire the write loop: movements store + usePortfolio rewire

## Parent

`.scratch/add-movement-ux/PRD.md` — Add Movement: Deposit (tracer bullet)

## What to build

The foundation that lets a recorded movement flow through to the Home screen. Introduce a
**dumb** movements store and rewire the single derivation seam (`usePortfolio`) to derive from
it instead of returning a frozen mock.

- A zustand store holding the raw `Movement[]`, seeded with `MOCK_MOVEMENTS`, exposing one
  action `addMovement(m)` that appends. The store never holds a `Portfolio`; the engine never
  enters the store (**derive-don't-store** — raw movements are the single source of truth).
- `usePortfolio` reads the store's movements and returns
  `assemblePortfolio(movements, MOCK_PRICES)`, memoized on `movements`. It stays the single
  swap-point for a future Supabase backend; **no screen changes**.

End-to-end behavior: with the seed unchanged, Home derives the exact same `Portfolio` it shows
today. Appending a movement via `addMovement` causes `usePortfolio` to re-derive so any consumer
(Home) reflects it on the next render. In-memory only — restart returns to the seed.

Store shape (from the PRD):

```ts
type MovementsState = {
  movements: Movement[];
  addMovement: (m: Movement) => void;
};
// seeded with MOCK_MOVEMENTS; addMovement appends immutably
```

## Acceptance criteria

- [ ] A movements store exists, seeded with `MOCK_MOVEMENTS`, exposing `movements` and
      `addMovement`.
- [ ] `addMovement` appends immutably (new array; existing seed preserved; new item last).
- [ ] `usePortfolio` returns `assemblePortfolio(store.movements, MOCK_PRICES)`, memoized on
      `movements`.
- [ ] Home renders unchanged for the seed (same derived `Portfolio` as before the rewire).
- [ ] Adding a movement via `addMovement` makes `usePortfolio` re-derive (a consumer sees the
      updated `Portfolio`).
- [ ] A store unit test (vitest) covers `addMovement` appending to the seed.
- [ ] `MOCK_PORTFOLIO_SUMMARY` is left in place (not deleted) even though it is now unused at
      runtime; `MOCK_MOVEMENTS` / `MOCK_PRICES` remain.
- [ ] `tsc` is clean.

## Blocked by

None - can start immediately
