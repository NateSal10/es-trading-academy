import { useState } from 'react'
import useStore from '../../store'

const INSTRUMENTS = [
  { id: 'ES',  label: 'ES  (E-mini S&P)', pointValue: 50,  margin: 6600 },
  { id: 'MES', label: 'MES (Micro S&P)',  pointValue: 5,   margin: 660  },
  { id: 'NQ',  label: 'NQ  (E-mini Nasdaq)', pointValue: 20, margin: 16500 },
  { id: 'MNQ', label: 'MNQ (Micro Nasdaq)',  pointValue: 2,  margin: 1650  },
]

export default function PositionSizer() {
  const account     = useStore(s => s.account)
  const paperAccount = useStore(s => s.paperAccount)
  const [source,    setSource]    = useState('prop')   // 'prop' | 'paper' | 'custom'
  const [customBal, setCustomBal] = useState('')
  const [riskPct,   setRiskPct]   = useState(1)
  const [stopPts,   setStopPts]   = useState(10)
  const [instrument, setInstrument] = useState('ES')

  const inst = INSTRUMENTS.find(i => i.id === instrument)
  const accountSize =
    source === 'prop'   ? account.balance :
    source === 'paper'  ? paperAccount.balance :
    parseFloat(customBal) || 0

  const dollarRisk  = accountSize * (riskPct / 100)
  const contracts   = inst && stopPts > 0
    ? Math.max(0, Math.floor(dollarRisk / (stopPts * inst.pointValue)))
    : 0
  const actualRisk   = contracts * stopPts * (inst?.pointValue ?? 0)
  const marginNeeded = contracts * (inst?.margin ?? 0)

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: 600 }}>
        Position Sizer
      </div>

      {/* Source selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {[
          { id: 'prop',   label: 'Prop' },
          { id: 'paper',  label: 'Paper' },
          { id: 'custom', label: 'Custom' },
        ].map(s => (
          <button key={s.id} onClick={() => setSource(s.id)} style={{
            flex: 1, padding: '4px 6px', fontSize: '10px', fontWeight: 700, border: `1px solid ${source === s.id ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '4px', background: source === s.id ? 'rgba(79,142,247,0.1)' : 'var(--bg3)',
            color: source === s.id ? '#4f8ef7' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {source === 'custom' && (
        <div style={{ marginBottom: '10px' }}>
          <input
            type="number" placeholder="Account size ($)" value={customBal}
            onChange={e => setCustomBal(e.target.value)}
            style={{ width: '100%', padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: '4px', color: 'var(--text)', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
        <Row label="Account Size">
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
            ${accountSize.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </Row>

        <Row label="Risk %">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" min="0.1" max="5" step="0.1" value={riskPct} onChange={e => setRiskPct(Math.max(0.1, +e.target.value))}
              style={inputStyle} />
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>%</span>
          </div>
        </Row>

        <Row label="Stop Distance">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" min="1" step="1" value={stopPts} onChange={e => setStopPts(Math.max(1, +e.target.value))}
              style={inputStyle} />
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>pts</span>
          </div>
        </Row>

        <Row label="Instrument">
          <select value={instrument} onChange={e => setInstrument(e.target.value)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', padding: '3px 6px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
            {INSTRUMENTS.map(i => <option key={i.id} value={i.id}>{i.id}</option>)}
          </select>
        </Row>
      </div>

      {/* Results */}
      <div style={{ background: 'var(--bg3)', borderRadius: '7px', padding: '10px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <ResultCell label="Contracts" value={String(contracts)} highlight={contracts > 0} />
          <ResultCell label="Point Value" value={`$${inst?.pointValue ?? 0}/pt`} />
          <ResultCell label="Dollar Risk" value={`$${actualRisk.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} warn={actualRisk > dollarRisk * 1.1} />
          <ResultCell label="Margin Req" value={`$${marginNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        </div>
        {contracts === 0 && stopPts > 0 && accountSize > 0 && (
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#f59e0b', textAlign: 'center' }}>
            Risk too small for 1 contract — increase account size or risk %
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{label}</span>
      {children}
    </div>
  )
}

function ResultCell({ label, value, highlight, warn }) {
  const color = warn ? '#f59e0b' : highlight ? '#22c55e' : 'var(--text)'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const inputStyle = {
  width: '60px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px',
  color: 'var(--text)', padding: '3px 6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace',
  textAlign: 'right',
}
