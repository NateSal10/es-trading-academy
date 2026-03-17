import { useMarketStatus } from '../../hooks/useMarketStatus'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function SessionClock() {
  const { status, NY_KILL, LONDON_KILL, LONDON_CLOSE, sessionProgress, timeStr, now } = useMarketStatus()

  const dayStr = DAYS[now.getDay()]
  const dateStr = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
  const dotPct = Math.round(sessionProgress * 100)

  return (
    <div className="card">
      <div className="card-title">Market Clock — ET</div>

      <div style={{ fontSize: '28px', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '6px' }}>
        {timeStr}
      </div>

      <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '10px' }}>
        {dayStr}, {dateStr}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {status === 'RTH' && <span className="badge b-green">RTH Open</span>}
        {status === 'ETH' && <span className="badge b-amber">ETH / Globex</span>}
        {status === 'CLOSED' && (
          <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            CLOSED
          </span>
        )}
        {NY_KILL && <span className="badge b-red">NY Kill Zone</span>}
        {LONDON_KILL && <span className="badge b-purple">London Kill Zone</span>}
        {LONDON_CLOSE && <span className="badge b-blue">London Close</span>}
      </div>

      {/* RTH Timeline bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
          <span>9:30 Open</span>
          <span>RTH Session</span>
          <span>4:00 Close</span>
        </div>
        <div style={{ position: 'relative', height: '8px', background: 'var(--bg3)', borderRadius: '4px' }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${dotPct}%`,
            background: status === 'RTH' ? 'var(--green)' : 'var(--border)',
            borderRadius: '4px',
            transition: 'width 1s linear',
          }} />
          <div style={{
            position: 'absolute',
            left: `${dotPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: status === 'RTH' ? 'var(--green)' : 'var(--muted)',
            border: '2px solid var(--card)',
            boxShadow: status === 'RTH' ? '0 0 6px rgba(29,158,117,0.7)' : 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
