import { useState, useEffect, useRef } from 'react'
import { buildSimCandles } from '../data/simData'

const cache = new Map()

// Map our UI timeframe labels → Yahoo Finance params
export const TF_CONFIG = {
  '1m':  { yInterval: '1m',  yRange: '5d',  simInterval: 60,    pollMs: 8000,  pollRange: '1d'  },
  '5m':  { yInterval: '5m',  yRange: '5d',  simInterval: 300,   pollMs: 15000, pollRange: '1d'  },
  '15m': { yInterval: '15m', yRange: '5d',  simInterval: 900,   pollMs: 30000, pollRange: '2d'  },
  '30m': { yInterval: '30m', yRange: '60d', simInterval: 1800,  pollMs: 60000, pollRange: '5d'  },
  '1h':  { yInterval: '60m', yRange: '60d', simInterval: 3600,  pollMs: 60000, pollRange: '5d'  },
  '4h':  { yInterval: '60m', yRange: '60d', simInterval: 14400, aggregate: 4,  pollMs: null     },
  '1D':  { yInterval: '1d',  yRange: '2y',  simInterval: 86400, pollMs: null                    },
}

// ── Front-month contract resolution ──────────────────────────────────────────
// Maps generic Yahoo symbols (ES=F) → specific CME contract (ESM26.CME).
// Roll date: third Friday of expiry month (actual contract expiry).
// Quarter codes: H=Mar, M=Jun, U=Sep, Z=Dec
const FUTURES_ROOTS = { 'ES=F': 'ES', 'MES=F': 'MES', 'NQ=F': 'NQ' }
const QUARTERS = [
  { month: 2,  code: 'H' },   // March
  { month: 5,  code: 'M' },   // June
  { month: 8,  code: 'U' },   // September
  { month: 11, code: 'Z' },   // December
]

function getThirdFriday(year, month) {
  let count = 0
  for (let day = 1; day <= 31; day++) {
    const dt = new Date(year, month, day)
    if (dt.getMonth() !== month) break
    if (dt.getDay() === 5) { count++; if (count === 3) return day }
  }
  return 21 // fallback
}

export function getFrontMonthTicker(genericSymbol) {
  const root = FUTURES_ROOTS[genericSymbol]
  if (!root) return genericSymbol

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()  // 0-indexed
  const d = now.getDate()

  for (const q of QUARTERS) {
    const expiry = getThirdFriday(y, q.month)
    if (m < q.month || (m === q.month && d <= expiry)) {
      return `${root}${q.code}${String(y).slice(-2)}.CME`
    }
  }
  // Past December roll → next year's March contract
  return `${root}H${String(y + 1).slice(-2)}.CME`
}

// ── Yahoo response parser ─────────────────────────────────────────────────────
function parseYahooResponse(data) {
  try {
    const result = data.chart.result[0]
    const timestamps = result.timestamp
    const { open, high, low, close, volume } = result.indicators.quote[0]
    return timestamps
      .map((t, i) => ({
        time: t,
        open:   open[i],
        high:   high[i],
        low:    low[i],
        close:  close[i],
        volume: volume[i] || 0,
      }))
      .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)
      .sort((a, b) => a.time - b.time)
  } catch {
    return null
  }
}

// Aggregate 1h candles into 4h candles
function aggregateCandles(candles, n) {
  const out = []
  for (let i = 0; i < candles.length; i += n) {
    const chunk = candles.slice(i, i + n)
    if (chunk.length === 0) continue
    out.push({
      time:   chunk[0].time,
      open:   chunk[0].open,
      high:   Math.max(...chunk.map(c => c.high)),
      low:    Math.min(...chunk.map(c => c.low)),
      close:  chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    })
  }
  return out
}

function mergeCandles(existing, fresh) {
  if (!fresh.length) return existing
  const cutoff = fresh[0].time
  const base   = existing.filter(c => c.time < cutoff)
  return [...base, ...fresh]
}

