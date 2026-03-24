# Backtest Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the backtesting page with a TradingView-style 4-zone layout — strategy chip bar, always-visible natural language editing strip, chart with visual-TF switcher, and tabbed results panel — while adding Pine Script AI translation and named strategy variants.

**Architecture:** `BacktestPage.jsx` is completely rewritten as a 4-zone layout shell that wires together existing engine logic and existing sub-components (now placed into tabs). A new `strategyVariants` Zustand slice handles variant persistence. Two new Vercel serverless functions handle Pine Script translation. No changes to the engine or strategy logic.

**Tech Stack:** React 18, Zustand (persist), lightweight-charts v5, Vite, Vercel serverless functions, Anthropic Claude Haiku API, Yahoo Finance proxy.

**Spec:** `docs/superpowers/specs/2026-03-23-backtest-redesign.md`

---

## File Map

### Files to Create
- `api/translate-pine.js` — Vercel serverless: POST `{ script }` → Claude Haiku → strategy config JSON
- `src/components/backtest/StrategyChipBar.jsx` — Zone 1: preset chips + variant chips + symbol/date/run button
- `src/components/backtest/NLBar.jsx` — Zone 2: NL text input + Apply & Run + Save as Variant
- `src/components/backtest/ChartWithMarkers.jsx` — Zone 3: candlestick chart + trade markers + TF switcher + metrics overlay
- `src/components/backtest/ResultsTabs.jsx` — Zone 4: tab shell (Overview / Trades / Visual Replay / Pine Script)
- `src/components/backtest/PineScriptTab.jsx` — Pine Script paste + translate UI (Zone 4 tab)

### Files to Modify
- `src/components/backtest/BacktestPage.jsx` — full rewrite to 4-zone layout
- `src/store/index.js` — add `strategyVariants` slice + partialize entry
- `src/engine/strategies/openingRangeBreakout.js` — add `defaultTimeframe: '1m'`
- `src/engine/strategies/vwapBounce.js` — add `defaultTimeframe: '5m'`
- `src/engine/strategies/ictSilverBullet.js` — add `defaultTimeframe: '5m'`
- `src/engine/strategies/breakAndRetest.js` — add `defaultTimeframe: '5m'`
- `src/engine/strategies/tjrStrategy.js` — add `defaultTimeframe: '5m'`
- `src/engine/strategies/customStrategyRunner.js` — add `defaultTimeframe: '5m'` to output of `buildCustomStrategy`

### Files to Delete
- `src/components/backtest/StrategySelector.jsx` — replaced by `StrategyChipBar.jsx`

### Files Unchanged (just re-used in new locations)
- `src/components/backtest/BacktestResults.jsx` — becomes Overview tab content
- `src/components/backtest/TradeLog.jsx` — becomes Trades tab content
- `src/components/backtest/VisualReplay.jsx` — becomes Visual Replay tab content
- `src/components/backtest/CustomStrategyBuilder.jsx` — opened as modal from "+ New Strategy" chip
- `src/components/backtest/BacktestHistory.jsx` — stays in Overview tab below equity curve

---

## Task 1: Add `defaultTimeframe` to all strategy files

**Files:**
- Modify: `src/engine/strategies/openingRangeBreakout.js`
- Modify: `src/engine/strategies/vwapBounce.js`
- Modify: `src/engine/strategies/ictSilverBullet.js`
- Modify: `src/engine/strategies/breakAndRetest.js`
- Modify: `src/engine/strategies/tjrStrategy.js`
- Modify: `src/engine/strategies/customStrategyRunner.js`

- [ ] **Step 1: Add `defaultTimeframe` to openingRangeBreakout**

In `src/engine/strategies/openingRangeBreakout.js`, find the exported object and add one line:
```js
export const openingRangeBreakout = {
  id: 'orb_815',
  defaultTimeframe: '1m',   // ← add this
  name: '8AM Opening Range Breakout',
  // ...rest unchanged
```

- [ ] **Step 2: Add `defaultTimeframe` to the remaining four strategies**

In each file below, add `defaultTimeframe: '5m'` as the second property (after `id`):
- `src/engine/strategies/vwapBounce.js`
- `src/engine/strategies/ictSilverBullet.js`
- `src/engine/strategies/breakAndRetest.js`
- `src/engine/strategies/tjrStrategy.js`

- [ ] **Step 3: Add `defaultTimeframe` to `buildCustomStrategy` output**

