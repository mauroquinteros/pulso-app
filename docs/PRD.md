# Pulso App — Implementation Plan

## Context

Pulso is a personal portfolio tracker for US stocks/ETFs traded through the Hapi broker. Hapi doesn't show real profit/loss, total invested, fees, or net performance — Pulso fills that gap. The app complements Hapi by showing only what Hapi doesn't: net P&L, accumulated costs, and movement history with portfolio impact.

The project is a fresh Expo ~54 template with React 19, TypeScript, and Expo Router. It needs to be restructured from the default 2-tab template into a 5-element tab bar (4 tabs + center FAB) portfolio tracker with Supabase backend.

---

## Tech Stack Decisions

- **Database/Backend:** Supabase (Postgres + auth)
- **Auth:** Anonymous auth from day one (silent sign-in, enables RLS from the start)
- **State management:** Zustand (cache Supabase data, manage UI state)
- **Stock prices:** Deferred to a future phase (no API integration now; portfolio value calculations will be ready for it)
- **Theme:** Dark-only (dark navy, not pure black)

---

## Color Palette

| Element | Hex | Use |
|---|---|---|
| Background | `#0A0E27` | Dark navy, all screens |
| Cards/Surface | `#111638` | Cards, inputs, containers |
| Accent | `#00E5CC` | CTAs, active tab, links |
| Positive | `#00C853` | Gains, dividends, profit |
| Negative | `#FF5252` | Losses, fees |
| Text primary | `#FFFFFF` | Titles, amounts, button text |
| Text secondary | `#8E8E93` | Labels, dates, descriptions |
| Borders | `#1C224D` | Separators, input borders |

---

## Phase 1: Foundation & Cleanup

### 1.1 Delete template boilerplate
- `components/hello-wave.tsx`
- `components/parallax-scroll-view.tsx`
- `components/external-link.tsx`
- `components/ui/collapsible.tsx`
- `app/(tabs)/explore.tsx`
- `app/modal.tsx`
- `scripts/reset-project.js`

### 1.2 Install dependencies
```bash
npx expo install expo-secure-store    # Secure storage for Supabase session
npm install @supabase/supabase-js     # Supabase client
npm install zustand                   # State management
npm install date-fns                  # Date formatting/grouping
```

### 1.3 Create folder structure
```
constants/
  theme.ts          # Rewrite: dark navy palette, cyan accents, semantic colors
  typography.ts     # NEW: font sizes, weights, line heights
  layout.ts         # NEW: spacing scale, border radii

lib/
  supabase.ts       # Supabase client initialization (anon key + secure store adapter)

store/
  portfolio-store.ts
  movements-store.ts
  add-movement-store.ts

hooks/
  use-auth.ts           # Anonymous auth initialization
  use-portfolio.ts      # Fetch & compute portfolio summary
  use-holdings.ts       # Fetch aggregated holdings
  use-movements.ts      # Fetch movements with filters
  use-stock-detail.ts   # Fetch detail for single ticker

utils/
  format.ts             # formatUSD, formatShares, formatDate, formatPercent
  calculations.ts       # avgCost, unrealizedPnL, totalFees, etc.

components/
  ui/
    tab-bar.tsx         # Custom tab bar with center FAB
    card.tsx            # Reusable card component
    amount-text.tsx     # Formatted USD with green/red coloring
    input-field.tsx     # Styled TextInput for forms
    date-picker.tsx     # Date picker wrapper
    section-header.tsx  # Month/section header for grouped lists
    empty-state.tsx     # Empty list placeholder
  home/
    portfolio-summary.tsx
    summary-cards.tsx
    holdings-list.tsx
    holding-row.tsx
  movements/
    movement-list.tsx
    movement-row.tsx
    movement-filters.tsx
  stock/
    position-card.tsx
    stock-header.tsx
    stock-movement-list.tsx
  add-movement/
    type-selector.tsx
    buy-form.tsx
    sell-form.tsx
    dividend-form.tsx
    deposit-form.tsx
    withdrawal-form.tsx
    total-bar.tsx
```

### 1.4 Theme overhaul
**Rewrite `constants/theme.ts`** — dark-only palette using the color palette above.

**Create `constants/typography.ts`** — type scale (largeTitle, title, headline, body, caption, etc.)

**Create `constants/layout.ts`** — spacing (4/8/12/16/20/24/32) and border radii.

**Update `app.json`:** Set `userInterfaceStyle: "dark"`, update splash colors to `#0A0E27`.

