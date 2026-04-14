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

Single-page app, 8 tabs. All routing is `useState` in `App.jsx` — no router library.
Active tab string: `'dashboard' | 'concepts' | 'quiz' | 'playbook' | 'practice' | 'journal' | 'proptracker' | 'glossary'`

### Authentication & Database
**Supabase** (PostgreSQL + built-in auth). Deployed on free tier.
- **Client**: `src/lib/supabase.js` — singleton `createClient` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.
- **Auth hook**: `src/hooks/useAuth.js` — returns `{ session, user, loading, signOut }`. Listens to `onAuthStateChange`.
- **Auth UI**: `src/components/auth/AuthPage.jsx` — email/password login, signup, password reset. No OAuth configured yet.
- **Auth gate**: `App.jsx` shows `<AuthPage />` if no session, otherwise renders the app.
- **Sign out**: `src/components/Header.jsx` — shows user email + sign out button (receives `signOut`, `userEmail`, `synced` as props).

### Database Schema (Supabase PostgreSQL)
5 tables, all with RLS enabled (`auth.uid() = user_id`):
- `user_settings` — single row per user. JSONB columns: `indicators`, `smc_layers`, `sessions`, `drawings`, `daily_checklist`, `daily_notes`. Boolean: `magnet_enabled`, `br_strategy`. Array: `completed_concepts text[]`.
- `journal_trades` — one row per trade. Columns map client fields: `entryPrice` → `entry_price`, `exitPrice` → `exit_price`, `stopLoss` → `stop_loss`, `target` → `take_profit`, `direction`, `symbol`, `contracts`, `setup`, `notes`, `pnl`, `rr`.
- `quiz_history` — one row per quiz attempt. `score`, `total`, `category`, `difficulty`, `questions` (JSONB).
- `accounts` — prop tracker state. `starting_balance`, `balance`, `peak_balance`, `daily_pnl` (JSONB).
- `paper_accounts` — practice account. `starting_balance`, `balance`, `trades` (JSONB array).

### Sync Layer
`src/store/sync.js` — all Supabase CRUD functions.
- `fetchUserData(userId)` — reads all 5 tables, returns `{ state, hasRemoteData }`.
- `syncSettings(userId, data)` — **debounced 1s** upsert for rapid toggles (indicators, SMC, sessions, drawings, checklist, notes).
- `syncSettingsNow(userId, data)` — immediate upsert for infrequent changes (concepts).
- `syncJournalAdd/Update/Delete`, `syncQuizResult`, `syncAccount`, `syncPaperAccount` — fire-and-forget writes.
- `initUserData(userId)` — creates default rows for new users.

**Important sync patterns:**
- Zustand is the in-memory cache; Supabase is source of truth.
- All mutations update Zustand first (optimistic), then fire-and-forget sync to Supabase.
- `_userId` and `_hydrated` fields on the store track auth/sync state (not persisted to localStorage).
- Settings-related toggles use debounced sync to avoid hammering Supabase.
- Client generates UUIDs (`crypto.randomUUID()`) — always pass to Supabase, don't rely on DB defaults.

### Data Migration
- `src/lib/migration.js` — `migrateLocalStorageToSupabase(userId)` and `hasLocalData()`.
- `src/components/auth/MigrationPrompt.jsx` — shown once after first login if localStorage has data but Supabase doesn't.

### State Management
`src/store/index.js` — single Zustand store with `persist` middleware → `localStorage` key `es-academy-v2`.
Slices: `completedConcepts`, `quizHistory`, `journal`, `dailyChecklist`, `dailyNotes`, `account`, `indicators`, `smcLayers`, `sessions`, `drawings`, `paperAccount`.
Auth fields: `_userId`, `_hydrated` (not persisted). Actions: `hydrateFromSupabase(userId)`, `clearOnLogout()`.
`partialize` ensures only data (not functions or auth fields) is persisted.
`sessions` slice: `{ asia, london, ny, asiaHL, londonHL, nyHL }` — booleans for session band + H/L toggles.
Every mutation action also calls the corresponding sync function from `src/store/sync.js` when `_userId` is set.

### Data Layer (`src/data/`)
Pure JS exports — no fetching:
- `conceptsData.js` — `CONCEPT_META[]`, `CONCEPT_CATEGORIES[]`, `CONCEPT_COUNT`
- `quizData.js` — 62 questions `{id, category, difficulty, q, opts, ans, exp}`
- `checklistData.js` — `CHECKLIST_SECTIONS[]`, `CHECKLIST_ITEMS[]` (26 items, 5 sections)
- `glossaryData.js` — 120 terms `{term, category, definition}`
- `simData.js` — `buildSimCandles(intervalSecs)` generates ETH candles (4 AM–8 PM ET, 16h session). Starting price ~5650. `barsPerDay`: 1m=960, 5m=192, 15m=64, 30m=32, 1h=16, 4h=4, 1D=1.

### Real Market Data
`src/hooks/useChartData.js` — fetches `/api/yahoo/v8/finance/chart/ES=F?interval=…&range=…&includePrePost=true`.
Vite proxy in `vite.config.js`: `/api/yahoo` → `https://query1.finance.yahoo.com` with browser User-Agent header to avoid bot blocking.
Falls back to `buildSimCandles()` on any fetch failure. Returns `{candles, loading, isLive}`.
"Sim" badge shown in ChartContainer when `!isLive`.

