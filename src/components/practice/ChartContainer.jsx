import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import {
  createChart,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts'
import useStore from '../../store'

// ── SMC detection ─────────────────────────────────────────────────────────────
// Detectors return ACTIVE (unmitigated/unswept) zones only.
// All operate on the last LOOKBACK candles so distant history is ignored.
// Zones include startTime so boxes can be anchored to where they formed.

const LOOKBACK = 200  // max bars to scan — keeps zones relevant to current view

function detectFVGs(candles) {
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

function detectOBs(candles) {
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

function detectLiquidity(candles) {
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

// ── Box Zone Primitive (FVG & OB drawn as canvas rectangles) ─────────────────
// Zones: { type: 'bull'|'bear', top, bot, startTime }

class BoxZoneRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _series: s, _chart: c, _zones: zones } = this._src
    if (!s || !c || !zones.length) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()
      zones.forEach(z => {
        const topY = s.priceToCoordinate(z.top)
        const botY = s.priceToCoordinate(z.bot)
        if (topY == null || botY == null) return

        // X: start at formation candle; extend to right edge of chart
        const rawStartX = ts.timeToCoordinate(z.startTime)
        const startX = rawStartX != null ? Math.max(0, rawStartX) : 0
        const endX   = mediaSize.width + 4

        const y = Math.min(topY, botY)
        const h = Math.max(2, Math.abs(topY - botY))
        const w = endX - startX
        if (w <= 0) return

        const isBull = z.type === 'bull'
        const isOB   = !!z._ob
        const fill   = isOB
          ? (isBull ? 'rgba(251,146,60,0.08)'  : 'rgba(167,139,250,0.08)')
          : (isBull ? 'rgba(34,197,94,0.08)'   : 'rgba(239,68,68,0.08)')
        const border = isOB
          ? (isBull ? 'rgba(251,146,60,0.55)'  : 'rgba(167,139,250,0.55)')
          : (isBull ? 'rgba(34,197,94,0.45)'   : 'rgba(239,68,68,0.45)')

        ctx.fillStyle = fill
        ctx.fillRect(startX, y, w, h)

        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(startX + 0.5, y + 0.5, w, h)
        ctx.setLineDash([])

        // Label inside the box
        ctx.fillStyle = border
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.fillText(z.label ?? (isBull ? 'FVG↑' : 'FVG↓'), startX + 4, y + Math.min(11, h - 2))
      })
    })
  }
}

class BoxZonePaneView {
  constructor(src) { this._renderer = new BoxZoneRenderer(src) }
  renderer() { return this._renderer }
  zOrder()   { return 'bottom' }
}

class BoxZonePrimitive {
  constructor() {
    this._zones   = []
    this._series  = null
    this._chart   = null
    this._request = null
    this._views   = [new BoxZonePaneView(this)]
  }
  attached({ series, chart, requestUpdate }) {
    this._series  = series
    this._chart   = chart
    this._request = requestUpdate
  }
  detached() { this._series = null; this._chart = null; this._request = null }
  updateZones(zones) { this._zones = zones; this._request?.() }
  paneViews()       { return this._views }
  updateAllViews()  {}
}

// ── Session helpers ───────────────────────────────────────────────────────────
const SESSION_DEFS = {
  asia:   { startH: 0,  startM: 0,  endH: 9,  endM: 0,  color: 'rgba(30,100,210,0.10)',  labelColor: 'rgba(56,140,240,0.30)',  label: 'Asia'     },
  london: { startH: 7,  startM: 0,  endH: 16, endM: 0,  color: 'rgba(100,110,30,0.12)',  labelColor: 'rgba(170,180,40,0.28)',  label: 'London'   },
  ny:     { startH: 12, startM: 0,  endH: 21, endM: 0,  color: 'rgba(100,110,30,0.12)',  labelColor: 'rgba(170,180,40,0.28)',  label: 'New York' },
}