In `src/engine/strategies/customStrategyRunner.js`, find the `buildCustomStrategy` function. In the returned strategy object, add:
```js
return {
  id: 'custom',
  defaultTimeframe: '5m',   // ← add this
  name: 'Custom Strategy',
  // ...rest unchanged
```

- [ ] **Step 4: Verify build passes**
```bash
npm run build
```
Expected: clean build, no errors.

- [ ] **Step 5: Commit**
```bash
git add src/engine/strategies/
git commit -m "feat: add defaultTimeframe to all strategy objects"
```

---

## Task 2: Add `strategyVariants` slice to Zustand store

**Files:**
- Modify: `src/store/index.js`

- [ ] **Step 1: Add the slice state and actions**

In `src/store/index.js`, find the `backtestHistory` slice (around line 258) and add the `strategyVariants` slice directly after it:

```js
// ─── STRATEGY VARIANTS ──────────────────────────────────────────────
strategyVariants: [],

addVariant: (variant) => set((s) => {
  // If name collision: overwrite the existing variant
  const existing = s.strategyVariants.find(v => v.name === variant.name)
  if (existing) {
    return {
      strategyVariants: s.strategyVariants.map(v =>
        v.name === variant.name
          ? { ...variant, id: v.id }  // keep original id, update everything else
          : v
      )
    }
  }
  // Prepend new variant; prune oldest if over 20
  const updated = [variant, ...s.strategyVariants]
  if (updated.length > 20) {
    updated.pop()  // remove oldest (last element)
    // Note: caller is responsible for showing a toast about pruning
  }
  return { strategyVariants: updated }
}),

deleteVariant: (id) => set((s) => ({
  strategyVariants: s.strategyVariants.filter(v => v.id !== id),
})),

clearVariants: () => set({ strategyVariants: [] }),
```

- [ ] **Step 2: Add `strategyVariants` to `partialize`**

Find the `partialize` object (around line 340) and add one line:
```js
partialize: (s) => ({
  // ...existing entries...
  backtestHistory: s.backtestHistory,
  strategyVariants: s.strategyVariants,  // ← add this
}),
```

- [ ] **Step 3: Verify build passes**
```bash
npm run build
```

- [ ] **Step 4: Commit**
```bash
git add src/store/index.js
git commit -m "feat: add strategyVariants Zustand slice with add/delete/clear actions"
```

---

## Task 3: Create `api/translate-pine.js` serverless function

**Files:**
- Create: `api/translate-pine.js`

- [ ] **Step 1: Create the file**

Create `api/translate-pine.js` with this exact content:

```js
/**
 * Vercel serverless function: translate a Pine Script strategy into
 * a structured config object for the Custom Strategy Builder.
 *
 * Requires ANTHROPIC_API_KEY env var set in Vercel project settings.
 */

const ALLOWED_ORIGIN = 'https://es-trading-academy.vercel.app'

const SYSTEM_PROMPT = `You are a Pine Script strategy translator for a futures trading backtesting app (ES/NQ/MES/MNQ).

Read the Pine Script code and extract the trading strategy logic into a JSON config object.

Available condition types (use exact "type" strings):
- "price_above_vwap" — price is above VWAP
- "price_below_vwap" — price is below VWAP
- "price_crosses_above_vwap" — price crosses above VWAP
- "price_crosses_below_vwap" — price crosses below VWAP
- "price_above_ema" — price above EMA (requires emaPeriod: number)
- "price_below_ema" — price below EMA (requires emaPeriod: number)
- "bullish_fvg" — bullish Fair Value Gap formed
- "bearish_fvg" — bearish Fair Value Gap formed
- "bullish_ob" — bullish Order Block formed
- "bearish_ob" — bearish Order Block formed
- "bullish_bos" — bullish Break of Structure
- "bearish_bos" — bearish Break of Structure
- "time_between" — time filter (requires startHour, startMin, endHour, endMin in 24h ET)
- "bullish_candle" — current bar closes bullish
- "bearish_candle" — current bar closes bearish

SL methods: "fixed_points" | "below_signal_candle" | "swing_point"
TP methods: "rr_multiple" | "fixed_points"

