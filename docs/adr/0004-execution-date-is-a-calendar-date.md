# Movement `executionDate` is a calendar date, not an instant

A **Movement**'s `executionDate` is the calendar day the movement happened
(`YYYY-MM-DD`) — no time, no timezone. The user picks it in a date-only picker
(`mode="date"`, capped at today with no lower bound, because backdating is the
normal flow for a tracker: you record on the 22nd a buy you made on the 15th).
`createdAt` is a separate field: the UTC instant the record was written. It is
never shown to the user; the reducer uses it _only_ as the chronological
tiebreaker — two movements can share an `executionDate` precisely because that
field carries no time.

Naming follows a convention this ADR establishes: **`-Date` denotes a calendar
date, `-At` denotes an instant.** The field was renamed from `executedAt`, whose
`-At` suffix promised a timestamp and invited a UTC→local conversion. Put side
by side, the two fields now document themselves:

<!-- prettier-ignore -->
```ts
executionDate: "2025-01-15"             // calendar date  — when it happened
createdAt:     "2025-02-03T21:14:00Z"   // instant        — when it was recorded
```

## Considered Options

- **`executedAt` as a full ISO instant, with a time component.** Rejected on
  three counts. (1) _It would fabricate precision._ A tracker records the past;
  a user entering a week-old buy knows the day, not that it filled at 14:32:07 —
  the picker would have to ask for an hour the user does not have. (2) _No
  derived figure needs it._ **Cash**, **Average Cost**, **Realized P&L** and
  **Total Return** all depend only on day-level ordering. (3) _It forces a
  timezone conversion whose classic trap shifts the day._ Parsing a date-only
  string as an instant yields UTC midnight, which renders as the **previous day**
  for any user west of UTC: `new Date("2025-01-15")` prints _14 Jan_ in UTC−5.
  The whole history would silently slide back one square.

- **Keeping the name `executedAt` and documenting the semantics here only.**
  Rejected: the `-At` suffix _is_ the source of the misreading. A name that lies
  is a defect no ADR can fully offset — the next reader (human or agent) will
  "fix" the display before ever opening `docs/adr/`. The rename is mechanical
  (a field name, no logic), fully caught by `tsc`, and guarded by the existing
  test suite.

- **`executedOn`** (the ActiveRecord `_at`/`_on` convention) and
  **`effectiveDate`** (the accounting term). Rejected: `-On` requires knowing a
  Rails-ism to read correctly, and `effectiveDate` introduces a new glossary term
  that brushes against _settlement/value date_. `executionDate` keeps the
  existing vocabulary and needs no prior knowledge. `tradeDate` was rejected
  outright: a **Movement** is not always a trade — deposits and withdrawals are
  not.

## Consequences

- **No time is ever displayed.** The movements list renders `executionDate`
  verbatim; nothing is converted.
- **`createdAt` is never surfaced to the user.** It is an audit field and the
  reducer's tiebreaker, nothing more.
- **Date-only values must never be parsed as instants.** `new Date("2025-01-15")`
  is UTC midnight and will shift the day. Use a date-safe parser (date-fns
  `parseISO` resolves to local midnight).
- **Supabase schema:** `execution_date` must be typed **`date`**, not
  `timestamptz`. `created_at` stays `timestamptz`. Choosing wrong reintroduces
  the day-shift at the database layer, where it is far more expensive to undo.
- **Future date fields follow the convention:** `-Date` for calendar dates,
  `-At` for instants.
- **If execution time is ever genuinely needed,** it is a model migration, not a
  display tweak: the date picker's mode, the five add-movement view-models and
  their tests, the mock seed, and the reducer's tiebreaker (which would become
  unnecessary).
