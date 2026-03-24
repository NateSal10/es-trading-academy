# Backtest Page Redesign — Design Spec
**Date:** 2026-03-23
**Status:** Approved (post-review)

---

## Overview

A full redesign of the backtesting page to match TradingView's UX conventions: chart-dominant layout, natural language strategy editing, Pine Script import via AI translation, visual timeframe switching, and saved strategy variants. All features ship in one release, built in safe incremental layers.

---

## Layout — Four Zones

### Zone 1 — Strategy Bar (top)
A slim horizontal bar spanning the full width. Contains:
- All preset strategies as clickable chips (ICT Silver Bullet, ORB, VWAP Bounce, Break & Retest, TJR, Custom)
- User-saved variants displayed inline with a ★ star badge (e.g. "ICT (my 3:1 rules) ★")
- A "Pine Script" chip — clicking it scrolls/opens the Pine Script tab in Zone 4 (not a separate modal)
- A "+ New Strategy" chip that opens the custom condition builder as a modal
- Symbol selector (ES=F, MES=F, NQ=F, MNQ) and date range picker on the right
- "▶ Run Backtest" button on the far right
- During a run: button shows a spinner and is disabled; results appear when complete

### Zone 2 — Natural Language Bar (below strategy bar)
A persistent single-line strip always visible above the chart. Contains:
- Label: "Adjust strategy:"
- Text input: **clears whenever a different strategy chip is selected** (strategy switch always resets the NL context). Text is not retained between strategy switches — each strategy starts with a blank NL bar.
- "Apply & Run" button — applies the described change for this run only, does not persist
- "Save as Variant" button — opens a name prompt, saves config, adds chip to Zone 1

No number sliders or parameter grids anywhere in the UI. All strategy customization goes through this bar.
If ANTHROPIC_API_KEY is missing: both buttons are disabled with a tooltip: "Add ANTHROPIC_API_KEY to Vercel environment variables."

### Zone 3 — Chart (dominant, center)
Candlestick chart using lightweight-charts v5 filling most of the screen. Contains:
- Trade entry markers (▲ green for LONG, ▼ red for SHORT)
- Trade exit markers (● green for TP hit, ● red for SL hit)
- **Live metrics overlay top-left** (4 metrics): Net P&L, Win Rate, Max Drawdown, Total Trades
- **Timeframe switcher top-right** (1m · 5m · 15m · 30m · 1h · 4h)

**TF Switcher behavior:**
- The engine always runs on the strategy's `defaultTimeframe` — this never changes
- After a run, clicking a TF button fetches candles at that TF via the existing `/api/yahoo` proxy
- Trade markers are remapped: for each trade, find the candle where `candle.time <= trade.entryTime < candle.time + barDurationSeconds`; if no exact containing candle exists (gap, holiday), use the next candle after the trade time
- The chart re-renders with visual-TF candles + remapped markers — no engine re-run
- TF switcher defaults to the strategy's `defaultTimeframe` after each run

### Zone 4 — Results Panel (bottom, tabbed)
Collapsible panel below the chart. Four tabs:

**Overview tab**
- 8-metric grid: Net P&L, Win Rate, Profit Factor, Max Drawdown, Sharpe Ratio, Trades, Expectancy, Avg R:R
- Equity curve (lightweight-charts LineSeries, green if profitable, red if not)

**Trades tab**
- Sortable trade log table columns: #, Date/Time (ET, YYYY-MM-DD HH:MM), Side, Entry Price, Exit Price, P&L ($), R:R, Bars Held, Exit Reason (TP/SL)
- CSV Export: same columns, ET timestamps, comma-separated

**Visual Replay tab**
- Full candlestick chart with all trade markers
- Component: `VisualReplay.jsx` — props: `candles` (native TF candle array), `trades` (array of trade objects)

**Pine Script tab**
- Textarea to paste a Pine Script strategy
- "Translate with AI" button → POST to `/api/translate-pine`
- Summary panel shows what was interpreted
- "Use This Strategy" button applies the translated config as a new strategy chip in Zone 1

---

## API Endpoint Contracts

### `/api/interpret-strategy` (existing, unchanged)
**Request:** `{ text: string, baseStrategy?: string }`
**Response (200):**
```json
{
  "conditions": [{ "type": "string", ...params }],
  "direction": "LONG | SHORT | AUTO",
  "slMethod": "fixed_points | below_signal_candle | swing_point",
  "slValue": 5,
  "tpMethod": "rr_multiple | fixed_points",
  "tpValue": 2,
  "maxTradesPerDay": 2,
  "summary": "1-2 sentence plain English description"
}
```

