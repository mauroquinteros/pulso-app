# Hapi.trade sync - reverse-engineering findings

Captured 2026-08-18 from a real authenticated session (personal account, own credentials).
Goal: sync Hapi movements -> Pulso Postgres. No public/retail API exists (broker-dealer
Hapi Securities + Apex Clearing), so this targets the private web GraphQL API.

## Endpoint
POST https://api.hapi.trade/graphql   (Apollo, Express backend, Nuxt SPA frontend)

## Auth model (the crux)
- Tokens are **httpOnly JWT cookies** - invisible to document.cookie, visible on the wire:
  - access_token  : HS256 JWT, lifetime = **3 days** (iat->exp = 259200s)
  - refresh_token : HS256 JWT, lifetime = **7 days** (iat->exp = 604800s)
  - csrf_token    : NOT httpOnly (readable); must be echoed in `x-csrf-token` header
- => No static bearer token to drop in an env var. Session lives in httpOnly cookies.
- => Login frequency: worst case ~once a week. Cron refreshes the 3d access token via the
  7d refresh token; only re-login when refresh token expires (possibly sliding window).

## Login flow (human-only, do NOT automate)
1. mutation login({email})            -> targetType PASSKEY + WebAuthn challenge (options)
2. mutation login({encryptedCredentials}) fallback -> targetType EMAIL (emails a code)
3. (verify step exchanges code/passkey for the httpOnly token cookies)
- Passkey = WebAuthn, non-replayable by design + bound to user's 1Password extension.
  Email-code path works in any browser. Either way: a HUMAN logs in once, we reuse session.

## Request signing (the only opaque part)
Every GraphQL request carries, computed by their obfuscated JS:
  signature: <hex>         # HMAC over (at least) body + timestamp
  timestamp: <epoch ms>
  x-device-id / x-browser-id / x-device-* / platform_app_version: 11.3.5
  apollographql-client-name: apollo-web-client
=> Do NOT reverse the signer (brittle, breaks each release). Instead drive the authenticated
   browser context and let the page's own fetch/Apollo sign each call (page.evaluate).

## Movements query (the payload we want)
query history($input: HistoryInput!) {
  history(input: $input) {
    history { id action amount type ticker status shares fee
              operationType assetType provider paymentMethod timespan }
  }
}
input: { offset, limit, status:"", ticker:"", type:"ALL", initRange:0, finalRange:0, customPortfolioId:null }
- Paginated by offset/limit; filter by type/ticker/date-range.
- Observed types: DIVIDEND, DEPOSIT (operationType BANKING, provider CROSS_PAYMENTS).
  BUY/SELL/WITHDRAWAL appear at older offsets.
- timespan = epoch ms. amount/shares/fee are strings.
- NOTE: list lacks explicit executionPrice/grossAmount -> derive (amount/shares) or find a
  per-movement detail query when mapping to Pulso's Movement domain (camelCase boundary).

## Other GraphQL ops seen (context)
- appConfig, userInfo (name/country/status/accountType CASH), userSubscriptionInfo(PRIME)

## Recommended architecture
Playwright + persisted storageState:
1. Human logs in once (real browser or headed Playwright) -> storageState() captures ALL
   cookies incl. httpOnly access/refresh tokens.
2. Cron job: launch headless, load storageState, goto app.hapi.trade (loads their JS +
   auto-refreshes access token via refresh_token), then page.evaluate the `history` query
   through the app's own client so signing/csrf/device headers are handled for free.
3. Paginate history -> map rows to Movement -> upsert to Postgres. Fits ADR 0008 (cron model).
4. Persist updated storageState after each run to ride the sliding refresh window.
5. Alert to re-login only when refresh token is truly expired (~weekly).

## UPDATE - capture primitive CONFIRMED live (2026-08-18)
- Raw fetch to /graphql without a signature -> 400 {"message":"490450"} (signature enforced).
- window.__APOLLO_CLIENT__ is exposed (the app's signed, wired Apollo client).
- A hand-authored `history` DocumentNode sent through that client -> 403 Forbidden
  (signed, but the server enforces an OPERATION ALLOWLIST keyed to the app's own
  registered documents).
- Fix that works: wrap client.query to harvest the app's exact DocumentNodes by
  operation name, then replay them with our own variables through the original
  client.query. Verified: `history` paginated cleanly (offset 0 vs 3 => different
  rows), fully signed, 200. This is what sync/hapi/capture.ts implements.

## Trade detail query (per order) - `tradingOrderInfo`
input: { orderId }
Key fields for Pulso:
- avgPrice        -> exact executionPrice (list-derived is only cent-accurate; Hapi
                     rounds shares to 5dp, e.g. derived 364.0865 vs avgPrice 364.085)
- appliedFees.stockSellSec + appliedFees.stockSellTaf -> SELL regulatoryFees
                     (NOT present in the list row; a sell cannot be mapped without this)
- completedAt     -> execution instant
- amount/fee/total-> principal / commission / total
Sample (MSFT buy): avgPrice 364.085, amount 200, fee 0.15, total 200.15, appliedFees
  { feeStocksDollars 0.15, stockSellSec null, stockSellTaf null }.

## Confirmed row discrimination (action, not type)
- BUY/SELL: action=BUY|SELL, type=MARKET|LIMIT (order type), assetType=STOCKS|CRYPTO
- DIVIDEND: action=DIVIDEND, type=DIVIDEND
- DEPOSIT/WITHDRAWAL: action=TRANSFERS, type=DEPOSIT|WITHDRAWAL
- CANCELLED orders carry shares:"0" and status:"CANCELLED" -> skip (never touched Cash)
- Other actions (Payments/Prizes/Events) -> not modeled by Pulso -> skip
