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

### State Management
`src/store/index.js` — single Zustand store with `persist` middleware → `localStorage` key `es-academy-v2`.
Slices: `completedConcepts`, `quizHistory`, `journal`, `dailyChecklist`, `dailyNotes`, `account`, `indicators`, `smcLayers`, `sessions`, `drawings`, `paperAccount`.
`partialize` ensures only data (not functions) is persisted.
`sessions` slice: `{ asia, london, ny, asiaHL, londonHL, nyHL }` — booleans for session band + H/L toggles.

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
  - Order types: `market | limit | stop | stop_limit` — non-market orders in replay sit as `awaitingFill` and check fill conditions per advancing candle
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
Single flat CSS file `src/styles/globals.css`. CSS custom properties on `:root`. No CSS modules, no Tailwind.
Color tokens: `--green`, `--red`, `--blue`, `--amber`, `--purple` + `*-bg` variants.

### Alpha Futures Zero 50K Rules (used in PropTrackerPage + PlaybookPage)
- Daily loss guard: $1,000
- Max drawdown: $2,000
- Profit target: $3,000 (eval) / None (qualified)
- Minimum trading days: 1 (eval) / 5 (qualified)
- Consistency rule: None (eval) / 40% of total profit (qualified)
- Max position size: 3 contracts
- Profit split: 90% (qualified)