// Futures trade nearly 24/5 — include pre/post session data.
// Stocks have thin extended-hours volume that causes price spikes.
function isFuturesSymbol(symbol) {
  return symbol.endsWith('=F') || symbol.endsWith('.CME') || symbol.endsWith('.CBT') || symbol.endsWith('.NYB')
}

function buildUrl(symbol, interval, range) {
  const prePost = isFuturesSymbol(symbol) ? '&includePrePost=true' : ''
  return `/api/yahoo/v8/finance/chart/${symbol}?interval=${interval}&range=${range}${prePost}`
}

async function fetchCandles(symbol, interval, range, aggregate) {
  const r    = await fetch(buildUrl(symbol, interval, range))
  const data = await r.json()
  let candles = parseYahooResponse(data)
  if (!candles || candles.length <= 10) return null
  if (aggregate) candles = aggregateCandles(candles, aggregate)
  return candles
}

export function useChartData(symbol = 'ES=F', tf = '5m') {
  const cfg        = TF_CONFIG[tf] || TF_CONFIG['5m']
  const key        = `${symbol}-${tf}`
  const isLiveRef  = useRef(false)
  // The specific contract ticker actually used for fetching (e.g. "ESM26.CME")
  const contractRef = useRef(getFrontMonthTicker(symbol))

  const [state, setState] = useState(() => ({
    candles:  cache.get(key) || buildSimCandles(cfg.simInterval),
    loading:  !cache.has(key),
    isLive:   cache.has(key),
    contract: contractRef.current,
  }))

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    isLiveRef.current  = false
    contractRef.current = getFrontMonthTicker(symbol)

    if (cache.has(key)) {
      setState(prev => ({ ...prev, candles: cache.get(key), loading: false, isLive: true }))
      isLiveRef.current = true
      return
    }

    setState(prev => ({ ...prev, candles: buildSimCandles(cfg.simInterval), loading: true, isLive: false }))

    let cancelled = false

    ;(async () => {
      try {
        const specific = contractRef.current
        let candles = null

        // 1️⃣ Try specific front-month contract (e.g. ESM26.CME) — accurate prices
        candles = await fetchCandles(specific, cfg.yInterval, cfg.yRange, cfg.aggregate)

        // 2️⃣ Fall back to generic continuous (ES=F) if specific fails
        if (!candles && specific !== symbol) {
          candles = await fetchCandles(symbol, cfg.yInterval, cfg.yRange, cfg.aggregate)
          if (candles) contractRef.current = symbol  // note we fell back
        }

        if (cancelled) return

        if (candles) {
          cache.set(key, candles)
          setState({ candles, loading: false, isLive: true, contract: contractRef.current })
          isLiveRef.current = true
        } else {
          // 3️⃣ Sim fallback
          setState({ candles: buildSimCandles(cfg.simInterval), loading: false, isLive: false, contract: contractRef.current })
        }
      } catch {
        if (!cancelled) {
          setState({ candles: buildSimCandles(cfg.simInterval), loading: false, isLive: false, contract: contractRef.current })
        }
      }
    })()

    return () => { cancelled = true }
  }, [key])

  // ── Live polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cfg.pollMs) return

    const id = setInterval(async () => {
      if (!isLiveRef.current) return
      try {
        const pollSymbol = contractRef.current
        let fresh = await fetchCandles(pollSymbol, cfg.yInterval, cfg.pollRange ?? cfg.yRange, cfg.aggregate)
        if (!fresh) return

        setState(prev => {
          if (!prev.isLive) return prev
          const merged = mergeCandles(prev.candles, fresh)
          cache.set(key, merged)
          return { ...prev, candles: merged }
        })
      } catch {
        // Silent — keep existing data
      }
    }, cfg.pollMs)

    return () => clearInterval(id)
  }, [key, cfg.pollMs])

  return state
}
