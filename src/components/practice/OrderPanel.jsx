import { useState, useEffect, useRef } from 'react'
import useStore from '../../store'
import { format } from 'date-fns'

const POINT_VALUE = { ES: 50, MES: 5 }

export default function OrderPanel({ currentPrice }) {
  const addPaperTrade = useStore(s => s.addPaperTrade)
  const paperAccount = useStore(s => s.paperAccount)

  const [dir, setDir] = useState('LONG')
  const [orderType, setOrderType] = useState('MARKET')
  const [qty, setQty] = useState(() => paperAccount?.trades?.[0]?.qty ?? 1)
  const [limitPrice, setLimitPrice] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [symbol, setSymbol] = useState(() => paperAccount?.trades?.[0]?.symbol ?? 'ES')

  const panelRef = useRef(null)
  const stopRef = useRef(null)
  const targetRef = useRef(null)

  const entry = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice) || currentPrice
  const stopF = parseFloat(stop)
  const targetF = parseFloat(target)
  const pv = POINT_VALUE[symbol] || 50

  const rr = (stop && target && entry)
    ? Math.abs((targetF - entry) / (entry - stopF)).toFixed(2)
    : '—'
  const potentialPnL = (stop && target && entry)
    ? ((targetF - entry) * (dir === 'SHORT' ? -1 : 1) * qty * pv).toFixed(0)
    : '—'

  // Risk banner calcs
  const hasAll = stop !== '' && target !== '' && !isNaN(entry)
  const riskPoints = hasAll ? Math.abs(entry - stopF) : 0
  const riskDollars = hasAll ? riskPoints * pv * qty : 0
  const rewardDollars = hasAll ? Math.abs(targetF - entry) * pv * qty : 0
  const rrRatio = riskDollars > 0 ? (rewardDollars / riskDollars).toFixed(2) : '—'
  const acctRiskPct = paperAccount.balance > 0 ? (riskDollars / paperAccount.balance) * 100 : 0

  // Validation
  const slInvalid = stop !== '' && (dir === 'LONG' ? stopF >= entry : stopF <= entry)
  const tpInvalid = target !== '' && (dir === 'LONG' ? targetF <= entry : targetF >= entry)
  const formInvalid = slInvalid || tpInvalid || !stop || !target

  function submitOrder() {
    if (formInvalid) return
    const exitPrice = targetF || entry
    const pnl = (exitPrice - entry) * (dir === 'SHORT' ? -1 : 1) * qty * pv
    addPaperTrade({
      date: format(new Date(), 'yyyy-MM-dd HH:mm'),
      symbol, direction: dir, entry, exit: exitPrice,
      stop: stopF, target: targetF, qty, pnl,
    })
  }

  // Keyboard hotkeys
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'b' || e.key === 'B')) {
        if (typing) return
        e.preventDefault()
        setDir('LONG')
        ;(stopRef.current || targetRef.current)?.focus()
        return
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
        if (typing) return
        e.preventDefault()
        setDir('SHORT')
        ;(stopRef.current || targetRef.current)?.focus()
        return
      }
      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (panelRef.current && panelRef.current.contains(document.activeElement)) {
          if (!formInvalid) {
            e.preventDefault()
            submitOrder()
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formInvalid, dir, stopF, targetF, entry, qty, symbol, orderType, stop, target]) // eslint-disable-line

  const bannerHot = acctRiskPct > 2
  const bannerStyle = bannerHot
    ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.5)', color: 'var(--red-bright)', borderRadius: 8, padding: '6px 10px', fontSize: 11, marginBottom: 8 }
    : { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 11, marginBottom: 8 }

  return (
    <div className="panel-section" ref={panelRef}>
      <div className="panel-title">Paper Trade</div>

      <div className={`risk-banner ${bannerHot ? 'risk-banner-hot' : ''}`} style={bannerStyle}>
        <div className="risk-banner-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>R:R <strong>{rrRatio === '—' ? '—' : `1:${rrRatio}`}</strong></span>
          <span>Risk <strong>{hasAll ? `$${Math.round(riskDollars).toLocaleString()}` : '—'}</strong></span>
          <span>Acct% <strong>{hasAll ? `${acctRiskPct.toFixed(2)}%` : '—'}</strong></span>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
        Balance: <strong style={{ color: 'var(--text)' }}>${paperAccount.balance.toLocaleString()}</strong>
      </div>

      {/* Direction tabs */}
      <div className="order-type-tabs" style={{ marginBottom: '8px' }}>
        {['LONG', 'SHORT'].map(d => (
          <button key={d} className={`order-tab ${d.toLowerCase()}${dir === d ? ' active' : ''}`} onClick={() => setDir(d)}>
            {d === 'LONG' ? '▲' : '▼'} {d}
          </button>
        ))}
      </div>

      {/* Symbol + Order type */}
      <div className="form-grid" style={{ marginBottom: '6px' }}>
        <div>
          <div className="order-input-label">Symbol</div>
          <select className="order-input" value={symbol} onChange={e => setSymbol(e.target.value)}>
            <option>ES</option><option>MES</option>
          </select>
        </div>
        <div>
          <div className="order-input-label">Type</div>
          <select className="order-input" value={orderType} onChange={e => setOrderType(e.target.value)}>
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>
        </div>
      </div>

      {orderType === 'LIMIT' && (
        <div style={{ marginBottom: '6px' }}>
          <div className="order-input-label">Limit Price</div>
          <input className="order-input" type="number" step="0.25" value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)} placeholder={currentPrice?.toFixed(2)} />
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: '6px' }}>
        <div>
          <div className="order-input-label">Stop Loss</div>
          <input ref={stopRef} className="order-input" type="number" step="0.25" value={stop}
            onChange={e => setStop(e.target.value)} placeholder="0.00"
            style={{ borderColor: slInvalid ? 'var(--red)' : undefined }} />
        </div>
        <div>
          <div className="order-input-label">Target</div>
          <input ref={targetRef} className="order-input" type="number" step="0.25" value={target}
            onChange={e => setTarget(e.target.value)} placeholder="0.00"
            style={{ borderColor: tpInvalid ? 'var(--red)' : undefined }} />
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div className="order-input-label">Contracts</div>
        <input className="order-input" type="number" min="1" value={qty}
          onChange={e => setQty(parseInt(e.target.value) || 1)} />
      </div>

      {/* Live calc */}
      <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px', marginBottom: '8px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: 'var(--muted)' }}>R:R</span>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{rr}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--muted)' }}>Target P&L</span>
          <span style={{ color: parseFloat(potentialPnL) >= 0 ? '#5DCAA5' : '#ef7a50', fontWeight: 700 }}>
            {potentialPnL === '—' ? '—' : `$${parseInt(potentialPnL).toLocaleString()}`}
          </span>
        </div>
      </div>

      <button className={dir === 'LONG' ? 'submit-long' : 'submit-short'} onClick={submitOrder}
        disabled={formInvalid}
        style={{ opacity: formInvalid ? 0.5 : 1, cursor: formInvalid ? 'not-allowed' : 'pointer' }}>
        {dir === 'LONG' ? '▲ BUY' : '▼ SELL'} {qty} {symbol}
      </button>
      {slInvalid && <div style={{ color: 'var(--red-bright)', fontSize: 10, marginTop: 4 }}>SL must be {dir === 'LONG' ? 'below' : 'above'} entry</div>}
      {tpInvalid && <div style={{ color: 'var(--red-bright)', fontSize: 10, marginTop: 4 }}>TP must be {dir === 'LONG' ? 'above' : 'below'} entry</div>}
    </div>
  )
}
