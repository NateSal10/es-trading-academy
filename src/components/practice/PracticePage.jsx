import { useState, useCallback, useEffect, useRef } from 'react'
import { useChartData, TF_CONFIG } from '../../hooks/useChartData'
import ChartContainer from './ChartContainer'
import ReplayControls from './ReplayControls'
import IndicatorPanel from './IndicatorPanel'
import WatchlistPanel from './WatchlistPanel'
import AccountManager from './AccountManager'
import useStore from '../../store'

const TIMEFRAMES = Object.keys(TF_CONFIG)
const SYMBOLS    = ['ES=F', 'MES=F', 'NQ=F']
const ES_POINT   = 50
const MES_POINT  = 5

// Common stock/ETF suggestions shown as chips
const POPULAR_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'QQQ', 'AMZN', 'META']

const ORDER_TYPES = [
  { id: 'market',     label: 'Market',     desc: 'Fill immediately at current price' },
  { id: 'limit',      label: 'Limit',      desc: 'Long: fill at or below entry · Short: fill at or above entry' },
  { id: 'stop',       label: 'Stop',       desc: 'Long: triggers when price breaks above · Short: when price breaks below' },
  { id: 'stop_limit', label: 'Stop-Limit', desc: 'Activates at trigger price, fills at limit price' },
]

