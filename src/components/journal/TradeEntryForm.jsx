import { useState } from 'react'
import { format } from 'date-fns'
import useStore from '../../store/index'

const POINT_VALUES = { ES: 50, MES: 5, NQ: 20, MNQ: 2 }

const DEFAULT_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  symbol: 'ES',
  direction: 'LONG',
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  target: '',
  contracts: 1,
  setup: 'FVG',
  notes: '',
}

function calcMetrics(form) {
  const entry = parseFloat(form.entryPrice)
  const exit = parseFloat(form.exitPrice)
  const stop = parseFloat(form.stopLoss)
  const contracts = parseInt(form.contracts, 10) || 1
  const pv = POINT_VALUES[form.symbol] || 50

  if (!entry || !exit || !stop) return { rr: null, pnl: null, rMult: null }

  const isLong = form.direction === 'LONG'
  const risk = isLong ? entry - stop : stop - entry
  const reward = isLong ? exit - entry : entry - exit

  const rr = risk !== 0 ? Math.abs(reward / risk) : null
  const rMult = risk !== 0 ? reward / risk : null
  const pnl = (isLong ? exit - entry : entry - exit) * contracts * pv

  return { rr, pnl, rMult }
}

export default function TradeEntryForm() {
  const addTrade = useStore(s => s.addTrade)
  const updateAccountPnL = useStore(s => s.updateAccountPnL)

  const [form, setForm] = useState(DEFAULT_FORM)

  const metrics = calcMetrics(form)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.entryPrice || !form.exitPrice || !form.stopLoss) return

    const trade = {
      ...form,
      entryPrice: parseFloat(form.entryPrice),
      exitPrice: parseFloat(form.exitPrice),
      stopLoss: parseFloat(form.stopLoss),
      target: parseFloat(form.target) || null,
      contracts: parseInt(form.contracts, 10) || 1,
      pnl: metrics.pnl ?? 0,
      rr: metrics.rr ?? 0,
      rMultiple: metrics.rMult ?? 0,
    }

    addTrade(trade)
    updateAccountPnL(form.date, metrics.pnl ?? 0)
    setForm({ ...DEFAULT_FORM, date: form.date })
  }

  const fieldStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: '11px',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  return (
    <div className="card">
      <div className="card-title">Log Trade</div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Symbol</label>
            <select name="symbol" value={form.symbol} onChange={handleChange} style={fieldStyle}>
              <option>ES</option>
              <option>MES</option>
              <option>NQ</option>
              <option>MNQ</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Direction</label>
            <select name="direction" value={form.direction} onChange={handleChange} style={fieldStyle}>
              <option>LONG</option>
              <option>SHORT</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Setup</label>
            <select name="setup" value={form.setup} onChange={handleChange} style={fieldStyle}>
              <option>FVG</option>
              <option>OB</option>
              <option>B&amp;R</option>
              <option>OB+FVG</option>
              <option>Sweep+OB</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Entry Price</label>
            <input type="number" name="entryPrice" value={form.entryPrice} onChange={handleChange}
              step="0.25" placeholder="0.00" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Exit Price</label>
            <input type="number" name="exitPrice" value={form.exitPrice} onChange={handleChange}
              step="0.25" placeholder="0.00" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Stop Loss</label>
            <input type="number" name="stopLoss" value={form.stopLoss} onChange={handleChange}
              step="0.25" placeholder="0.00" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Target</label>
            <input type="number" name="target" value={form.target} onChange={handleChange}
              step="0.25" placeholder="0.00" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Contracts</label>
            <input type="number" name="contracts" value={form.contracts} onChange={handleChange}
              min="1" step="1" style={fieldStyle} />
          </div>

          {/* Live metrics */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Live Calc
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--muted)' }}>R:R</span>
                <span style={{ fontWeight: 600, color: metrics.rr !== null ? 'var(--text)' : 'var(--muted)' }}>
                  {metrics.rr !== null ? `1 : ${metrics.rr.toFixed(2)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--muted)' }}>P&amp;L</span>
                <span style={{ fontWeight: 600, color: metrics.pnl !== null ? (metrics.pnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}>
                  {metrics.pnl !== null ? `${metrics.pnl >= 0 ? '+' : ''}$${metrics.pnl.toFixed(2)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--muted)' }}>R-mult</span>
                <span style={{ fontWeight: 600, color: metrics.rMult !== null ? (metrics.rMult >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}>
                  {metrics.rMult !== null ? `${metrics.rMult >= 0 ? '+' : ''}${metrics.rMult.toFixed(2)}R` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Setup rationale, market context, mistakes…"
            style={{ ...fieldStyle, resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <button type="submit" className="next-btn" style={{ width: '100%', padding: '10px' }}>
          Log Trade
        </button>
      </form>
    </div>
  )
}
