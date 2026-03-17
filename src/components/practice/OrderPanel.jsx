import { useState } from 'react'
import useStore from '../../store'
import { format } from 'date-fns'

const POINT_VALUE = { ES: 50, MES: 5 }

export default function OrderPanel({ currentPrice }) {
  const [dir, setDir] = useState('LONG')
  const [orderType, setOrderType] = useState('MARKET')
  const [qty, setQty] = useState(1)
  const [limitPrice, setLimitPrice] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [symbol, setSymbol] = useState('ES')

  const addPaperTrade = useStore(s => s.addPaperTrade)
  const paperAccount = useStore(s => s.paperAccount)

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

  function submitOrder() {
    const exitPrice = targetF || entry
    const pnl = (exitPrice - entry) * (dir === 'SHORT' ? -1 : 1) * qty * pv
    addPaperTrade({
      date: format(new Date(), 'yyyy-MM-dd HH:mm'),
      symbol, direction: dir, entry, exit: exitPrice,
      stop: stopF, target: targetF, qty, pnl,
    })
  }

  return (
    <div className="panel-section">
      <div className="panel-title">Paper Trade</div>
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
          <input className="order-input" type="number" step="0.25" value={stop}
            onChange={e => setStop(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <div className="order-input-label">Target</div>
          <input className="order-input" type="number" step="0.25" value={target}
            onChange={e => setTarget(e.target.value)} placeholder="0.00" />
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

      <button className={dir === 'LONG' ? 'submit-long' : 'submit-short'} onClick={submitOrder}>
        {dir === 'LONG' ? '▲ BUY' : '▼ SELL'} {qty} {symbol}
      </button>
    </div>
  )
}