function buildSessionZones(candles, sessions) {
  const active = Object.keys(SESSION_DEFS).filter(k => sessions[k])
  if (!active.length || !candles.length) return []

  // Unique UTC days present in candle data
  const days = [...new Set(candles.map(c => {
    const d = new Date(c.time * 1000)
    return `${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()}`
  }))]

  const zones = []
  days.forEach(dayStr => {
    const [y, m, d] = dayStr.split(',').map(Number)
    active.forEach(key => {
      const def = SESSION_DEFS[key]
      const windowStart = Math.floor(Date.UTC(y, m, d, def.startH, def.startM) / 1000)
      const windowEnd   = Math.floor(Date.UTC(y, m, d, def.endH,   def.endM)   / 1000)

      // Collect actual candles inside this session window
      const sc = candles.filter(c => c.time >= windowStart && c.time <= windowEnd)
      if (!sc.length) return

      // Use real candle timestamps — timeToCoordinate always resolves these.
      // Avoids null coords when the session boundary falls in a data gap
      // (e.g. NY 21:00 UTC lands exactly on the CME maintenance break).
      zones.push({
        startTime:  sc[0].time,
        endTime:    sc[sc.length - 1].time,
        color:      def.color,
        labelColor: def.labelColor,
        label:      def.label,
      })
    })
  })
  return zones
}

function calcSessionHL(candles, sessions) {
  const hlActive = Object.keys(SESSION_DEFS).filter(k => sessions[k] && sessions[k + 'HL'])
  if (!hlActive.length || !candles.length) return []

  // Only last 2 days — beyond that the H/L lines get noisy
  const days = [...new Set(candles.map(c => {
    const d = new Date(c.time * 1000)
    return `${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()}`
  }))].slice(-2)

  const levels = []
  days.forEach(dayStr => {
    const [y, m, d] = dayStr.split(',').map(Number)
    hlActive.forEach(key => {
      const def = SESSION_DEFS[key]
      const startTs = Math.floor(Date.UTC(y, m, d, def.startH, def.startM) / 1000)
      const endTs   = Math.floor(Date.UTC(y, m, d, def.endH,   def.endM)   / 1000)
      const sc = candles.filter(c => c.time >= startTs && c.time < endTs)
      if (!sc.length) return
      levels.push({ price: Math.max(...sc.map(c => c.high)), color: def.labelColor, title: `${def.label} H` })
      levels.push({ price: Math.min(...sc.map(c => c.low)),  color: def.labelColor, title: `${def.label} L` })
    })
  })
  return levels
}

// ── Vertical Band Primitive (session backgrounds) ─────────────────────────────
class VerticalBandRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _chart: c, _zones: zones } = this._src
    if (!c || !zones.length) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()
      zones.forEach(z => {
        const x1 = ts.timeToCoordinate(z.startTime)
        const x2 = ts.timeToCoordinate(z.endTime)
        if (x1 == null || x2 == null) return

        const left  = Math.max(0, x1)
        const right = Math.min(mediaSize.width, x2)
        const w = right - left
        if (w <= 0) return

        ctx.fillStyle = z.color
        ctx.fillRect(left, 0, w, mediaSize.height)

        // Large centered watermark label
        ctx.fillStyle = z.labelColor
        ctx.font = 'bold 42px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(z.label, left + w / 2, mediaSize.height * 0.62)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      })
    })
  }
}

class VerticalBandPaneView {
  constructor(src) { this._renderer = new VerticalBandRenderer(src) }
  renderer() { return this._renderer }
  zOrder()   { return 'bottom' }
}

class VerticalBandPrimitive {
  constructor() {
    this._zones  = []
    this._chart  = null
    this._request = null
    this._views  = [new VerticalBandPaneView(this)]
  }
  attached({ chart, requestUpdate }) { this._chart = chart; this._request = requestUpdate }
  detached() { this._chart = null; this._request = null }
  updateZones(zones) { this._zones = zones; this._request?.() }
  paneViews()      { return this._views }
  updateAllViews() {}
}