### `/api/translate-pine` (new)
**Request:** `{ script: string }` (min 50 chars, max 5000 chars — Pine Script is never valid under ~50 chars)
**Response (200):** Same shape as `/api/interpret-strategy` above
**Error responses:** Same pattern as interpret-strategy (400 for bad input, 500 for missing API key, 502 for Claude error)
**Fallback if ANTHROPIC_API_KEY missing:** `500 { error: "ANTHROPIC_API_KEY not configured" }`

---

## Natural Language Strategy Editing

### Flow
1. User selects a strategy chip (e.g. ICT Silver Bullet)
2. User types in Zone 2: *"use 3:1 target, only trade the 10 AM window, stop below FVG low"*
3. Click "Apply & Run": POST to `/api/interpret-strategy` with `{ text, baseStrategy: "ict_silver_bullet" }` → apply returned config → run backtest immediately
4. Click "Save as Variant": same API call → prompt user for a name → save to Zustand `strategyVariants`

### Variant Storage (Zustand `strategyVariants` slice in `store/index.js`)
```js
// Shape
{ id: uuid, name: string, baseStrategy: string, config: object, createdAt: ISO string }

// Actions
addVariant(variant)    // prepends; prunes oldest if count > 20; shows toast "Oldest variant removed to stay under limit" if pruned
deleteVariant(id)
```
- Variants with duplicate names: overwrite the existing variant with the same name (update config + createdAt, keep id)
- Persisted to localStorage via existing `partialize`

---

## Pine Script Import

### Scope
AI translation only (not a full Pine Script interpreter). System prompt instructs Claude to extract:
- `strategy.entry()` / `strategy.exit()` → conditions + direction
- `ta.ema()`, `ta.vwap()` → condition types
- Time-based filters → `time_between` conditions
- `input()` values → param defaults (slValue, tpValue, maxTradesPerDay)

### `api/translate-pine.js`
Same structure as `api/interpret-strategy.js`:
- Validates body (script required, 10–5000 chars)
- Calls Claude Haiku with a Pine Script-specific system prompt
- Strips markdown fences from response
- Returns parsed JSON config

---

## Strategy `defaultTimeframe` Property

All existing strategy files must have this field added:

| Strategy | defaultTimeframe |
|---|---|
| openingRangeBreakout | `'1m'` |
| vwapBounce | `'5m'` |
| ictSilverBullet | `'5m'` |
| breakAndRetest | `'5m'` |
| tjrStrategy | `'5m'` |
| customStrategyRunner | `'5m'` (default) |

`BacktestPage` reads `strategy.defaultTimeframe` on strategy selection and updates the internal `timeframe` state immediately — this triggers `useChartData` to re-fetch at the correct TF before the user clicks Run. No user-facing TF selector in Zone 1.

---

## Component Migration

| Old Component | New Home | Notes |
|---|---|---|
| `StrategySelector.jsx` | Replaced by Zone 1 chip row in `BacktestPage.jsx` | Only rendered strategy cards — no fetch/auth logic to migrate |
| `BacktestResults.jsx` | Overview tab content | Keep metrics grid + equity curve, remove outer wrapper |
| `TradeLog.jsx` | Trades tab | No changes needed |
| `VisualReplay.jsx` | Visual Replay tab | Props unchanged: `candles`, `trades` |
| `CustomStrategyBuilder.jsx` | Modal opened by "+ New Strategy" chip | Config still flows through `onChange` → `BacktestPage` state |

---

## Files to Create / Modify

### New Files
- `api/translate-pine.js`

### Modified Files
- `src/components/backtest/BacktestPage.jsx` — full layout rebuild
- `src/engine/strategies/*.js` — add `defaultTimeframe` to each strategy object
- `src/store/index.js` — add `strategyVariants` slice + partialize

### Deleted Files
- `src/components/backtest/StrategySelector.jsx` — logic absorbed into BacktestPage Zone 1

---

## Build Order (incremental layers)

1. **Shell** — 4-zone layout structure, Zone 1 chip row (presets only), Zone 2 NL bar (non-functional), empty tab panels
2. **Engine wiring** — Run button triggers existing engine unchanged; results populate Overview tab and live overlay
3. **TF Switcher** — Visual TF switching post-run, marker remapping logic
4. **NL Variants** — Zone 2 Apply & Run + Save as Variant flow, variant storage, variant chips in Zone 1
5. **Pine Script Tab** — `api/translate-pine.js`, Pine Script tab UI in Zone 4
6. **Polish** — Loading states, error states, responsive layout, animations

---

## Out of Scope
- Full Pine Script interpreter (AI translation only)
- Parameter optimization / grid search
- Walk-forward analysis
- Monte Carlo simulation
- Multi-symbol comparison
