# Hapi -> Pulso sync: feasibility + plan (exploration only)

Not implemented. This is the "is it possible, and how would it work" writeup.
Companion docs: `FINDINGS.md` (raw reverse-engineering record) and
`ACCESS-GUIDE.md` (how to read the API by hand).

## Verdict

Feasible. Hapi has no public API, but its private GraphQL endpoint can be read
through the app's own client. Proven live 2026-08-19: paginated the real
`history` query and got movements back as JSON. Nothing about the app was
changed to do it.

## 1. Access (how you reach the data)

Endpoint: `POST https://api.hapi.trade/graphql`. Three gates, so a raw
`curl`/`fetch` cannot work:

- httpOnly cookie auth (`access_token` 3-day, `refresh_token` 7-day) - no token
  is readable or copyable.
- HMAC request signing - unsigned -> 400.
- Operation allowlist - signed-but-unregistered query -> 403.

Way through: borrow `window.__APOLLO_CLIENT__`, harvest the app's own query
documents, replay them with your own variables. Login is manual (passkey/email
code), ~weekly, because that is when the refresh token expires. See
`ACCESS-GUIDE.md`.

## 2. The Hapi data structure

**List query `history(input)`** - paginated feed. `input`:
`{ offset, limit, status, ticker, type, initRange, finalRange, customPortfolioId }`
where `type` in `ALL | TRADING | DIVIDENDS | TRANSFERS`.

Each row (all numbers are strings; `timespan` is epoch ms):

| field | meaning |
|-------|---------|
| `id` | Hapi's record id (the idempotency key) |
| `action` | **the real type**: `BUY` / `SELL` / `DIVIDEND` / `TRANSFERS` |
| `type` | for trades: order type `MARKET`/`LIMIT`; for cash: `DEPOSIT`/`WITHDRAWAL` |
| `status` | `COMPLETED` / `CANCELLED` (skip non-completed; cancelled has `shares:"0"`) |
| `ticker` | symbol, e.g. `MSFT`, `BTCUSD` |
| `amount` | total that moved Buying Power = principal + fee |
| `shares` | quantity (rounded to 5 dp) |
| `fee` | commission |
| `assetType` | `STOCKS` / `CRYPTO` |
| `timespan` | execution instant, epoch ms |

**Detail query `tradingOrderInfo(input:{orderId})`** - needed for sells (their
`appliedFees.stockSellSec` + `stockSellTaf` = regulatory fees, absent from the
list) and for an exact `avgPrice` (list-derived price is only cent-accurate).

Actions outside the five Pulso types (Payments/Prizes/Events) exist and are
ignored.

## 3. How each Hapi row maps to a Pulso Movement

Discriminate on `action`. Pulso's `id` is minted at insert and `createdAt` comes
from the DB (ADR 0010), so mapping produces every *other* field plus Hapi's `id`
as the dedup key.

| Hapi `action` (+`type`) | Pulso Movement | field mapping |
|---|---|---|
| `BUY` | buy | `executionPrice = (amount - fee)/shares` (or detail `avgPrice`), `shares`, `fee`, `ticker` |
| `SELL` | sell | as buy **+** `regulatoryFees = stockSellSec + stockSellTaf` (needs detail) |
| `DIVIDEND` | dividend | `grossAmount = amount`, `tax = 0` *(interim; see gaps)* |
| `TRANSFERS`/`DEPOSIT` | deposit | `amount`, `transferFee = 0` *(interim)* |
| `TRANSFERS`/`WITHDRAWAL` | withdrawal | `amount`, `transferFee = 0` *(interim)* |

`executionDate` = `timespan` rendered as a calendar date in market time
(`America/New_York`) per ADR 0004.

## 4. How it would land in the app (design, not built)

- **Idempotency:** a nullable `broker_id` column on the three movement tables
  (`movement_cash`, `movement_dividends`, `movement_trades`), unique per user
  when present. Pulso's own `id` stays the PK; manual entries have no
  `broker_id`. Upsert on `broker_id` so re-runs never duplicate. (Broker-agnostic
  by design - a second broker would just prefix its ids.)
- **Write path:** `lib/history.ts::saveMovement` today refuses `sell` and
  `dividend` and does not write `broker_id`; importing the full History needs
  those branches added.
- **Runtime (open):** a standalone Node + Playwright job on a cron is the natural
  fit (Supabase Edge/Deno cannot run Playwright). It would: load a persisted
  logged-in session, harvest the query docs, paginate `history`, fetch
  `tradingOrderInfo` for sells, map, and upsert. Human re-login ~weekly.

## 5. Open questions before any implementation

- Dividend **gross/tax** split - list gives only net `amount`; needs a dividend
  detail query (not yet found).
- Deposit/withdrawal **transfer fee** - not in the list; needs a transfer detail
  query (not yet found). (Cash is unaffected either way - transfer fees sit
  outside Cash.)
- **executionDate timezone** - confirm `America/New_York` against a near-midnight
  trade.
- **ToS / anti-fraud** - scripted access likely violates Hapi's terms; their
  Nsure SDK fingerprints sessions. Keep any automation human-paced.
- **Scope** - is importing sells/dividends/crypto in scope for the app right now
  (ADR 0002 boundaries)?
