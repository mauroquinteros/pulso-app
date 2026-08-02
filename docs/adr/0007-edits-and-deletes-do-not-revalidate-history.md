# Movements can be edited and deleted without revalidating the resulting history

A **Movement** can be edited or deleted at any time, and the app does **not** check whether the history that results is still coherent. This is deliberate, and it is a real asymmetry: the forms refuse to *add* an illegal movement — a buy costing more than available **Cash**, a sell of shares not held on that date — but those gates judge a movement against the history *as it stood when it was added*, and an edit changes that history underneath everything that came after it. The record is the user's account of their own money, so its accuracy is theirs to keep.

## What this permits

- Deposit $1,000, buy $900, then edit the deposit down to $500 — the buy has now spent money that never existed, and **Cash** is negative.
- Edit a buy's share count downward until a later sell becomes an oversell, which is the failure class fixed in `bd8fffd` ("backdated oversell no longer fabricates realized P&L") reappearing through a different door.
- Edit an `executionDate` so that a sell falls before the buy that made it possible.

None of these are rejected, and nothing warns.

## Considered Options

- **Revalidate the whole resulting history on save.** Swap the edited movement into a candidate list, run the engine over it, and reject the edit if it produces negative Cash or an oversell. Cheap to do — pure functions over hundreds of rows, the same work a screen render already performs — and it would have made edits consistent with adds. Rejected: it converts every edit into a negotiation with the app about the user's own records, and the failure it prevents is the user's to own.
- **Restrict which fields are editable** (fees and dates but not quantities, say). Rejected as the worst of both: it neither protects the invariants nor lets the user fix a mistake, and the line between a "safe" and "unsafe" field is arbitrary.

## Consequences

- All three movement tables carry `update` **and** `delete` policies alongside `insert` and `select`. Deletes are hard, matching how a **Perfil** is deleted.
- `updatedAt` records only *that* a row changed. It feeds no calculation, is shown to no one, and exists for the same reason `createdAt` does.
- **A broken history yields wrong numbers, not a broken app.** Total Return % is computed only when **Peak Contributions** is positive, so a mangled history cannot put `Infinity` or `NaN` on screen. Anything that would break rendering rather than merely mislead — a negative Cash reaching **Allocation**, where a negative share of **Total Portfolio Value** is not a shape the donut expects — is a bug in *this* policy's implementation, not an instance of it.
- **Row-level security protects ownership, not arithmetic.** With the engine on-device the server has no way to judge whether a history is coherent, so this policy is not merely chosen but also, at present, the only one enforceable. Moving the engine server-side would be a precondition for ever reversing it.
