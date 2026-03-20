import { useState, useMemo } from 'react'
import useStore from '../../store/index'
import SessionClock from './SessionClock'
import useCountUp from '../../hooks/useCountUp'
import ConsistencyChart from '../proptracker/ConsistencyChart'

function fmt$(n, sign = false) {
  const s = sign && n > 0 ? '+' : n < 0 ? '-' : ''
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatsBar({ items }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      border: '1px solid var(--border)',
      borderRadius: '10px',
      marginBottom: '14px',
      overflow: 'hidden',
      background: 'var(--card)',
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: '10px 12px',
          borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '5px', fontWeight: 600 }}>
            {item.label}
          </div>
          <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: item.color || 'var(--text)' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, accentColor, mono = true }) {
  return (
    <div className="card" style={{ textAlign: 'center', marginBottom: 0, borderTop: `2px solid ${accentColor}` }}>
      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: mono ? 'monospace' : 'inherit', color: 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}

function MeterBar({ label, used, limit, color }) {
  const pct = Math.min(100, limit > 0 ? Math.round(Math.abs(used) / limit * 100) : 0)
  const barColor = pct >= 80 ? 'var(--red-bright)' : pct >= 50 ? 'var(--amber-bright)' : color
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', fontSize: '10px', fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: 'monospace', color: barColor, fontWeight: 700 }}>
          {fmt$(Math.abs(used))} / {fmt$(limit)}
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: barColor,
          borderRadius: '3px', transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', textAlign: 'right' }}>
        {pct}% used · {fmt$(limit - Math.abs(used))} remaining
      </div>
    </div>
  )
}

function DrawdownMeter({ todayPnL, balance, peakBalance, startingBalance }) {
  const dailyLoss = Math.min(0, todayPnL)
  const ddFromPeak = Math.max(0, peakBalance - balance)
  const profitGain = Math.max(0, balance - startingBalance)
  const PROFIT_TARGET = 3000
  const profitPct = Math.min(100, Math.round(profitGain / PROFIT_TARGET * 100))
  const profitColor = profitPct >= 100 ? 'var(--green-bright)' : 'var(--accent)'

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', fontWeight: 600 }}>
        Prop Risk Limits
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <MeterBar label="Daily Loss" used={dailyLoss} limit={1000} color="var(--green-bright)" />
        <MeterBar label="Max Drawdown" used={ddFromPeak} limit={2000} color="var(--green-bright)" />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', fontSize: '10px', fontWeight: 600 }}>Profit Target</span>
            <span style={{ fontFamily: 'monospace', color: profitColor, fontWeight: 700 }}>
              {fmt$(profitGain, true)} / {fmt$(PROFIT_TARGET)}
            </span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${profitPct}%`,
              background: profitColor, borderRadius: '3px', transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', textAlign: 'right' }}>
            {profitPct}% · {fmt$(PROFIT_TARGET - profitGain)} to go
          </div>
        </div>
      </div>
    </div>
  )
}

function EquityCurve({ dailyPnL, startingBalance }) {
  const dates = Object.keys(dailyPnL).sort()
  if (dates.length < 2) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No equity data yet — start trading</span>
      </div>
    )
  }

  let bal = startingBalance
  const points = dates.map(d => { bal += dailyPnL[d]; return bal })

  const W = 400, H = 90
  const minV = Math.min(...points) * 0.999
  const maxV = Math.max(...points) * 1.001
  const range = maxV - minV || 1
  function toX(i) { return (i / (points.length - 1)) * W }
  function toY(v) { return 10 + 70 - ((v - minV) / range) * 70 }

  const pathD = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const areaD = `${pathD} L ${toX(points.length - 1)} ${H} L ${toX(0)} ${H} Z`
  const lastBal = points[points.length - 1]
  const isUp = lastBal >= startingBalance
  const lineColor = isUp ? 'var(--green-bright)' : 'var(--red-bright)'
  const gradId = `eq-grad-${isUp ? 'g' : 'r'}`

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Equity Curve</span>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: lineColor, fontWeight: 600 }}>
          {fmt$(lastBal - startingBalance, true)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px`, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={toX(points.length - 1)} cy={toY(lastBal)} r="3" fill={lineColor} />
      </svg>
    </div>
  )
}