Output ONLY valid JSON (no markdown, no explanation):
{
  "conditions": [{ "type": "condition_type_id", ...optional params }],
  "direction": "LONG" | "SHORT" | "AUTO",
  "slMethod": "fixed_points" | "below_signal_candle" | "swing_point",
  "slValue": number,
  "tpMethod": "rr_multiple" | "fixed_points",
  "tpValue": number,
  "maxTradesPerDay": number,
  "summary": "1-2 sentence plain English description of what the Pine Script strategy does"
}

Rules:
- Map strategy.entry("Long") → direction LONG, strategy.entry("Short") → direction SHORT
- Map ta.ema(close, N) conditions → price_above_ema or price_below_ema with emaPeriod: N
- Map ta.vwap conditions → price_above_vwap or price_below_vwap
- Map time() filters → time_between condition
- Map strategy.exit stop_loss → slValue in points; profit_target → tpValue
- If direction is ambiguous or both long and short, use "AUTO"
- maxTradesPerDay default 2 if not specified
- Extract as many conditions as possible from the Pine Script`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' })
    return
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const script = (body?.script ?? '').trim()
  if (!script || script.length < 50) {
    res.status(400).json({ error: 'Pine Script too short (minimum 50 characters)' })
    return
  }
  if (script.length > 5000) {
    res.status(400).json({ error: 'Pine Script too long (maximum 5000 characters)' })
    return
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: script }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      res.status(502).json({ error: data?.error?.message ?? 'Claude API error' })
      return
    }

    const raw = data?.content?.[0]?.text ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(502).json({ error: 'Could not parse strategy from Pine Script' })
      return
    }

    const config = JSON.parse(jsonMatch[0])
    res.status(200).json(config)
  } catch (err) {
    res.status(500).json({ error: 'Pine Script translation failed: ' + err.message })
  }
}
```

- [ ] **Step 2: Verify build passes**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add api/translate-pine.js
git commit -m "feat: add /api/translate-pine serverless function for Pine Script AI translation"
```

---

## Task 4: Build `StrategyChipBar` (Zone 1)

**Files:**
- Create: `src/components/backtest/StrategyChipBar.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';
import { Plus, Star } from 'lucide-react';

