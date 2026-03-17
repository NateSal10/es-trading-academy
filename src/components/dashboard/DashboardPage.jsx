import { useState, useMemo } from 'react'
import useStore from '../../store/index'
import SessionClock from './SessionClock'
import useCountUp from '../../hooks/useCountUp'

const todayStr = new Date().toISOString().split('T')[0]

function fmt$(n, sign = false) {
  const s = sign && n > 0 ? '+' : n < 0 ? '-' : ''
  return s + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatCard({ label, value, sub, accentColor, mono = true }) {
  return (
    <div className="card" style={{
      textAlign: 'center',
      marginBottom: 0,
      borderTop: `2px solid ${accentColor}`,
    }}>
      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: mono ? 'monospace' : 'inherit', color: 'var(--text)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>{sub}</div>
      )}
    </div>
  )
}

function TickerStrip({ balance, todayPnL, totalPnL, winRate, trades, avgR, mode }) {
  const items = [
    { label: 'ES FUTURES', value: mode === 'prop' ? 'PROP' : 'PAPER', color: mode === 'prop' ? 'var(--accent)' : '#a78bfa' },
    { label: 'BALANCE',    value: fmt$(balance),                       color: 'var(--text)' },
    { label: "TODAY P&L",  value: fmt$(todayPnL, true),                color: todayPnL > 0 ? 'var(--green-bright)' : todayPnL < 0 ? 'var(--red-bright)' : 'var(--muted)' },
    { label: 'TOTAL P&L',  value: fmt$(totalPnL, true),                color: totalPnL > 0 ? 'var(--green-bright)' : totalPnL < 0 ? 'var(--red-bright)' : 'var(--muted)' },
    { label: 'WIN RATE',   value: `${winRate}%`,                       color: winRate >= 50 ? 'var(--green-bright)' : trades === 0 ? 'var(--muted)' : 'var(--red-bright)' },
    { label: 'TRADES',     value: String(trades),                      color: 'var(--text)' },
    { label: 'AVG R',      value: `${avgR}R`,                          color: 'var(--accent)' },
  ]
  const doubled = [...items, ...items]
  return (
    <div className="ticker-wrap" style={{ margin: '0 -24px', marginBottom: '14px' }}>
      <div className="ticker-fade-l" />
      <div className="ticker-fade-r" />
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-lbl">{item.label}</span>
            <span className="ticker-val" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EquityCurve({ dailyPnL, startingBalance }) {
  const dates = Object.keys(dailyPnL).sort()
  const empty = dates.length < 2

  if (empty) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No equity data yet — start trading</span>
      </div>
    )
  }

  let bal = startingBalance
  const points = dates.map(d => {
    bal += dailyPnL[d]
    return bal
  })

  const W = 400
  const H = 90
  const PAD = { top: 10, bottom: 10, left: 0, right: 0 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const minV = Math.min(...points) * 0.999
  const maxV = Math.max(...points) * 1.001
  const range = maxV - minV || 1

  function toX(i) { return PAD.left + (i / (points.length - 1)) * chartW }
  function toY(v) { return PAD.top + chartH - ((v - minV) / range) * chartH }

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
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: isUp ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
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
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Recent Trades</div>
      {recent.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '11px' }}>
              {t.side === 'LONG' ? '▲' : '▼'}
            </span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{(t.symbol || 'ES=F').replace('=F', '')}</span>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{t.entry?.toFixed(1)} → {t.exit?.toFixed(1)}</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
            {t.pnl >= 0 ? '+' : ''}{fmt$(t.pnl)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [mode, setMode] = useState('prop')
  const account      = useStore(s => s.account)
  const paperAccount = useStore(s => s.paperAccount)

  const allTrades = paperAccount.trades

  // Filter trades by account type
  const trades = useMemo(
    () => allTrades.filter(t => t.accountType === mode),
    [allTrades, mode]
  )

  // Build daily P&L from trades (paper account doesn't track dailyPnL in store)
  const dailyPnL = useMemo(() => {
    if (mode === 'prop') return account.dailyPnL
    const map = {}
    trades.forEach(t => {
      const d = (t.date || '').split('T')[0]
      if (d) map[d] = (map[d] || 0) + (t.pnl || 0)
    })
    return map
  }, [mode, account.dailyPnL, trades])

  const balance        = mode === 'prop' ? account.balance : paperAccount.balance
  const startingBal    = mode === 'prop' ? account.startingBalance : paperAccount.startingBalance
  const peakBalance    = mode === 'prop' ? account.peakBalance : Math.max(startingBal, ...trades.reduce((acc, t) => { const last = acc.length ? acc[acc.length - 1] : startingBal; acc.push(last + (t.pnl || 0)); return acc }, [startingBal]))
  const todayPnL       = dailyPnL[todayStr] || 0
  const todayTrades    = trades.filter(t => (t.date || '').startsWith(todayStr))
  const wins           = trades.filter(t => t.pnl > 0).length
  const winRate        = trades.length > 0 ? Math.round(wins / trades.length * 100) : 0

  // Streaks
  const totalPnL = balance - startingBal

  // Average R
  const avgR = trades.length > 0
    ? (trades.reduce((sum, t) => sum + (t.r || 0), 0) / trades.length).toFixed(1)
    : '–'

  // Animated values
  const animBalance  = useCountUp(balance)
  const animPnL      = useCountUp(todayPnL)
  const animWinRate  = useCountUp(winRate)
  const animTrades   = useCountUp(todayTrades.length)

  const pnlColor = todayPnL > 0 ? 'var(--green-bright)' : todayPnL < 0 ? 'var(--red-bright)' : 'var(--muted)'
  const isProp = mode === 'prop'

  return (
    <div className="page">
      <TickerStrip
        balance={balance}
        todayPnL={todayPnL}
        totalPnL={totalPnL}
        winRate={winRate}
        trades={trades.length}
        avgR={avgR}
        mode={mode}
      />

      {/* Account toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
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
            <span> · Avg {avgR}R · P&L{' '}
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: totalPnL >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                {fmt$(totalPnL, true)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Row 1: Clock + Equity Curve */}
      <div className="row2" style={{ marginBottom: '12px' }}>
        <SessionClock />
        <EquityCurve dailyPnL={dailyPnL} startingBalance={startingBal} />
      </div>

      {/* Row 2: Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <StatCard
          label={isProp ? 'Prop Balance' : 'Paper Balance'}
          value={fmt$(animBalance)}
          sub={isProp ? `Peak: ${fmt$(peakBalance)}` : `Starting: ${fmt$(startingBal)}`}
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
      </div>

      {/* Row 3: Recent Trades */}
      <RecentTrades trades={trades} />
    </div>
  )
}
