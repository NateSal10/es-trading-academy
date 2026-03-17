import useStore from '../../store/index'

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '12px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: color || 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function PnLBarChart({ trades }) {
  const recent = trades.slice(-20)
  if (recent.length === 0) return null

  const pnls = recent.map(t => t.pnl || 0)
  const maxAbs = Math.max(...pnls.map(Math.abs), 1)
  const W = 560
  const H = 100
  const BAR_W = Math.floor((W - 20) / recent.length) - 2
  const MID = H / 2

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
        Last {recent.length} Trades P&amp;L
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ height: '100px' }}>
        {/* Zero line */}
        <line x1="10" y1={MID} x2={W - 10} y2={MID} stroke="var(--border)" strokeWidth="1" />
        {recent.map((trade, i) => {
          const pnl = trade.pnl || 0
          const barH = Math.max(2, Math.abs(pnl) / maxAbs * (MID - 8))
          const x = 10 + i * (BAR_W + 2)
          const y = pnl >= 0 ? MID - barH : MID
          const fill = pnl >= 0 ? 'var(--green)' : 'var(--red)'
          const sign = pnl >= 0 ? '+' : ''
          return (
            <g key={trade.id || i}>
              <rect x={x} y={y} width={BAR_W} height={barH} fill={fill} rx="1" opacity="0.85">
                <title>{trade.date} — {sign}${Math.abs(pnl).toFixed(0)} ({trade.symbol} {trade.direction})</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function JournalStats() {
  const journal = useStore(s => s.journal)

  if (journal.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
        Log trades to see statistics.
      </div>
    )
  }

  const wins = journal.filter(t => (t.pnl || 0) > 0)
  const losses = journal.filter(t => (t.pnl || 0) < 0)
  const totalPnL = journal.reduce((s, t) => s + (t.pnl || 0), 0)
  const grossWin = wins.reduce((s, t) => s + (t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss) : grossWin > 0 ? Infinity : 0
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const winRate = journal.length > 0 ? (wins.length / journal.length) * 100 : 0
  const rMultiples = journal.map(t => t.rMultiple || 0).filter(r => r !== 0)
  const avgRR = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0
  const bestTrade = journal.length > 0 ? Math.max(...journal.map(t => t.pnl || 0)) : 0
  const worstTrade = journal.length > 0 ? Math.min(...journal.map(t => t.pnl || 0)) : 0

  function fmt$(n) {
    const sign = n >= 0 ? '+' : ''
    return `${sign}$${Math.abs(n).toFixed(0)}`
  }

  return (
    <div className="card">
      <div className="card-title">Statistics</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
        <StatCard label="Win Rate" value={`${winRate.toFixed(0)}%`} color={winRate >= 50 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Total P&L" value={fmt$(totalPnL)} color={totalPnL >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Avg R:R" value={avgRR.toFixed(2) + 'R'} color={avgRR >= 1 ? 'var(--green)' : 'var(--amber)'} />
        <StatCard label="Profit Factor" value={isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'} color={profitFactor >= 1.5 ? 'var(--green)' : profitFactor >= 1 ? '#e8a93a' : 'var(--red)'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <StatCard label="Best Trade" value={fmt$(bestTrade)} color="var(--green)" />
        <StatCard label="Worst Trade" value={fmt$(worstTrade)} color="var(--red)" />
        <StatCard label="Avg Win" value={fmt$(avgWin)} color="var(--green)" />
        <StatCard label="Avg Loss" value={`-$${avgLoss.toFixed(0)}`} color="var(--red)" />
      </div>
      <PnLBarChart trades={journal} />
    </div>
  )
}