function pointValue(symbol) {
  if (symbol === 'MES=F') return MES_POINT
  if (symbol === 'ES=F')  return ES_POINT
  if (symbol === 'NQ=F')  return 20
  return 1  // stocks/ETFs: $1 per point (100-share lot equivalent)
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
  const [tickerQuery, setTickerQuery] = useState('')
  const [showTickers, setShowTickers] = useState(false)
  const [replayMode,  setReplayMode]  = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [speed,       setSpeed]       = useState(1)
  const [drawingTool, setDrawingTool] = useState(null)  // null | 'hline' | 'line' | 'box'

  // Account mode — derived from active named account
  const namedAccounts      = useStore(s => s.namedAccounts)
  const activeAccountId    = useStore(s => s.activeAccountId)
  const setActiveAccount   = useStore(s => s.setActiveAccount)
  const activeNamedAccount = namedAccounts.find(a => a.id === activeAccountId) ?? namedAccounts[0]
  const accountMode        = activeNamedAccount?.type ?? 'prop'

  const [showAccountManager, setShowAccountManager] = useState(false)
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

  // Local input state for active-order TP/SL — prevents intermediate keystrokes from
  // triggering checkTPSL mid-type (e.g. typing "5610" passes through "5" which
  // would immediately hit the TP condition and close the trade).
  // Values are synced FROM activeOrder when it changes externally (drag, trailing stop).
  // Values are committed TO activeOrder only on blur or Enter.
  const [localTP, setLocalTP] = useState('')
  const [localSL, setLocalSL] = useState('')

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

  const DEFAULT_STOP_PTS = 20
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

  // Sync local TP/SL inputs from activeOrder when it changes externally
  // (chart drag, trailing stop, new fill).  NOT on every tick — only when
  // the stored order values actually change.
  useEffect(() => {
    if (activeOrder) {
      setLocalTP(activeOrder.tp.toFixed(2))
      setLocalSL(activeOrder.sl.toFixed(2))
    } else {
      setLocalTP('')
      setLocalSL('')
    }
  }, [activeOrder?.tp, activeOrder?.sl, activeOrder?.entry])  // include entry so reset on new fill

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
    setPendingGrade(null)
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
    setAwaitingFill(null)
    setTickPrice(null)
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
    setBalanceInput('')
  }

  function handleSetPaperBalance() {
    const bal = parseFloat(balanceInput)
    if (bal > 0) {
      setPaperStartingBalance(bal)
      setBalanceInput('')
    }
  }

  // Use named account data for display (default accounts mirror legacy account/paperAccount)
  const displayBalance = activeAccountId === 'default-prop'  ? account.balance
                       : activeAccountId === 'default-paper' ? paperAccount.balance
                       : activeNamedAccount?.balance ?? 0
  const displayStart   = activeAccountId === 'default-prop'  ? account.startingBalance
                       : activeAccountId === 'default-paper' ? paperAccount.startingBalance
                       : activeNamedAccount?.startingBalance ?? 0
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
        {/* Symbol selector + search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
          <select
            className="tool-btn"
            style={{ fontWeight: 700, paddingLeft: '8px', paddingRight: '8px' }}
            value={SYMBOLS.includes(symbol) ? symbol : ''}
            onChange={e => { if (e.target.value) { setSymbol(e.target.value); setOrderMode(null); setPendingOrder(null) } }}
          >
            {!SYMBOLS.includes(symbol) && (
              <option value="">{symbol}</option>
            )}
            {SYMBOLS.map(s => <option key={s} value={s}>{s.replace('=F', '')}</option>)}
          </select>

          {/* Ticker search input */}
          <div style={{ position: 'relative' }}>
            <input
              className="tool-btn"
              style={{
                width: 76, fontWeight: 700, fontFamily: 'inherit',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                background: showTickers ? 'var(--bg2)' : undefined,
              }}
              placeholder="Search…"
              value={tickerQuery}
              onChange={e => { setTickerQuery(e.target.value.toUpperCase()); setShowTickers(true) }}
              onFocus={() => setShowTickers(true)}
              onBlur={() => setTimeout(() => setShowTickers(false), 150)}
              onKeyDown={e => {
                if (e.key === 'Enter' && tickerQuery.trim()) {
                  setSymbol(tickerQuery.trim())
                  setOrderMode(null)
                  setPendingOrder(null)
                  setTickerQuery('')
                  setShowTickers(false)
                }
                if (e.key === 'Escape') { setTickerQuery(''); setShowTickers(false) }
              }}
            />
            {/* Suggestions dropdown */}
            {showTickers && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                background: '#0e1220', border: '1px solid #2a3a5a',
                borderRadius: 6, minWidth: 140, marginTop: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}>
                {(tickerQuery
                  ? POPULAR_TICKERS.filter(t => t.startsWith(tickerQuery))
                  : POPULAR_TICKERS
                ).map(t => (
                  <button
                    key={t}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 12px', background: 'none', border: 'none',
                      color: symbol === t ? '#4f8ef7' : '#c0c8e0',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Inter, monospace, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    onMouseDown={() => {
                      setSymbol(t)
                      setOrderMode(null)
                      setPendingOrder(null)
                      setTickerQuery('')
                      setShowTickers(false)
                    }}
                  >{t}</button>
                ))}
                {tickerQuery && !POPULAR_TICKERS.includes(tickerQuery) && (
                  <button
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 12px', background: 'none', border: 'none',
                      color: '#4f8ef7', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Inter, monospace, sans-serif',
                      borderTop: '1px solid #1a2340',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    onMouseDown={() => {
                      setSymbol(tickerQuery.trim())
                      setOrderMode(null)
                      setPendingOrder(null)
                      setTickerQuery('')
                      setShowTickers(false)
                    }}
                  >+ Add "{tickerQuery}"</button>
                )}
              </div>
            )}
          </div>
        </div>

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

        {/* Active account + balance */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowAccountManager(true)}
            title="Switch or manage accounts"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg3)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: accountMode === 'prop' ? 'var(--accent)' : '#7c3aed',
            }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeNamedAccount?.name ?? 'Account'}
            </span>
          </button>
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

          {/* ── Watchlist ───────────────────────────────────────────────────── */}
          <div style={{ padding: '10px 10px 0' }}>
            <WatchlistPanel
              activeSymbol={symbol}
              onSelectSymbol={(sym) => { setSymbol(sym); setOrderMode(null); setPendingOrder(null) }}
            />
          </div>

          {/* ── Account panel ──────────────────────────────────────────────── */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                  {activeNamedAccount?.name ?? 'Account'}
                </div>
                <div style={{ fontSize: '9px', color: accountMode === 'prop' ? 'var(--accent)' : '#a78bfa', textTransform: 'uppercase', fontWeight: 600, marginTop: 1 }}>
                  {accountMode}
                </div>
              </div>
              <button onClick={() => setShowAccountManager(true)}
                style={{ fontSize: '10px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Accounts
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {(accountMode === 'prop' ? [
                { label: 'Balance',   val: fmt$(displayBalance),      color: 'var(--text)' },
                { label: 'P&L',       val: fmt$(displayPnL, true),    color: displayPnL >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Daily P&L', val: fmt$(dailyTotalPnL, true), color: dailyTotalPnL >= 0 ? '#22c55e' : dailyTotalPnL <= -DAILY_LOSS_LIMIT ? '#ef4444' : '#f59e0b' },
                { label: 'Day Limit', val: fmt$(Math.max(0, DAILY_LOSS_LIMIT + dailyTotalPnL)) + ' left', color: dailyLimitReached ? '#ef4444' : 'var(--muted)' },
              ] : [
                { label: 'Balance',  val: fmt$(displayBalance),   color: 'var(--text)' },
                { label: 'P&L',      val: fmt$(displayPnL, true), color: displayPnL >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Starting', val: fmt$(displayStart),     color: 'var(--muted)' },
              ]).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Order entry (TV-style) ─────────────────────────────────────── */}
          {!hasActiveFlow && (
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>

              {/* Order type pills */}
              <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
                {ORDER_TYPES.map(ot => (
                  <button
                    key={ot.id}
                    onClick={() => setOrderType(ot.id)}
                    title={ot.desc}
                    style={{
                      flex: 1, padding: '5px 0', fontSize: '10px', fontWeight: 700, fontFamily: 'inherit',
                      border: `1px solid ${orderType === ot.id ? '#2a3f6e' : 'transparent'}`,
                      borderRadius: '4px',
                      background: orderType === ot.id ? '#101828' : 'transparent',
                      color: orderType === ot.id ? '#7eb5f7' : '#4a5580',
                      cursor: 'pointer', transition: 'all .12s', letterSpacing: '0.3px',
                    }}
                  >
                    {ot.label}
                  </button>
                ))}
              </div>

              {/* Buy / Sell (TV-style full-width buttons) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {['LONG', 'SHORT'].map(side => {
                  const isActive = orderMode === side
                  const isGreen  = side === 'LONG'
                  return (
                    <button
                      key={side}
                      onClick={() => {
                        if (orderType === 'market') {
                          // Market orders fill instantly (no confirmation step) — like TradingView paper trading
                          const entryPrice = livePrice ?? lastPrice
                          if (entryPrice == null) return
                          const stop = DEFAULT_STOP_PTS
                          const tp = side === 'LONG' ? entryPrice + stop * 2 : entryPrice - stop * 2
                          const sl = side === 'LONG' ? entryPrice - stop     : entryPrice + stop
                          const currentCandleTime = replayMode
                            ? (candles[replayIndex - 1]?.time ?? 0)
                            : (candles.length > 0 ? candles[candles.length - 1].time : 0)
                          const trailData = trailingEnabled ? { trailPts, trailSL: sl } : {}
                          setActiveOrder({ side, orderType: 'market', entry: entryPrice, tp, sl, filledAtCandleTime: currentCandleTime, ...trailData })
                        } else {
                          setOrderMode(orderMode === side ? null : side)
                        }
                      }}
                      style={{
                        flex: 1, padding: '11px 6px', fontFamily: 'inherit',
                        border: 'none',
                        borderRadius: '5px',
                        background: isGreen ? (isActive ? '#166534' : '#14532d') : (isActive ? '#7f1d1d' : '#450a0a'),
                        color: isGreen ? (isActive ? '#4ade80' : '#22c55e') : (isActive ? '#f87171' : '#ef4444'),
                        cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all .12s',
                        boxShadow: isActive ? `0 0 0 1px ${isGreen ? '#22c55e55' : '#ef444455'}` : 'none',
                      }}
                    >
                      {side === 'LONG' ? '▲ Buy' : '▼ Sell'}
                    </button>
                  )
                })}
              </div>

              {livePrice && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'monospace' }}>
                  Market: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{livePrice.toFixed(2)}</span>
                </div>
              )}

              {orderMode && (
                <div style={{ fontSize: '10px', color: '#7eb5f7', textAlign: 'center', padding: '5px 8px', background: 'rgba(79,142,247,0.07)', borderRadius: '4px', marginBottom: '6px' }}>
                  Click chart to set {orderType === 'limit' ? 'limit price' : orderType === 'stop' ? 'stop trigger' : 'stop trigger'}
                </div>
              )}

              {/* Trailing stop */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={trailingEnabled} onChange={e => setTrailingEnabled(e.target.checked)}
                    style={{ accentColor: '#f59e0b', cursor: 'pointer' }} />
                  <span style={{ fontSize: '11px', color: trailingEnabled ? '#f59e0b' : 'var(--muted)', fontWeight: 600 }}>Trail Stop</span>
                </label>
                {trailingEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" min="1" step="1" value={trailPts} onChange={e => setTrailPts(Math.max(1, +e.target.value))}
                      style={{ width: '48px', background: 'var(--bg3)', border: '1px solid #f59e0b44', borderRadius: '4px', color: '#f59e0b', padding: '3px 6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', textAlign: 'right' }} />
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>pts</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Pending order ticket (TV-style) ─────────────────────────────── */}
          {pendingOrder && (
            <div style={{
              margin: '10px',
              border: `1px solid ${pendingOrder.side === 'LONG' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderLeft: `3px solid ${pendingOrder.side === 'LONG' ? '#22c55e' : '#ef4444'}`,
              borderRadius: '6px',
              background: pendingOrder.side === 'LONG' ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)',
              overflow: 'hidden',
            }}>
              {/* Ticket header */}
              <div style={{
                padding: '8px 12px',
                background: pendingOrder.side === 'LONG' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: pendingOrder.side === 'LONG' ? '#4ade80' : '#f87171', letterSpacing: '0.5px' }}>
                  {pendingOrder.side === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                </span>
                <span style={{ fontSize: '10px', color: '#6b7a9e', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '3px', fontWeight: 600 }}>
                  {ORDER_TYPES.find(o => o.id === pendingOrder.orderType)?.label.toUpperCase()}
                </span>
              </div>

              {/* Price rows */}
              <div style={{ padding: '8px 12px' }}>
                {[
                  ...(pendingOrder.orderType === 'stop_limit' ? [
                    { label: 'Trigger', val: pendingOrder.stopTrigger, color: '#f59e0b', key: 'stopTrigger', pts: null },
                    { label: 'Limit',   val: pendingOrder.entry,       color: '#7eb5f7', key: 'entry', pts: null },
                  ] : [
                    {
                      label: pendingOrder.orderType === 'limit' ? 'Limit'
                           : pendingOrder.orderType === 'stop'  ? 'Stop'
                           : 'Entry',
                      val: pendingOrder.entry, color: '#7eb5f7', key: 'entry', pts: null,
                    },
                  ]),
                  { label: 'TP', val: pendingOrder.tp, color: '#4ade80', key: 'tp',
                    pts: +(pendingOrder.tp - pendingOrder.entry).toFixed(2) },
                  { label: 'SL', val: pendingOrder.sl, color: '#f87171', key: 'sl',
                    pts: +(pendingOrder.sl - pendingOrder.entry).toFixed(2) },
                ].map((row, i) => (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 0',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#4a5580', fontWeight: 600, minWidth: '40px' }}>{row.label}</span>
                      {row.pts !== null && (
                        <span style={{ fontSize: '9px', color: row.pts > 0 ? '#4ade8099' : '#f8717199', fontFamily: 'monospace' }}>
                          {row.pts > 0 ? '+' : ''}{row.pts}
                        </span>
                      )}
                    </div>
                    <input
                      type="number" step="0.25" value={row.val}
                      onChange={e => handleUpdateOrder({ [row.key]: +e.target.value })}
                      style={{
                        width: '84px', background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${row.color}44`,
                        borderRadius: '4px', color: row.color,
                        padding: '4px 8px', fontSize: '13px', fontWeight: 700,
                        fontFamily: 'monospace', textAlign: 'right',
                      }}
                    />
                  </div>
                ))}

                {/* R:R bar */}
                <div style={{
                  marginTop: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#4a5580', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Risk:Reward</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{rr(pendingOrder.entry, pendingOrder.tp, pendingOrder.sl)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: '#4a5580', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Max Risk</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
                      {fmt$(Math.abs(pendingOrder.entry - pendingOrder.sl) * pointValue(symbol))}
                    </div>
                  </div>
                </div>

                {pendingOrder.orderType !== 'market' && (
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#c08030', lineHeight: 1.5, background: 'rgba(245,158,11,0.07)', padding: '5px 8px', borderRadius: '4px' }}>
                    {pendingOrder.orderType === 'limit'
                      ? `Waits until price reaches ${pendingOrder.entry.toFixed(2)}`
                      : pendingOrder.orderType === 'stop'
                      ? `Triggers when price hits ${pendingOrder.entry.toFixed(2)}`
                      : `Triggers @ ${pendingOrder.stopTrigger?.toFixed(2)}, fills @ ${pendingOrder.entry.toFixed(2)}`}
                  </div>
                )}

                {trailingEnabled && (
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#c08030', background: 'rgba(245,158,11,0.07)', padding: '4px 8px', borderRadius: '4px' }}>
                    Trailing stop: {trailPts} pts
                  </div>
                )}

                {orderValidError && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '5px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    ⚠ {orderValidError}
                  </div>
                )}

                <div style={{ marginTop: '4px', fontSize: '9px', color: '#3a4460', textAlign: 'center' }}>
                  Drag Entry / TP / SL lines on chart to adjust
                </div>

                {/* Confirm / Cancel */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={handleConfirm} style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: '5px',
                    background: pendingOrder.side === 'LONG' ? '#166534' : '#7f1d1d',
                    color: pendingOrder.side === 'LONG' ? '#4ade80' : '#f87171',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                    transition: 'filter .12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.filter = ''}
                  >
                    {pendingOrder.orderType === 'market' ? '✓ Confirm Trade' : '✓ Place Order'}
                  </button>
                  <button onClick={handleCancel} style={{
                    padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '5px',
                    background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                  }}>✕</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Awaiting fill (TV-style) ─────────────────────────────────────── */}
          {awaitingFill && !activeOrder && (
            <div style={{
              margin: '10px',
              border: '1px solid rgba(245,158,11,0.25)',
              borderLeft: '3px solid #f59e0b',
              borderRadius: '6px',
              background: 'rgba(245,158,11,0.04)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '7px 12px', background: 'rgba(245,158,11,0.10)',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', flex: 1 }}>Awaiting Fill</span>
                <span style={{ fontSize: '10px', color: '#6b7a9e', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px' }}>
                  {ORDER_TYPES.find(o => o.id === awaitingFill.orderType)?.label.toUpperCase()}
                </span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a5580' }}>Side</span>
                  <span style={{ fontWeight: 700, color: awaitingFill.side === 'LONG' ? '#4ade80' : '#f87171' }}>{awaitingFill.side}</span>
                </div>
                {awaitingFill.orderType === 'stop_limit' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4a5580' }}>Trigger</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>{awaitingFill.stopTrigger?.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a5580' }}>
                    {awaitingFill.orderType === 'stop_limit' ? 'Limit' : awaitingFill.orderType === 'limit' ? 'Limit' : 'Stop'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7eb5f7' }}>{awaitingFill.entry.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a5580' }}>TP</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>{awaitingFill.tp.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a5580' }}>SL</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f87171' }}>{awaitingFill.sl.toFixed(2)}</span>
                </div>
                <button onClick={() => setAwaitingFill(null)} style={{
                  marginTop: '4px', width: '100%', padding: '7px', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '4px', background: 'transparent', color: '#f59e0b',
                  cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600,
                }}>
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* ── Active trade (TV-style) ──────────────────────────────────────── */}
          {activeOrder && (() => {
            const pv  = pointValue(symbol)
            const uPnL = livePrice != null
              ? (activeOrder.side === 'LONG' ? livePrice - activeOrder.entry : activeOrder.entry - livePrice) * pv
              : null
            const isProfit = uPnL != null && uPnL >= 0
            const sideColor = activeOrder.side === 'LONG' ? '#4ade80' : '#f87171'
            const tpPts = +(activeOrder.tp - activeOrder.entry).toFixed(2)
            const slPts = +(activeOrder.sl - activeOrder.entry).toFixed(2)
            return (
              <div style={{
                margin: '10px',
                border: `1px solid ${activeOrder.side === 'LONG' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                borderLeft: `3px solid ${sideColor}`,
                borderRadius: '6px',
                background: activeOrder.side === 'LONG' ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)',
                overflow: 'hidden',
              }}>
                {/* Header: side + entry + unrealized */}
                <div style={{
                  padding: '8px 12px',
                  background: activeOrder.side === 'LONG' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: sideColor }}>
                      {activeOrder.side === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7a9e', marginTop: '1px', fontFamily: 'monospace' }}>
                      Entry {activeOrder.entry.toFixed(2)}
                    </div>
                  </div>
                  {uPnL != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: '#4a5580', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unrealized</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: isProfit ? '#4ade80' : '#f87171' }}>
                        {fmt$(uPnL, true)}
                      </div>
                      {livePrice && (
                        <div style={{ fontSize: '9px', color: '#4a5580', fontFamily: 'monospace' }}>@ {livePrice.toFixed(2)}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* TP / SL rows with editable inputs
                    Local state prevents mid-type intermediate values (e.g. "5" while
                    typing "5610") from triggering checkTPSL and closing the trade.
                    Changes commit to activeOrder on blur or Enter only. */}
                <div style={{ padding: '8px 12px' }}>
                  {[
                    { label: 'TP', localVal: localTP, setLocal: setLocalTP, color: '#4ade80', pts: tpPts, key: 'tp' },
                    { label: 'SL', localVal: localSL, setLocal: setLocalSL, color: '#f87171', pts: slPts, key: 'sl' },
                  ].map((r, i) => {
                    function commit() {
                      const v = parseFloat(r.localVal)
                      if (!isNaN(v)) handleUpdateActiveOrder({ [r.key]: v })
                    }
                    return (
                    <div key={r.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#4a5580', fontWeight: 600, minWidth: '18px' }}>{r.label}</span>
                        <span style={{ fontSize: '9px', color: `${r.color}99`, fontFamily: 'monospace' }}>
                          {r.pts > 0 ? '+' : ''}{r.pts}
                        </span>
                      </div>
                      <input
                        type="number" step="0.25"
                        value={r.localVal}
                        onChange={e => r.setLocal(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur() } }}
                        style={{
                          width: '84px', background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${r.color}44`,
                          borderRadius: '4px', color: r.color,
                          padding: '4px 8px', fontSize: '13px', fontWeight: 700,
                          fontFamily: 'monospace', textAlign: 'right',
                        }}
                      />
                    </div>
                    )
                  })}

                  <div style={{ fontSize: '9px', color: '#3a4460', textAlign: 'center', marginTop: '4px', marginBottom: '8px' }}>
                    Drag TP / SL lines on chart to adjust
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={handleCloseTrade} style={{
                      flex: 1, padding: '10px', border: 'none',
                      borderRadius: '5px',
                      background: activeOrder.side === 'LONG' ? '#7f1d1d' : '#14532d',
                      color: activeOrder.side === 'LONG' ? '#f87171' : '#4ade80',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                      transition: 'filter .12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.filter = ''}
                    >
                      ✕ Close @ Market
                    </button>
                    <button onClick={() => setActiveOrder(null)} style={{
                      padding: '10px 10px', border: '1px solid var(--border)',
                      borderRadius: '5px', background: 'transparent', color: '#4a5580',
                      cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                      title: 'Discard without logging P&L',
                    }}>
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

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
                  {activeNamedAccount?.name ?? (accountMode === 'prop' ? 'Prop Account' : 'Paper Account')}
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

      {/* Account Manager modal */}
      {showAccountManager && <AccountManager onClose={() => setShowAccountManager(false)} />}
    </div>
  )
}
