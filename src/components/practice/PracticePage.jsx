import { useState, useCallback, useEffect, useRef } from 'react'
import { useChartData, TF_CONFIG } from '../../hooks/useChartData'
import ChartContainer from './ChartContainer'
import ReplayControls from './ReplayControls'
import IndicatorPanel from './IndicatorPanel'
import useStore from '../../store'

const TIMEFRAMES = Object.keys(TF_CONFIG)
const SYMBOLS    = ['ES=F', 'MES=F', 'NQ=F']
const ES_POINT   = 50
const MES_POINT  = 5

const ORDER_TYPES = [
  { id: 'market',     label: 'Market',     desc: 'Fill immediately at current price' },
  { id: 'limit',      label: 'Limit',      desc: 'Long: fill at or below entry · Short: fill at or above entry' },
  { id: 'stop',       label: 'Stop',       desc: 'Long: triggers when price breaks above · Short: when price breaks below' },
  { id: 'stop_limit', label: 'Stop-Limit', desc: 'Activates at trigger price, fills at limit price' },
]

function pointValue(symbol) {
  return symbol === 'MES=F' ? MES_POINT : ES_POINT
}

function fmt$(n, sign = false) {
  const s = sign && n > 0 ? '+' : ''
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtCandleTime(ts) {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }) + ' ET'
}

function rr(entry, tp, sl) {
  const risk   = Math.abs(entry - sl)
  const reward = Math.abs(tp - entry)
  if (risk === 0) return '–'
  return (reward / risk).toFixed(1) + 'R'
}

