import { format } from 'date-fns'
import useStore from '../../store/index'

const MAX_TRAILING_DRAWDOWN = 2000
const DAILY_LOSS_LIMIT = 1000
const todayStr = format(new Date(), 'yyyy-MM-dd')

function CircleGauge({ label, current, max, unit = '$', sub }) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100))
  const r = 36
  const C = 2 * Math.PI * r
  const arcLen = C * 0.75          // 270° arc
  const fillLen = (pct / 100) * arcLen
  const buffer = max - current
  const color = pct >= 80 ? 'var(--red-bright)' : pct >= 55 ? '#f59e0b' : 'var(--green-bright)'

  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {/* Background track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg3)" strokeWidth="8"
            strokeDasharray={`${arcLen} ${C - arcLen}`} strokeLinecap="round"
            transform="rotate(135 50 50)" />
          {/* Fill arc */}
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${fillLen} ${C - fillLen}`} strokeLinecap="round"
            transform="rotate(135 50 50)"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>
            {pct.toFixed(0)}%
          </div>
          <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>used</div>
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
          {unit}{current.toFixed(0)} <span style={{ color: 'var(--border2)' }}>/</span> {unit}{max}
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px', color: buffer < max * 0.3 ? 'var(--red-bright)' : 'var(--muted)' }}>
          {unit}{buffer.toFixed(0)} remaining
        </div>
        {sub && <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function DrawdownMeter() {
  const account = useStore(s => s.account)
  const { balance, peakBalance, dailyPnL } = account

  const currentDrawdown = Math.max(0, peakBalance - balance)

  const todayPnL = dailyPnL[todayStr] || 0
  const dailyLoss = Math.abs(Math.min(0, todayPnL))

  const bufferPts = (MAX_TRAILING_DRAWDOWN - currentDrawdown) / 50 // ES points

  return (
    <div className="card">
      <div className="card-title">Drawdown Meters</div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px' }}>
        Peak balance: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>${peakBalance.toLocaleString()}</span>
        {todayPnL > 0 && (
          <span style={{ marginLeft: '10px', color: 'var(--green-bright)' }}>
            Today +${todayPnL.toFixed(0)} ↑
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <CircleGauge
          label="Max Drawdown"
          current={currentDrawdown}
          max={MAX_TRAILING_DRAWDOWN}
          unit="$"
          sub={`~${bufferPts.toFixed(1)} ES pts left`}
        />
        <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
        <CircleGauge
          label="Daily Loss Guard"
          current={dailyLoss}
          max={DAILY_LOSS_LIMIT}
          unit="$"
        />
      </div>
    </div>
  )
}
