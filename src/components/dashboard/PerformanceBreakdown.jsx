import { useMemo, useState } from 'react'

function fmt$(n, sign = false) {
  const s = sign && n > 0 ? '+' : n < 0 ? '-' : ''
  return s + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const HOUR_LABELS = Array.from({ length: 10 }, (_, i) => `${i + 8}am`).concat(['6pm', '7pm'])
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DOW_VALUES = [1, 2, 3, 4, 5]  // 0=Sun, 1=Mon…

function BarChart({ data, keyFn, labelFn, colorFn, heightPx = 80 }) {
  const maxAbs = Math.max(1, ...data.map(d => Math.abs(d.winRate ?? d.value ?? 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: `${heightPx}px` }}>
      {data.map((d, i) => {
        const val = d.winRate ?? d.value ?? 0
        const h = Math.max(2, (Math.abs(val) / maxAbs) * (heightPx - 16))
        const color = colorFn ? colorFn(d) : (val >= 50 ? '#22c55e' : '#ef4444')
        return (
          <div key={keyFn(d, i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ fontSize: '8px', color: 'var(--muted)', fontFamily: 'monospace', lineHeight: 1 }}>
              {d.trades > 0 ? `${Math.round(val)}%` : ''}
            </div>
            <div style={{ width: '100%', height: `${h}px`, background: color, borderRadius: '2px 2px 0 0', opacity: d.trades > 0 ? 0.85 : 0.2, transition: 'height 0.3s ease' }} />
            <div style={{ fontSize: '8px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1 }}>{labelFn(d, i)}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function PerformanceBreakdown({ trades }) {
  const [open, setOpen] = useState(false)

  const { byHour, byDow, bySession } = useMemo(() => {
    const hourMap   = Object.fromEntries(HOURS.map(h => [h, { trades: 0, wins: 0, pnl: 0 }]))
    const dowMap    = Object.fromEntries(DOW_VALUES.map(d => [d, { trades: 0, wins: 0, pnl: 0 }]))
    const sessionMap = { Asia: { trades: 0, wins: 0, pnl: 0 }, London: { trades: 0, wins: 0, pnl: 0 }, NY: { trades: 0, wins: 0, pnl: 0 } }

    for (const t of trades) {
      if (!t.date) continue
      const d = new Date(t.date)
      const hourET = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', hour12: false,
      }).format(d), 10)
      const dow = d.getDay()

      if (hourMap[hourET]) {
        hourMap[hourET].trades++
        if (t.pnl > 0) hourMap[hourET].wins++
        hourMap[hourET].pnl += t.pnl
      }

      if (dowMap[dow]) {
        dowMap[dow].trades++
        if (t.pnl > 0) dowMap[dow].wins++
        dowMap[dow].pnl += t.pnl
      }

      // Session by UTC hour
      const utcH = d.getUTCHours()
      const sessionKey = utcH >= 0 && utcH < 7 ? 'Asia' : utcH >= 7 && utcH < 12 ? 'London' : 'NY'
      sessionMap[sessionKey].trades++
      if (t.pnl > 0) sessionMap[sessionKey].wins++
      sessionMap[sessionKey].pnl += t.pnl
    }

    const toWR = (m) => Object.entries(m).map(([k, v]) => ({
      key: k, trades: v.trades, pnl: v.pnl,
      winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0,
    }))

    return {
      byHour:    HOURS.map(h => ({ key: h, ...hourMap[h], winRate: hourMap[h].trades > 0 ? (hourMap[h].wins / hourMap[h].trades) * 100 : 0 })),
      byDow:     DOW_VALUES.map(d => ({ key: d, ...dowMap[d], winRate: dowMap[d].trades > 0 ? (dowMap[d].wins / dowMap[d].trades) * 100 : 0 })),
      bySession: toWR(sessionMap),
    }
  }, [trades])

  if (!trades.length) return null

  return (
    <div className="card" style={{ marginTop: '12px' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
          Performance Breakdown
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Win rate by hour */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Win Rate by Hour (ET)</div>
            <BarChart
              data={byHour}
              keyFn={d => d.key}
              labelFn={(d, i) => HOUR_LABELS[i] ?? d.key}
              colorFn={d => d.trades === 0 ? '#333' : d.winRate >= 50 ? '#22c55e' : '#ef4444'}
            />
          </div>

          {/* Win rate by day of week */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Win Rate by Day</div>
            <BarChart
              data={byDow}
              keyFn={d => d.key}
              labelFn={(_, i) => DOW_LABELS[i]}
              colorFn={d => d.trades === 0 ? '#333' : d.winRate >= 50 ? '#22c55e' : '#ef4444'}
              heightPx={70}
            />
          </div>

          {/* P&L by session */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>P&amp;L by Session</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {bySession.map(s => (
                <div key={s.key} style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 600 }}>{s.key}</div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: s.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmt$(s.pnl, true)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    {s.trades}T · {s.trades > 0 ? Math.round(s.winRate) : 0}%W
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