### 1.5 Update existing components
- `themed-text.tsx` — use new dark-only colors
- `themed-view.tsx` — use new dark-only colors
- `use-theme-color.ts` — always return dark theme values

---

## Phase 2: Supabase Setup

### 2.1 Supabase project & database schema

Create tables in Supabase dashboard (or via migrations):

```sql
-- movements: single table for all movement types
CREATE TABLE movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  type          TEXT NOT NULL CHECK(type IN ('buy','sell','dividend','deposit','withdrawal')),
  ticker        TEXT,                          -- NULL for deposit/withdrawal
  execution_price NUMERIC(12,2),               -- buy/sell only
  shares        NUMERIC(12,5),                 -- buy/sell only (up to 5 decimals)
  gross_amount  NUMERIC(12,2),                 -- dividend only
  amount        NUMERIC(12,2),                 -- deposit/withdrawal
  fee           NUMERIC(12,2) DEFAULT 0,       -- all types can have a fee
  transfer_fee  NUMERIC(12,2) DEFAULT 0,       -- deposit only
  regulatory_fees NUMERIC(12,2) DEFAULT 0,     -- sell only
  tax           NUMERIC(12,2) DEFAULT 0,       -- sell & dividend (WHT)
  date          DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_movements_user ON movements(user_id);
CREATE INDEX idx_movements_type ON movements(type);
CREATE INDEX idx_movements_ticker ON movements(ticker);
CREATE INDEX idx_movements_date ON movements(date);

-- RLS: users can only access their own data
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own movements"
  ON movements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Why a single `movements` table:** All types share enough fields. Nullable columns for type-specific fields keeps it simple for a personal app. Holdings are computed via SQL aggregations (not stored), avoiding consistency bugs.

### 2.2 Supabase client (`lib/supabase.ts`)
- Initialize with anon key + project URL
- Use `expo-secure-store` as the storage adapter for auth session persistence
- Export typed client

### 2.3 Anonymous auth (`hooks/use-auth.ts`)
- On app launch, check for existing session
- If no session, call `supabase.auth.signInAnonymously()`
- Session persists via secure store — user won't re-auth on every launch
- When real auth is added later, anonymous user can be linked to email/social

### 2.4 Root layout integration (`app/_layout.tsx`)
- Initialize Supabase + anonymous auth before rendering app
- Show splash screen until auth is ready
- Force dark theme via `ThemeProvider`

---

## Phase 3: Navigation & Tab Bar

### 3.1 Root layout (`app/_layout.tsx`)
Stack navigator wrapping tabs + push screens:
- `(tabs)` — tab navigator (headerShown: false)
- `stock/[ticker]` — stock detail (push)
- `movement/[id]` — movement detail (push)
- `add-movement` — modal presentation flow

### 3.2 Custom tab bar (`components/ui/tab-bar.tsx`)
5 elements: Home | Movements | (+) FAB | Holdings | Settings
- The FAB is a circular cyan button in the center
- Pressing it calls `router.push('/add-movement/')`
- FAB uses Reanimated for scale animation on press

### 3.3 Tab layout (`app/(tabs)/_layout.tsx`)
```
app/(tabs)/
  _layout.tsx      # 4 tab screens + custom tabBar with FAB
  index.tsx        # Home
  movements.tsx    # Movements
  holdings.tsx     # Holdings
  settings.tsx     # Settings (user info, log out)
```

### 3.4 Modal flow (`app/add-movement/`)
```
app/add-movement/
  _layout.tsx      # Stack layout for the flow
  index.tsx        # Step 1: type selector
  form.tsx         # Step 2: dynamic form based on selected type