export default function PracticePage() {
  const [symbol,      setSymbol]      = useState('ES=F')
  const [timeframe,   setTimeframe]   = useState('5m')
  const [replayMode,  setReplayMode]  = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [speed,       setSpeed]       = useState(1)
  const [drawingTool, setDrawingTool] = useState(null)  // null | 'hline' | 'line' | 'box'

  // Account mode
  const [accountMode,     setAccountMode]     = useState('prop')
  const [showPaperConfig, setShowPaperConfig] = useState(false)
  const [balanceInput,    setBalanceInput]    = useState('')

  // Order flow
  const [orderType,         setOrderType]         = useState('market')
  const [orderMode,         setOrderMode]         = useState(null)   // 'LONG' | 'SHORT' | null
  const [pendingOrder,      setPendingOrder]      = useState(null)   // ticket being configured
  const [awaitingFill,      setAwaitingFill]      = useState(null)   // confirmed, waiting to fill
  const [activeOrder,       setActiveOrder]       = useState(null)   // filled, tracking TP/SL
  const [orderResult,       setOrderResult]       = useState(null)   // { win, pnl, r }
  const [tickPrice,         setTickPrice]         = useState(null)   // live simulated price from chart ticks
  const [orderValidError,   setOrderValidError]   = useState(null)   // validation warning string
  const [trailingEnabled,   setTrailingEnabled]   = useState(false)
  const [trailPts,          setTrailPts]          = useState(10)
  const [dailyLimitAck,     setDailyLimitAck]     = useState(false)  // user acknowledged daily limit banner
  const [pendingGrade,      setPendingGrade]       = useState(null)   // grade for the result trade (A+/A/B/C)

  const { candles, loading, isLive, contract } = useChartData(symbol, timeframe)

  const addPaperTrade           = useStore(s => s.addPaperTrade)
  const updatePaperTrade        = useStore(s => s.updatePaperTrade)
  const paperAccount            = useStore(s => s.paperAccount)
  const lastTradeIdRef          = useRef(null)
  const account                 = useStore(s => s.account)
  const resetPaperAccount       = useStore(s => s.resetPaperAccount)
  const resetAccount            = useStore(s => s.resetAccount)
  const setPaperStartingBalance = useStore(s => s.setPaperStartingBalance)
  const magnetEnabled           = useStore(s => s.magnetEnabled)
  const setMagnetEnabled        = useStore(s => s.setMagnetEnabled)
  const clearDrawings           = useStore(s => s.clearDrawings)

  const DEFAULT_STOP_PTS = 10
  const DAILY_LOSS_LIMIT = 1000  // Alpha Futures Zero rule

  const lastCandle = candles.length > 0
    ? candles[replayMode ? Math.max(0, replayIndex - 1) : candles.length - 1]
    : null
  const lastPrice      = lastCandle?.close ?? null
  const lastCandleTime = lastCandle?.time  ?? null

  // Live price: prefer tick simulation price (updates every ~100ms) over polled candle close
  const livePrice = tickPrice ?? lastPrice

  // ── Daily P&L + loss limit ────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const dailyClosedPnL = (accountMode === 'prop' ? account.dailyPnL[todayStr] : null) ??
    paperAccount.trades
      .filter(t => t.accountType === accountMode && (t.date || '').startsWith(todayStr))
      .reduce((s, t) => s + (t.pnl || 0), 0)
  const unrealizedPnL = activeOrder && livePrice != null
    ? (activeOrder.side === 'LONG' ? livePrice - activeOrder.entry : activeOrder.entry - livePrice) * pointValue(symbol)
    : 0
  const dailyTotalPnL     = dailyClosedPnL + unrealizedPnL
  const dailyLimitReached = dailyTotalPnL <= -DAILY_LOSS_LIMIT

  const handleTickPrice = useCallback((price) => {
    setTickPrice(price)
  }, [])

  // ── Replay step ──────────────────────────────────────────────────────────
  const step = useCallback((n = 1) => {
    setReplayIndex(i => Math.min(candles.length, Math.max(1, i + n)))
  }, [candles.length])

  function toggleReplay() {
    if (!replayMode) {
      setReplayMode(true)
      setReplayIndex(Math.min(50, candles.length))
      setPlaying(false)
      setActiveOrder(null)
      setAwaitingFill(null)
      setOrderResult(null)
    } else {
      setReplayMode(false)
      setPlaying(false)
      setActiveOrder(null)
      setAwaitingFill(null)
      setOrderResult(null)
    }
  }

  // ── Shared fill + TP/SL check logic ─────────────────────────────────────
  function checkFill(candle) {
    if (!candle) return
    if (awaitingFill) {
      const { side, orderType: type, entry, stopTrigger } = awaitingFill
      let filled = false
      if (type === 'limit') {
        if (side === 'LONG'  && candle.low  <= entry) filled = true
        if (side === 'SHORT' && candle.high >= entry) filled = true
      } else if (type === 'stop') {
        if (side === 'LONG'  && candle.high >= entry) filled = true
        if (side === 'SHORT' && candle.low  <= entry) filled = true
      } else if (type === 'stop_limit') {
        const trigger = stopTrigger ?? entry
        if (side === 'LONG'  && candle.high >= trigger && candle.low  <= entry) filled = true
        if (side === 'SHORT' && candle.low  <= trigger && candle.high >= entry) filled = true
      }
      if (filled) { setActiveOrder({ ...awaitingFill, filledAtCandleTime: candle.time }); setAwaitingFill(null) }
    }
  }

  function checkTPSL(candle) {
    if (!candle || !activeOrder) return
    const { side, entry, tp, trailPts: tPts, trailSL } = activeOrder
    const pv = pointValue(symbol)

    // ── Trailing stop: advance SL as price moves in favor ─────────────────
    let currentSL = activeOrder.sl
    if (tPts && trailSL != null) {
      if (side === 'LONG') {
        const newTrailSL = candle.high - tPts
        if (newTrailSL > trailSL) {
          currentSL = newTrailSL
          setActiveOrder(o => o ? { ...o, sl: newTrailSL, trailSL: newTrailSL } : o)
        }
      } else {
        const newTrailSL = candle.low + tPts
        if (newTrailSL < trailSL) {
          currentSL = newTrailSL
          setActiveOrder(o => o ? { ...o, sl: newTrailSL, trailSL: newTrailSL } : o)
        }
      }
    }

    const sl = currentSL
    const hit = (side === 'LONG')
      ? candle.high >= tp ? { win: true,  pnl: (tp - entry) * pv, exit: tp,  r: +(Math.abs(tp - entry) / Math.abs(entry - sl)).toFixed(1) }
      : candle.low  <= sl ? { win: false, pnl: (sl - entry) * pv, exit: sl,  r: -1 }
      : null
      : candle.low  <= tp ? { win: true,  pnl: (entry - tp) * pv, exit: tp,  r: +(Math.abs(entry - tp) / Math.abs(sl - entry)).toFixed(1) }
      : candle.high >= sl ? { win: false, pnl: (entry - sl) * pv, exit: sl,  r: -1 }
      : null
    if (hit) {
      const tradeId = crypto.randomUUID()
      lastTradeIdRef.current = tradeId
      setPendingGrade(null)
      setOrderResult(hit)
      addPaperTrade({
        id: tradeId,
        symbol, side, entry, tp, sl,
        exit: hit.exit,
        pnl: hit.pnl, r: hit.r,
        closePrice: hit.exit,
        status: 'closed',
        date: new Date().toISOString(),
        accountType: accountMode,
      })
      setActiveOrder(null)
      setPlaying(false)
    }
  }

  // ── Replay: check fill + TP/SL on each bar advance ───────────────────────
  // Only fire when replayIndex changes (a new bar is revealed), NOT when the
  // order state changes — that prevents false fills the instant an order is placed.
  useEffect(() => {
    if (!replayMode) return
    const candle = candles[replayIndex - 1]
    if (!candle || !awaitingFill) return
    // Guard: only check candles that started AFTER the order was placed
    if (awaitingFill.placedAfterCandleTime && candle.time <= awaitingFill.placedAfterCandleTime) return
    checkFill(candle)
  }, [replayIndex, replayMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!replayMode) return
    const candle = candles[replayIndex - 1]
    if (!candle || !activeOrder) return
    // Guard: only check candles that started AFTER the trade was filled
    if (activeOrder.filledAtCandleTime && candle.time <= activeOrder.filledAtCandleTime) return
    checkTPSL(candle)
  }, [replayIndex, replayMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live mode: check fill + TP/SL whenever candles update (polling) ──────
  // Skip the check when symbol/timeframe just changed — the new candles cover
  // a different price range and would falsely trigger TP/SL on timeframe switch.
  // Replay position anchor — stores candle timestamp across timeframe switches
  const replayAnchorRef = useRef(null)

  // When candles reload (TF change), restore replay position closest to saved timestamp
  useEffect(() => {
    if (!replayMode || !replayAnchorRef.current || candles.length === 0) return
    const anchor = replayAnchorRef.current
    replayAnchorRef.current = null
    // Find the index of the candle whose time is closest to (and not after) the anchor
    let best = 1
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].time <= anchor) best = i + 1
      else break
    }
    setReplayIndex(Math.max(1, Math.min(best, candles.length)))
  }, [candles, replayMode])

  const liveCheckKeyRef = useRef(`${symbol}-${timeframe}`)
  useEffect(() => {
    const key = `${symbol}-${timeframe}`
    const keyChanged = key !== liveCheckKeyRef.current
    liveCheckKeyRef.current = key
    if (keyChanged || replayMode || (!awaitingFill && !activeOrder)) return
    const candle = candles[candles.length - 1]
    if (!candle) return

    // Only check fill on candles that started AFTER the order was placed —
    // prevents false fills from stale price ranges in the current candle.
    const canFill = !awaitingFill || !awaitingFill.placedAfterCandleTime || candle.time > awaitingFill.placedAfterCandleTime
    if (canFill) checkFill(candle)

    // Only check TP/SL on candles that started AFTER the trade was filled
    const canCheckTPSL = !activeOrder || !activeOrder.filledAtCandleTime || candle.time > activeOrder.filledAtCandleTime
    if (canCheckTPSL) checkTPSL(candle)
  }, [candles, replayMode, symbol, timeframe, awaitingFill, activeOrder])

  // ── Place order on chart click ───────────────────────────────────────────
  const handleChartClick = useCallback((price) => {
    if (!orderMode) return
    const stop = DEFAULT_STOP_PTS
    // Market orders in live mode snap to the current market price
    const entryPrice = (orderType === 'market' && !replayMode && lastPrice != null)
      ? lastPrice
      : price
    const tp = orderMode === 'LONG' ? entryPrice + stop * 2 : entryPrice - stop * 2
    const sl = orderMode === 'LONG' ? entryPrice - stop     : entryPrice + stop
    setPendingOrder({
      side: orderMode,
      orderType,
      entry: entryPrice,
      // For stop_limit: stopTrigger defaults to clicked price
      stopTrigger: orderType === 'stop_limit'
        ? price
        : undefined,
      tp,
      sl,
    })
    setOrderMode(null)
  }, [orderMode, orderType, replayMode, lastPrice])

  function handleUpdateOrder(patch) {
    setPendingOrder(o => o ? { ...o, ...patch } : o)
  }

  function handleUpdateActiveOrder(patch) {
    setActiveOrder(o => o ? { ...o, ...patch } : o)
  }

  function handleUpdateAwaitingFill(patch) {
    setAwaitingFill(o => o ? { ...o, ...patch } : o)
  }

  function handleConfirm() {
    if (!pendingOrder) return

    // ── Validation: TP/SL must be on correct side of entry ────────────────
    const { side, entry, tp, sl } = pendingOrder
    if (side === 'LONG') {
      if (tp <= entry) { setOrderValidError('Long TP must be above entry price'); return }
      if (sl >= entry) { setOrderValidError('Long SL must be below entry price'); return }
    } else {
      if (tp >= entry) { setOrderValidError('Short TP must be below entry price'); return }
      if (sl <= entry) { setOrderValidError('Short SL must be above entry price'); return }
    }
    setOrderValidError(null)

    const isMarket = pendingOrder.orderType === 'market'
    // In replay mode use the current replay candle; in live mode use the latest candle.
    // Using the wrong candle time (e.g. the last candle in the full dataset) causes
    // the fill guard to pass on the very candle where the order was placed.
    const currentCandleTime = replayMode
      ? (candles[replayIndex - 1]?.time ?? 0)
      : (candles.length > 0 ? candles[candles.length - 1].time : 0)

    const trailData = trailingEnabled ? { trailPts, trailSL: sl } : {}

    if (isMarket) {
      // In live mode, fill at actual current market price (not wherever user clicked)
      const fillPrice = (!replayMode && lastPrice != null) ? lastPrice : pendingOrder.entry
      setActiveOrder({ ...pendingOrder, entry: fillPrice, filledAtCandleTime: currentCandleTime, ...trailData })
    } else {
      // Store placement time — live fill check will only trigger on candles that
      // start AFTER this time, preventing false fills from stale price ranges.
      setAwaitingFill({ ...pendingOrder, placedAfterCandleTime: currentCandleTime, ...trailData })
    }
    setPendingOrder(null)
  }

  function handleCancel() {
    setPendingOrder(null)
    setOrderMode(null)
  }

  function handleCloseTrade() {
    const exitPrice = livePrice
    if (!activeOrder || exitPrice == null) return
    const pv  = pointValue(symbol)
    const pnl = (activeOrder.side === 'LONG'
      ? exitPrice - activeOrder.entry
      : activeOrder.entry - exitPrice) * pv
    const win = pnl > 0
    const risk = Math.abs(activeOrder.entry - activeOrder.sl)
    const r    = risk > 0 ? +(Math.abs(exitPrice - activeOrder.entry) / risk).toFixed(1) : 0

    const tradeId = crypto.randomUUID()
    lastTradeIdRef.current = tradeId
    setPendingGrade(null)
    addPaperTrade({
      id: tradeId,
      symbol, side: activeOrder.side,
      entry: activeOrder.entry, exit: exitPrice,
      tp: activeOrder.tp, sl: activeOrder.sl,
      pnl: +pnl.toFixed(0),
      r,
      closePrice: exitPrice,
      status: 'closed',
      date: new Date().toISOString(),
      accountType: accountMode,
    })
    setOrderResult({ win, pnl: +pnl.toFixed(0), r })
    setActiveOrder(null)
    setPlaying(false)
  }

  function dismissResult() {
    setOrderResult(null)
  }

  // ── Account helpers ──────────────────────────────────────────────────────
  function handleResetProp() {
    if (window.confirm('Reset prop account to $50,000? This clears all daily P&L history.')) {
      resetAccount()
    }
  }

  function handleResetPaper() {
    const bal = parseFloat(balanceInput) || paperAccount.startingBalance
    resetPaperAccount(bal)
    setShowPaperConfig(false)
    setBalanceInput('')
  }

  function handleSetPaperBalance() {
    const bal = parseFloat(balanceInput)
    if (bal > 0) {
      setPaperStartingBalance(bal)
      setBalanceInput('')
      setShowPaperConfig(false)
    }
  }

  const displayBalance = accountMode === 'prop' ? account.balance       : paperAccount.balance
  const displayStart   = accountMode === 'prop' ? account.startingBalance : paperAccount.startingBalance
  const displayPnL     = displayBalance - displayStart

  const hasActiveFlow = !!pendingOrder || !!awaitingFill || !!activeOrder

  return (
    <div style={{
      height: 'calc(100vh - 96px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="chart-toolbar">
        <select
          className="tool-btn"
          style={{ fontWeight: 700, paddingLeft: '8px', paddingRight: '8px' }}
          value={symbol}
          onChange={e => { setSymbol(e.target.value); setOrderMode(null); setPendingOrder(null) }}
        >
          {SYMBOLS.map(s => <option key={s} value={s}>{s.replace('=F', '')}</option>)}
        </select>

        <div className="toolbar-sep" />

        {TIMEFRAMES.map(tf => (
          <button key={tf} className={`tool-btn${timeframe === tf ? ' active' : ''}`} onClick={() => {
            if (tf === timeframe) return
            if (replayMode) {
              // Remember current candle timestamp so we can restore position after TF change
              if (replayIndex > 0 && candles.length > 0) {
                const curTime = candles[Math.min(replayIndex, candles.length) - 1]?.time
                replayAnchorRef.current = curTime ?? null
              }
              // Clear any in-flight orders — they reference prices/times from the old TF
              setAwaitingFill(null)
              setActiveOrder(null)
              setPendingOrder(null)
            }
            setTimeframe(tf)
          }}>{tf}</button>
        ))}

        <div className="toolbar-sep" />

        <button
          className={`tool-btn${drawingTool === 'hline' ? ' active' : ''}`}
          title="Horizontal Line — click chart to place"
          onClick={() => setDrawingTool(t => t === 'hline' ? null : 'hline')}
        >&#x2500; H-Line</button>

        <button
          className={`tool-btn${drawingTool === 'line' ? ' active' : ''}`}
          title="Trend Line — click two points"
          onClick={() => setDrawingTool(t => t === 'line' ? null : 'line')}
        >&#x2571; Line</button>

        <button
          className={`tool-btn${drawingTool === 'box' ? ' active' : ''}`}
          title="Rectangle — click two corners"
          onClick={() => setDrawingTool(t => t === 'box' ? null : 'box')}
        >&#x25A1; Box</button>

        <button
          className={`tool-btn${magnetEnabled ? ' active' : ''}`}
          title="Snap to OHLC"
          onClick={() => setMagnetEnabled(!magnetEnabled)}
        >&#x2295; Snap</button>

        <button
          className="tool-btn"
          title="Clear all drawings"
          style={{ color: 'var(--muted)' }}
          onClick={() => { if (window.confirm('Clear all drawings?')) clearDrawings() }}
        >&#x2715; Clear</button>

        <div className="toolbar-sep" />

        <button className={`tool-btn${replayMode ? ' active' : ''}`} onClick={toggleReplay}>
          {replayMode ? '■ Exit Replay' : '▶ Replay'}
        </button>

        {loading
          ? <span className="data-badge" style={{ background: 'var(--border)', color: 'var(--muted)' }}>Loading…</span>
          : <span className={`data-badge ${isLive ? 'data-live' : 'data-sim'}`} title={isLive ? 'Yahoo Finance data — ~10-15 min delay' : 'Simulated data (Yahoo fetch failed)'}>
              {isLive ? '● Delayed' : 'Sim'}
            </span>
        }
        {isLive && contract && contract !== symbol && (
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>
            {contract.replace('.CME', '')}
          </span>
        )}

        {livePrice && (
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)', marginLeft: '4px' }}>
            {livePrice.toFixed(2)}
            {isLive && lastCandleTime && (
              <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--muted)', marginLeft: '5px' }}>
                as of {fmtCandleTime(lastCandleTime)}
              </span>
            )}
          </span>
        )}

        {/* Account toggle + balance */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {['prop', 'paper'].map(m => (
              <button key={m} onClick={() => setAccountMode(m)} style={{
                padding: '4px 10px', fontSize: '11px', fontWeight: 700, border: 'none',
                borderLeft: m === 'paper' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                background: accountMode === m ? (m === 'prop' ? 'var(--accent)' : '#7c3aed') : 'var(--bg3)',
                color: accountMode === m ? '#fff' : 'var(--muted)',
                transition: 'all .15s',
              }}>
                {m === 'prop' ? 'Prop' : 'Paper'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: displayPnL >= 0 ? '#22c55e' : '#ef4444' }}>
            {fmt$(displayBalance)}{displayPnL !== 0 && <span style={{ fontSize: '11px' }}> ({fmt$(displayPnL, true)})</span>}
          </span>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '1px', background: 'var(--border)' }}>

        {/* Chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0, position: 'relative' }}>

          {/* ── Daily loss limit banner ─────────────────────────────────────── */}
          {dailyLimitReached && !dailyLimitAck && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.4)',
              padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            }}>
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                ⚠ Daily loss limit reached (${DAILY_LOSS_LIMIT.toLocaleString()})
                <span style={{ fontWeight: 400, marginLeft: '6px', color: 'rgba(239,68,68,0.8)' }}>
                  Real prop accounts would be locked. Proceed with caution.
                </span>
              </span>
              <button onClick={() => setDailyLimitAck(true)} style={{
                padding: '4px 12px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '5px', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
              }}>Acknowledge</button>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            <ChartContainer
              candles={candles}
              replayIndex={replayMode ? replayIndex : 0}
              isLive={isLive}
              playing={playing}
              speed={speed}
              pointValue={pointValue(symbol)}
              orderMode={orderMode}
              pendingOrder={pendingOrder}
              activeOrder={activeOrder}
              awaitingFill={awaitingFill}
              onChartClick={handleChartClick}
              onUpdateOrder={handleUpdateOrder}
              onUpdateActiveOrder={handleUpdateActiveOrder}
              onUpdateAwaitingFill={handleUpdateAwaitingFill}
              onTickPrice={handleTickPrice}
              drawingTool={drawingTool}
              magnetEnabled={magnetEnabled}
              onDrawingDone={() => setDrawingTool(null)}
            />
          </div>

          {replayMode && (
            <ReplayControls
              total={candles.length}
              index={replayIndex}
              playing={playing}
              speed={speed}
              candles={candles}
              onToggle={() => setPlaying(p => !p)}
              onStep={step}
              onReset={() => { setReplayIndex(1); setPlaying(false); setActiveOrder(null); setAwaitingFill(null); setOrderResult(null) }}
              onSpeedChange={setSpeed}
              onSeek={setReplayIndex}
            />
          )}
        </div>

        {/* Side panel */}
        <div style={{
          width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg)', overflow: 'hidden auto', borderLeft: '1px solid var(--border)',
        }}>

          {/* ── Account panel ──────────────────────────────────────────────── */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                {accountMode === 'prop' ? 'Prop Account' : 'Paper Account'}
              </div>
              <button onClick={() => accountMode === 'prop' ? handleResetProp() : setShowPaperConfig(v => !v)}
                style={{ fontSize: '10px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {accountMode === 'prop' ? 'Reset' : showPaperConfig ? 'Done' : 'Configure'}
              </button>
            </div>

            {accountMode === 'prop' && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {[
                  { label: 'Balance', val: fmt$(account.balance), color: 'var(--text)' },
                  { label: 'P&L', val: fmt$(account.balance - account.startingBalance, true), color: (account.balance - account.startingBalance) >= 0 ? '#22c55e' : '#ef4444' },
                  { label: 'Peak', val: fmt$(account.peakBalance), color: 'var(--text)' },
                  { label: 'Daily P&L', val: fmt$(dailyTotalPnL, true), color: dailyTotalPnL >= 0 ? '#22c55e' : dailyTotalPnL <= -DAILY_LOSS_LIMIT ? '#ef4444' : '#f59e0b' },
                  { label: 'Day Limit', val: fmt$(Math.max(0, DAILY_LOSS_LIMIT + dailyTotalPnL)) + ' left', color: dailyLimitReached ? '#ef4444' : 'var(--muted)' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.label}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            )}

            {accountMode === 'paper' && (
              <>
                <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {[
                    { label: 'Balance', val: fmt$(paperAccount.balance), color: 'var(--text)' },
                    { label: 'P&L', val: fmt$(paperAccount.balance - paperAccount.startingBalance, true), color: (paperAccount.balance - paperAccount.startingBalance) >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Starting', val: fmt$(paperAccount.startingBalance), color: 'var(--muted)' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.label}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
                {showPaperConfig && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Custom Balance</div>
                    <input type="number" placeholder={String(paperAccount.startingBalance)} value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: '4px', color: 'var(--text)', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '6px' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={handleResetPaper} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '4px', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit' }}>Reset & Apply</button>
                      <button onClick={handleSetPaperBalance} style={{ flex: 1, padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>Set Only</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Order entry ───────────────────────────────────────────────────── */}
          {!hasActiveFlow && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>
                Order Type
              </div>

              {/* Order type selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                {ORDER_TYPES.map(ot => (
                  <button
                    key={ot.id}
                    onClick={() => setOrderType(ot.id)}
                    title={ot.desc}
                    style={{
                      padding: '6px 4px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
                      border: `1px solid ${orderType === ot.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '5px',
                      background: orderType === ot.id ? 'rgba(79,142,247,0.12)' : 'var(--bg3)',
                      color: orderType === ot.id ? '#4f8ef7' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {ot.label}
                  </button>
                ))}
              </div>

              {/* Order type description */}
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '10px', lineHeight: 1.5, minHeight: '28px' }}>
                {ORDER_TYPES.find(o => o.id === orderType)?.desc}
              </div>

              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>
                {replayMode ? 'Place Trade (Replay)' : 'Place Trade'}
                {' '}
                <span style={{ color: accountMode === 'prop' ? 'var(--accent)' : '#7c3aed', fontSize: '9px' }}>
                  [{accountMode === 'prop' ? 'PROP' : 'PAPER'}]
                </span>
              </div>

              {/* Long / Short */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['LONG', 'SHORT'].map(side => (
                  <button
                    key={side}
                    onClick={() => {
                      if (orderType === 'market') {
                        // Market: place immediately at current price, no chart click needed
                        const entryPrice = livePrice ?? lastPrice
                        if (entryPrice == null) return
                        const stop = DEFAULT_STOP_PTS
                        const tp = side === 'LONG' ? entryPrice + stop * 2 : entryPrice - stop * 2
                        const sl = side === 'LONG' ? entryPrice - stop     : entryPrice + stop
                        setPendingOrder({ side, orderType: 'market', entry: entryPrice, tp, sl })
                      } else {
                        setOrderMode(orderMode === side ? null : side)
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px 6px', fontFamily: 'inherit',
                      border: `1px solid ${orderMode === side ? (side === 'LONG' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') : 'var(--border)'}`,
                      borderRadius: '6px',
                      background: orderMode === side ? (side === 'LONG' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)') : 'var(--bg3)',
                      color: orderMode === side ? (side === 'LONG' ? '#22c55e' : '#ef4444') : '#5a6080',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all .15s',
                    }}
                  >
                    {side === 'LONG' ? '▲ Long' : '▼ Short'}
                  </button>
                ))}
              </div>

              {/* Trailing stop option */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={trailingEnabled} onChange={e => setTrailingEnabled(e.target.checked)}
                    style={{ accentColor: '#f59e0b', cursor: 'pointer' }} />
                  <span style={{ fontSize: '11px', color: trailingEnabled ? '#f59e0b' : 'var(--muted)', fontWeight: 600 }}>Trailing Stop</span>
                </label>
                {trailingEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" min="1" step="1" value={trailPts} onChange={e => setTrailPts(Math.max(1, +e.target.value))}
                      style={{ width: '52px', background: 'var(--bg3)', border: '1px solid #f59e0b44', borderRadius: '4px', color: '#f59e0b', padding: '3px 6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', textAlign: 'right' }} />
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>pts</span>
                  </div>
                )}
              </div>

              {orderMode && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>
                  Click the chart to set{' '}
                  {orderType === 'limit' ? 'limit price'
                    : orderType === 'stop' ? 'stop trigger price'
                    : 'stop trigger price'}
                </div>
              )}
            </div>
          )}

          {/* ── Pending order ticket ────────────────────────────────────────── */}
          {pendingOrder && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pendingOrder.side === 'LONG' ? '#22c55e' : '#ef4444' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: pendingOrder.side === 'LONG' ? '#22c55e' : '#ef4444' }}>
                    {pendingOrder.side}
                  </span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {ORDER_TYPES.find(o => o.id === pendingOrder.orderType)?.label.toUpperCase()}
                </span>
              </div>

              {/* Price inputs */}
              {[
                // Stop-limit shows trigger + limit; others show entry
                ...(pendingOrder.orderType === 'stop_limit' ? [
                  { label: 'Stop Trigger', val: pendingOrder.stopTrigger, color: '#f59e0b', key: 'stopTrigger' },
                  { label: 'Limit Price',  val: pendingOrder.entry,       color: '#4f8ef7', key: 'entry' },
                ] : [
                  {
                    label: pendingOrder.orderType === 'limit' ? 'Limit Price'
                         : pendingOrder.orderType === 'stop'  ? 'Stop Price'
                         : 'Entry',
                    val: pendingOrder.entry, color: '#4f8ef7', key: 'entry',
                  },
                ]),
                { label: 'Take Profit', val: pendingOrder.tp, color: '#22c55e', key: 'tp' },
                { label: 'Stop Loss',   val: pendingOrder.sl, color: '#ef4444', key: 'sl' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{row.label}</span>
                  <input
                    type="number" step="0.25" value={row.val}
                    onChange={e => handleUpdateOrder({ [row.key]: +e.target.value })}
                    style={{
                      width: '80px', background: 'var(--bg3)', border: `1px solid ${row.color}33`,
                      borderRadius: '4px', color: row.color, padding: '3px 6px',
                      fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', textAlign: 'right',
                    }}
                  />
                </div>
              ))}

              {/* R:R + risk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>R:R</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                  {rr(pendingOrder.entry, pendingOrder.tp, pendingOrder.sl)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Max Risk</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                  {fmt$(Math.abs(pendingOrder.entry - pendingOrder.sl) * pointValue(symbol))}
                </span>
              </div>

              {pendingOrder.orderType !== 'market' && (
                <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '8px', lineHeight: 1.5, background: 'rgba(245,158,11,0.08)', padding: '6px 8px', borderRadius: '5px' }}>
                  {pendingOrder.orderType === 'limit'
                    ? `Order waits until price reaches ${pendingOrder.entry.toFixed(2)}`
                    : pendingOrder.orderType === 'stop'
                    ? `Order triggers when price hits ${pendingOrder.entry.toFixed(2)}`
                    : `Triggers at ${pendingOrder.stopTrigger?.toFixed(2)}, fills at ${pendingOrder.entry.toFixed(2)}`}
                </div>
              )}

              {trailingEnabled && (
                <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '6px', background: 'rgba(245,158,11,0.08)', padding: '5px 8px', borderRadius: '5px' }}>
                  Trailing stop: {trailPts} pts
                </div>
              )}

              {orderValidError && (
                <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '8px', background: 'rgba(239,68,68,0.1)', padding: '6px 8px', borderRadius: '5px', fontWeight: 600 }}>
                  ⚠ {orderValidError}
                </div>
              )}

              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                Drag TP/SL lines on the chart to adjust
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleConfirm} style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: '6px',
                  background: pendingOrder.side === 'LONG' ? '#16a34a' : '#dc2626',
                  color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                }}>
                  {pendingOrder.orderType === 'market' ? 'Confirm' : 'Place Order'}
                </button>
                <button onClick={handleCancel} style={{
                  padding: '9px 14px', border: '1px solid var(--border)', borderRadius: '6px',
                  background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── Awaiting fill ───────────────────────────────────────────────── */}
          {awaitingFill && !activeOrder && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f59e0b' }}>
                  Awaiting Fill
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700 }}>
                  {ORDER_TYPES.find(o => o.id === awaitingFill.orderType)?.label.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Side</span>
                  <span style={{ fontWeight: 700, color: awaitingFill.side === 'LONG' ? '#22c55e' : '#ef4444' }}>{awaitingFill.side}</span>
                </div>
                {awaitingFill.orderType === 'stop_limit' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Trigger</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>{awaitingFill.stopTrigger?.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{awaitingFill.orderType === 'stop_limit' ? 'Limit' : awaitingFill.orderType === 'limit' ? 'Limit' : 'Stop'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f8ef7' }}>{awaitingFill.entry.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>TP / SL</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: '10px' }}>
                    <span style={{ color: '#22c55e' }}>{awaitingFill.tp.toFixed(2)}</span>
                    {' / '}
                    <span style={{ color: '#ef4444' }}>{awaitingFill.sl.toFixed(2)}</span>
                  </span>
                </div>
              </div>
              <button onClick={() => setAwaitingFill(null)} style={{
                marginTop: '10px', width: '100%', padding: '7px', border: '1px solid var(--border)',
                borderRadius: '6px', background: 'transparent', color: 'var(--muted)',
                cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
              }}>
                Cancel Order
              </button>
            </div>
          )}

          {/* ── Active order ─────────────────────────────────────────────────── */}
          {activeOrder && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>Active Trade</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: activeOrder.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '13px' }}>
                {activeOrder.side === 'LONG' ? '▲' : '▼'} {activeOrder.side}
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>@ {activeOrder.entry.toFixed(2)}</span>
              </div>
              {[{ label: 'TP', val: activeOrder.tp, color: '#22c55e' }, { label: 'SL', val: activeOrder.sl, color: '#ef4444' }].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                  <span style={{ color: r.color, fontWeight: 700, fontFamily: 'monospace' }}>{r.val.toFixed(2)}</span>
                </div>
              ))}
              {livePrice && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                  Unrealized:{' '}
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: (activeOrder.side === 'LONG' ? livePrice - activeOrder.entry : activeOrder.entry - livePrice) * pointValue(symbol) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmt$((activeOrder.side === 'LONG' ? livePrice - activeOrder.entry : activeOrder.entry - livePrice) * pointValue(symbol), true)}
                  </span>
                  {' '}
                  <span style={{ color: 'var(--muted)', fontSize: '10px' }}>@ {livePrice.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button onClick={handleCloseTrade} style={{
                  flex: 1, padding: '8px', border: 'none',
                  borderRadius: '6px', background: activeOrder.side === 'LONG' ? '#dc2626' : '#16a34a',
                  color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit',
                }}>
                  Exit @ Market
                </button>
                <button onClick={() => setActiveOrder(null)} style={{
                  padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: '6px', background: 'transparent', color: 'var(--muted)',
                  cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                  title: 'Remove order without recording P&L',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Trade result ─────────────────────────────────────────────────── */}
          {orderResult && (
            <div style={{ margin: '12px', padding: '14px', border: `1px solid ${orderResult.win ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', background: orderResult.win ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: orderResult.win ? '#22c55e' : '#ef4444' }}>
                {orderResult.win ? '✓ Target Hit' : '✕ Stopped Out'}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: orderResult.win ? '#22c55e' : '#ef4444', marginBottom: '6px' }}>
                {fmt$(orderResult.pnl, true)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                {orderResult.win ? `+${orderResult.r}R` : '-1R'} · {symbol.replace('=F', '')}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '10px' }}>
                Credited to: <span style={{ color: accountMode === 'prop' ? 'var(--accent)' : '#7c3aed', fontWeight: 700 }}>
                  {accountMode === 'prop' ? 'Prop Account' : 'Paper Account'}
                </span>
              </div>

              {/* Grade picker */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Grade this setup</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['A+', 'A', 'B', 'C'].map(g => {
                    const gc = g === 'A+' ? '#22c55e' : g === 'A' ? '#4f8ef7' : g === 'B' ? '#f59e0b' : '#ef4444'
                    const sel = pendingGrade === g
                    return (
                      <button key={g} onClick={() => {
                        setPendingGrade(g)
                        if (lastTradeIdRef.current) updatePaperTrade(lastTradeIdRef.current, { grade: g })
                      }} style={{
                        flex: 1, padding: '5px 4px', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit',
                        border: `1px solid ${sel ? gc : 'var(--border)'}`,
                        borderRadius: '4px', background: sel ? `${gc}22` : 'var(--bg3)',
                        color: sel ? gc : 'var(--muted)', cursor: 'pointer',
                      }}>
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={dismissResult} style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '5px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
                Dismiss
              </button>
            </div>
          )}

          {/* ── Indicators ───────────────────────────────────────────────────── */}
          <div style={{ padding: '14px', flex: 1 }}>
            <IndicatorPanel />
          </div>

          {/* ── Recent trades ─────────────────────────────────────────────────── */}
          {paperAccount.trades.length > 0 && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>Recent Trades</div>
              {paperAccount.trades.slice(-5).reverse().map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '11px' }}>
                  <span style={{ color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {t.side === 'LONG' ? '▲' : '▼'} {t.symbol?.replace('=F', '') || 'ES'}
                  </span>
                  <span style={{ fontSize: '9px', color: t.accountType === 'prop' ? 'var(--accent)' : '#7c3aed' }}>
                    {t.accountType === 'prop' ? 'PROP' : 'PAPER'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmt$(t.pnl, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