function ResetButton({ mode }) {
  const resetAccount      = useStore(s => s.resetAccount)
  const resetPaperAccount = useStore(s => s.resetPaperAccount)
  const [confirming, setConfirming] = useState(false)

  const isProp = mode === 'prop'
  const confirmMsg = isProp ? 'Reset prop account to $50K?' : 'Reset paper account?'

  function handleReset() {
    if (confirming) { isProp ? resetAccount() : resetPaperAccount(); setConfirming(false) }
    else setConfirming(true)
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{confirmMsg}</span>
        <button onClick={handleReset} style={{
          padding: '6px 14px', background: 'var(--red-bg)', border: '1px solid rgba(216,90,48,0.4)',
          borderRadius: '6px', color: '#ef7a50', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
        }}>Confirm Reset</button>
        <button onClick={() => setConfirming(false)} style={{
          padding: '6px 14px', background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
        }}>Cancel</button>
      </div>
    )
  }

  return (
    <button onClick={handleReset} style={{
      padding: '7px 16px', background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', transition: 'color 0.15s, border-color 0.15s',
    }}
      onMouseEnter={e => { e.target.style.color = '#ef7a50'; e.target.style.borderColor = 'rgba(216,90,48,0.4)' }}
      onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border)' }}
    >
      Reset Account
    </button>
  )
}

