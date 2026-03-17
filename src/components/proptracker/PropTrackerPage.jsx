import { useState } from 'react'
import useStore from '../../store/index'
import DrawdownMeter from './DrawdownMeter'
import AccountRulesCard from './AccountRulesCard'
import ConsistencyChart from './ConsistencyChart'
import DailyTradesLog from './DailyTradesLog'

export default function PropTrackerPage() {
  const resetAccount = useStore(s => s.resetAccount)
  const [confirming, setConfirming] = useState(false)

  function handleReset() {
    if (confirming) {
      resetAccount()
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Prop Tracker</h2>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Alpha Futures — Zero 50K Account</div>
        </div>
        <div>
          {confirming ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Reset account to $50K?</span>
              <button
                onClick={handleReset}
                style={{
                  padding: '6px 14px',
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(216,90,48,0.4)',
                  borderRadius: '6px',
                  color: '#ef7a50',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  padding: '6px 14px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleReset}
              style={{
                padding: '7px 16px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'inherit',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.target.style.color = '#ef7a50'; e.target.style.borderColor = 'rgba(216,90,48,0.4)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border)' }}
            >
              Reset Account
            </button>
          )}
        </div>
      </div>

      <div className="row2">
        <DrawdownMeter />
        <AccountRulesCard />
      </div>

      <ConsistencyChart />
      <DailyTradesLog />
    </div>
  )
}
