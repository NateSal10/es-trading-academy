import { useState } from 'react'
import useStore from '../../store/index'

function fmt$(n, sign = false) {
  const s = sign && n > 0 ? '+' : n < 0 ? '-' : ''
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtTime(iso) {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch { return '–' }
}

function fmtDate(dateStr) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
  } catch { return dateStr }
}

function SidePill({ side }) {
  const isLong = (side || '').toUpperCase() === 'LONG'
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px',
      borderRadius: '4px', letterSpacing: '0.5px',
      background: isLong ? 'var(--green-bg)' : 'var(--red-bg)',
      color: isLong ? 'var(--green-bright)' : 'var(--red-bright)',
      border: `1px solid ${isLong ? 'var(--green-border)' : 'var(--red-border)'}`,
    }}>
      {isLong ? 'L' : 'S'}
    </span>
  )
}

function DayStatusBadge({ pnl }) {
  if (pnl > 0)  return <span className="badge b-green">Win</span>
  if (pnl < 0)  return <span className="badge b-red">Loss</span>
  return <span className="badge">Flat</span>
}

function TradeRow({ trade }) {
  const pnlColor = trade.pnl > 0 ? 'var(--green-bright)' : trade.pnl < 0 ? 'var(--red-bright)' : 'var(--muted)'
  const r = trade.r != null ? trade.r : (
    trade.entry && trade.sl && trade.exit
      ? (() => {
          const risk   = Math.abs(trade.entry - trade.sl)
          const gained = Math.abs(trade.exit - trade.entry)
          return risk > 0 ? (gained / risk).toFixed(1) : '–'
        })()
      : '–'
  )

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace' }}>
        {fmtTime(trade.date)}
      </td>
      <td style={{ padding: '6px 10px', fontSize: '12px' }}>{trade.symbol || 'ES=F'}</td>
      <td style={{ padding: '6px 10px' }}><SidePill side={trade.side} /></td>
      <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace' }}>
        {trade.entry != null ? trade.entry.toFixed(2) : '–'}
      </td>
      <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace' }}>
        {trade.exit != null ? trade.exit.toFixed(2) : '–'}
      </td>
      <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: pnlColor }}>
        {fmt$(trade.pnl, true)}
      </td>
      <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--muted2)' }}>
        {r !== '–' ? `${r}R` : '–'}
      </td>
    </tr>
  )
}

function DayRow({ dateStr, trades }) {
  const [open, setOpen] = useState(false)
  const dayPnL  = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const wins    = trades.filter(t => t.pnl > 0).length
  const wr      = trades.length > 0 ? Math.round(wins / trades.length * 100) : 0
  const pnlColor = dayPnL > 0 ? 'var(--green-bright)' : dayPnL < 0 ? 'var(--red-bright)' : 'var(--muted)'

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', borderTop: '1px solid var(--border)', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600 }}>
          <span style={{ marginRight: '8px', fontSize: '10px', color: 'var(--muted)', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
          {fmtDate(dateStr)}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--muted2)' }}>
          {trades.length}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: pnlColor }}>
          {fmt$(dayPnL, true)}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '12px', color: wr >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
          {wr}% ({wins}/{trades.length})
        </td>
        <td style={{ padding: '10px 12px' }}>
          <DayStatusBadge pnl={dayPnL} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ padding: 0, background: 'var(--bg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  {['Time (ET)', 'Symbol', 'Side', 'Entry', 'Exit', 'P&L', 'R'].map(h => (
                    <th key={h} style={{ padding: '5px 10px', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map(t => <TradeRow key={t.id} trade={t} />)}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

export default function DailyTradesLog() {
  const paperAccount = useStore(s => s.paperAccount)

  const propTrades = paperAccount.trades.filter(t => t.accountType === 'prop')

  if (propTrades.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '28px' }}>
        No prop trades logged yet. Select <strong style={{ color: 'var(--muted2)' }}>Prop</strong> mode in Practice and close a trade to see your history here.
      </div>
    )
  }

  // Group by date
  const byDate = {}
  for (const t of propTrades) {
    const d = (t.date || new Date().toISOString()).split('T')[0]
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(t)
  }
  const sortedDates = Object.keys(byDate).sort().reverse()

  // Summary stats
  const totalDays  = sortedDates.length
  const allPnLs    = sortedDates.map(d => byDate[d].reduce((s, t) => s + (t.pnl || 0), 0))
  const avgDayPnL  = allPnLs.reduce((s, v) => s + v, 0) / totalDays
  const wins       = propTrades.filter(t => t.pnl > 0).length
  const winRate    = Math.round(wins / propTrades.length * 100)
  const bestDay    = Math.max(...allPnLs)
  const worstDay   = Math.min(...allPnLs)

  return (
    <div className="card" style={{ marginTop: '12px' }}>
      <div className="card-title" style={{ marginBottom: '14px' }}>Daily Trade Log</div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
        {[
          { label: 'Trading Days',  value: totalDays, color: 'var(--accent)' },
          { label: 'Avg Daily P&L', value: fmt$(avgDayPnL, true), color: avgDayPnL >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' },
          { label: 'Win Rate',      value: `${winRate}%`, color: winRate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' },
          { label: 'Best / Worst',  value: `${fmt$(bestDay, true)} / ${fmt$(worstDay, true)}`, color: 'var(--muted2)', small: true },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: s.small ? '12px' : '16px', fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg3)' }}>
              {['Date', 'Trades', 'Day P&L', 'Win Rate', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDates.map(d => (
              <DayRow key={d} dateStr={d} trades={byDate[d]} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
