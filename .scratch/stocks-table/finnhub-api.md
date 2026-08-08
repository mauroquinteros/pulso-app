# Finnhub — what the free tier actually returns

Probes run **2026-08-07, 19:43 ET (Fri)** — after the US close, so every quote
below is a closing price. Free tier, one key, no paid add-ons.

Every command assumes the key is in the environment and **never** written down:

```bash
export FINNHUB_KEY='...'   # never commit this, never let it reach the app bundle
```

Finnhub's own docs are JS-rendered and unreadable by fetch; these are live calls.

---

## Summary

| Question | Answer |
|---|---|
| Does a quote carry a market timestamp? | **Yes** — `t`, accurate to the closing bell. Absent from Finnhub's generated client, present in the live response. |
| Does `profile2` name an ETF? | **No** — returns `{}` for VOO. |
| What does name an ETF? | `/search` — `description`, works for both stocks and ETFs. |
| Is `/search` an existence check? | **No, it is fuzzy.** `APPL` returns 11 results, none of them `APPL`. |
| What does an unknown symbol return? | **HTTP 200** with every figure zeroed. No error to catch. |
| Is the full US symbol list reachable? | Yes — 30,934 symbols, 7.3 MB, via a redirect. Carries `figi`. |

**Endpoints the design needs:** `/search` (validate + name) and `/quote` (price).
`profile2` is not needed at all; its only unique field is the logo, which is also
empty for ETFs.

---

## `/quote` — the price

### A real symbol, after the close

```bash
curl -s "https://finnhub.io/api/v1/quote?symbol=AAPL&token=$FINNHUB_KEY" | jq
```
 
```json
{
  "c": 313.33,
  "d": 0.92,
  "dp": 0.2945,
  "h": 314.81,
  "l": 310.74,
  "o": 311.45,
  "pc": 312.41,
  "t": 1786132800
}
```

`c` current · `d` change · `dp` percent change · `h` high · `l` low · `o` open ·
`pc` previous close · `t` **market timestamp** (unix seconds).

```bash
TZ=America/New_York date -r 1786132800
# Fri Aug  7 16:00:00 EDT 2026
```

`t` is **the closing bell to the second**. This is the single most important
finding here: it means a stored price can say which market moment it belongs to,
which is exactly what the **Stale Price** definition in `CONTEXT.md` requires and
what `updated_at` (when the cron asked) can never answer.

Note `c` = 313.33 is today's close while `pc` = 312.41 is Thursday's — so a cron
running after the bell gets the day's close from `c`, and `t` proves it.

### An ETF — quotes work fine

```bash
curl -s "https://finnhub.io/api/v1/quote?symbol=VOO&token=$FINNHUB_KEY" | jq
```

```json
{ "c": 710.71, "d": 4.31, "dp": 0.6101, "h": 711.37, "l": 707.44, "o": 708.73, "pc": 706.4, "t": 1786132800 }
```

### An unknown symbol — **HTTP 200**, not an error

```bash
curl -s "https://finnhub.io/api/v1/quote?symbol=NOTAREALTICKER&token=$FINNHUB_KEY" | jq
```

```json
{ "c": 0, "d": null, "dp": null, "h": 0, "l": 0, "o": 0, "pc": 0, "t": 0 }
```

An empty `symbol=` returns the identical body, also `HTTP 200`.

There is no status code to branch on — the guard has to read the payload, and
`t == 0` is the cleanest tell (a genuine quote always carries a real market
moment). Writing `c: 0` as a price would be **worse than writing nothing**: it
reads as a real price with `priceAvailable: true` and silently drops that
holding's Market Value to zero, while an absent row already has a correct,
tested `exclude + flag` path.

---

## `/stock/profile2` — company identity (not usable for ETFs)

### A common stock — full data

```bash
curl -s "https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=$FINNHUB_KEY" | jq
```

```json
{
  "ticker": "AAPL",
  "name": "Apple Inc",
  "country": "US",
  "currency": "USD",
  "estimateCurrency": "USD",
  "exchange": "NASDAQ NMS - GLOBAL MARKET",
  "ipo": "1980-12-12",
  "marketCapitalization": 4559367.676171373,
  "logo": "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png",
  "shareOutstanding": 14687.36,
  "finnhubIndustry": "Technology",
  "phone": "14089961010",
  "weburl": "https://www.apple.com/",
  "floatingShare": 14445.7
}
```

### An ETF — **empty**

```bash
curl -s "https://finnhub.io/api/v1/stock/profile2?symbol=VOO&token=$FINNHUB_KEY" | jq
```

```json
{}
```

`/etf/profile` is the endpoint that would cover this, and it is **premium**. So
`profile2` cannot be the source of `name`: it would leave half of a portfolio
holding ETFs unnamed. Its only field not available elsewhere is `logo`, which is
missing for those same ETFs.

---

## `/search` — validation *and* name, in one call

### Exact symbols — stock and ETF both

```bash
curl -s "https://finnhub.io/api/v1/search?q=AAPL&exchange=US&token=$FINNHUB_KEY" | jq
curl -s "https://finnhub.io/api/v1/search?q=VOO&exchange=US&token=$FINNHUB_KEY"  | jq
```

```json
{ "count": 1, "result": [ { "description": "APPLE INC",           "displaySymbol": "AAPL", "symbol": "AAPL", "type": "Common Stock" } ] }
{ "count": 1, "result": [ { "description": "VANGUARD S&P 500 ETF", "displaySymbol": "VOO",  "symbol": "VOO",  "type": "ETP" } ] }
```

Case-insensitive: `q=voo` returns the same row.