```

### 3.5 Detail screens
```
app/stock/[ticker].tsx     # Stock detail & history
app/movement/[id].tsx      # Movement detail view
```

Create placeholder screens for all routes to verify navigation works end-to-end.

---

## Phase 4: Add Movement Flow (data entry first)

Build this first so we can populate data for other screens.

### 4.1 Zustand store (`store/add-movement-store.ts`)
- Tracks selected type, form data, computed total
- `submit()` action inserts into Supabase and refreshes other stores

### 4.2 Type selector screen (`app/add-movement/index.tsx`)
- List of 5 cards: Buy, Sell, Dividend, Deposit, Withdrawal
- Each with icon and label
- Modal header with close (X) button

### 4.3 Form components (one per type in `components/add-movement/`)
- **Buy:** Ticker, Execution Price, Shares, Fee ($0.15/$0.10), Date
- **Sell:** Ticker, Shares, Execution Price, Fee ($0.15), Regulatory Fees, Tax, Date
- **Dividend:** Ticker, Gross Amount, Tax (WHT), Date
- **Deposit:** Amount Received, Transfer Fee, Date
- **Withdrawal:** Amount, Fee, Date

### 4.4 Shared UI components
- `input-field.tsx` — styled numeric/text input
- `date-picker.tsx` — date picker with default today
- `total-bar.tsx` — fixed bottom bar showing computed total + Save button

### 4.5 Total calculation logic
- Buy: `-(price × shares + fee)`
- Sell: `+(price × shares - fee - regulatory - tax)`
- Dividend: `+(gross - tax)`
- Deposit: `+(amount - transfer_fee)`
- Withdrawal: `-(amount + fee)`

---

## Phase 5: Home Screen

### 5.1 Store & hooks
- `store/portfolio-store.ts` — total invested, total fees, total dividends, holdings list
- `hooks/use-portfolio.ts` — fetches from Supabase, computes aggregations

### 5.2 Components (`components/home/`)
- `portfolio-summary.tsx` — total value (placeholder until prices), Net P&L
- `summary-cards.tsx` — 3 cards: Invested, Fees, Dividends
- `holdings-list.tsx` + `holding-row.tsx` — list of tickers with position data

### 5.3 Screen (`app/(tabs)/index.tsx`)
- Header: "Portfolio" title + total value + Net P&L
- Summary cards row
- Holdings FlatList (tap → stock detail)
- Pull-to-refresh

---

## Phase 6: Movements Screen

### 6.1 Store & hooks
- `store/movements-store.ts` — movements list, active filter
- `hooks/use-movements.ts` — fetch with filter, group by month

### 6.2 Components (`components/movements/`)
- `movement-filters.tsx` — horizontal scrollable chips (All, Deposits, Buys, etc.)
- `movement-list.tsx` — SectionList grouped by month
- `movement-row.tsx` — type icon + description + date + amount

### 6.3 Screens
- `app/(tabs)/movements.tsx` — main movements list
- `app/movement/[id].tsx` — full detail with label/value pairs, delete button

---

## Phase 7: Holdings & Stock Detail

### 7.1 Holdings screen (`app/(tabs)/holdings.tsx`)
- FlatList of tickers with open positions
- Each row: ticker, shares, avg cost, market value, unrealized P&L
- Tap → stock detail

### 7.2 Stock detail (`app/stock/[ticker].tsx`)
- Header: ticker symbol + market price (placeholder until price API)
- Position card: shares, avg cost, total invested, current value, P&L, dividends, fees
- Movement history for this ticker

---

## Phase 8: Settings Screen

### 8.1 Screen (`app/(tabs)/settings.tsx`)
- User info section: display anonymous user ID (or email when real auth is added)
- Log out button: calls `supabase.auth.signOut()`, clears session, re-triggers anonymous auth

---

## Phase 9: Polish

- Empty states for all lists
- Loading skeletons
- Haptic feedback on save, tab switches
- FAB animation (scale on press)
- Delete movement with confirmation
- Edge cases: zero holdings, fractional shares display, large numbers

---

## Utilities (`utils/`)

### `format.ts`
- `formatUSD(amount)` — `$1,234.56`
- `formatShares(shares)` — up to 5 decimals, trim trailing zeros
- `formatDate(date)` — `Feb 26, 2026`
- `formatPercent(value)` — `+12.34%` / `-5.67%`

### `calculations.ts`
- `computeAvgCost(buys)` — weighted average cost per share
- `computeUnrealizedPnL(avgCost, currentPrice, shares)`
- `computeTotalFees(movements)`
- `computeNetDividends(movements)`

---

## Verification Plan

1. **After Phase 1:** App launches with dark navy theme, no template content
2. **After Phase 2:** Anonymous auth works silently, session persists across restarts
3. **After Phase 3:** All 4 tab bar elements work, FAB opens modal, navigation to detail screens works
4. **After Phase 4:** Can create movements of all 5 types, data persists in Supabase, total calculation is correct
5. **After Phase 5:** Home shows aggregated data from movements, summary cards update after adding movements
6. **After Phase 6:** Movements list shows all entries grouped by month, filters work, detail view shows correct data
7. **After Phase 7:** Holdings list shows aggregated positions, stock detail shows position card and movement history
8. **After Phase 8:** Settings shows user info and log out works correctly
9. **After Phase 9:** App feels polished — empty states, loading states, haptics, animations
