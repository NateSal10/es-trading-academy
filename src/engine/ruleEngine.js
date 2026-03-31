/**
 * Rule Engine — converts a visual RuleConfig into a strategy object
 * compatible with backtestEngine.runBacktest().
 *
 * RuleConfig shape:
 * {
 *   conditions: Condition[],
 *   tradeDirection: 'LONG' | 'SHORT' | 'BOTH',
 *   slPoints: number,   // stop loss in price points
 *   tpPoints: number,   // take profit in price points
 * }
 *
 * Condition types:
 *   ema_cross  : { maType, period, direction }
 *   time_window: { start, end }            (HH:MM strings, ET)
 *   rsi        : { period, operator, threshold }
 *   vwap       : { operator }
 *   zone_time  : { startTime, endTime }     (HH:MM strings, ET) — price inside daily range
 *   zone_manual: { high, low }              — price inside fixed range
 *   br_zone    : { startTime, endTime, rrRatio } — pre-market break & retest
 *                 Detects breakout from zone, then entry at midpoint on retest
 *                 with auto SL/TP at rrRatio:1. Overrides global slPoints/tpPoints.
 *
 * Each condition except the first has a `connector` field: 'AND' | 'OR'.
 */

import { toET, computeEMA, computeVWAP } from './strategies/strategyInterface.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || '09:30').split(':').map(Number)
  return h * 60 + m
}

