# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint
```

No test framework is configured.

## Architecture

Single-page app, 5 tabs. All routing is `useState` in `App.jsx` — no router library.
Active tab: `'dashboard' | 'practice' | 'backtest' | 'concepts' | 'glossary'`

### Auth (Supabase)
- Client: `src/lib/supabase.js` — `createClient` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Hook: `src/hooks/useAuth.js` — returns `{ session, user, loading, signOut }`
- Gate: `App.jsx` renders `<AuthPage />` if no session; `<MigrationPrompt />` on first login with local data

### Database Schema (Supabase, RLS on all tables via `auth.uid() = user_id`)
- `user_settings` — JSONB: `indicators`, `smc_layers`, `sessions`, `drawings`, `daily_checklist`, `daily_notes`. Boolean: `magnet_enabled`, `br_strategy`. Array: `completed_concepts text[]`
- `journal_trades` — `entry_price`, `exit_price`, `stop_loss`, `take_profit`, `direction`, `symbol`, `contracts`, `setup`, `notes`, `pnl`, `rr`
- `quiz_history` — `score`, `total`, `category`, `difficulty`, `questions` (JSONB)
- `accounts` — prop tracker: `starting_balance`, `balance`, `peak_balance`, `daily_pnl` (JSONB)
- `paper_accounts` — `starting_balance`, `balance`, `trades` (JSONB array)

### Sync Layer (`src/store/sync.js`)
- `fetchUserData(userId)` — parallel fetch all 5 tables, returns `{ state, hasRemoteData }`
- `syncSettings(userId, data)` — **debounced 1s** upsert (indicators, SMC, sessions, drawings, checklist, notes)
- `syncSettingsNow(userId, data)` — immediate upsert (concepts)
- `syncJournalAdd/Update/Delete`, `syncQuizResult`, `syncAccount`, `syncPaperAccount` — fire-and-forget
- `initUserData(userId)` — creates default rows for new users

**Key patterns:** Zustand = in-memory cache; Supabase = source of truth. All mutations update Zustand first (optimistic), then async sync. Always pass `crypto.randomUUID()` — don't rely on DB defaults.

### State (`src/store/index.js`)
Zustand + `persist` → localStorage key `es-academy-v2`. `partialize` excludes `_userId`, `_hydrated` (auth state). Every mutation calls the corresponding sync fn when `_userId` is set.

### Real Market Data
`src/hooks/useChartData.js` fetches `/api/yahoo/v8/finance/chart/ES=F?interval=…&range=…&includePrePost=true`.
Vite proxy `/api/yahoo` → `https://query1.finance.yahoo.com` with browser User-Agent (avoids bot block).
Falls back to `buildSimCandles()` on failure. Returns `{candles, loading, isLive}`.

### Practice Chart (`src/components/practice/ChartContainer.jsx`)
Uses **lightweight-charts v5** — API differs from v4:
- Series: `addSeries(SeriesClass, options)` — NOT `addCandlestickSeries()`
- Overlays: Series Primitives via `attachPrimitive(primitive)` — implement `attached({series,chart,requestUpdate})`, `paneViews()`, `updateAllViews()`
- Canvas: `target.useMediaCoordinateSpace()` — **NOT** `usePixelCoordinateSpace` (crashes)
- `LOOKBACK = 200` — SMC detection scans only last 200 candles
- Time axis: ET 12-hour via `tickMarkFormatter` + `localization.timeFormatter` with `America/New_York`
- `BusinessDay` type checks needed in timeFormatter for intraday vs daily accuracy

Order fill logic in PracticePage: limit=price reaches entry; stop=price breaks trigger; stop_limit=trigger hit then entry filled.

### Session Definitions (UTC)
- Asia: 00:00–09:00 UTC | London: 07:00–16:00 UTC | NY: 13:30–21:00 UTC

### Styling
`src/styles/globals.css` + Tailwind CSS v4 (`@tailwindcss/vite`). Color tokens: `--green`, `--red`, `--blue`, `--amber`, `--purple` + `*-bg` variants. Glassmorphism `.card` with backdrop filters. `framer-motion` for page-load cascade reveals.

### Deployment
Vercel (auto-deploy on push to `main`). Serverless: `api/yahoo.js` proxies Yahoo Finance. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in Vercel dashboard + local `.env`).

### Prop Account Rules (Alpha Futures Zero 50K)
Daily loss: $1,000 | Max drawdown: $2,000 | Profit target: $3,000 (eval) | Max contracts: 3 | Profit split: 90%
