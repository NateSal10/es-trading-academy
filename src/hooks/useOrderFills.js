export function useOrderFills({
  symbol,
  pointValueFn,
  accountMode,
  activeOrder,
  awaitingFill,
  setActiveOrder,
  setAwaitingFill,
  setOrderResult,
  setPendingGrade,
  addPaperTrade,
  lastTradeIdRef,
  setPlaying
}) {

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
      if (filled) { 
        setActiveOrder({ ...awaitingFill, filledAtCandleTime: candle.time })
        setAwaitingFill(null) 
      }
    }
  }

  function checkTPSL(candle) {
    if (!candle || !activeOrder) return
    const { side, entry, tp, trailPts: tPts, trailSL } = activeOrder
    const pv = pointValueFn(symbol)

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
    const ct = activeOrder.contracts || 1
    const hit = (side === 'LONG')
      ? candle.high >= tp ? { win: true,  pnl: (tp - entry) * pv * ct, exit: tp,  r: +(Math.abs(tp - entry) / Math.abs(entry - sl)).toFixed(1) }
      : candle.low  <= sl ? { win: false, pnl: (sl - entry) * pv * ct, exit: sl,  r: -1 }
      : null
      : candle.low  <= tp ? { win: true,  pnl: (entry - tp) * pv * ct, exit: tp,  r: +(Math.abs(entry - tp) / Math.abs(sl - entry)).toFixed(1) }
      : candle.high >= sl ? { win: false, pnl: (entry - sl) * pv * ct, exit: sl,  r: -1 }
      : null
    if (hit) {
      const tradeId = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      lastTradeIdRef.current = tradeId
      setPendingGrade(null)
      setOrderResult(hit)
      addPaperTrade({
        id: tradeId,
        symbol, side, entry, tp, sl,
        exit: hit.exit,
        pnl: hit.pnl, r: hit.r,
        contracts: ct,
        closePrice: hit.exit,
        status: 'closed',
        date: new Date().toISOString(),
        accountType: accountMode,
      })
      setActiveOrder(null)
      setPlaying(false)
    }
  }

  return { checkFill, checkTPSL }
}
