import { format } from 'date-fns'
import useStore from '../../store/index'

const CONSISTENCY_RULE = 0.40

export default function ConsistencyChart() {
  const account = useStore(s => s.account)
  const { dailyPnL, balance, startingBalance } = account

  const allDates = Object.keys(dailyPnL)
    .filter(d => dailyPnL[d] !== 0)
    .sort()

  const last30 = allDates.slice(-30)

  const totalProfit = balance - startingBalance
  const consistencyLimit = totalProfit * CONSISTENCY_RULE

  if (last30.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
        No daily P&amp;L data yet. Start logging trades to see your consistency chart.
      </div>
    )
  }

  const values = last30.map(d => dailyPnL[d])
  const maxAbs = Math.max(...values.map(Math.abs), 100)

  // SVG dimensions
  const W = 560
  const H = 140
  const PADDING = { top: 16, bottom: 32, left: 50, right: 16 }
  const chartW = W - PADDING.left - PADDING.right
  const chartH = H - PADDING.top - PADDING.bottom
  const barW = Math.max(4, Math.floor(chartW / last30.length) - 2)
  const MID_Y = PADDING.top + chartH / 2

  function toY(val) {
    const ratio = val / maxAbs
    return MID_Y - ratio * (chartH / 2)
  }

  // Y-axis labels
  const yLabels = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs]

  return (
    <div className="card">
      <div className="card-title">Daily P&amp;L Consistency</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
        Last {last30.length} trading day{last30.length !== 1 ? 's' : ''}.
        {totalProfit > 0 && (
          <span style={{ marginLeft: '8px', color: '#e8a93a' }}>
            40% consistency limit: ${consistencyLimit.toFixed(0)}/day
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ height: `${H}px` }}>
        {/* Y-axis labels */}
        {yLabels.map((val, i) => (
          <text
            key={i}
            x={PADDING.left - 4}
            y={toY(val) + 4}
            className="lbl"
            textAnchor="end"
          >
            {val >= 0 ? `$${val.toFixed(0)}` : `-$${Math.abs(val).toFixed(0)}`}
          </text>
        ))}

        {/* Zero line */}
        <line
          x1={PADDING.left}
          y1={MID_Y}
          x2={PADDING.left + chartW}
          y2={MID_Y}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* Consistency limit dashed line (only if in profit) */}
        {totalProfit > 100 && consistencyLimit > 0 && consistencyLimit <= maxAbs && (
          <line
            x1={PADDING.left}
            y1={toY(consistencyLimit)}
            x2={PADDING.left + chartW}
            y2={toY(consistencyLimit)}
            stroke="#e8a93a"
            strokeWidth="1.5"
            strokeDasharray="6,3"
            opacity="0.7"
          />
        )}
        {totalProfit > 100 && consistencyLimit > 0 && consistencyLimit <= maxAbs && (
          <text x={PADDING.left + 4} y={toY(consistencyLimit) - 4} className="lbl" fill="#e8a93a" fontSize="10">
            40% limit
          </text>
        )}

        {/* Bars */}
        {last30.map((date, i) => {
          const val = dailyPnL[date]
          const x = PADDING.left + i * (chartW / last30.length) + (chartW / last30.length - barW) / 2
          const barH = Math.max(2, Math.abs(toY(0) - toY(val)))
          const y = val >= 0 ? toY(val) : MID_Y
          const fill = val >= 0 ? 'var(--green)' : 'var(--red)'
          const overLimit = consistencyLimit > 0 && val > consistencyLimit

          let shortDate = ''
          try {
            shortDate = format(new Date(date + 'T12:00:00'), 'MMM d')
          } catch {
            shortDate = date.slice(5)
          }

          return (
            <g key={date}>
              <rect x={x} y={y} width={barW} height={barH} fill={fill}
                opacity={overLimit ? 1 : 0.8} rx="1">
                <title>{shortDate}: {val >= 0 ? '+' : ''}${val.toFixed(0)}{overLimit ? ' ⚠ over limit' : ''}</title>
              </rect>
              {overLimit && (
                <rect x={x - 1} y={y - 1} width={barW + 2} height={barH + 2}
                  fill="none" stroke="#e8a93a" strokeWidth="1.5" rx="2" />
              )}
              {/* X-axis date label — show every 5th or if few bars */}
              {(last30.length <= 10 || i % 5 === 0) && (
                <text
                  x={x + barW / 2}
                  y={H - 4}
                  className="lbl"
                  textAnchor="middle"
                  fontSize="9"
                >
                  {shortDate}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