// ── Chart theme ───────────────────────────────────────────────────────────────
const CHART_OPTIONS = {
  layout: {
    background: { color: '#0c0e16' },
    textColor: '#5a6080',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#141826', style: LineStyle.Solid },
    horzLines: { color: '#141826', style: LineStyle.Solid },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a2340' },
    horzLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a2340' },
  },
  timeScale: {
    borderColor: '#1c1f2e',
    timeVisible: true,
    secondsVisible: false,
    borderVisible: true,
  },
  rightPriceScale: { borderColor: '#1c1f2e', borderVisible: true },
  handleScale: { axisPressedMouseMove: true },
}

const DRAG_THRESHOLD = 14 // px from line centre to grab — larger = easier

export default function ChartContainer({
  candles,
  replayIndex,
  isLive,
  playing,              // bool — replay is playing (drives tick animation)
  speed,                // number — replay speed (drives tick interval)
  pointValue,           // number — $ per point (50 for ES, 5 for MES)
  orderMode,            // null | 'LONG' | 'SHORT' — cursor intent
  pendingOrder,         // { side, orderType, entry, stopTrigger?, tp, sl } | null
  activeOrder,          // confirmed + filled order being tracked for TP/SL
  awaitingFill,         // confirmed but not yet filled (limit/stop pending entry)
  onChartClick,         // (price: number) => void
  onUpdateOrder,        // ({ tp?, sl? }) => void  — updates pendingOrder
  onUpdateActiveOrder,  // ({ tp?, sl? }) => void  — updates activeOrder
  onTickPrice,          // (price: number) => void — called on each tick with simulated close
}) {
  const mainElRef   = useRef(null)
  const chartRef    = useRef(null)
  const seriesRef   = useRef({})
  const fvgPrimRef     = useRef(null)
  const obPrimRef      = useRef(null)
  const sessionPrimRef = useRef(null)
  const orderLinesRef  = useRef({ entry: null, tp: null, sl: null, trigger: null })
  const draggingRef    = useRef(null)
  const pendingOrderRef = useRef(pendingOrder)
  const onUpdateOrderRef = useRef(onUpdateOrder)
  const tickRef              = useRef({ close: null, high: null, low: null, barTime: null })
  const activeOrderRef       = useRef(activeOrder)
  const onUpdateActiveOrderRef = useRef(onUpdateActiveOrder)
  const onTickPriceRef = useRef(onTickPrice)
  const [hoverLine, setHoverLine] = useState(null)   // 'tp' | 'sl' | null — for cursor
  const [dragDisplay, setDragDisplay] = useState(null) // { pts, dollars, y } — shown while dragging

  const smcLayers  = useStore(s => s.smcLayers)
  const sessions   = useStore(s => s.sessions)

  const visibleCandles = useMemo(
    () => (replayIndex > 0 ? candles.slice(0, replayIndex) : candles),
    [candles, replayIndex]
  )

  // ── Mount chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mainElRef.current) return

    const chart = createChart(mainElRef.current, {
      ...CHART_OPTIONS,
      width:  mainElRef.current.clientWidth,
      height: mainElRef.current.clientHeight || 420,
    })
    chartRef.current = chart

    // ── ET 12-hour time display ───────────────────────────────────────────────
    // All timestamps are UTC; display converted to America/New_York (handles DST)
    const toET = (ts, opts) =>
      new Date(ts * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts })

    chart.applyOptions({
      localization: {
        timeFormatter: (ts) => toET(ts, {
          month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
      },
    })

    chart.timeScale().applyOptions({
      tickMarkFormatter: (ts, tickMarkType) => {
        // TickMarkType: 0=Year 1=Month 2=DayOfMonth 3=Time 4=TimeWithSeconds
        if (tickMarkType === 0) return toET(ts, { year: 'numeric' })
        if (tickMarkType === 1) return toET(ts, { month: 'short', year: 'numeric' })
        if (tickMarkType === 2) return toET(ts, { month: 'short', day: 'numeric' })
        return toET(ts, { hour: 'numeric', minute: '2-digit', hour12: true })
      },
    })

    seriesRef.current.candles = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    })

    // Attach SMC box primitives + session band primitive to the candle series
    fvgPrimRef.current     = new BoxZonePrimitive()
    obPrimRef.current      = new BoxZonePrimitive()
    sessionPrimRef.current = new VerticalBandPrimitive()
    seriesRef.current.candles.attachPrimitive(fvgPrimRef.current)
    seriesRef.current.candles.attachPrimitive(obPrimRef.current)
    seriesRef.current.candles.attachPrimitive(sessionPrimRef.current)

    const ro = new ResizeObserver(() => {
      if (mainElRef.current) chart.applyOptions({ width: mainElRef.current.clientWidth, height: mainElRef.current.clientHeight || 420 })
    })
    ro.observe(mainElRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [])

  // ── Chart click → place order ────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const handler = (param) => {
      if (!param.point || !onChartClick) return
      // Only fire when in order placement mode
      if (!orderMode) return
      const price = seriesRef.current.candles?.coordinateToPrice(param.point.y)
      if (price != null) onChartClick(+price.toFixed(2))
    }

    chart.subscribeClick(handler)
    return () => chart.unsubscribeClick(handler)
  }, [orderMode, onChartClick])

  // ── Order price lines (pending & active) ──────────────────────────────────
  useEffect(() => {
    const cs = seriesRef.current.candles
    if (!cs) return

    // Remove old lines
    const ol = orderLinesRef.current
    if (ol.entry)   try { cs.removePriceLine(ol.entry)   } catch {}
    if (ol.tp)      try { cs.removePriceLine(ol.tp)      } catch {}
    if (ol.sl)      try { cs.removePriceLine(ol.sl)      } catch {}
    if (ol.trigger) try { cs.removePriceLine(ol.trigger) } catch {}
    orderLinesRef.current = { entry: null, tp: null, sl: null, trigger: null }

    // Awaiting fill — show pending entry line only
    if (awaitingFill && !pendingOrder && !activeOrder) {
      const aColor = 'rgba(79,142,247,0.5)'
      const label = awaitingFill.orderType === 'limit'      ? `LIMIT ${awaitingFill.side} @ ${awaitingFill.entry.toFixed(2)}`
                  : awaitingFill.orderType === 'stop'       ? `STOP ${awaitingFill.side} @ ${awaitingFill.entry.toFixed(2)}`
                  : `STOP-LMT ${awaitingFill.side}`

      orderLinesRef.current.entry = cs.createPriceLine({
        price: awaitingFill.entry,
        color: aColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: label,
      })
      if (awaitingFill.orderType === 'stop_limit' && awaitingFill.stopTrigger != null) {
        orderLinesRef.current.trigger = cs.createPriceLine({
          price: awaitingFill.stopTrigger,
          color: 'rgba(245,158,11,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `TRIGGER @ ${awaitingFill.stopTrigger.toFixed(2)}`,
        })
      }
      // Also show TP/SL as faint guides
      orderLinesRef.current.tp = cs.createPriceLine({ price: awaitingFill.tp, color: 'rgba(34,197,94,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      orderLinesRef.current.sl = cs.createPriceLine({ price: awaitingFill.sl, color: 'rgba(239,68,68,0.3)',  lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      return
    }

    const order = pendingOrder || activeOrder
    if (!order) return

    const entryColor = '#4f8ef7'
    const tpColor    = '#22c55e'
    const slColor    = '#ef4444'

    orderLinesRef.current.entry = cs.createPriceLine({
      price: order.entry,
      color: entryColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: `${order.side} @ ${order.entry.toFixed(2)}`,
    })
    // For stop-limit: also show the trigger line
    if (order.orderType === 'stop_limit' && order.stopTrigger != null) {
      orderLinesRef.current.trigger = cs.createPriceLine({
        price: order.stopTrigger,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `TRIGGER @ ${order.stopTrigger.toFixed(2)}`,
      })
    }
    orderLinesRef.current.tp = cs.createPriceLine({
      price: order.tp,
      color: tpColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `TP ${order.tp.toFixed(2)}`,
    })
    orderLinesRef.current.sl = cs.createPriceLine({
      price: order.sl,
      color: slColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `SL ${order.sl.toFixed(2)}`,
    })
  }, [pendingOrder, activeOrder, awaitingFill])

  // ── Update price lines when order changes ─────────────────────────────────
  useEffect(() => {
    const ol = orderLinesRef.current
    const order = pendingOrder || activeOrder
    if (!order) return
    if (ol.tp)      ol.tp.applyOptions({ price: order.tp, title: `TP ${order.tp.toFixed(2)}` })
    if (ol.sl)      ol.sl.applyOptions({ price: order.sl, title: `SL ${order.sl.toFixed(2)}` })
    if (ol.entry)   ol.entry.applyOptions({ price: order.entry, title: `${order.side} @ ${order.entry.toFixed(2)}` })
    if (ol.trigger && order.stopTrigger != null) ol.trigger.applyOptions({ price: order.stopTrigger, title: `TRIGGER @ ${order.stopTrigger.toFixed(2)}` })
  }, [pendingOrder?.tp, pendingOrder?.sl, pendingOrder?.entry, pendingOrder?.stopTrigger, activeOrder?.tp, activeOrder?.sl])

  // Keep refs in sync so document listeners always see fresh values
  useEffect(() => { pendingOrderRef.current       = pendingOrder       }, [pendingOrder])
  useEffect(() => { onUpdateOrderRef.current      = onUpdateOrder      }, [onUpdateOrder])
  useEffect(() => { activeOrderRef.current        = activeOrder        }, [activeOrder])
  useEffect(() => { onUpdateActiveOrderRef.current = onUpdateActiveOrder }, [onUpdateActiveOrder])
  useEffect(() => { onTickPriceRef.current = onTickPrice }, [onTickPrice])

  // Always-current ref to visible candles — lets the tick interval read the
  // latest bar without needing visibleCandles in its dependency array (which
  // caused the interval to restart on every poll cycle, creating a race where
  // a stale update() fired after setData() and crashed lightweight-charts).
  const visibleCandlesRef = useRef(visibleCandles)
  useEffect(() => { visibleCandlesRef.current = visibleCandles }, [visibleCandles])

  // ── Intra-candle tick simulation ──────────────────────────────────────────
  // Runs a single persistent interval; reads the latest bar from the ref each
  // tick so it always works on current data without restarting on every poll.
  useEffect(() => {
    const shouldTick = playing || isLive
    if (!shouldTick) {
      // Restore actual OHLC when paused/stopped
      const cs  = seriesRef.current.candles
      const vc  = visibleCandlesRef.current
      if (cs && vc.length) {
        const bar = vc[vc.length - 1]
        try { cs.update({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }) } catch {}
      }
      tickRef.current = { close: null, high: null, low: null, barTime: null }
      return
    }

    const tickMs = Math.max(40, 300 / Math.max(0.5, speed || 1))

    const id = setInterval(() => {
      const cs = seriesRef.current.candles
      const vc = visibleCandlesRef.current
      if (!cs || !vc.length) return

      const bar = vc[vc.length - 1]

      // Reset tick state when bar advances (new candle)
      if (tickRef.current.barTime !== bar.time) {
        tickRef.current = { close: bar.open, high: bar.open, low: bar.open, barTime: bar.time }
      }

      const t      = tickRef.current
      const target = bar.close
      const drift  = (target - t.close) * 0.12
      const noise  = (Math.random() - 0.5) * 0.6
      const newClose = +Math.max(bar.low, Math.min(bar.high, t.close + drift + noise)).toFixed(2)
      const newHigh  = Math.max(t.high, newClose)
      const newLow   = Math.min(t.low,  newClose)
      tickRef.current = { ...t, close: newClose, high: newHigh, low: newLow }

      try {
        cs.update({ time: bar.time, open: bar.open, high: newHigh, low: newLow, close: newClose })
        onTickPriceRef.current?.(newClose)
      } catch {
        // Ignore stale-bar errors — next tick will re-sync
      }
    }, tickMs)

    return () => clearInterval(id)
  }, [playing, isLive, speed])  // ← no visibleCandles dep — reads via ref

  // ── Mouse drag for TP/SL ──────────────────────────────────────────────────
  // Uses clientY + bounding rect so coordinates stay accurate regardless of
  // which child element the cursor happens to be over. Document-level listeners
  // ensure drag continues even when mouse leaves the chart div.
  function chartY(clientY) {
    if (!mainElRef.current) return null
    const rect = mainElRef.current.getBoundingClientRect()
    return clientY - rect.top
  }

  function priceAt(clientY) {
    const y = chartY(clientY)
    if (y == null) return null
    return seriesRef.current.candles?.coordinateToPrice(y) ?? null
  }

  const handleMouseDown = useCallback((e) => {
    // Use whichever order is currently active (pending takes priority)
    const order  = pendingOrderRef.current || activeOrderRef.current
    const isPending = !!pendingOrderRef.current
    if (!order || !seriesRef.current.candles) return

    const cs = seriesRef.current.candles
    const y = chartY(e.clientY)
    if (y == null) return

    const tpCoord = cs.priceToCoordinate(order.tp)
    const slCoord = cs.priceToCoordinate(order.sl)

    let target = null
    if (tpCoord != null && Math.abs(y - tpCoord) <= DRAG_THRESHOLD) target = 'tp'
    else if (slCoord != null && Math.abs(y - slCoord) <= DRAG_THRESHOLD) target = 'sl'
    if (!target) return

    draggingRef.current = target
    e.preventDefault()
    e.stopPropagation()

    chartRef.current?.applyOptions({ handleScroll: false, handleScale: false })

    function onMove(ev) {
      const price = priceAt(ev.clientY)
      if (price == null) return
      const p = +price.toFixed(2)

      // Route update to the right order
      const cb = isPending ? onUpdateOrderRef.current : onUpdateActiveOrderRef.current
      if (draggingRef.current === 'tp') cb?.({ tp: p })
      if (draggingRef.current === 'sl') cb?.({ sl: p })

      // Distance label
      const cur = isPending ? pendingOrderRef.current : activeOrderRef.current
      if (cur) {
        const pts = Math.abs(p - cur.entry)
        const pv  = pointValue ?? 50
        setDragDisplay({
          label:   draggingRef.current === 'tp' ? 'TP' : 'SL',
          pts:     +pts.toFixed(2),
          dollars: Math.round(pts * pv),
          y:       chartY(ev.clientY) ?? 0,
        })
      }
    }

    function onUp() {
      draggingRef.current = null
      setDragDisplay(null)
      chartRef.current?.applyOptions({ handleScroll: true, handleScale: true })
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, []) // no deps — uses refs only

  // Hover detection: change cursor when near any draggable TP/SL line
  const handleMouseMove = useCallback((e) => {
    if (draggingRef.current) return
    const order = pendingOrderRef.current || activeOrderRef.current
    if (!order || !seriesRef.current.candles) { setHoverLine(null); return }

    const cs = seriesRef.current.candles
    const y = chartY(e.clientY)
    if (y == null) { setHoverLine(null); return }

    const tpCoord = cs.priceToCoordinate(order.tp)
    const slCoord = cs.priceToCoordinate(order.sl)

    if (tpCoord != null && Math.abs(y - tpCoord) <= DRAG_THRESHOLD) setHoverLine('tp')
    else if (slCoord != null && Math.abs(y - slCoord) <= DRAG_THRESHOLD) setHoverLine('sl')
    else setHoverLine(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverLine(null)
  }, [])

  // ── Feed candle data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current.candles || !visibleCandles.length) return
    seriesRef.current.candles.setData(visibleCandles)
  }, [visibleCandles])

  // ── SMC overlays ─────────────────────────────────────────────────────────────
  // FVG and OB use canvas box primitives (start at formation candle, extend right).
  // Liquidity uses price lines (single price level, no start/end concept).
  useEffect(() => {
    const cs = seriesRef.current.candles
    if (!cs || !visibleCandles.length) return

    // ── FVG boxes ─────────────────────────────────────────────────────────────
    fvgPrimRef.current?.updateZones(
      smcLayers.fvg
        ? detectFVGs(visibleCandles).map(z => ({ ...z, label: z.type === 'bull' ? 'FVG↑' : 'FVG↓' }))
        : []
    )

    // ── OB boxes (orange=bull, purple=bear) ───────────────────────────────────
    if (smcLayers.ob) {
      obPrimRef.current?.updateZones(
        detectOBs(visibleCandles).map(ob => ({
          type: ob.type,
          top: ob.high, bot: ob.low,
          startTime: ob.startTime,
          label: ob.type === 'bull' ? 'OB↑' : 'OB↓',
          // Override colors via a flag — renderer checks this
          _bull: ob.type === 'bull',
          _ob: true,
        }))
      )
    } else {
      obPrimRef.current?.updateZones([])
    }

    // ── Liquidity price lines (sweep levels, no box needed) ───────────────────
    if (seriesRef.current._liqLines) {
      seriesRef.current._liqLines.forEach(l => { try { cs.removePriceLine(l) } catch {} })
    }
    seriesRef.current._liqLines = smcLayers.liq
      ? detectLiquidity(visibleCandles).map(lv =>
          cs.createPriceLine({ price: lv.price, color: 'rgba(245,158,11,0.5)', lineWidth: 1, lineStyle: LineStyle.Dotted, title: lv.type === 'high' ? 'BSL' : 'SSL', axisLabelVisible: false })
        )
      : []
  }, [visibleCandles, smcLayers])

  // ── Session bands + H/L ──────────────────────────────────────────────────────
  useEffect(() => {
    const cs = seriesRef.current.candles
    if (!cs || !visibleCandles.length) return

    // Background bands via primitive
    sessionPrimRef.current?.updateZones(buildSessionZones(visibleCandles, sessions))

    // H/L price lines — remove previous first
    if (seriesRef.current._sessionHLLines) {
      seriesRef.current._sessionHLLines.forEach(l => { try { cs.removePriceLine(l) } catch {} })
    }
    seriesRef.current._sessionHLLines = calcSessionHL(visibleCandles, sessions).map(lv =>
      cs.createPriceLine({
        price: lv.price,
        color: lv.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: lv.title,
      })
    )
  }, [visibleCandles, sessions])

  const cursor = orderMode ? 'crosshair' : hoverLine ? 'ns-resize' : 'default'

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={mainElRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Placement hint */}
      {orderMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: orderMode === 'LONG' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
          border: `1px solid ${orderMode === 'LONG' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: orderMode === 'LONG' ? '#22c55e' : '#ef4444',
          padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
          pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          Click chart to place {orderMode} entry
        </div>
      )}

      {/* Drag hint for TP/SL */}
      {pendingOrder && !orderMode && !dragDisplay && (
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: '10px', color: 'var(--muted)', pointerEvents: 'none',
          background: 'rgba(8,9,13,0.8)', padding: '3px 8px', borderRadius: '4px',
        }}>
          Drag TP/SL lines to adjust
        </div>
      )}

      {/* Drag distance label — appears next to the line being dragged */}
      {dragDisplay && (
        <div style={{
          position: 'absolute',
          top: Math.max(4, dragDisplay.y - 28),
          left: '50%',
          transform: 'translateX(-50%)',
          background: dragDisplay.label === 'TP' ? 'rgba(22,163,74,0.9)' : 'rgba(220,38,38,0.9)',
          border: `1px solid ${dragDisplay.label === 'TP' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}`,
          color: '#fff',
          padding: '4px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
        }}>
          {dragDisplay.label}  {dragDisplay.pts.toFixed(2)} pts  ·  ${dragDisplay.dollars.toLocaleString()}
        </div>
      )}

      {!isLive && !orderMode && (
        <div style={{ position: 'absolute', top: 8, right: 10, zIndex: 5, pointerEvents: 'none' }}>
          <span className="data-badge data-sim">Sim</span>
        </div>
      )}
    </div>
  )
}
