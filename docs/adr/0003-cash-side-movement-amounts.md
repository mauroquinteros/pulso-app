# Movement `amount` is the cash-side figure; transfer fees sit between Cash and Net Contributions

A deposit/withdrawal's `amount` is the **cash-side** number — what lands in or leaves Buying Power (deposit: `cash += amount`; withdrawal: `cash -= amount`) — mirroring how Hapi presents it, so the user types "add $250 of cash" / "withdraw $10", not the gross transfer. The transfer fee is *not* subtracted from Cash; instead it lives in **Net Contributions** (a deposit contributes `amount + transferFee`, a withdrawal removes `amount − transferFee`), which keeps each fee eroding **Total Return** by its full amount while the reconciliation invariant `Cash + Market Value == Net Contributions + Total Return` still holds.

## Considered Options

- **Bank-side `amount` (the original engine, pre-2026-06-26).** `amount` was the gross transfer: deposit `cash += amount − transferFee`, withdrawal `cash -= amount + transferFee`, with Net Contributions using the gross `amount`. Rejected: the user had to type the gross figure (e.g. enter "5.01" to pull $10 out of cash, or "252.99" to end up with $250 of buying power), which is the opposite of how a person thinks about the movement, and diverged from Hapi's presentation.

## Consequences

- The same real movement yields an **identical derived portfolio** under either convention; only the meaning of the stored `amount` field changed. Any persisted/seed `amount` is now interpreted cash-side (the mock seed's round amounts read as "cash deposited/withdrawn").
- "Every fee reduces Cash" no longer holds for transfer fees — only for trading (buy/sell) fees. Transfer fees surface as the gap between **Cash** and **Net Contributions**, and that gap is what makes them erode **Total Return**.