const s = {
  bar: {
    background: 'var(--card)',
    borderBottom: '1px solid var(--border)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chipRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  chip: (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
  variantChip: (active) => ({
    background: active ? '#22c55e22' : 'var(--bg2)',
    color: active ? 'var(--green)' : 'var(--muted)',
    border: `1px solid ${active ? '#22c55e44' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  }),
  pineChip: {
    background: 'rgba(168,85,247,0.1)',
    color: 'var(--purple)',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '11px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  newChip: {
    background: 'none',
    border: '1px dashed var(--border)',
    color: 'var(--muted)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  select: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '11px',
  },
  runBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : 'var(--accent)',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
};

const SYMBOLS = ['ES=F', 'MES=F', 'NQ=F', 'MNQ=F'];

export default function StrategyChipBar({
  presets,           // array of strategy objects
  variants,          // array of { id, name, baseStrategy, config }
  selectedId,        // currently selected strategy id or variant id
  symbol,
  onSelectPreset,    // (strategy) => void
  onSelectVariant,   // (variant) => void
  onSymbolChange,    // (symbol) => void
  onPineScript,      // () => void — opens Pine Script tab
  onNewStrategy,     // () => void — opens custom builder modal
  onRun,             // () => void
  running,
  canRun,
}) {
  return (
    <div style={s.bar}>
      <div style={s.chipRow}>
        {presets.map((strategy) => (
          <button
            key={strategy.id}
            style={s.chip(selectedId === strategy.id)}
            onClick={() => onSelectPreset(strategy)}
          >
            {strategy.name}
          </button>
        ))}

        {variants.map((variant) => (
          <button
            key={variant.id}
            style={s.variantChip(selectedId === variant.id)}
            onClick={() => onSelectVariant(variant)}
          >
            <Star size={10} />
            {variant.name}
          </button>
        ))}

        <button style={s.pineChip} onClick={onPineScript}>
          Pine Script
        </button>

        <button style={s.newChip} onClick={onNewStrategy}>
          <Plus size={11} />
          New Strategy
        </button>
      </div>

      <div style={s.controls}>
        <select style={s.select} value={symbol} onChange={(e) => onSymbolChange(e.target.value)}>
          {SYMBOLS.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>
        <button style={s.runBtn(!canRun || running)} disabled={!canRun || running} onClick={onRun}>
          {running ? '⟳ Running…' : '▶ Run Backtest'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add src/components/backtest/StrategyChipBar.jsx
git commit -m "feat: add StrategyChipBar component (Zone 1)"
```

---

## Task 5: Build `NLBar` (Zone 2)

**Files:**
- Create: `src/components/backtest/NLBar.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';

const s = {
  bar: {
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    padding: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  input: {
    flex: 1,
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  applyBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : 'var(--green)',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  }),
  saveBtn: (disabled) => ({
    background: 'var(--bg2)',
    color: disabled ? 'var(--muted)' : 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '11px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }),
  errorText: {
    fontSize: '10px',
    color: 'var(--red)',
    whiteSpace: 'nowrap',
  },
};

export default function NLBar({
  strategyId,        // current strategy id — used to call the right API
  apiKeyMissing,     // bool — disables buttons if true
  onApplyAndRun,     // (nlText) => Promise<void> — applies config + triggers run
  onSaveVariant,     // (nlText, name) => Promise<void> — saves as variant
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset text when strategy changes (spec: "clears when a different strategy chip is selected")
  useEffect(() => { setText(''); setError(null); }, [strategyId]);

  const disabled = apiKeyMissing || !text.trim() || loading;

  const handleApply = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onApplyAndRun(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (disabled) return;
    const name = window.prompt('Save variant as:', `${strategyId} (custom)`);
    if (!name?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSaveVariant(text, name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = apiKeyMissing
    ? 'Add ANTHROPIC_API_KEY to Vercel environment variables to enable AI editing'
    : undefined;

  return (
    <div style={s.bar}>
      <span style={s.label}>Adjust strategy:</span>
      <input
        style={s.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "target 3:1, only trade the 10 AM window, stop below FVG low"'
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
      />
      <button style={s.applyBtn(disabled)} disabled={disabled} onClick={handleApply} title={title}>
        {loading
          ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Working…</>
          : <><Sparkles size={11} /> Apply &amp; Run</>
        }
      </button>
      <button style={s.saveBtn(disabled)} disabled={disabled} onClick={handleSave} title={title}>
        Save as Variant
      </button>
      {error && <span style={s.errorText}>{error}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add src/components/backtest/NLBar.jsx
git commit -m "feat: add NLBar component (Zone 2) with Apply & Run and Save as Variant"
```

---

## Task 6: Build `ChartWithMarkers` (Zone 3)

**Files:**
- Create: `src/components/backtest/ChartWithMarkers.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { useChartData } from '../../hooks/useChartData';

const TF_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '4h'];

// Given a list of candles and a trade time (unix seconds),
// returns the candle that contains that time.
function remapToCandle(candles, tradeTime) {
  if (!candles.length) return null;
  for (let i = 0; i < candles.length - 1; i++) {
    if (candles[i].time <= tradeTime && tradeTime < candles[i + 1].time) {
      return candles[i];
    }
  }
  // If trade time is after the last candle's open, use the last candle
  if (tradeTime >= candles[candles.length - 1].time) return candles[candles.length - 1];
  // If before first candle, use first
  return candles[0];
}

function buildMarkers(trades, candles) {
  if (!trades?.length || !candles?.length) return [];
  const markers = [];
  for (const trade of trades) {
    const isLong = trade.side === 'LONG';
    const isWin = trade.pnl >= 0;

    if (trade.entryTime) {
      const c = remapToCandle(candles, trade.entryTime);
      if (c) markers.push({
        time: c.time,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#22c55e' : '#ef4444',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `${isLong ? 'L' : 'S'} ${trade.entry?.toFixed(1) ?? ''}`,
      });
    }
    if (trade.exitTime) {
      const c = remapToCandle(candles, trade.exitTime);
      if (c) markers.push({
        time: c.time,
        position: isLong ? 'aboveBar' : 'belowBar',
        color: isWin ? '#22c55e' : '#ef4444',
        shape: 'circle',
        text: `${trade.exitReason?.toUpperCase() ?? 'X'} ${trade.exitPrice?.toFixed(1) ?? ''}`,
      });
    }
  }
  markers.sort((a, b) => a.time - b.time);
  return markers;
}

const metricStyle = {
  display: 'inline-block',
  background: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '5px',
  padding: '3px 8px',
  fontSize: '11px',
  marginRight: '5px',
};

export default function ChartWithMarkers({
  symbol,
  nativeTf,      // strategy's defaultTimeframe — used for initial TF
  trades,        // array of trade objects (have entryTime/exitTime in unix seconds)
  metrics,       // { totalPnl, winRate, maxDrawdown, totalTrades }
}) {
  const [visualTf, setVisualTf] = useState(nativeTf || '5m');
  const { candles } = useChartData(symbol, visualTf);
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  // Reset to native TF when strategy changes
  useEffect(() => {
    setVisualTf(nativeTf || '5m');
  }, [nativeTf]);

  useEffect(() => {
    if (!candles?.length || !containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 380,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    series.setData(candles);

    const markers = buildMarkers(trades, candles);
    if (markers.length) createSeriesMarkers(series, markers);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => { chart.remove(); chartRef.current = null; };
  }, [candles, trades]);

  const pnlPositive = (metrics?.totalPnl ?? 0) >= 0;

  return (
    <div style={{ position: 'relative', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      {/* Metrics overlay */}
      {metrics && (
        <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 10, display: 'flex', gap: 4 }}>
          <span style={{ ...metricStyle, color: pnlPositive ? '#22c55e' : '#ef4444' }}>
            {pnlPositive ? '+' : ''}{metrics.totalPnl?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </span>
          <span style={{ ...metricStyle, color: '#e2e8f0' }}>
            {metrics.winRate?.toFixed(1)}% win
          </span>
          <span style={{ ...metricStyle, color: '#ef4444' }}>
            DD {metrics.maxDrawdown?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </span>
          <span style={{ ...metricStyle, color: '#9ca3af' }}>
            {metrics.totalTrades} trades
          </span>
        </div>
      )}

      {/* TF switcher */}
      <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, display: 'flex', gap: 3 }}>
        {TF_OPTIONS.map((tf) => (
          <button
            key={tf}
            onClick={() => setVisualTf(tf)}
            style={{
              background: visualTf === tf ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
              color: visualTf === tf ? '#fff' : '#6b7280',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      <div ref={containerRef} style={{ height: '380px', width: '100%' }} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add src/components/backtest/ChartWithMarkers.jsx
git commit -m "feat: add ChartWithMarkers component (Zone 3) with TF switcher and metrics overlay"
```

---

## Task 7: Build `PineScriptTab` (Zone 4 tab)

**Files:**
- Create: `src/components/backtest/PineScriptTab.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

const s = {
  wrap: { padding: '16px' },
  label: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: '6px' },
  textarea: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '160px',
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: '1.5',
  },
  translateBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : 'var(--purple, #a855f7)',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
  }),
  useBtn: {
    background: 'var(--green)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: '8px',
    marginTop: '10px',
  },
  summaryBox: {
    background: 'rgba(79,142,247,0.08)',
    border: '1px solid rgba(79,142,247,0.25)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--text)',
    lineHeight: '1.5',
    marginTop: '12px',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--red-bright, #f87171)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
};

export default function PineScriptTab({ onUseStrategy }) {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { summary, ...config }

  const canTranslate = script.trim().length >= 50 && !loading;

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/translate-pine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (result) onUseStrategy(result);
  };

  return (
    <div style={s.wrap}>
      <div style={s.label}>Paste Pine Script Strategy</div>
      <textarea
        style={s.textarea}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder={'//@version=5\nstrategy("My Strategy")\n// paste your full Pine Script here…'}
        spellCheck={false}
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button style={s.translateBtn(!canTranslate)} disabled={!canTranslate} onClick={handleTranslate}>
          {loading
            ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Translating…</>
            : '⟳ Translate with AI'
          }
        </button>
        {result && (
          <button style={s.useBtn} onClick={handleUse}>
            <CheckCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Use This Strategy
          </button>
        )}
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} />
          {error.includes('ANTHROPIC_API_KEY')
            ? 'Add ANTHROPIC_API_KEY to your Vercel environment variables to enable AI translation.'
            : error}
        </div>
      )}

      {result?.summary && (
        <div style={s.summaryBox}>
          <strong>Interpreted as:</strong> {result.summary}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add src/components/backtest/PineScriptTab.jsx
git commit -m "feat: add PineScriptTab component (Zone 4) with AI translation"
```

---

## Task 8: Build `ResultsTabs` (Zone 4 shell)

**Files:**
- Create: `src/components/backtest/ResultsTabs.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';
import BacktestResults from './BacktestResults';
import TradeLog from './TradeLog';
import VisualReplay from './VisualReplay';
import PineScriptTab from './PineScriptTab';
import BacktestHistory from './BacktestHistory';

const TABS = ['Overview', 'Trades', 'Visual Replay', 'Pine Script'];

const s = {
  shell: {
    background: 'var(--card)',
    borderTop: '1px solid var(--border)',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px 0',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  tab: (active) => ({
    padding: '5px 14px',
    borderRadius: '6px 6px 0 0',
    fontSize: '11px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--text)' : 'var(--muted)',
    background: active ? 'var(--card)' : 'transparent',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    borderBottom: active ? '1px solid var(--card)' : '1px solid transparent',
    cursor: 'pointer',
    marginBottom: active ? '-1px' : 0,
  }),
};

export default function ResultsTabs({
  metrics,
  equityCurve,
  trades,
  candles,         // native-TF candles for Visual Replay
  strategyName,
  onSelectHistory, // (historyEntry) => void
  onPineUse,       // (config) => void — called when Pine Script tab "Use This Strategy"
  initialTab,      // optional: 'Pine Script' to auto-open that tab
  onTabOpened,     // () => void — called after initialTab is consumed, so parent resets it
}) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Overview');

  // Allow parent to force-switch to a tab once, then reset
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onTabOpened?.(); // notify parent to reset pineTabTrigger to null
    }
  }, [initialTab]);

  return (
    <div style={s.shell}>
      <div style={s.tabBar}>
        {TABS.map((tab) => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div style={{ padding: '16px' }}>
          <BacktestResults metrics={metrics} equityCurve={equityCurve} />
          <BacktestHistory onSelect={onSelectHistory} />
        </div>
      )}

      {activeTab === 'Trades' && (
        <TradeLog trades={trades} strategyName={strategyName} />
      )}

      {activeTab === 'Visual Replay' && (
        <VisualReplay candles={candles} trades={trades} />
      )}

      {activeTab === 'Pine Script' && (
        <PineScriptTab onUseStrategy={onPineUse} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
```bash
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add src/components/backtest/ResultsTabs.jsx
git commit -m "feat: add ResultsTabs component (Zone 4) with Overview/Trades/Replay/Pine tabs"
```

---

## Task 9: Rewrite `BacktestPage.jsx`

This is the main assembly step — wires all zones together.

**Files:**
- Modify: `src/components/backtest/BacktestPage.jsx`
- Delete: `src/components/backtest/StrategySelector.jsx`

- [ ] **Step 1: Replace `BacktestPage.jsx` entirely**

```jsx
import { useState, useCallback, useRef } from 'react';
import useStore from '../../store';
import { useChartData } from '../../hooks/useChartData';
import { runBacktest, getPointValue } from '../../engine/backtestEngine';
import { openingRangeBreakout } from '../../engine/strategies/openingRangeBreakout';
import { vwapBounce } from '../../engine/strategies/vwapBounce';
import { ictSilverBullet } from '../../engine/strategies/ictSilverBullet';
import { breakAndRetest } from '../../engine/strategies/breakAndRetest';
import { tjrStrategy } from '../../engine/strategies/tjrStrategy';
import { buildCustomStrategy } from '../../engine/strategies/customStrategyRunner';
import StrategyChipBar from './StrategyChipBar';
import NLBar from './NLBar';
import ChartWithMarkers from './ChartWithMarkers';
import ResultsTabs from './ResultsTabs';
import CustomStrategyBuilder from './CustomStrategyBuilder';

const PRESET_STRATEGIES = [
  openingRangeBreakout,
  vwapBounce,
  ictSilverBullet,
  breakAndRetest,
  tjrStrategy,
];

// Detect if ANTHROPIC_API_KEY is configured by attempting a known-bad request
// and checking the response — if 500 with ANTHROPIC_API_KEY error, key is missing.
// Simpler: we just check at runtime when the user tries to use it.
const API_KEY_MISSING_MSG = 'ANTHROPIC_API_KEY not configured';

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [symbol, setSymbol] = useState('ES=F');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [customConfig, setCustomConfig] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pineTabTrigger, setPineTabTrigger] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const { strategyVariants, addVariant, saveBacktestResult, backtestHistory } = useStore((s) => ({
    strategyVariants: s.strategyVariants,
    addVariant: s.addVariant,
    saveBacktestResult: s.saveBacktestResult,
    backtestHistory: s.backtestHistory,
  }));

  // Determine native timeframe from selected strategy or variant
  const nativeTf = selectedVariant
    ? (PRESET_STRATEGIES.find(s => s.id === selectedVariant.baseStrategy)?.defaultTimeframe ?? '5m')
    : (selectedStrategy?.defaultTimeframe ?? '5m');

  const { candles, loading } = useChartData(symbol, nativeTf);

  const selectedId = selectedVariant?.id ?? selectedStrategy?.id ?? null;
  const canRun = !!(selectedStrategy || selectedVariant) && candles.length > 0 && !loading && !running;

  // ── Strategy selection ──────────────────────────────────────────────
  const handleSelectPreset = useCallback((strategy) => {
    setSelectedStrategy(strategy);
    setSelectedVariant(null);
  }, []);

  const handleSelectVariant = useCallback((variant) => {
    setSelectedVariant(variant);
    setSelectedStrategy(PRESET_STRATEGIES.find(s => s.id === variant.baseStrategy) ?? null);
  }, []);

  // ── Run backtest ────────────────────────────────────────────────────
  const runWith = useCallback((strategy, params, label) => {
    if (!candles.length) return;
    setRunning(true);
    setTimeout(() => {
      const config = {
        startingBalance: 10000,
        pointValue: getPointValue(symbol.replace('=F', '')),
        contractQty: 1,
        commission: 0,
      };
      const result = runBacktest(candles, strategy, params, config);
      setResults({ ...result, strategyLabel: label });
      saveBacktestResult({
        strategyId: strategy.id,
        strategyName: label,
        symbol,
        timeframe: nativeTf,
        params,
        metrics: result.metrics,
        trades: result.trades,
        equityCurve: result.equityCurve,
      });
      setRunning(false);
    }, 50);
  }, [candles, symbol, nativeTf, saveBacktestResult]);

  const handleRun = useCallback(() => {
    if (!canRun) return;
    if (selectedVariant) {
      const isCustom = selectedVariant.baseStrategy === 'custom';
      const strategy = isCustom
        ? buildCustomStrategy(selectedVariant.config)
        : (PRESET_STRATEGIES.find(s => s.id === selectedVariant.baseStrategy) ?? selectedStrategy);
      runWith(strategy, isCustom ? {} : selectedVariant.config, selectedVariant.name);
    } else if (selectedStrategy?.id === 'custom') {
      runWith(buildCustomStrategy(customConfig), {}, 'Custom Strategy');
    } else if (selectedStrategy) {
      const params = {};
      for (const [key, def] of Object.entries(selectedStrategy.params ?? {})) {
        params[key] = def.default ?? def.min ?? 0;
      }
      runWith(selectedStrategy, params, selectedStrategy.name);
    }
  }, [canRun, selectedStrategy, selectedVariant, customConfig, runWith]);

  // ── NL editing ──────────────────────────────────────────────────────
  const interpretNL = async (text) => {
    const baseId = selectedStrategy?.id ?? 'custom';
    const res = await fetch('/api/interpret-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseStrategy: baseId }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes('ANTHROPIC_API_KEY')) setApiKeyMissing(true);
      throw new Error(data.error || 'Interpretation failed');
    }
    return data;
  };

  const handleApplyAndRun = async (text) => {
    const config = await interpretNL(text);
    const strategy = buildCustomStrategy(config);
    runWith(strategy, {}, `${selectedStrategy?.name ?? 'Custom'} (adjusted)`);
  };

  const handleSaveVariant = async (text, name) => {
    const config = await interpretNL(text);
    const willPrune = strategyVariants.length >= 20 &&
      !strategyVariants.find(v => v.name === name); // overwrite doesn't prune
    const variant = {
      id: crypto.randomUUID(),
      name,
      baseStrategy: selectedStrategy?.id ?? 'custom',
      config,
      createdAt: new Date().toISOString(),
    };
    addVariant(variant);
    if (willPrune) {
      console.info('Oldest variant removed to stay under 20 limit');
    }
  };

  // ── Pine Script ─────────────────────────────────────────────────────
  const handlePineUse = useCallback((config) => {
    setCustomConfig(config);
    const strategy = buildCustomStrategy(config);
    setSelectedStrategy({ ...strategy, name: 'Pine Script Strategy' });
    setSelectedVariant(null);
    setPineTabTrigger(null); // reset so the effect in ResultsTabs doesn't re-fire
  }, []);

  // ── History load ────────────────────────────────────────────────────
  const handleLoadHistory = useCallback((entry) => {
    setResults({
      trades: entry.trades,
      equityCurve: entry.equityCurve,
      metrics: entry.metrics,
      strategyLabel: entry.strategyName,
    });
  }, []);

  // ── Metrics for overlay ─────────────────────────────────────────────
  const overlayMetrics = results ? {
    totalPnl: results.metrics?.totalPnl,
    winRate: results.metrics?.winRate,
    maxDrawdown: results.metrics?.maxDrawdown,
    totalTrades: results.metrics?.totalTrades,
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh' }}>
      {/* Zone 1 */}
      <StrategyChipBar
        presets={PRESET_STRATEGIES}
        variants={strategyVariants}
        selectedId={selectedId}
        symbol={symbol}
        onSelectPreset={handleSelectPreset}
        onSelectVariant={handleSelectVariant}
        onSymbolChange={setSymbol}
        onPineScript={() => setPineTabTrigger('Pine Script')}
        onNewStrategy={() => setShowCustomModal(true)}
        onRun={handleRun}
        running={running}
        canRun={canRun}
      />

      {/* Zone 2 */}
      <NLBar
        strategyId={selectedStrategy?.id ?? 'custom'}
        apiKeyMissing={apiKeyMissing}
        onApplyAndRun={handleApplyAndRun}
        onSaveVariant={handleSaveVariant}
      />

      {/* Zone 3 */}
      <ChartWithMarkers
        symbol={symbol}
        nativeTf={nativeTf}
        trades={results?.trades ?? null}
        metrics={overlayMetrics}
      />

      {/* Zone 4 */}
      <ResultsTabs
        metrics={results?.metrics ?? null}
        equityCurve={results?.equityCurve ?? null}
        trades={results?.trades ?? null}
        candles={candles}
        strategyName={results?.strategyLabel ?? selectedStrategy?.name}
        onSelectHistory={handleLoadHistory}
        onPineUse={handlePineUse}
        initialTab={pineTabTrigger}
        onTabOpened={() => setPineTabTrigger(null)}
      />

      {/* Custom Strategy Modal */}
      {showCustomModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={() => setShowCustomModal(false)}
        >
          <div
            style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CustomStrategyBuilder config={customConfig} onChange={(cfg) => {
              setCustomConfig(cfg);
              setSelectedStrategy({ id: 'custom', name: 'Custom Strategy', defaultTimeframe: '5m', params: {} });
              setSelectedVariant(null);
            }} />
            <button
              onClick={() => setShowCustomModal(false)}
              style={{ width: '100%', marginTop: 8, padding: '8px', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete the old StrategySelector**
```bash
rm "src/components/backtest/StrategySelector.jsx"
```

- [ ] **Step 3: Verify build**
```bash
npm run build
```
Expected: clean build. If there are import errors for StrategySelector anywhere else, remove those imports.

- [ ] **Step 4: Commit**
```bash
git add src/components/backtest/BacktestPage.jsx
git rm src/components/backtest/StrategySelector.jsx
git commit -m "feat: rewrite BacktestPage with 4-zone TradingView layout"
```

---

## Task 10: Final integration check + deploy

- [ ] **Step 1: Run full build**
```bash
npm run build
```
Expected: clean build, no errors, only the chunk-size warning (acceptable).

- [ ] **Step 2: Smoke test in browser**

Start dev server:
```bash
npm run dev
```

Check these scenarios:
1. Select ICT Silver Bullet → symbol ES=F → click Run → trades appear on chart and in Overview tab
2. Click the 15m TF button → chart re-renders with 15m candles, markers still visible
3. Type in NL bar → "only trade after 10 AM, 3:1 target" → Apply & Run → results appear
4. Type in NL bar → same text → Save as Variant → name it → variant chip appears in Zone 1
5. Click Pine Script chip → Pine Script tab opens → paste a simple Pine Script → Translate
6. Click + New Strategy → custom builder modal opens → configure → Done → chip updates

- [ ] **Step 3: Commit any polish fixes found during smoke test**

- [ ] **Step 4: Push and deploy**
```bash
git push origin main
```
Vercel will auto-deploy from main.

- [ ] **Step 5: Verify deployed version**

Open the Vercel URL and repeat the smoke test above in production.
