import { format } from 'date-fns'
import useStore from '../../store/index'

const ACCOUNT_SIZE = 50000
const MAX_TRAILING_DRAWDOWN = 2000   // max drawdown
const DAILY_LOSS_LIMIT = 1000        // daily loss guard
const PROFIT_TARGET = 3000           // eval target
const CONSISTENCY_RULE = 0.40        // no single day > 40% of total profit
const MIN_TRADING_DAYS = 1           // eval minimum

const todayStr = format(new Date(), 'yyyy-MM-dd')

function RuleRow({ label, value, status, detail }) {
  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : status === 'fail' ? '❌' : '○'
  const statusColor = status === 'pass' ? 'var(--green)' : status === 'warn' ? '#e8a93a' : status === 'fail' ? 'var(--red)' : 'var(--muted)'
  const statusText  = status === 'pass' ? 'PASSING' : status === 'warn' ? 'NEAR LIMIT' : status === 'fail' ? 'BREACHED' : 'IN PROGRESS'

  return (
    <div className="pb-item">
      <div style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>{icon}</div>
      <div className="pb-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pb-label">{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text)', fontWeight: 600 }}>{value}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: statusColor, letterSpacing: '0.5px' }}>{statusText}</span>
          </div>
        </div>
        {detail && <div className="pb-text">{detail}</div>}
      </div>
    </div>
  )
}

export default function AccountRulesCard() {
  const account = useStore(s => s.account)

  const { balance, startingBalance, peakBalance, dailyPnL } = account
  const totalProfit = balance - startingBalance
  const currentDrawdown = peakBalance > 0 ? (peakBalance - balance) : 0
  const currentDrawdownPct = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0
  const trailingBuffer = MAX_TRAILING_DRAWDOWN - currentDrawdown

  const todayPnL = dailyPnL[todayStr] || 0
  const todayLoss = Math.min(0, todayPnL) // 0 or negative
  const dailyLossUsed = Math.abs(todayLoss)

  // Consistency: any single day > 30% of total profit
  const consistencyLimit = totalProfit * CONSISTENCY_RULE
  const worstConsistencyDay = totalProfit > 0
    ? Math.max(...Object.values(dailyPnL).filter(p => p > 0), 0)
    : 0
  const consistencyBreached = totalProfit > 100 && worstConsistencyDay > consistencyLimit

  // Trading days count
  const tradingDays = Object.keys(dailyPnL).filter(d => dailyPnL[d] !== 0).length

  // Rule statuses
  const ddStatus = currentDrawdown > MAX_TRAILING_DRAWDOWN
    ? 'fail'
    : currentDrawdown > MAX_TRAILING_DRAWDOWN * 0.7
    ? 'warn'
    : 'pass'

  const dailyStatus = dailyLossUsed > DAILY_LOSS_LIMIT
    ? 'fail'
    : dailyLossUsed > DAILY_LOSS_LIMIT * 0.7
    ? 'warn'
    : 'pass'

  const profitStatus = totalProfit >= PROFIT_TARGET ? 'pass' : totalProfit >= PROFIT_TARGET * 0.8 ? 'warn' : 'progress'
  const consistencyStatus = consistencyBreached ? 'fail' : totalProfit > 100 && worstConsistencyDay > consistencyLimit * 0.85 ? 'warn' : 'pass'
  const daysStatus = tradingDays >= MIN_TRADING_DAYS ? 'pass' : 'progress'

  const anyFail = [ddStatus, dailyStatus, profitStatus, consistencyStatus, daysStatus].includes('fail')
  const anyWarn = [ddStatus, dailyStatus, profitStatus, consistencyStatus, daysStatus].includes('warn')
  const badgeClass = anyFail ? 'badge b-red' : anyWarn ? 'badge b-amber' : 'badge b-blue'

  return (
    <div className="card">
      <div className={badgeClass} style={{ marginBottom: '8px' }}>Alpha Futures — Zero 50K</div>
      <div className="card-title">Account Rules</div>

      <RuleRow
        label="Trailing Drawdown"
        value={`$${currentDrawdown.toFixed(0)} / $${MAX_TRAILING_DRAWDOWN}`}
        status={ddStatus}
        detail={`Buffer remaining: $${trailingBuffer.toFixed(0)} · Current drawdown: ${currentDrawdownPct.toFixed(2)}%`}
      />
      <RuleRow
        label="Daily Loss Limit"
        value={`$${dailyLossUsed.toFixed(0)} / $${DAILY_LOSS_LIMIT}`}
        status={dailyStatus}
        detail={`Today's P&L: ${todayPnL >= 0 ? '+' : ''}$${todayPnL.toFixed(0)}`}
      />
      <RuleRow
        label="Profit Target"
        value={`$${Math.max(0, totalProfit).toFixed(0)} / $${PROFIT_TARGET}`}
        status={profitStatus}
        detail={`Remaining: $${Math.max(0, PROFIT_TARGET - totalProfit).toFixed(0)}`}
      />
      <RuleRow
        label="Consistency Rule"
        value={`Best day: $${worstConsistencyDay.toFixed(0)}`}
        status={consistencyStatus}
        detail={`Max allowed per day: $${consistencyLimit > 0 ? consistencyLimit.toFixed(0) : 'N/A'} (40% of total profit)`}
      />
      <RuleRow
        label="Min Trading Days"
        value={`${tradingDays} / ${MIN_TRADING_DAYS}`}
        status={daysStatus}
        detail={`${Math.max(0, MIN_TRADING_DAYS - tradingDays)} more day${MIN_TRADING_DAYS - tradingDays !== 1 ? 's' : ''} needed`}
      />
    </div>
  )
}