### A symbol that does not exist

```bash
curl -s "https://finnhub.io/api/v1/search?q=NOTAREALTICKER&exchange=US&token=$FINNHUB_KEY" | jq
```

```json
{ "count": 0, "result": [] }
```

### A typo — **fuzzy, and this is the trap**

```bash
curl -s "https://finnhub.io/api/v1/search?q=APPL&exchange=US&token=$FINNHUB_KEY" | jq
```

```json
{
  "count": 11,
  "result": [
    { "description": "Apple Inc",                              "displaySymbol": "AAPL", "symbol": "AAPL", "type": "Common Stock" },
    { "description": "Applied Materials Inc",                  "displaySymbol": "AMAT", "symbol": "AMAT", "type": "Common Stock" },
    { "description": "Applovin Corp",                          "displaySymbol": "APP",  "symbol": "APP",  "type": "Common Stock" },
    { "description": "Applied Industrial Technologies Inc",    "displaySymbol": "AIT",  "symbol": "AIT",  "type": "Common Stock" },
    { "description": "Applied Optoelectronics Inc",            "displaySymbol": "AAOI", "symbol": "AAOI", "type": "Common Stock" },
    { "description": "Applied Digital Corp",                   "displaySymbol": "APLD", "symbol": "APLD", "type": "Common Stock" },
    { "description": "Science Applications International Corp","displaySymbol": "SAIC", "symbol": "SAIC", "type": "Common Stock" },
    { "description": "Apple Hospitality REIT Inc",             "displaySymbol": "APLE", "symbol": "APLE", "type": "Common Stock" },
    { "description": "Applied Aerospace & Defense Inc",        "displaySymbol": "AADX", "symbol": "AADX", "type": "Common Stock" },
    { "description": "Maui Land & Pineapple Company Inc",      "displaySymbol": "MLP",  "symbol": "MLP",  "type": "Common Stock" },
    { "description": "Applied Energetics Inc",                 "displaySymbol": "AERG", "symbol": "AERG", "type": "Common Stock" }
  ]
}
```

**`count > 0` is not an existence check.** `APPL` — the likeliest typo in the
whole app — returns eleven results and not one of them is `APPL`. Validation must
be `result.some(r => r.symbol === typed)`.

### The `exchange` parameter — a market filter, and it is load-bearing

It restricts which market a symbol may belong to. It does not cap the result count.

```bash
curl -s "https://finnhub.io/api/v1/search?q=AAPL&token=$FINNHUB_KEY"             | jq -c '{count}'
curl -s "https://finnhub.io/api/v1/search?q=AAPL&exchange=US&token=$FINNHUB_KEY" | jq -c '{count}'
```

```json
{ "count": 9 }
{ "count": 1 }
```

Unfiltered, `AAPL` also matches `AAPL.TO` and `AAPL.NE` (Canadian DRs), `AAPL.MX`,
`AAPL.RO` and `AAPL.SN` — the same company listed in Toronto, Mexico, Romania and
Santiago. `q=SAP` unfiltered surfaces `SAP.DE`, `SAP.BD`, `SAP.DU`.

**Those listings quote in their local currency.** `ADR 0002` fixes Pulso to USD
with no FX anywhere, so a peso price entering `stocks` would be multiplied by a
share count and labelled USD, with `priceAvailable: true`. `exchange=US` is what
makes that assumption true at the boundary. It is mandatory, not a convenience.

Today the app is protected only by accident: the Símbolo field strips non-letters,
so `AAPL.MX` collapses to `AAPLMX` and fails. That is an input regex doing a domain
job — and it is the same regex that makes `BRK.B` unenterable.

---

## `/stock/symbol?exchange=US` — the whole universe (not needed, but reachable)

Answers with a **302** to a signed one-day download URL, so `curl` needs `-L`:

```bash
curl -sL "https://finnhub.io/api/v1/stock/symbol?exchange=US&token=$FINNHUB_KEY" -o us-symbols.json
# HTTP 200  size 7316636 bytes
jq 'length' us-symbols.json          # 30934
jq '.[]|select(.symbol=="VOO")' us-symbols.json
```

```json
{
  "currency": "USD",
  "description": "VANGUARD S&P 500 ETF",
  "displaySymbol": "VOO",
  "figi": "BBG0015VYNT4",
  "figiComposite": "BBG0015VYNT4",
  "isin": "",
  "mic": "ARCX",
  "shareClassFIGI": "BBG001TC6MC1",
  "symbol": "VOO",
  "symbol2": "",
  "type": "ETP"
}
```

30,934 symbols, 7.3 MB, in one call. Not needed for the chosen design — `/search`
gives the same `description` and `type` per symbol without downloading the world.
It is the **only** source of `figi`, the stable instrument identifier that would
survive a ticker being reassigned to a different company after a delisting
(see the consequences in `docs/adr/0009`).

---

## What each finding decides

| Finding | Decides |
|---|---|
| `t` is the market moment | Store it. `updated_at` alone cannot answer the **Stale Price** question, and `t` makes the stored price self-describing regardless of when the cron ran. |
| `c` after the close is the day's close | The price column is `c`, not `pc`. |
| `profile2` empty for ETFs, `/search` is not | `name` comes from `/search`. `profile2` drops out of the design entirely. |
| `/search` is fuzzy | Validation is an exact `symbol` match, never `count > 0`. |
| Unknown symbol → HTTP 200, all zeros | The `never write price 0` guard reads the payload; `t == 0` is the tell. |
| `/search` returns `type` | `Common Stock` vs `ETP` is available free, in a response already being parsed. |
