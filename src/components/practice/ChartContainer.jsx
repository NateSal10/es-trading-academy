import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import {
  createChart,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts'
import useStore from '../../store'
import { DrawingLayerPrimitive } from './drawingPrimitives'
import { detectFVGs, detectOBs, detectLiquidity } from '../../engine/smcDetectors'
import { BoxZonePrimitive, VerticalBandPrimitive } from '../../lib/chart/primitives'
import { SESSION_DEFS, buildSessionZones, calcSessionHL, buildKillZones } from '../../lib/chart/sessionUtils'
import { toET, snapToOHLC, hitTestDrawing, applyDragPatch } from '../../lib/chart/drawingUtils'

// ── RSI calculation (Wilder's smoothed method) ────────────────────────────────
function calculateRSI(candles, period = 14) {
  if (candles.length < period + 1) return []
  const results = []
  let avgGain = 0, avgLoss = 0
  // Seed with first `period` changes
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close
    if (d > 0) avgGain += d
    else avgLoss += Math.abs(d)
  }
  avgGain /= period
  avgLoss /= period
  results.push({ time: candles[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) })
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close
    avgGain = (avgGain * (period - 1) + Math.max(0, d))  / period
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period
    results.push({ time: candles[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) })
  }
  return results
}

const CHART_OPTIONS = {
  layout: {
    background: { color: '#0c0e16' },
    textColor: '#8892b0',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#141826', style: LineStyle.Solid },
    horzLines: { color: '#141826', style: LineStyle.Solid },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a2340', labelVisible: true },
    horzLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a2340', labelVisible: true },
  },
  timeScale: {
    visible: true,
    borderColor: '#1c1f2e',
    timeVisible: true,
    secondsVisible: false,
    borderVisible: true,
    // Set here (not via applyOptions) so LWC uses it before the first render
    tickMarkFormatter: (ts, tickMarkType) => {
      // TickMarkType: 0=Year 1=Month 2=DayOfMonth 3=Time 4=TimeWithSeconds
      if (tickMarkType === 0) return toET(ts, { year: 'numeric' })
      if (tickMarkType === 1) return toET(ts, { month: 'short', year: 'numeric' })
      if (tickMarkType === 2) return toET(ts, { month: 'short', day: 'numeric' })
      return toET(ts, { hour: 'numeric', minute: '2-digit', hour12: true })
    },
  },
  rightPriceScale: { borderColor: '#1c1f2e', borderVisible: true },
  handleScale: { axisPressedMouseMove: true },
}

const DRAG_THRESHOLD = 20 // px from line centre to grab — larger = easier to hit