function computeRSI(candles, period, index) {
  const lookback = period * 2
  const start = Math.max(1, index - lookback)
  const closes = []
  for (let i = start; i <= index; i++) closes.push(candles[i].close)
  if (closes.length < 2) return 50

  let gains = 0
  let losses = 0
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  const count = closes.length - 1
  const avgGain = gains / count
  const avgLoss = losses / count
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function buildReasonString(conditions) {
  return conditions
    .map((c) => {
      if (c.type === 'ema_cross') return `${c.maType || 'EMA'}(${c.period}) ${c.direction}`
      if (c.type === 'time_window') return `${c.start}-${c.end} ET`
      if (c.type === 'rsi') return `RSI(${c.period}) ${c.operator} ${c.threshold}`
      if (c.type === 'vwap') return `VWAP ${c.operator}`
      if (c.type === 'zone_time') return `Zone(${c.startTime}-${c.endTime})`
      if (c.type === 'zone_manual') return `Zone(${c.low?.toFixed(2)}-${c.high?.toFixed(2)})`
      if (c.type === 'br_zone') return `B&R(${c.startTime}-${c.endTime} RR${c.rrRatio ?? 3}:1)`
      return c.type
    })
    .join(' & ')
}

// ── Strategy builder ──────────────────────────────────────────────────────────

export function buildStrategy(ruleConfig) {
  return {
    id: 'custom_rule',
    name: 'Custom Rule',
    defaultTimeframe: '5m',
    params: {},

    initialize(candles) {
      const ctx = {}

      // Precompute MA arrays
      for (const cond of ruleConfig.conditions) {
        if (cond.type === 'ema_cross') {
          const key = `${cond.maType || 'EMA'}_${cond.period}`
          if (!ctx[key]) {
            const closes = candles.map((c) => c.close)
            if ((cond.maType || 'EMA') === 'SMA') {
              const p = cond.period || 20
              ctx[key] = closes.map((_, i) => {
                if (i < p - 1) return null
                let sum = 0
                for (let j = i - p + 1; j <= i; j++) sum += closes[j]
                return sum / p
              })
            } else {
              ctx[key] = computeEMA(closes, cond.period || 20)
            }
          }
        }
      }

      // Precompute daily time-based zones: dateStr → { high, low }
      for (const cond of ruleConfig.conditions) {
        if (cond.type === 'zone_time' || cond.type === 'br_zone') {
          const st = cond.type === 'zone_time' ? cond.startTime : cond.startTime
          const et2 = cond.type === 'zone_time' ? cond.endTime : cond.endTime
          const zoneKey = `zone_${st}_${et2}`
          if (!ctx[zoneKey]) {
            const startMins = timeToMinutes(st)
            const endMins = timeToMinutes(et2)
            const dailyZones = {}
            for (const c of candles) {
              const etInfo = toET(c.time)
              const mins = etInfo.hours * 60 + etInfo.minutes
              if (mins >= startMins && mins < endMins) {
                if (!dailyZones[etInfo.dateStr]) {
                  dailyZones[etInfo.dateStr] = { high: c.high, low: c.low }
                } else {
                  dailyZones[etInfo.dateStr].high = Math.max(dailyZones[etInfo.dateStr].high, c.high)
                  dailyZones[etInfo.dateStr].low = Math.min(dailyZones[etInfo.dateStr].low, c.low)
                }
              }
            }
            ctx[zoneKey] = dailyZones
          }
        }
      }

      // Init BR zone state tracker (mutable per-day, updated in onBar)
      if (ruleConfig.conditions.some((c) => c.type === 'br_zone')) {
        ctx.brState = {}  // dateStr → { brokeUp, brokeDown, retested }
      }

      // Precompute session-start index per candle for daily VWAP
      if (ruleConfig.conditions.some((c) => c.type === 'vwap')) {
        const sessionStart = new Array(candles.length).fill(0)
        let currentDate = null
        let startIdx = 0
        for (let i = 0; i < candles.length; i++) {
          const et = toET(candles[i].time)
          if (et.dateStr !== currentDate) {
            currentDate = et.dateStr
            startIdx = i
          }
          sessionStart[i] = startIdx
        }
        ctx.sessionStart = sessionStart
      }

      return ctx
    },

    onBar(bar, index, candles, context) {
      const { tradeDirection, slPoints, tpPoints, conditions } = ruleConfig
      if (!conditions || conditions.length === 0) return null

      const et = toET(bar.time)
      const barMins = et.hours * 60 + et.minutes

      // Evaluate each condition and combine with AND/OR
      let result = evaluateCondition(conditions[0], bar, index, candles, context, et, barMins)

      for (let i = 1; i < conditions.length; i++) {
        const cond = conditions[i]
        const met = evaluateCondition(cond, bar, index, candles, context, et, barMins)
        if ((cond.connector || 'AND') === 'OR') {
          result = result || met
        } else {
          result = result && met
        }
      }

      if (!result) return null

      // BR zone condition stores its own computed entry/sl/tp in context
      if (context._signalOverride) {
        const override = context._signalOverride
        context._signalOverride = null
        return { ...override, reason: buildReasonString(conditions) }
      }

      const sl = slPoints || 10
      const tp = tpPoints || 20

      // For BOTH direction, emit LONG (engine handles one trade at a time)
      const side = tradeDirection === 'SHORT' ? 'SHORT' : 'LONG'

      return {
        side,
        entry: bar.close,
        sl: side === 'LONG' ? bar.close - sl : bar.close + sl,
        tp: side === 'LONG' ? bar.close + tp : bar.close - tp,
        reason: buildReasonString(conditions),
      }
    },
  }

  function evaluateCondition(cond, bar, index, candles, context, et, barMins) {
    switch (cond.type) {
      case 'ema_cross': {
        if (index < 1) return false
        const key = `${cond.maType || 'EMA'}_${cond.period}`
        const maArr = context[key]
        if (!maArr) return false
        const prevMA = maArr[index - 1]
        const curMA = maArr[index]
        if (prevMA == null || curMA == null) return false
        const prevClose = candles[index - 1].close
        const curClose = bar.close
        return cond.direction === 'above'
          ? prevClose <= prevMA && curClose > curMA
          : prevClose >= prevMA && curClose < curMA
      }

      case 'time_window': {
        const start = timeToMinutes(cond.start)
        const end = timeToMinutes(cond.end)
        return barMins >= start && barMins <= end
      }

      case 'rsi': {
        if (index < (cond.period || 14)) return false
        const rsi = computeRSI(candles, cond.period || 14, index)
        return cond.operator === 'below'
          ? rsi < (cond.threshold ?? 30)
          : rsi > (cond.threshold ?? 70)
      }

      case 'vwap': {
        const startIdx = context.sessionStart?.[index] ?? 0
        const vwap = computeVWAP(candles, startIdx, index)
        if (cond.operator === 'above') return bar.close > vwap
        if (cond.operator === 'below') return bar.close < vwap
        if (index < 1) return false
        const prevVwap = computeVWAP(candles, context.sessionStart?.[index - 1] ?? 0, index - 1)
        const prevClose = candles[index - 1].close
        if (cond.operator === 'crosses_above') return prevClose <= prevVwap && bar.close > vwap
        if (cond.operator === 'crosses_below') return prevClose >= prevVwap && bar.close < vwap
        return false
      }

      case 'zone_time': {
        const zoneKey = `zone_${cond.startTime}_${cond.endTime}`
        const zone = context[zoneKey]?.[et.dateStr]
        if (!zone) return false
        return bar.close >= zone.low && bar.close <= zone.high
      }

      case 'zone_manual': {
        const h = Number(cond.high) || 0
        const l = Number(cond.low) || 0
        if (h <= l) return false
        return bar.close >= l && bar.close <= h
      }

      case 'br_zone': {
        const zoneKey = `zone_${cond.startTime}_${cond.endTime}`
        const zone = context[zoneKey]?.[et.dateStr]
        if (!zone) return false

        // Only fire after the zone window has closed
        const endMins = timeToMinutes(cond.endTime)
        if (barMins < endMins) return false

        // Init per-day state
        if (!context.brState[et.dateStr]) {
          context.brState[et.dateStr] = { brokeUp: false, brokeDown: false, retested: false }
        }
        const state = context.brState[et.dateStr]

        // Already traded this zone today
        if (state.retested) return false

        const mid = (zone.high + zone.low) / 2
        const rrRatio = cond.rrRatio || 3

        // Detect initial breakout (no signal on the same bar, just record it)
        if (!state.brokeUp && !state.brokeDown) {
          if (bar.close > zone.high) { state.brokeUp = true }
          else if (bar.close < zone.low) { state.brokeDown = true }
          return false
        }

        // After bullish breakout — watch for retest (bar touches back into zone)
        if (state.brokeUp && bar.low <= zone.high) {
          state.retested = true
          const risk = mid - zone.low
          context._signalOverride = {
            side: 'LONG',
            entry: mid,
            sl: zone.low,
            tp: mid + rrRatio * risk,
          }
          return true
        }

        // After bearish breakout — watch for retest (bar touches back into zone)
        if (state.brokeDown && bar.high >= zone.low) {
          state.retested = true
          const risk = zone.high - mid
          context._signalOverride = {
            side: 'SHORT',
            entry: mid,
            sl: zone.high,
            tp: mid - rrRatio * risk,
          }
          return true
        }

        return false
      }

      default:
        return false
    }
  }
}

/**
 * Compute daily B&R zone boxes from a ruleConfig + candles array.
 * Returns array of { top, bot, startTime, label } — one entry per day per br_zone condition.
 * startTime is the first candle in the zone window; box extends to chart right edge.
 */
export function computeBrZones(ruleConfig, candles) {
  if (!ruleConfig?.conditions || !candles?.length) return []
  const zones = []
  for (const cond of ruleConfig.conditions) {
    if (cond.type !== 'br_zone') continue
    const startMins = timeToMinutes(cond.startTime)
    const endMins   = timeToMinutes(cond.endTime)
    const daily = {}
    for (const c of candles) {
      const et = toET(c.time)
      const mins = et.hours * 60 + et.minutes
      if (mins >= startMins && mins < endMins) {
        if (!daily[et.dateStr]) {
          daily[et.dateStr] = { high: c.high, low: c.low, startTime: c.time }
        } else {
          daily[et.dateStr].high = Math.max(daily[et.dateStr].high, c.high)
          daily[et.dateStr].low  = Math.min(daily[et.dateStr].low,  c.low)
        }
      }
    }
    for (const z of Object.values(daily)) {
      zones.push({
        top:       z.high,
        bot:       z.low,
        startTime: z.startTime,
        label:     `B&R ${cond.startTime}`,
      })
    }
  }
  return zones
}