### Practice Chart (`src/components/practice/`)
- `ChartContainer.jsx` — lightweight-charts **v5** (important: v5 API differs from v4).
  - Series created via `addSeries(SeriesClass, options)` not `addCandlestickSeries()`
  - Custom overlays via **Series Primitives** (`attachPrimitive(primitive)`): implement `attached({series,chart,requestUpdate})`, `paneViews()`, `updateAllViews()`
  - Canvas drawing uses `target.useMediaCoordinateSpace()` — **NOT** `usePixelCoordinateSpace` (doesn't exist, crashes chart)
  - SMC zones: `BoxZonePrimitive` (FVG boxes + OB boxes), `VerticalBandPrimitive` (session backgrounds)
  - `LOOKBACK = 200` — only last 200 candles scanned for SMC detection
  - FVG mitigation: bull FVG mitigated when future candle's low enters the gap; bear FVG when high enters
  - OB mitigation: price trades through OB extremes; Liquidity: price trades beyond swing point
  - Session H/L lines via `createPriceLine()`, Liquidity via `createPriceLine()`
  - Time axis uses ET 12-hour format via `tickMarkFormatter` + `localization.timeFormatter` with `America/New_York`
- `PracticePage.jsx` — toolbar (symbol, timeframe, tools), two-column layout, replay state
  - Order types: `market | limit | stop | stop_limit` — Use `<ChartContainer>` instead of vanilla TradingView widgets for SMC zones and replay controls
- Dashboard runs on `<DashboardPage>` which displays `<DrawdownMeter>`, `<RecentTrades>`, `<ConsistencyChart>`, and `<TradeCalendar>` (PerformanceBreakdown & PositionSizer were removed)

### Recent Visual & Architecture Upgrades
- **UI System**: Deployed Glassmorphism across the `.card` ecosystem using deep drop shadows and `rgba` backdrop filters.
- **Animations**: Integrated `framer-motion` for cascade-reveals on page loads.
- **Charts**: Lightweight-charts `tickMarkFormatter` and `timeFormatter` have been patched with strict `BusinessDay` type checks to ensure the X-axis and crosshairs always render accurately intraday vs daily.
  - `awaitingFill` state: `{ type, side, entry, stopTrigger, tp, sl, symbol }`
  - Fill logic: limit=price reaches entry; stop=price breaks trigger; stop_limit=trigger hit then entry filled
- `ReplayControls.jsx` — play/pause/step/reset, speed selector (0.5×/1×/2×/4×/8×), timestamps in ET 12hr
- `IndicatorPanel.jsx` — 6 indicators + 3 SMC layers + 3 sessions (Asia/London/NY) with H/L sub-toggles
- `OrderPanel.jsx` — paper trading form, live R:R calc, submits to `store.addPaperTrade()`

### Session Definitions (UTC, covers ES futures ETH)
- Asia: 00:00 – 09:00 UTC (midnight–9 AM UTC)
- London: 07:00 – 16:00 UTC (3 AM–noon ET)
- NY: 13:30 – 21:00 UTC (9:30 AM–5 PM ET — full ETH, includes post-close until ES maintenance break)

### Concepts Tab (`src/components/concepts/`)
`ConceptsPage.jsx` owns sub-tab state. `PAGE_MAP` maps concept id → component.
All 12 concepts have pages: `CandlesPage`, `StructurePage`, `FVGPage`, `LiquidityPage`, `OrderBlocksPage`, `BreakRetestPage`, `PremiumDiscountPage`, `SessionsPage`, `VWAPPage`, `RiskPage`, `PowerOf3Page`, `ConfluencePage`.

### Styling
Single flat CSS file `src/styles/globals.css`. CSS custom properties on `:root`. Project is now powered by **Tailwind CSS v4** (`@tailwindcss/vite`), allowing inline utility styling alongside base variables.
Color tokens: `--green`, `--red`, `--blue`, `--amber`, `--purple` + `*-bg` variants.
Auth styles: `.auth-page`, `.auth-card`, `.auth-input`, `.auth-button`, `.auth-error`, `.auth-message`, `.auth-links`.
Header user styles: `.user-email`, `.signout-btn`.
Migration styles: `.migration-overlay`, `.migration-card`, `.migration-actions`, `.migration-skip`.

### Deployment
- **Hosting**: Vercel. Auto-deploys on push to `main`.
- **Serverless**: `api/yahoo.js` — proxies Yahoo Finance API requests.
- **Env vars** (set in Vercel dashboard + local `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.env` is gitignored.

### Alpha Futures Zero 50K Rules (used in PropTrackerPage + PlaybookPage)
- Daily loss guard: $1,000
- Max drawdown: $2,000
- Profit target: $3,000 (eval) / None (qualified)
- Minimum trading days: 1 (eval) / 5 (qualified)
- Consistency rule: None (eval) / 40% of total profit (qualified)
- Max position size: 3 contracts
- Profit split: 90% (qualified)
