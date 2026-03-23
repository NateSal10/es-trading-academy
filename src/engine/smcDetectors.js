// ── SMC detection ─────────────────────────────────────────────────────────────
// Detectors return ACTIVE (unmitigated/unswept) zones only.
// All operate on the last LOOKBACK candles so distant history is ignored.
// Zones include startTime so boxes can be anchored to where they formed.

const LOOKBACK = 200  // max bars to scan — keeps zones relevant to current view

export function detectFVGs(candles) {
  if (candles.length < 3) return []
  const data = candles.slice(-LOOKBACK)
  const result = []
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1], mid = data[i], next = data[i + 1]
    const future = data.slice(i + 2)

    if (prev.high < next.low) {
      // Bullish FVG: gap [prev.high → next.low]; mitigated when any future low touches or enters the gap
      if (!future.some(c => c.low <= next.low)) {
        result.push({ type: 'bull', top: next.low, bot: prev.high, startTime: mid.time })
      }
    } else if (prev.low > next.high) {
      // Bearish FVG: gap [next.high → prev.low]; mitigated when any future high touches or enters the gap
      if (!future.some(c => c.high >= next.high)) {
        result.push({ type: 'bear', top: prev.low, bot: next.high, startTime: mid.time })
      }
    }
  }
  return result.slice(-8)
}

export function detectOBs(candles) {
  if (candles.length < 4) return []
  const data = candles.slice(-LOOKBACK)
  const result = []
  for (let i = 2; i < data.length - 1; i++) {
    const c = data[i], n1 = data[i + 1]
    const future = data.slice(i + 1)

    const isBullImpulse = n1.close > n1.open && (n1.close - n1.open) > (n1.high - n1.low) * 0.45
    if (c.close < c.open && isBullImpulse) {
      if (!future.some(fc => fc.low <= c.low)) {
        result.push({ type: 'bull', high: c.high, low: c.low, startTime: c.time })
      }
    }

    const isBearImpulse = n1.close < n1.open && (n1.open - n1.close) > (n1.high - n1.low) * 0.45
    if (c.close > c.open && isBearImpulse) {
      if (!future.some(fc => fc.high >= c.high)) {
        result.push({ type: 'bear', high: c.high, low: c.low, startTime: c.time })
      }
    }
  }
  return result.slice(-5)
}

export function detectLiquidity(candles) {
  if (candles.length < 11) return []
  const data = candles.slice(-LOOKBACK)
  const levels = [], w = 5
  for (let i = w; i < data.length - w; i++) {
    const win = data.slice(i - w, i + w + 1)
    // Check ALL candles after the swing point for sweeps (not just outside the window)
    const future = data.slice(i + 1)
    if (data[i].high === Math.max(...win.map(c => c.high))) {
      if (!future.some(c => c.high >= data[i].high)) levels.push({ type: 'high', price: data[i].high })
    }
    if (data[i].low === Math.min(...win.map(c => c.low))) {
      if (!future.some(c => c.low <= data[i].low)) levels.push({ type: 'low', price: data[i].low })
    }
  }
  return levels.slice(-6)
}

// ── Additional detectors for backtesting strategies ──────────────────────────

/**
 * Detect swing highs and lows (key levels for Break & Retest, TJR, etc.)
 * @param {Array} candles - OHLC candle array
 * @param {number} windowSize - bars on each side to confirm swing (default 5)
 * @returns {{ highs: Array<{price, time, index}>, lows: Array<{price, time, index}> }}
 */
export function detectSwingPoints(candles, windowSize = 5) {
  const highs = []
  const lows = []
  for (let i = windowSize; i < candles.length - windowSize; i++) {
    const win = candles.slice(i - windowSize, i + windowSize + 1)
    if (candles[i].high === Math.max(...win.map(c => c.high))) {
      highs.push({ price: candles[i].high, time: candles[i].time, index: i })
    }
    if (candles[i].low === Math.min(...win.map(c => c.low))) {
      lows.push({ price: candles[i].low, time: candles[i].time, index: i })
    }
  }
  return { highs, lows }
}

/**
 * Detect Break of Structure (BOS) — price breaks a previous swing point
 * @param {Array} candles - OHLC candle array
 * @param {number} lookback - how many swing points to check
 * @returns {Array<{type: 'bullish'|'bearish', breakBar: number, brokenLevel: number, time: number}>}
 */
export function detectBOS(candles, lookback = 50) {
  const { highs, lows } = detectSwingPoints(candles)
  const breaks = []

  for (let i = 1; i < candles.length; i++) {
    const bar = candles[i]
    // Bullish BOS: close above a recent swing high
    for (const sh of highs) {
      if (sh.index < i && i - sh.index <= lookback && bar.close > sh.price) {
        breaks.push({ type: 'bullish', breakBar: i, brokenLevel: sh.price, time: bar.time })
        break
      }
    }
    // Bearish BOS: close below a recent swing low
    for (const sl of lows) {
      if (sl.index < i && i - sl.index <= lookback && bar.close < sl.price) {
        breaks.push({ type: 'bearish', breakBar: i, brokenLevel: sl.price, time: bar.time })
        break
      }
    }
  }
  return breaks
}