function RecentTrades({ trades }) {
  const recent = trades.slice(-6).reverse()
  if (!recent.length) {
    return (
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Recent Trades</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>No trades yet</div>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recent Trades</div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 50px 70px 50px', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', textAlign: 'right' }}>
          <span style={{ textAlign: 'left' }}>Entry → Exit</span>
          <span>Side</span>
          <span>P&amp;L</span>
          <span>R</span>
        </div>
      </div>
      {recent.map(t => (
        <div key={t.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '11px' }}>
              {t.side === 'LONG' ? '▲' : '▼'}
            </span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{(t.symbol || 'ES=F').replace('=F', '')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 50px 70px 50px', textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'left' }}>
              {t.entry?.toFixed(1)} → {t.exit?.toFixed(1)}
            </span>
            <span style={{ color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontSize: '11px', fontWeight: 600 }}>
              {t.side}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
              {t.pnl >= 0 ? '+' : ''}{fmt$(t.pnl)}
            </span>
            <span style={{ fontFamily: 'monospace', color: t.r > 0 ? 'var(--accent)' : 'var(--muted)', fontSize: '11px' }}>
              {t.r != null ? `${Number(t.r) > 0 ? '+' : ''}${Number(t.r).toFixed(1)}R` : '–'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function DayModal({ dateStr, dayTrades, pnl, onClose }) {
  const wins    = dayTrades.filter(t => t.pnl > 0).length
  const losses  = dayTrades.length - wins
  const totalR  = dayTrades.reduce((s, t) => s + (t.r || 0), 0)
  const avgR    = dayTrades.length ? (totalR / dayTrades.length).toFixed(1) : '–'
  const pnlColor = pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : 'var(--muted)'

  // Format date nicely: "Wednesday, March 19, 2026"
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateObj    = new Date(y, m - 1, d)
  const longDate   = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '14px', width: '560px', maxWidth: '95vw',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
              {longDate}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} · {wins}W {losses}L · Avg {avgR}R
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontFamily: 'monospace', fontWeight: 700, color: pnlColor }}>
              {pnl > 0 ? '+' : ''}{fmt$(pnl)}
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: '4px', background: 'none', border: 'none',
                color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
              }}
            >✕ Close</button>
          </div>
        </div>

        {/* Summary stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border)',
        }}>
          {[
            { label: 'Net P&L',   value: (pnl > 0 ? '+' : '') + fmt$(pnl),       color: pnlColor },
            { label: 'Win Rate',  value: dayTrades.length ? `${Math.round(wins / dayTrades.length * 100)}%` : '–', color: wins > losses ? '#22c55e' : '#ef4444' },
            { label: 'Avg R',     value: avgR !== '–' ? `${avgR}R` : '–',         color: 'var(--accent)' },
            { label: 'Trades',    value: String(dayTrades.length),                 color: 'var(--text)' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '12px 16px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Trade list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 20px' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 90px 110px 80px 70px 60px',
            gap: '8px', padding: '12px 0 6px',
            fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span>Symbol</span>
            <span>Side</span>
            <span>Entry → Exit</span>
            <span style={{ textAlign: 'right' }}>P&amp;L</span>
            <span style={{ textAlign: 'right' }}>R</span>
            <span style={{ textAlign: 'right' }}>Account</span>
          </div>
          {dayTrades.map((t, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 90px 110px 80px 70px 60px',
              gap: '8px', padding: '11px 0',
              borderBottom: i < dayTrades.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                {(t.symbol || 'ES=F').replace('=F', '')}
              </span>
              <span style={{ color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '12px' }}>
                {t.side === 'LONG' ? '▲ Long' : '▼ Short'}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text)' }}>
                {t.entry?.toFixed(2)} → {t.exit?.toFixed(2) ?? '–'}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', textAlign: 'right',
                color: t.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                {t.pnl >= 0 ? '+' : ''}{fmt$(t.pnl)}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', textAlign: 'right',
                color: t.r > 0 ? 'var(--accent)' : t.r < 0 ? '#ef4444' : 'var(--muted)' }}>
                {t.r != null ? `${Number(t.r) > 0 ? '+' : ''}${Number(t.r).toFixed(1)}R` : '–'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'right', textTransform: 'uppercase' }}>
                {t.accountType || '–'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TradeCalendar({ trades, dailyPnL }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState(null) // dateStr of clicked day

  // Group trades by YYYY-MM-DD
  const tradesByDay = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const d = (t.date || '').split('T')[0]
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(t)
    })
    return map
  }, [trades])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Monthly totals
  const monthDays = Object.keys(dailyPnL).filter(d => {
    const [y, m] = d.split('-').map(Number)
    return y === year && m - 1 === month
  })
  const monthPnL    = monthDays.reduce((s, d) => s + (dailyPnL[d] || 0), 0)
  const monthTrades = trades.filter(t => {
    const d = (t.date || '').split('T')[0]
    const [y, m] = (d || '').split('-').map(Number)
    return y === year && m - 1 === month
  })
  const monthWins     = monthTrades.filter(t => t.pnl > 0).length
  const monthPnLColor = monthPnL > 0 ? '#22c55e' : monthPnL < 0 ? '#ef4444' : 'var(--muted)'

  return (
    <>
      {/* Day detail modal */}
      {selectedDay && (
        <DayModal
          dateStr={selectedDay}
          dayTrades={tradesByDay[selectedDay] || []}
          pnl={dailyPnL[selectedDay] || 0}
          onClose={() => setSelectedDay(null)}
        />
      )}

      <div className="card" style={{ marginTop: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
              Trade Calendar
            </span>
            {monthTrades.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {monthTrades.length} trade{monthTrades.length !== 1 ? 's' : ''} ·{' '}
                {monthWins}W {monthTrades.length - monthWins}L ·{' '}
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: monthPnLColor }}>
                  {monthPnL > 0 ? '+' : ''}{fmt$(monthPnL)}
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={prevMonth} style={{
              padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '5px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
            }}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '130px', textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} style={{
              padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '5px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
            }}>›</button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', fontWeight: 600, letterSpacing: '0.6px', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />

            const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const pnl       = dailyPnL[dateStr]
            const dayTrades = tradesByDay[dateStr] || []
            const isToday   = dateStr === todayStr
            const hasTrades = !!pnl || dayTrades.length > 0
            const wins      = dayTrades.filter(t => t.pnl > 0).length
            const loss      = dayTrades.length - wins

            const bg     = pnl == null ? 'var(--bg3)'
                         : pnl > 0    ? `rgba(34,197,94,${Math.min(0.35, 0.07 + Math.abs(pnl) / 1500)})`
                         : `rgba(239,68,68,${Math.min(0.35, 0.07 + Math.abs(pnl) / 1500)})`
            const border = isToday  ? '1px solid var(--accent)'
                         : pnl > 0 ? '1px solid rgba(34,197,94,0.3)'
                         : pnl < 0 ? '1px solid rgba(239,68,68,0.3)'
                         : '1px solid var(--border)'

            return (
              <div
                key={dateStr}
                onClick={() => hasTrades && setSelectedDay(dateStr)}
                style={{
                  background: bg, border, borderRadius: '6px',
                  padding: '6px 5px 5px', minHeight: '64px',
                  cursor: hasTrades ? 'pointer' : 'default',
                  transition: 'filter 0.12s',
                }}
                onMouseOver={e => { if (hasTrades) e.currentTarget.style.filter = 'brightness(1.15)' }}
                onMouseOut={e => { e.currentTarget.style.filter = '' }}
              >
                {/* Date number */}
                <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--muted)', marginBottom: '3px' }}>
                  {day}
                </div>

                {/* P&L */}
                {pnl != null && (
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.2,
                    color: pnl > 0 ? '#22c55e' : '#ef4444' }}>
                    {pnl > 0 ? '+' : ''}{fmt$(pnl)}
                  </div>
                )}

                {/* Trade count + W/L */}
                {dayTrades.length > 0 && (
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginTop: '3px', lineHeight: 1.3 }}>
                    {dayTrades.length}T · {wins}W{loss > 0 ? ` ${loss}L` : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [mode, setMode] = useState('prop')
  const todayStr = new Date().toISOString().split('T')[0]
  const account      = useStore(s => s.account)
  const paperAccount = useStore(s => s.paperAccount)
  const allTrades    = paperAccount.trades

  const trades = useMemo(
    () => allTrades.filter(t => t.accountType === mode),
    [allTrades, mode]
  )

  const dailyPnL = useMemo(() => {
    if (mode === 'prop') return account.dailyPnL
    const map = {}
    trades.forEach(t => {
      const d = (t.date || '').split('T')[0]
      if (d) map[d] = (map[d] || 0) + (t.pnl || 0)
    })
    return map
  }, [mode, account.dailyPnL, trades])

  const balance     = mode === 'prop' ? account.balance     : paperAccount.balance
  const startingBal = mode === 'prop' ? account.startingBalance : paperAccount.startingBalance
  const peakBalance = useMemo(() => {
    if (mode === 'prop') return account.peakBalance
    let running = startingBal
    let peak = startingBal
    for (const t of trades) {
      running += (t.pnl || 0)
      if (running > peak) peak = running
    }
    return peak
  }, [mode, account.peakBalance, startingBal, trades])

  const todayPnL    = dailyPnL[todayStr] || 0
  const todayTrades = trades.filter(t => (t.date || '').startsWith(todayStr))
  const wins        = trades.filter(t => t.pnl > 0).length
  const winRate     = trades.length > 0 ? Math.round(wins / trades.length * 100) : 0
  const totalPnL    = balance - startingBal
  const avgR        = trades.length > 0
    ? (trades.reduce((sum, t) => sum + (t.r || 0), 0) / trades.length).toFixed(1)
    : '–'
  const tradingDays = Object.keys(dailyPnL).filter(d => dailyPnL[d] !== 0).length
  const allDayPnLs  = Object.values(dailyPnL)
  const bestDay     = allDayPnLs.length ? Math.max(...allDayPnLs) : 0

  const streak = useMemo(() => {
    if (!trades.length) return { count: 0, type: null }
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const type = sorted[sorted.length - 1].pnl > 0 ? 'W' : 'L'
    let count = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      if ((sorted[i].pnl > 0) === (type === 'W')) count++
      else break
    }
    return { count, type }
  }, [trades])

  const animBalance  = useCountUp(balance)
  const animPnL      = useCountUp(todayPnL)
  const animWinRate  = useCountUp(winRate)
  const animTrades   = useCountUp(todayTrades.length)

  const pnlColor = todayPnL > 0 ? 'var(--green-bright)' : todayPnL < 0 ? 'var(--red-bright)' : 'var(--muted)'
  const isProp   = mode === 'prop'

  // Stats bar: overall/historical summary — no overlap with the cards below
  const statsBarItems = [
    { label: 'Account',      value: isProp ? 'PROP' : 'PAPER',           color: isProp ? 'var(--accent)' : '#a78bfa' },
    { label: 'Total P&L',    value: fmt$(totalPnL, true),                 color: totalPnL > 0 ? 'var(--green-bright)' : totalPnL < 0 ? 'var(--red-bright)' : 'var(--muted)' },
    { label: 'Peak Balance', value: fmt$(peakBalance),                    color: 'var(--text)' },
    { label: 'Avg R',        value: trades.length ? `${avgR}R` : '–',    color: 'var(--accent)' },
    { label: 'Total Trades', value: String(trades.length),                color: 'var(--text)' },
    { label: 'Trading Days', value: String(tradingDays),                  color: 'var(--text)' },
    { label: 'Best Day',     value: bestDay > 0 ? fmt$(bestDay, true) : '–', color: bestDay > 0 ? 'var(--green-bright)' : 'var(--muted)' },
  ]

  return (
    <div className="page">
      <StatsBar items={statsBarItems} />

      {/* Account toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {[
              { id: 'prop',  label: 'Prop Account' },
              { id: 'paper', label: 'Paper Account' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '7px 18px', fontSize: '12px', fontWeight: 600, border: 'none',
                borderLeft: m.id === 'paper' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                background: mode === m.id ? (m.id === 'prop' ? 'var(--accent)' : '#7c3aed') : 'var(--bg3)',
                color: mode === m.id ? '#fff' : 'var(--muted)',
                transition: 'all .15s',
              }}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {trades.length} total trade{trades.length !== 1 ? 's' : ''}
            {trades.length > 0 && (
              <span> · Avg {avgR}R · P&amp;L{' '}
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: totalPnL >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                  {fmt$(totalPnL, true)}
                </span>
              </span>
            )}
          </div>
        </div>
        <ResetButton mode={mode} />
      </div>

      {/* Row 1: Clock + Equity Curve */}
      <div className="row2" style={{ marginBottom: '12px' }}>
        <SessionClock />
        <EquityCurve dailyPnL={dailyPnL} startingBalance={startingBal} />
      </div>

      {/* Row 2: Stat cards — today's performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <StatCard
          label={isProp ? 'Prop Balance' : 'Paper Balance'}
          value={fmt$(animBalance)}
          sub={isProp ? 'Alpha Futures Zero 50K' : `Starting: ${fmt$(startingBal)}`}
          accentColor={isProp ? 'var(--accent)' : '#7c3aed'}
        />
        <StatCard
          label="Today's P&L"
          value={<span style={{ color: pnlColor }}>{fmt$(animPnL, true)}</span>}
          sub={todayStr}
          accentColor={todayPnL >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="Win Rate"
          value={<span style={{ color: trades.length === 0 ? 'var(--muted)' : winRate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' }}>{Math.round(animWinRate)}%</span>}
          sub={`${wins} / ${trades.length} trades`}
          accentColor="var(--purple)"
        />
        <StatCard
          label="Trades Today"
          value={Math.round(animTrades)}
          sub={todayTrades.length > 0 ? `${todayTrades.filter(t => t.pnl > 0).length}W · ${todayTrades.filter(t => t.pnl <= 0).length}L` : 'no trades yet'}
          accentColor="var(--amber)"
        />
        <StatCard
          label="Streak"
          value={
            streak.count === 0
              ? <span style={{ color: 'var(--muted)' }}>–</span>
              : <span style={{ color: streak.type === 'W' ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                  {streak.count}{streak.type}
                </span>
          }
          sub={streak.count === 0 ? 'no trades' : streak.type === 'W' ? 'win streak' : 'loss streak'}
          accentColor={streak.type === 'W' ? 'var(--green)' : streak.type === 'L' ? 'var(--red)' : 'var(--border)'}
        />
      </div>

      {/* Row 3: Risk limits (prop only) + Recent Trades */}
      {isProp ? (
        <>
          <div className="row2">
            <DrawdownMeter
              todayPnL={todayPnL}
              balance={balance}
              peakBalance={peakBalance}
              startingBalance={startingBal}
            />
            <RecentTrades trades={trades} />
          </div>
          <ConsistencyChart />
        </>
      ) : (
        <RecentTrades trades={trades} />
      )}

      {/* Trade Calendar */}
      <TradeCalendar trades={trades} dailyPnL={dailyPnL} />
    </div>
  )
}
