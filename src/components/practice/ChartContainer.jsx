import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import {
  createChart,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts'
import useStore from '../../store'
import { DrawingLayerPrimitive } from './drawingPrimitives'

// Snap clicked price to the nearest OHLC value of the nearest candle (magnet mode)
function snapToOHLC(candles, clickedTime, clickedPrice) {
  if (!candles.length) return +clickedPrice.toFixed(2)
  const nearest = candles.reduce((best, c) =>
    Math.abs(c.time - clickedTime) < Math.abs(best.time - clickedTime) ? c : best
  )
  const ohlc = [nearest.open, nearest.high, nearest.low, nearest.close]
  const snapped = ohlc.reduce((best, p) =>
    Math.abs(p - clickedPrice) < Math.abs(best - clickedPrice) ? p : best
  )
  return +snapped.toFixed(2)
}

// ── Drawing hit-test helpers ───────────────────────────────────────────────────
const HIT_PX = 10

function dist2D(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

function segmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  if (dx === 0 && dy === 0) return dist2D(px, py, x1, y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return dist2D(px, py, x1 + t * dx, y1 + t * dy)
}

// Returns hit mode string or null.
// Modes: 'move' | 'p1' | 'p2' | 'corner-11' | 'corner-22' | 'corner-12' | 'corner-21'
function hitTestDrawing(d, mx, my, cs, ts) {
  if (d.type === 'hline') {
    const y = cs.priceToCoordinate(d.price)
    if (y == null) return null
    return Math.abs(my - y) <= HIT_PX ? 'move' : null
  }
  if (d.type === 'line') {
    const x1 = ts.timeToCoordinate(d.p1.time), y1 = cs.priceToCoordinate(d.p1.price)
    const x2 = ts.timeToCoordinate(d.p2.time), y2 = cs.priceToCoordinate(d.p2.price)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return null
    if (dist2D(mx, my, x1, y1) <= HIT_PX) return 'p1'
    if (dist2D(mx, my, x2, y2) <= HIT_PX) return 'p2'
    if (segmentDist(mx, my, x1, y1, x2, y2) <= HIT_PX) return 'move'
    return null
  }
  if (d.type === 'box') {
    const x1 = ts.timeToCoordinate(d.p1.time), y1 = cs.priceToCoordinate(d.p1.price)
    const x2 = ts.timeToCoordinate(d.p2.time), y2 = cs.priceToCoordinate(d.p2.price)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return null
    if (dist2D(mx, my, x1, y1) <= HIT_PX) return 'corner-11'
    if (dist2D(mx, my, x2, y2) <= HIT_PX) return 'corner-22'
    if (dist2D(mx, my, x1, y2) <= HIT_PX) return 'corner-12'
    if (dist2D(mx, my, x2, y1) <= HIT_PX) return 'corner-21'
    const left = Math.min(x1, x2), right = Math.max(x1, x2)
    const top  = Math.min(y1, y2), bot   = Math.max(y1, y2)
    if (mx >= left && mx <= right && my >= top && my <= bot) return 'move'
    return null
  }
  return null
}

// Compute the drawing patch for a given drag mode + current mouse position
function applyDragPatch(orig, mode, nx, ny, dxPx, dyPx, cs, ts) {
  if (orig.type === 'hline') {
    const p = cs.coordinateToPrice(ny)
    return p != null ? { price: +p.toFixed(2) } : null
  }
  if (orig.type === 'line' || orig.type === 'box') {
    if (mode === 'p1' || mode === 'corner-11') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p1: { time: t, price: +p.toFixed(2) } } : null
    }
    if (mode === 'p2' || mode === 'corner-22') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p2: { time: t, price: +p.toFixed(2) } } : null
    }
    if (mode === 'corner-12') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p1: { ...orig.p1, time: t }, p2: { ...orig.p2, price: +p.toFixed(2) } } : null
    }
    if (mode === 'corner-21') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p2: { ...orig.p2, time: t }, p1: { ...orig.p1, price: +p.toFixed(2) } } : null
    }
    if (mode === 'move') {
      const ox1 = ts.timeToCoordinate(orig.p1.time), oy1 = cs.priceToCoordinate(orig.p1.price)
      const ox2 = ts.timeToCoordinate(orig.p2.time), oy2 = cs.priceToCoordinate(orig.p2.price)
      if (ox1 == null || oy1 == null || ox2 == null || oy2 == null) return null
      const t1 = ts.coordinateToTime(ox1 + dxPx), p1 = cs.coordinateToPrice(oy1 + dyPx)
      const t2 = ts.coordinateToTime(ox2 + dxPx), p2 = cs.coordinateToPrice(oy2 + dyPx)
      return (t1 && p1 != null && t2 && p2 != null)
        ? { p1: { time: t1, price: +p1.toFixed(2) }, p2: { time: t2, price: +p2.toFixed(2) } }
        : null
    }
  }
  return null
}

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
        const isBR   = !!z._brStrategy
        const fill   = isBR
          ? 'rgba(250,204,21,0.06)'
          : isOB
            ? (isBull ? 'rgba(251,146,60,0.08)'  : 'rgba(167,139,250,0.08)')
            : (isBull ? 'rgba(34,197,94,0.08)'   : 'rgba(239,68,68,0.08)')
        const border = isBR
          ? 'rgba(250,204,21,0.50)'
          : isOB
            ? (isBull ? 'rgba(251,146,60,0.55)'  : 'rgba(167,139,250,0.55)')
            : (isBull ? 'rgba(34,197,94,0.45)'   : 'rgba(239,68,68,0.45)')

        ctx.fillStyle = fill
        ctx.fillRect(startX, y, w, h)

        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(startX + 0.5, y + 0.5, w, h)
        ctx.setLineDash([])

        // Midpoint dashed line through box center
        const midY = y + h / 2
        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(startX, midY)
        ctx.lineTo(endX, midY)
        ctx.stroke()
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
  asia:   { startH: 0,  startM: 0,  endH: 7,  endM: 0,  color: 'rgba(30,100,210,0.10)',  labelColor: 'rgba(56,140,240,0.30)',  label: 'Asia'     },
  london: { startH: 7,  startM: 0,  endH: 12, endM: 0,  color: 'rgba(120,80,200,0.10)',  labelColor: 'rgba(167,139,250,0.30)',  label: 'London'   },
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
  onUpdateOrder,          // ({ tp?, sl? }) => void  — updates pendingOrder
  onUpdateActiveOrder,    // ({ tp?, sl? }) => void  — updates activeOrder
  onUpdateAwaitingFill,   // ({ tp?, sl? }) => void  — updates awaitingFill TP/SL
  onTickPrice,            // (price: number) => void — called on each tick with simulated close
  drawingTool,          // null | 'hline' | 'line' | 'box'
  magnetEnabled,        // boolean — snap clicks to OHLC
  onDrawingDone,        // () => void — called after a drawing is placed
}) {
  const mainElRef   = useRef(null)
  const chartRef    = useRef(null)
  const seriesRef   = useRef({})
  const fvgPrimRef        = useRef(null)
  const obPrimRef         = useRef(null)
  const sessionPrimRef    = useRef(null)
  const drawingPrimRef    = useRef(null)
  const brStrategyPrimRef = useRef(null)
  const drawStartRef      = useRef(null)   // { time, price } — first click of line/box
  const orderLinesRef  = useRef({ entry: null, tp: null, sl: null, trigger: null })
  const draggingRef    = useRef(null)
  const pendingOrderRef = useRef(pendingOrder)
  const onUpdateOrderRef = useRef(onUpdateOrder)
  const tickRef              = useRef({ close: null, high: null, low: null, barTime: null })
  const activeOrderRef       = useRef(activeOrder)
  const onUpdateActiveOrderRef = useRef(onUpdateActiveOrder)
  const onTickPriceRef          = useRef(onTickPrice)
  const onUpdateAwaitingFillRef = useRef(onUpdateAwaitingFill)
  const awaitingFillRef         = useRef(awaitingFill)
  const addDrawingRef           = useRef(null)
  const onDrawingDoneRef        = useRef(null)
  const [hoverLine, setHoverLine]       = useState(null)   // 'tp' | 'sl' | null — for cursor
  const [hoverDrawing, setHoverDrawing] = useState(false)  // true when hovering a drawing
  const [dragDisplay, setDragDisplay]   = useState(null)   // { pts, dollars, y } — shown while dragging
  const [selectedDrawingId, setSelectedDrawingId] = useState(null)
  const selectedDrawingIdRef = useRef(null)
  const drawingsRef          = useRef([])
  const drawingDragRef       = useRef(null)
  const updateDrawingRef     = useRef(null)
  const removeDrawingRef     = useRef(null)

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
    fvgPrimRef.current      = new BoxZonePrimitive()
    obPrimRef.current       = new BoxZonePrimitive()
    sessionPrimRef.current  = new VerticalBandPrimitive()
    brStrategyPrimRef.current = new BoxZonePrimitive()
    drawingPrimRef.current  = new DrawingLayerPrimitive()
    seriesRef.current.candles.attachPrimitive(fvgPrimRef.current)
    seriesRef.current.candles.attachPrimitive(obPrimRef.current)
    seriesRef.current.candles.attachPrimitive(sessionPrimRef.current)
    seriesRef.current.candles.attachPrimitive(brStrategyPrimRef.current)
    seriesRef.current.candles.attachPrimitive(drawingPrimRef.current)

    const ro = new ResizeObserver(() => {
      if (mainElRef.current) chart.applyOptions({ width: mainElRef.current.clientWidth, height: mainElRef.current.clientHeight || 420 })
    })
    ro.observe(mainElRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [])

  // ── Chart click → place order OR drawing ────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const handler = (param) => {
      if (!param.point) return
      const cs = seriesRef.current.candles
      if (!cs) return
      const rawPrice = cs.coordinateToPrice(param.point.y)
      if (rawPrice == null) return

      // Drawing tool takes priority over order mode
      if (drawingTool) {
        const snappedPrice = magnetEnabled
          ? snapToOHLC(visibleCandlesRef.current, param.time, rawPrice)
          : +rawPrice.toFixed(2)
        const snappedTime = param.time

        if (drawingTool === 'hline') {
          addDrawingRef.current?.({ id: crypto.randomUUID(), type: 'hline', price: snappedPrice, color: '#4f8ef7' })
          onDrawingDoneRef.current?.()
        } else {
          // line or box: need two clicks
          if (!drawStartRef.current) {
            drawStartRef.current = { time: snappedTime, price: snappedPrice }
          } else {
            addDrawingRef.current?.({
              id: crypto.randomUUID(),
              type: drawingTool,
              p1: drawStartRef.current,
              p2: { time: snappedTime, price: snappedPrice },
              color: '#4f8ef7',
            })
            drawStartRef.current = null
            drawingPrimRef.current?.setPreview(null)
            onDrawingDoneRef.current?.()
          }
        }
        return
      }

      // Existing order placement logic
      if (!orderMode || !onChartClick) return
      onChartClick(+rawPrice.toFixed(2))
    }

    chart.subscribeClick(handler)
    return () => chart.unsubscribeClick(handler)
  }, [orderMode, onChartClick, drawingTool, magnetEnabled])

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
      // Show TP/SL as fully visible draggable lines
      orderLinesRef.current.tp = cs.createPriceLine({ price: awaitingFill.tp, color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `TP ${awaitingFill.tp.toFixed(2)}` })
      orderLinesRef.current.sl = cs.createPriceLine({ price: awaitingFill.sl, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `SL ${awaitingFill.sl.toFixed(2)}` })
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

  // ── Update TP/SL lines while awaiting fill (so drag updates are reflected) ─
  useEffect(() => {
    const ol = orderLinesRef.current
    if (!awaitingFill || pendingOrder || activeOrder) return
    if (ol.tp) ol.tp.applyOptions({ price: awaitingFill.tp, title: `TP ${awaitingFill.tp.toFixed(2)}` })
    if (ol.sl) ol.sl.applyOptions({ price: awaitingFill.sl, title: `SL ${awaitingFill.sl.toFixed(2)}` })
  }, [awaitingFill?.tp, awaitingFill?.sl])

  // Keep refs in sync so document listeners always see fresh values
  useEffect(() => { pendingOrderRef.current        = pendingOrder        }, [pendingOrder])
  useEffect(() => { onUpdateOrderRef.current       = onUpdateOrder       }, [onUpdateOrder])
  useEffect(() => { activeOrderRef.current         = activeOrder         }, [activeOrder])
  useEffect(() => { onUpdateActiveOrderRef.current = onUpdateActiveOrder }, [onUpdateActiveOrder])
  useEffect(() => { onTickPriceRef.current          = onTickPrice          }, [onTickPrice])
  useEffect(() => { onUpdateAwaitingFillRef.current = onUpdateAwaitingFill }, [onUpdateAwaitingFill])
  useEffect(() => { awaitingFillRef.current         = awaitingFill         }, [awaitingFill])
  useEffect(() => { onDrawingDoneRef.current        = onDrawingDone        }, [onDrawingDone])

  // Keep drawing-related refs in sync from store
  const addDrawingFn    = useStore(s => s.addDrawing)
  const updateDrawingFn = useStore(s => s.updateDrawing)
  const removeDrawingFn = useStore(s => s.removeDrawing)
  useEffect(() => { addDrawingRef.current    = addDrawingFn    }, [addDrawingFn])
  useEffect(() => { updateDrawingRef.current = updateDrawingFn }, [updateDrawingFn])
  useEffect(() => { removeDrawingRef.current = removeDrawingFn }, [removeDrawingFn])
  useEffect(() => { selectedDrawingIdRef.current = selectedDrawingId }, [selectedDrawingId])

  // Sync selectedId highlight to primitive
  useEffect(() => {
    drawingPrimRef.current?.setSelectedId(selectedDrawingId)
  }, [selectedDrawingId])

  // Backspace / Delete key removes the selected drawing
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const id = selectedDrawingIdRef.current
      if (!id) return
      e.preventDefault()
      removeDrawingRef.current?.(id)
      setSelectedDrawingId(null)
      drawingPrimRef.current?.setSelectedId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Reset first-click state when drawing tool is cleared
  useEffect(() => {
    if (!drawingTool) {
      drawStartRef.current = null
      drawingPrimRef.current?.setPreview(null)
    }
  }, [drawingTool])

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
    const cs    = seriesRef.current.candles
    const chart = chartRef.current
    if (!cs || !chart) return
    const rect = mainElRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // ── 1. Drawing drag / select (only when no drawing tool is placing) ───────
    if (!drawingToolRef.current) {
      const dl = drawingsRef.current
      const ts = chart.timeScale()
      for (let i = dl.length - 1; i >= 0; i--) {
        const d = dl[i]
        const mode = hitTestDrawing(d, mouseX, mouseY, cs, ts)
        if (!mode) continue

        setSelectedDrawingId(d.id)
        drawingPrimRef.current?.setSelectedId(d.id)
        drawingDragRef.current = {
          id: d.id, mode,
          origDrawing: { ...d, p1: d.p1 ? { ...d.p1 } : undefined, p2: d.p2 ? { ...d.p2 } : undefined },
          startX: mouseX, startY: mouseY,
          currentPatch: null,
        }
        e.preventDefault()
        e.stopPropagation()
        chart.applyOptions({ handleScroll: false, handleScale: false })

        function onMoveDrawing(ev) {
          const drag = drawingDragRef.current
          if (!drag) return
          const nx = ev.clientX - rect.left
          const ny = ev.clientY - rect.top
          const patch = applyDragPatch(drag.origDrawing, drag.mode, nx, ny, nx - drag.startX, ny - drag.startY, cs, ts)
          if (patch) {
            drag.currentPatch = patch
            const updated = { ...drag.origDrawing, ...patch }
            drawingPrimRef.current?.updateDrawings(
              drawingsRef.current.map(dr => dr.id === drag.id ? updated : dr)
            )
          }
        }

        function onUpDrawing() {
          const drag = drawingDragRef.current
          if (drag?.currentPatch) updateDrawingRef.current?.(drag.id, drag.currentPatch)
          drawingDragRef.current = null
          chart.applyOptions({ handleScroll: true, handleScale: true })
          document.removeEventListener('mousemove', onMoveDrawing)
          document.removeEventListener('mouseup', onUpDrawing)
        }

        document.addEventListener('mousemove', onMoveDrawing)
        document.addEventListener('mouseup', onUpDrawing)
        return
      }
      // Clicked empty space → deselect
      setSelectedDrawingId(null)
      drawingPrimRef.current?.setSelectedId(null)
    }

    // ── 2. TP/SL drag ────────────────────────────────────────────────────────
    const order      = pendingOrderRef.current || activeOrderRef.current || awaitingFillRef.current
    const isPending  = !!pendingOrderRef.current
    const isAwaiting = !pendingOrderRef.current && !activeOrderRef.current && !!awaitingFillRef.current
    if (!order) return

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
    chart.applyOptions({ handleScroll: false, handleScale: false })

    function onMove(ev) {
      const price = priceAt(ev.clientY)
      if (price == null) return
      const p = +price.toFixed(2)

      const cb = isPending  ? onUpdateOrderRef.current
               : isAwaiting ? onUpdateAwaitingFillRef.current
               : onUpdateActiveOrderRef.current
      if (draggingRef.current === 'tp') cb?.({ tp: p })
      if (draggingRef.current === 'sl') cb?.({ sl: p })

      const cur = isPending  ? pendingOrderRef.current
                : isAwaiting ? awaitingFillRef.current
                : activeOrderRef.current
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
      chart.applyOptions({ handleScroll: true, handleScale: true })
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, []) // no deps — uses refs only

  // Hover detection: change cursor when near any draggable TP/SL line
  // Also drives drawing preview ghost when placing a line/box second point
  const drawingToolRef   = useRef(drawingTool)
  const magnetEnabledRef = useRef(magnetEnabled)
  useEffect(() => { drawingToolRef.current   = drawingTool   }, [drawingTool])
  useEffect(() => { magnetEnabledRef.current = magnetEnabled }, [magnetEnabled])

  const handleMouseMove = useCallback((e) => {
    if (draggingRef.current) return

    const cs    = seriesRef.current.candles
    const chart = chartRef.current
    const rect  = mainElRef.current?.getBoundingClientRect()
    if (!cs || !chart || !rect) return

    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top
    const tool = drawingToolRef.current

    if (tool) {
      // ── Drawing tool active: show snap ghost on hover ─────────────────────
      const hoveredTime  = chart.timeScale().coordinateToTime(relX)
      const hoveredPrice = cs.coordinateToPrice(relY)
      if (hoveredTime != null && hoveredPrice != null) {
        const snapped = magnetEnabledRef.current
          ? snapToOHLC(visibleCandlesRef.current, hoveredTime, hoveredPrice)
          : +hoveredPrice.toFixed(2)
        if (tool === 'hline') {
          // Always show ghost hline at snapped price
          drawingPrimRef.current?.setPreview({ type: 'hline', price: snapped, color: 'rgba(79,142,247,0.55)' })
        } else if (drawStartRef.current) {
          // After first click: full ghost toward cursor
          drawingPrimRef.current?.setPreview({
            type: tool, p1: drawStartRef.current,
            p2: { time: hoveredTime, price: snapped },
            color: 'rgba(79,142,247,0.8)',
          })
        } else if (magnetEnabledRef.current) {
          // Before first click + magnet on: ghost hline shows snap price
          drawingPrimRef.current?.setPreview({ type: 'hline', price: snapped, color: 'rgba(79,142,247,0.35)' })
        }
      }
      return // Don't run TP/SL hover check while drawing tool is active
    }

    // ── No drawing tool: check if hovering any drawing (for move cursor) ─────
    const dl = drawingsRef.current
    if (dl.length > 0) {
      const ts = chart.timeScale()
      setHoverDrawing(dl.some(d => hitTestDrawing(d, relX, relY, cs, ts) !== null))
    } else {
      setHoverDrawing(false)
    }

    // ── TP/SL hover detection ─────────────────────────────────────────────────
    const order = pendingOrderRef.current || activeOrderRef.current
    if (!order) { setHoverLine(null); return }

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
    setHoverDrawing(false)
    drawingPrimRef.current?.setPreview(null)
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

  // ── User drawings overlay ─────────────────────────────────────────────────────
  const drawings = useStore(s => s.drawings)
  useEffect(() => {
    drawingsRef.current = drawings
    if (!drawingDragRef.current) drawingPrimRef.current?.updateDrawings(drawings)
  }, [drawings])

  // ── 15-min B&R strategy box ───────────────────────────────────────────────────
  // Shows the 8:00–8:15 AM ET range from the most recent NY session.
  // Persists until the next NY session opens (9:30 AM ET next trading day).
  const brStrategy = useStore(s => s.brStrategy)
  useEffect(() => {
    if (!brStrategy) { brStrategyPrimRef.current?.updateZones([]); return }

    // Use ALL candles (not just visible) so the box doesn't disappear when scrolling
    const allCandles = replayIndex > 0 ? candles.slice(0, replayIndex) : candles
    if (!allCandles.length) { brStrategyPrimRef.current?.updateZones([]); return }

    // Helper: get ET offset for a given date (handles DST)
    function getETOffset(y, m, d) {
      const refDate = new Date(Date.UTC(y, m - 1, d, 13, 0, 0))
      const tzPart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', timeZoneName: 'shortOffset',
      }).formatToParts(refDate).find(p => p.type === 'timeZoneName').value
      const etOffsetHours = parseInt(tzPart.replace('GMT', '') || '0')
      return -etOffsetHours * 3600
    }

    // Get unique ET dates from ALL candles, most recent first
    const etDates = [...new Set(allCandles.map(c =>
      new Date(c.time * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    ))].reverse()

    // Current time in seconds (use last candle time for replay, real time for live)
    const nowSecs = replayIndex > 0
      ? allCandles[allCandles.length - 1].time
      : Math.floor(Date.now() / 1000)

    let brBox = null
    for (const dateStr of etDates) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const etOffsetSecs = getETOffset(y, m, d)

      const start800 = Math.floor(Date.UTC(y, m - 1, d, 8, 0, 0) / 1000) + etOffsetSecs
      const start815 = Math.floor(Date.UTC(y, m - 1, d, 8, 15, 0) / 1000) + etOffsetSecs

      // Skip this date if 8:15 AM ET hasn't passed yet — look at a previous day
      if (nowSecs < start815) continue

      // Find candles in the 8:00-8:15 AM ET window from ALL candles
      const windowCandles = allCandles.filter(c => c.time >= start800 && c.time < start815)
      if (windowCandles.length > 0) {
        brBox = {
          top: Math.max(...windowCandles.map(c => c.high)),
          bot: Math.min(...windowCandles.map(c => c.low)),
          startTime: start800,
        }
        break
      }

      // Fallback for large timeframes: candle that contains 8:00 AM ET
      const containing = [...allCandles]
        .filter(c => c.time <= start800)
        .sort((a, b) => b.time - a.time)[0]
      if (containing && containing.time >= start800 - 86400) {
        brBox = { top: containing.high, bot: containing.low, startTime: containing.time }
        break
      }
    }

    brStrategyPrimRef.current?.updateZones(brBox ? [{
      type: 'bull', top: brBox.top, bot: brBox.bot,
      startTime: brBox.startTime, label: 'B&R 8AM', _brStrategy: true,
    }] : [])
  }, [candles, replayIndex, brStrategy])

  const cursor = (drawingTool || orderMode) ? 'crosshair'
    : hoverDrawing ? 'move'
    : hoverLine ? 'ns-resize'
    : 'default'

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