export default function ChartContainer({
  candles,
  dataKey,
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
  contracts = 1,        // number — contract quantity for label display
  drawingTool,          // null | 'hline' | 'line' | 'box'
  magnetEnabled,        // boolean — snap clicks to OHLC
  onDrawingDone,        // () => void — called after a drawing is placed
}) {
  const containerRef = useRef(null)
  const mainElRef   = useRef(null)
  const rsiElRef    = useRef(null)
  const chartRef    = useRef(null)
  const rsiChartRef  = useRef(null)
  const rsiSeriesRef = useRef(null)
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
  const [crosshairTime, setCrosshairTime] = useState(null) // { x, label } — TV-style time tooltip
  const selectedDrawingIdRef = useRef(null)
  const drawingsRef          = useRef([])
  const drawingDragRef       = useRef(null)
  const updateDrawingRef     = useRef(null)
  const removeDrawingRef     = useRef(null)

  const smcLayers  = useStore(s => s.smcLayers)
  const sessions   = useStore(s => s.sessions)
  const indicators = useStore(s => s.indicators)

  // ── Account pill data (balance / today PnL / drawdown room) ───────────────
  const balance          = useStore(s => s.paperAccount.balance)
  const startingBalance  = useStore(s => s.paperAccount.starting_balance ?? s.paperAccount.startingBalance ?? 50000)
  const todayPnL         = 0 // TODO: wire up from store.account.dailyPnL
  const maxDrawdown      = 2000
  const ddRoom           = Math.max(0, maxDrawdown - (startingBalance - balance))

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

    // ── ET 12-hour crosshair tooltip (uses the module-level toET helper) ─────
    chart.applyOptions({
      localization: {
        timeFormatter: (ts) => toET(ts, {
          month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
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
      if (rsiElRef.current && rsiChartRef.current) rsiChartRef.current.applyOptions({ width: rsiElRef.current.clientWidth })
    })
    ro.observe(mainElRef.current)

    let mainRangeHandler = null
    let rsiRangeHandler  = null

    // ── RSI sub-chart ────────────────────────────────────────────────────────
    if (rsiElRef.current) {
      const rsiChart = createChart(rsiElRef.current, {
        layout: {
          background: { color: '#080b12' },
          textColor: '#8892b0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#0e1220' },
          horzLines: { color: '#0e1220' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelVisible: false },
          horzLine: { color: '#4f8ef7', width: 1, style: LineStyle.Dashed, labelVisible: true, labelBackgroundColor: '#1a2340' },
        },
        timeScale: { visible: false, borderVisible: false },
        rightPriceScale: {
          borderColor: '#1c1f2e',
          borderVisible: true,
          scaleMargins: { top: 0.1, bottom: 0.1 },
          minimumWidth: 64,
        },
        width:  rsiElRef.current.clientWidth || 400,
        height: 108,
        handleScroll: true,
        handleScale: true,
      })
      rsiChartRef.current = rsiChart

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#7b68ee',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      })
      rsiSeriesRef.current = rsiSeries

      // Reference lines at 70, 50, 30
      rsiSeries.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.5)',   lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,  title: '70' })
      rsiSeries.createPriceLine({ price: 50, color: 'rgba(120,120,140,0.35)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' })
      rsiSeries.createPriceLine({ price: 30, color: 'rgba(34,197,94,0.5)',    lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,  title: '30' })

      // Bidirectional time scale sync (main ↔ RSI)
      let syncingRange = false
      mainRangeHandler = (range) => {
        if (syncingRange || !range) return
        syncingRange = true
        rsiChart.timeScale().setVisibleLogicalRange(range)
        syncingRange = false
      }
      rsiRangeHandler = (range) => {
        if (syncingRange || !range) return
        syncingRange = true
        chart.timeScale().setVisibleLogicalRange(range)
        syncingRange = false
      }
      const unsubMain = chart.timeScale().subscribeVisibleLogicalRangeChange(mainRangeHandler)
      const unsubRsi = rsiChart.timeScale().subscribeVisibleLogicalRangeChange(rsiRangeHandler)

      ro.observe(rsiElRef.current)
    }

    // Crosshair time tooltip (TradingView-style)
    const crosshairHandler = (param) => {
      if (!param.point || !param.time) {
        setCrosshairTime(null)
        return
      }
      const label = toET(param.time, {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
      setCrosshairTime({ x: param.point.x, label })
    }
    const unsubCrosshair = chart.subscribeCrosshairMove(crosshairHandler)

    return () => {
      ro.disconnect()
      if (typeof unsubCrosshair === 'function') unsubCrosshair()
      else chart.unsubscribeCrosshairMove(crosshairHandler)
      if (typeof unsubMain === 'function') unsubMain()
      else if (mainRangeHandler) chart.timeScale().unsubscribeVisibleLogicalRangeChange(mainRangeHandler)
      if (rsiRangeHandler && rsiChartRef.current) {
        if (typeof unsubRsi === 'function') unsubRsi()
        else rsiChartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(rsiRangeHandler)
      }
      chart.remove()
      rsiChartRef.current?.remove()
      rsiChartRef.current  = null
      rsiSeriesRef.current = null
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
          addDrawingRef.current?.({ id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), type: 'hline', price: snappedPrice, color: '#4f8ef7' })
          onDrawingDoneRef.current?.()
        } else {
          // line or box: need two clicks
          if (!drawStartRef.current) {
            drawStartRef.current = { time: snappedTime, price: snappedPrice }
          } else {
            addDrawingRef.current?.({
              id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
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

  // ── TV-style line label helpers ────────────────────────────────────────────
  // Returns "TP  +5.25 pts  +$263" or "SL  -10.50 pts  -$525"
  function tpLabel(tpPrice, entryPrice, ct) {
    const pv   = pointValue ?? 50
    const qty  = ct || contracts || 1
    const pts  = tpPrice - entryPrice
    const sign = pts >= 0 ? '+' : ''
    const $val = Math.round(Math.abs(pts) * pv * qty)
    const qtyStr = qty > 1 ? `  (${qty}ct)` : ''
    return `TP   ${sign}${pts.toFixed(2)} pts   ${sign}$${$val.toLocaleString()}${qtyStr}`
  }
  function slLabel(slPrice, entryPrice, ct) {
    const pv   = pointValue ?? 50
    const qty  = ct || contracts || 1
    const pts  = slPrice - entryPrice
    const sign = pts >= 0 ? '+' : ''
    const $val = Math.round(Math.abs(pts) * pv * qty)
    const qtyStr = qty > 1 ? `  (${qty}ct)` : ''
    return `SL   ${sign}${pts.toFixed(2)} pts   ${pts >= 0 ? '+' : '-'}$${$val.toLocaleString()}${qtyStr}`
  }

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
      const aColor = awaitingFill.side === 'LONG' ? '#26a69a' : '#ef5350'
      const typeLabel = awaitingFill.orderType === 'limit' ? 'LIMIT'
                      : awaitingFill.orderType === 'stop'  ? 'STOP'
                      : 'STOP-LMT'

      orderLinesRef.current.entry = cs.createPriceLine({
        price: awaitingFill.entry,
        color: aColor,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${typeLabel} ${awaitingFill.side}   ${awaitingFill.entry.toFixed(2)}`,
      })
      if (awaitingFill.orderType === 'stop_limit' && awaitingFill.stopTrigger != null) {
        orderLinesRef.current.trigger = cs.createPriceLine({
          price: awaitingFill.stopTrigger,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `TRIGGER   ${awaitingFill.stopTrigger.toFixed(2)}`,
        })
      }
      const aCt = awaitingFill.contracts || contracts || 1
      orderLinesRef.current.tp = cs.createPriceLine({
        price: awaitingFill.tp, color: '#26a69a', lineWidth: 2, lineStyle: LineStyle.Solid,
        axisLabelVisible: true, title: tpLabel(awaitingFill.tp, awaitingFill.entry, aCt),
      })
      orderLinesRef.current.sl = cs.createPriceLine({
        price: awaitingFill.sl, color: '#ef5350', lineWidth: 2, lineStyle: LineStyle.Solid,
        axisLabelVisible: true, title: slLabel(awaitingFill.sl, awaitingFill.entry, aCt),
      })
      return
    }

    const order = pendingOrder || activeOrder
    if (!order) return

    const entryColor = order.side === 'LONG' ? '#26a69a' : '#ef5350'
    const oCt = order.contracts || contracts || 1

    orderLinesRef.current.entry = cs.createPriceLine({
      price: order.entry,
      color: entryColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: `${order.side}   ${order.entry.toFixed(2)}${oCt > 1 ? `  (${oCt}ct)` : ''}`,
    })
    // For stop-limit: also show the trigger line
    if (order.orderType === 'stop_limit' && order.stopTrigger != null) {
      orderLinesRef.current.trigger = cs.createPriceLine({
        price: order.stopTrigger,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `TRIGGER   ${order.stopTrigger.toFixed(2)}`,
      })
    }
    orderLinesRef.current.tp = cs.createPriceLine({
      price: order.tp,
      color: '#26a69a',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: tpLabel(order.tp, order.entry, oCt),
    })
    orderLinesRef.current.sl = cs.createPriceLine({
      price: order.sl,
      color: '#ef5350',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: slLabel(order.sl, order.entry, oCt),
    })
  }, [pendingOrder, activeOrder, awaitingFill, contracts])

  // ── Update price lines when order changes ─────────────────────────────────
  useEffect(() => {
    const ol = orderLinesRef.current
    const order = pendingOrder || activeOrder
    if (!order) return
    const oCt = order.contracts || contracts || 1
    if (ol.tp)    ol.tp.applyOptions({ price: order.tp, title: tpLabel(order.tp, order.entry, oCt) })
    if (ol.sl)    ol.sl.applyOptions({ price: order.sl, title: slLabel(order.sl, order.entry, oCt) })
    if (ol.entry) ol.entry.applyOptions({ price: order.entry, title: `${order.side}   ${order.entry.toFixed(2)}${oCt > 1 ? `  (${oCt}ct)` : ''}` })
    if (ol.trigger && order.stopTrigger != null) ol.trigger.applyOptions({ price: order.stopTrigger, title: `TRIGGER   ${order.stopTrigger.toFixed(2)}` })
  }, [pendingOrder?.tp, pendingOrder?.sl, pendingOrder?.entry, pendingOrder?.stopTrigger, activeOrder?.tp, activeOrder?.sl, contracts])

  // ── Update TP/SL lines while awaiting fill (so drag updates are reflected) ─
  useEffect(() => {
    const ol = orderLinesRef.current
    if (!awaitingFill || pendingOrder || activeOrder) return
    const aCt = awaitingFill.contracts || contracts || 1
    if (ol.tp) ol.tp.applyOptions({ price: awaitingFill.tp, title: tpLabel(awaitingFill.tp, awaitingFill.entry, aCt) })
    if (ol.sl) ol.sl.applyOptions({ price: awaitingFill.sl, title: slLabel(awaitingFill.sl, awaitingFill.entry, aCt) })
  }, [awaitingFill?.tp, awaitingFill?.sl, contracts])

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

    // ── Helper: check if mouse is near a TP/SL/Entry order line ──────────────
    function nearOrderLine() {
      const order = pendingOrderRef.current || activeOrderRef.current || awaitingFillRef.current
      if (!order) return false
      const y = chartY(e.clientY)
      if (y == null) return false
      const tpCoord    = cs.priceToCoordinate(order.tp)
      const slCoord    = cs.priceToCoordinate(order.sl)
      const entryCoord = cs.priceToCoordinate(order.entry)
      return (tpCoord    != null && Math.abs(y - tpCoord)    <= DRAG_THRESHOLD) ||
             (slCoord    != null && Math.abs(y - slCoord)    <= DRAG_THRESHOLD) ||
             (entryCoord != null && Math.abs(y - entryCoord) <= DRAG_THRESHOLD)
    }

    // ── 1. Drawing drag / select (only when no drawing tool is placing) ───────
    // Skip drawing hit-test when mouse is near an order line — order lines take priority
    if (!drawingToolRef.current && !nearOrderLine()) {
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

    // ── 2. TP/SL/Entry drag ──────────────────────────────────────────────────
    const order      = pendingOrderRef.current || activeOrderRef.current || awaitingFillRef.current
    const isPending  = !!pendingOrderRef.current
    const isAwaiting = !pendingOrderRef.current && !activeOrderRef.current && !!awaitingFillRef.current
    if (!order) return

    const y = chartY(e.clientY)
    if (y == null) return

    const tpCoord    = cs.priceToCoordinate(order.tp)
    const slCoord    = cs.priceToCoordinate(order.sl)
    const entryCoord = cs.priceToCoordinate(order.entry)

    let target = null
    if (tpCoord    != null && Math.abs(y - tpCoord)    <= DRAG_THRESHOLD) target = 'tp'
    else if (slCoord != null && Math.abs(y - slCoord)  <= DRAG_THRESHOLD) target = 'sl'
    // Entry drag only for pending/awaiting-fill — not active trades (entry is fixed once filled)
    else if (!isAwaiting && isPending && entryCoord != null && Math.abs(y - entryCoord) <= DRAG_THRESHOLD) target = 'entry'
    if (!target) return

    draggingRef.current = target
    e.preventDefault()
    e.stopPropagation()
    chart.applyOptions({ handleScroll: false, handleScale: false })

    const orderContracts = order.contracts || 1
    function onMove(ev) {
      const price = priceAt(ev.clientY)
      if (price == null) return
      const p = +price.toFixed(2)

      const cb = isPending  ? onUpdateOrderRef.current
               : isAwaiting ? onUpdateAwaitingFillRef.current
               : onUpdateActiveOrderRef.current
      if (draggingRef.current === 'tp')    cb?.({ tp: p })
      if (draggingRef.current === 'sl')    cb?.({ sl: p })
      if (draggingRef.current === 'entry') cb?.({ entry: p })

      const cur = isPending  ? pendingOrderRef.current
                : isAwaiting ? awaitingFillRef.current
                : activeOrderRef.current
      if (cur) {
        const ref = draggingRef.current === 'entry' ? cur.sl : cur.entry
        const pts = Math.abs(p - ref)
        const pv  = pointValue ?? 50
        const label = draggingRef.current === 'tp' ? 'TP'
                    : draggingRef.current === 'sl' ? 'SL'
                    : 'Entry'
        setDragDisplay({
          label,
          pts:     +pts.toFixed(2),
          dollars: Math.round(pts * pv * orderContracts),
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

  // Register mousedown in CAPTURE phase so it fires before LWC's internal
  // scroll/pan handlers, which would otherwise consume the event and prevent
  // TP/SL drag from starting.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousedown', handleMouseDown, true)
    return () => el.removeEventListener('mousedown', handleMouseDown, true)
  }, [handleMouseDown])

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

    // ── TP/SL/Entry hover detection ───────────────────────────────────────────
    const order = pendingOrderRef.current || activeOrderRef.current || awaitingFillRef.current
    if (!order) { setHoverLine(null); return }

    const y = chartY(e.clientY)
    if (y == null) { setHoverLine(null); return }

    const tpCoord    = cs.priceToCoordinate(order.tp)
    const slCoord    = cs.priceToCoordinate(order.sl)
    const entryCoord = cs.priceToCoordinate(order.entry)

    if (tpCoord    != null && Math.abs(y - tpCoord)    <= DRAG_THRESHOLD) setHoverLine('tp')
    else if (slCoord != null && Math.abs(y - slCoord)  <= DRAG_THRESHOLD) setHoverLine('sl')
    else if (pendingOrderRef.current && entryCoord != null && Math.abs(y - entryCoord) <= DRAG_THRESHOLD) setHoverLine('entry')
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

  // ── Feed RSI data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rsiSeriesRef.current || !visibleCandles.length) return
    try {
      rsiSeriesRef.current.setData(calculateRSI(visibleCandles))
    } catch {
      // Ignore stale data errors
    }
  }, [visibleCandles])

  // ── Auto-fit when ticker or timeframe changes ────────────────────────────────
  // Depends on dataKey (= symbol+timeframe) so it fires ONLY on a real dataset
  // switch — NOT on every live poll that returns a new array reference.
  useEffect(() => {
    if (!candles.length) return
    chartRef.current?.timeScale().fitContent()
    rsiChartRef.current?.timeScale().fitContent()
  }, [dataKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SMC overlays ─────────────────────────────────────────────────────────────
  // FVG and OB use canvas box primitives (start at formation candle, extend right).
  // Liquidity uses price lines (single price level, no start/end concept).
  const fvgZones = useMemo(
    () => smcLayers.fvg
      ? detectFVGs(visibleCandles).map(z => ({ ...z, label: z.type === 'bull' ? 'FVG↑' : 'FVG↓' }))
      : [],
    [visibleCandles, smcLayers.fvg]
  )
  const obZones = useMemo(
    () => smcLayers.ob
      ? detectOBs(visibleCandles).map(ob => ({
          type: ob.type,
          top: ob.high, bot: ob.low,
          startTime: ob.startTime,
          label: ob.type === 'bull' ? 'OB↑' : 'OB↓',
          _bull: ob.type === 'bull',
          _ob: true,
        }))
      : [],
    [visibleCandles, smcLayers.ob]
  )
  const liqLevels = useMemo(
    () => smcLayers.liq ? detectLiquidity(visibleCandles) : [],
    [visibleCandles, smcLayers.liq]
  )

  useEffect(() => {
    const cs = seriesRef.current.candles
    if (!cs || !visibleCandles.length) return

    // ── FVG boxes ─────────────────────────────────────────────────────────────
    fvgPrimRef.current?.updateZones(fvgZones)

    // ── OB boxes (orange=bull, purple=bear) ───────────────────────────────────
    obPrimRef.current?.updateZones(obZones)

    // ── Liquidity price lines (sweep levels, no box needed) ───────────────────
    if (seriesRef.current._liqLines) {
      seriesRef.current._liqLines.forEach(l => { try { cs.removePriceLine(l) } catch {} })
    }
    seriesRef.current._liqLines = liqLevels.map(lv =>
      cs.createPriceLine({ price: lv.price, color: 'rgba(245,158,11,0.5)', lineWidth: 1, lineStyle: LineStyle.Dotted, title: lv.type === 'high' ? 'BSL' : 'SSL', axisLabelVisible: false })
    )
  }, [visibleCandles, fvgZones, obZones, liqLevels])

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

  // ── 15-min B&R strategy boxes ─────────────────────────────────────────────────
  // Shows the 8:00–8:15 AM ET range for EVERY NY session visible in the data.
  // Each box spans from 8:00 AM ET and ends at 9:30 AM ET (NY open) of that day.
  const brStrategy = useStore(s => s.brStrategy)
  useEffect(() => {
    if (!brStrategy) { brStrategyPrimRef.current?.updateZones([]); return }

    // Use ALL candles (not just visible) so the boxes don't disappear when scrolling
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

    // Collect B&R boxes for ALL dates (not just the most recent)
    const brBoxes = []
    for (const dateStr of etDates) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const etOffsetSecs = getETOffset(y, m, d)

      const start800 = Math.floor(Date.UTC(y, m - 1, d, 8, 0, 0) / 1000) + etOffsetSecs
      const start815 = Math.floor(Date.UTC(y, m - 1, d, 8, 15, 0) / 1000) + etOffsetSecs
      // Box ends at 11:00 AM ET
      const end930   = Math.floor(Date.UTC(y, m - 1, d, 11, 0, 0) / 1000) + etOffsetSecs

      // Skip this date if 8:15 AM ET hasn't passed yet
      if (nowSecs < start815) continue

      // Find candles in the 8:00-8:15 AM ET window
      const windowCandles = allCandles.filter(c => c.time >= start800 && c.time < start815)
      if (windowCandles.length > 0) {
        brBoxes.push({
          top: Math.max(...windowCandles.map(c => c.high)),
          bot: Math.min(...windowCandles.map(c => c.low)),
          startTime: start800,
          endTime: end930,
        })
        continue  // check next date — no break
      }

      // Fallback for large timeframes: candle that contains 8:00 AM ET
      const containing = [...allCandles]
        .filter(c => c.time <= start800)
        .sort((a, b) => b.time - a.time)[0]
      if (containing && containing.time >= start800 - 86400) {
        brBoxes.push({ top: containing.high, bot: containing.low, startTime: containing.time, endTime: end930 })
      }
    }

    brStrategyPrimRef.current?.updateZones(
      brBoxes.map(b => ({
        type: 'bull', top: b.top, bot: b.bot,
        startTime: b.startTime, endTime: b.endTime,
        label: 'B&R 8AM', _brStrategy: true,
      }))
    )
  }, [candles, replayIndex, brStrategy])

  const cursor = (drawingTool || orderMode) ? 'crosshair'
    : hoverDrawing ? 'move'
    : hoverLine ? 'ns-resize'
    : 'default'

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', cursor, paddingBottom: 16 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={mainElRef} style={{ flex: 1, minHeight: 0 }} />

      {/* RSI sub-pane — always mounted so chart is created at startup; CSS-hidden when off */}
      <div style={{ flexShrink: 0, overflow: 'hidden', height: indicators?.rsi ? 108 : 0, transition: 'height 0.15s ease' }}>
        <div style={{ position: 'relative', height: 108 }}>
          <div style={{
            position: 'absolute', top: 6, left: 8, zIndex: 5,
            fontSize: '10px', fontWeight: 700, color: '#7b68ee',
            pointerEvents: 'none', fontFamily: 'Inter, sans-serif',
          }}>RSI(14)</div>
          <div ref={rsiElRef} style={{ height: 108, width: '100%', borderTop: '1px solid #1a2030' }} />
        </div>
      </div>

      {/* TradingView-style crosshair time label on x-axis */}
      {crosshairTime && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          left: crosshairTime.x,
          transform: 'translateX(-50%)',
          background: '#1a2340',
          border: '1px solid #2a3a5a',
          color: '#b0bcdc',
          fontSize: '10px',
          fontFamily: 'Inter, monospace, sans-serif',
          padding: '2px 7px',
          borderRadius: '3px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 15,
        }}>
          {crosshairTime.label}
        </div>
      )}

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
          Drag Entry / TP / SL lines to adjust
        </div>
      )}

      {/* Drag distance label — appears next to the line being dragged */}
      {dragDisplay && (
        <div style={{
          position: 'absolute',
          top: Math.max(4, dragDisplay.y - 28),
          left: '50%',
          transform: 'translateX(-50%)',
          background: dragDisplay.label === 'TP' ? 'rgba(22,163,74,0.9)' : dragDisplay.label === 'Entry' ? 'rgba(26,35,64,0.95)' : 'rgba(220,38,38,0.9)',
          border: `1px solid ${dragDisplay.label === 'TP' ? 'rgba(34,197,94,0.6)' : dragDisplay.label === 'Entry' ? 'rgba(79,142,247,0.6)' : 'rgba(239,68,68,0.6)'}`,
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
