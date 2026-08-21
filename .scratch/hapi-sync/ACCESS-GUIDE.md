# How to read the Hapi API by hand

A step-by-step you can replicate in your own browser. It ends with you running
the real `history` query and getting your movements back as JSON.

If you tried this before and failed, it is almost certainly because you did the
obvious thing - open the Network tab, copy the request as `curl`, and replay it.
That **cannot** work here, and understanding why is the whole trick.

---

## Why the obvious approaches fail

`app.hapi.trade` is a Nuxt app that talks to one GraphQL endpoint:
`POST https://api.hapi.trade/graphql`. That endpoint has **three** gates:

1. **httpOnly cookie auth.** The real tokens (`access_token`, `refresh_token`)
   are httpOnly cookies. You cannot read them from `document.cookie`, cannot
   copy them into an env var, and cannot see them in JS. Only the browser can
   send them.
2. **HMAC request signing.** Every request carries a `signature` header computed
   by an Apollo link from obfuscated JS. A request without a valid signature is
   rejected `400 {"message":"490450"}`.
3. **Operation allowlist.** Even a *correctly signed* request is rejected
   `403 Forbidden` unless the query document is one the app itself registered.

So:
- **A raw `fetch`/`curl`** (even with your cookies) -> `400` (no signature).
- **A signed-but-hand-written query** -> `403` (not on the allowlist).

The only thing the server trusts is the app's *own* client running the app's
*own* query documents. So we don't fight it - we borrow it.

---

## Prerequisites

- Log in to `https://app.hapi.trade` normally (passkey or email code) in a
  desktop browser. Stay logged in.
- Open DevTools (`Cmd+Option+I` on macOS / `F12`), go to the **Console** tab.

Everything below is pasted into that Console.

---

## Step 1 - confirm the app's client is exposed

```js
window.__APOLLO_CLIENT__            // should print an ApolloClient object, not undefined
```

This is the fully wired client - signing link, cookies and all. It is our way in.

## Step 2 - install the query harvester

This wraps `client.query` so that every query the app runs leaves its exact,
allowlisted, signable document behind, filed by operation name.

```js
(() => {
  const c = window.__APOLLO_CLIENT__;
  if (c.__harvest) return "already installed";
  const orig = c.query.bind(c);
  c.__orig = orig;
  c.__docs = {};
  c.query = (opts) => {
    try {
      const name = opts?.query?.definitions
        ?.find((d) => d.kind === "OperationDefinition")?.name?.value;
      if (name) c.__docs[name] = opts.query;
    } catch {}
    return orig(opts);
  };
  c.__harvest = true;
  return "installed";
})();
```

## Step 3 - make the app run the queries you want to harvest

You are just clicking around so the app fires its own requests:

- Go to **More -> History** (`/history`). That fires `history`.
- Click any one row to open its detail. That fires `tradingOrderInfo` (trade
  detail) for that order.

Then check what you harvested:

```js
Object.keys(window.__APOLLO_CLIENT__.__docs)   // e.g. ["history", "tradingOrderInfo", ...]
```

If `history` is not in the list, you did not actually land on the History
screen - go back and try again with the harvester already installed.

## Step 4 - replay `history` with your own variables

Now call the harvested document yourself, paginating however you like. This is a
real network call; it returns your movements.

```js
async function history({ type = "ALL", offset = 0, limit = 10 } = {}) {
  const c = window.__APOLLO_CLIENT__;
  const doc = c.__docs.history;
  if (!doc) throw new Error("run Step 3 first");
  const res = await c.__orig({
    query: doc,
    variables: { input: {
      offset, limit, status: "", ticker: "", type,
      initRange: 0, finalRange: 0, customPortfolioId: null,
    } },
    fetchPolicy: "no-cache",
  });
  return res.data.history.history;
}

// examples:
await history();                              // newest 10, all types
await history({ type: "TRADING", limit: 50 }); // buys and sells
await history({ type: "TRADING", offset: 50, limit: 50 }); // next page
```

`type` accepts `"ALL" | "TRADING" | "DIVIDENDS" | "TRANSFERS"`. Paginate by
bumping `offset`; a page shorter than `limit` is the last one.

## Step 5 - replay `tradingOrderInfo` for one trade's detail

Needed for a sell's regulatory fees (SEC + TAF) and for an exact `avgPrice`.
Pass an order `id` from a Step 4 row.

```js
async function orderInfo(orderId) {
  const c = window.__APOLLO_CLIENT__;
  const doc = c.__docs.tradingOrderInfo;
  if (!doc) throw new Error("open any order once (Step 3) first");
  const res = await c.__orig({
    query: doc,
    variables: { input: { orderId } },
    fetchPolicy: "no-cache",
  });
  return res.data.tradingOrderInfo;
}

const trades = await history({ type: "TRADING", limit: 5 });
await orderInfo(trades[0].id);
```

---

## What a row looks like

```json
{
  "id": "9b32091b-0432-48d2-9d34-f83d5d66ab15",
  "action": "BUY",          // BUY | SELL | DIVIDEND | TRANSFERS
  "type": "MARKET",         // for trades this is the ORDER type (MARKET|LIMIT)
  "ticker": "MSFT",
  "status": "COMPLETED",    // skip anything not COMPLETED (CANCELLED has shares "0")
  "amount": "200.15",       // total that moved Buying Power (principal + fee)
  "shares": "0.54932",
  "fee": "0.15",
  "assetType": "STOCKS",    // STOCKS | CRYPTO
  "timespan": 1774970911666 // epoch ms, not a calendar date
}
```

The discriminator is **`action`, not `type`**. For `TRANSFERS`, the `type` field
is `DEPOSIT` or `WITHDRAWAL`.

---

## Turning this into automation

Everything above is manual Console work. To schedule it, drive the same steps
with Playwright instead of your hands - the code in `sync/hapi/` does exactly
that (`installHarvester` = Step 2, `fetchHistory` = Step 4, `fetchTradeDetail` =
Step 5). Automation only adds: persisting the logged-in session
(Playwright `storageState`) so you are not retyping the passkey, and re-logging
in about weekly when the 7-day refresh token finally expires.

## Notes

- **This is your own account.** Scripted access still likely violates Hapi's
  Terms of Service, and their anti-fraud SDK (Nsure) fingerprints sessions. Keep
  any automation slow and human-paced.
- If a call suddenly starts returning `403` again, Hapi shipped a new build and
  tore down your harvested docs - just re-run Steps 2-3.
