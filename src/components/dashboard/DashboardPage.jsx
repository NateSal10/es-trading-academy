import { useState, useMemo } from 'react'
import useStore from '../../store/index'
import SessionClock from './SessionClock'
import useCountUp from '../../hooks/useCountUp'

const todayStr = new Date().toISOString().split('T')[0]

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
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: '3px',
          transition: 'width 0.4s ease',
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

export default function DashboardPage() {
  const [mode, setMode] = useState('prop')
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
  const peakBalance = mode === 'prop'
    ? account.peakBalance
    : trades.reduce((peak, _, i) => {
        const cumBal = startingBal + trades.slice(0, i + 1).reduce((s, x) => s + (x.pnl || 0), 0)
        return Math.max(peak, cumBal)
      }, startingBal)

  const todayPnL    = dailyPnL[todayStr] || 0
  const todayTrades = trades.filter(t => (t.date || '').startsWith(todayStr))
  const wins        = trades.filter(t => t.pnl > 0).length
  const winRate     = trades.length > 0 ? Math.round(wins / trades.length * 100) : 0
  const totalPnL    = balance - startingBal
  const avgR        = trades.length > 0
    ? (trades.reduce((sum, t) => sum + (t.r || 0), 0) / trades.length).toFixed(1)
    : '–'

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

  const statsBarItems = [
    { label: 'Mode',      value: isProp ? 'PROP' : 'PAPER',  color: isProp ? 'var(--accent)' : '#a78bfa' },
    { label: 'Balance',   value: fmt$(balance),               color: 'var(--text)' },
    { label: 'Today P&L', value: fmt$(todayPnL, true),        color: todayPnL > 0 ? 'var(--green-bright)' : todayPnL < 0 ? 'var(--red-bright)' : 'var(--muted)' },
    { label: 'Total P&L', value: fmt$(totalPnL, true),        color: totalPnL > 0 ? 'var(--green-bright)' : totalPnL < 0 ? 'var(--red-bright)' : 'var(--muted)' },
    { label: 'Win Rate',  value: `${winRate}%`,               color: winRate >= 50 ? 'var(--green-bright)' : trades.length === 0 ? 'var(--muted)' : 'var(--red-bright)' },
    { label: 'Avg R',     value: `${avgR}R`,                  color: 'var(--accent)' },
    { label: 'Trades',    value: String(trades.length),       color: 'var(--text)' },
  ]

  return (
    <div className="page">
      <StatsBar items={statsBarItems} />

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
            <span> · Avg {avgR}R · P&amp;L{' '}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <StatCard
          label={isProp ? 'Prop Balance' : 'Paper Balance'}
          value={fmt$(animBalance)}
          sub={`Peak: ${fmt$(peakBalance)}`}
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

      {/* Row 3: Drawdown meter (prop only) + Recent Trades */}
      {isProp ? (
        <div className="row2">
          <DrawdownMeter
            todayPnL={todayPnL}
            balance={balance}
            peakBalance={peakBalance}
            startingBalance={startingBal}
          />
          <RecentTrades trades={trades} />
        </div>
      ) : (
        <RecentTrades trades={trades} />
      )}
    </div>
  )
}
