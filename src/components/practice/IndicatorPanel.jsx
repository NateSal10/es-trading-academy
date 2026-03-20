import useStore from '../../store'

const SMC_LAYERS = [
  { key: 'fvg', label: 'FVG Zones',    color: '#22c55e' },
  { key: 'ob',  label: 'Order Blocks', color: '#fb923c' },
  { key: 'liq', label: 'Liquidity',    color: '#f59e0b' },
]

const SESSION_DEF = [
  { key: 'asia',   hlKey: 'asiaHL',   label: 'Asia',   times: '00:00 – 09:00 UTC', color: '#38bdf8' },
  { key: 'london', hlKey: 'londonHL', label: 'London', times: '07:00 – 16:00 UTC', color: '#a78bfa' },
  { key: 'ny',     hlKey: 'nyHL',     label: 'NY',     times: '13:30 – 21:00 UTC', color: '#4ade80' },
]

function Toggle({ checked, onChange, color }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-track" style={checked ? { background: color } : {}} />
      <span className="toggle-thumb" />
    </label>
  )
}

function SmallToggle({ checked, onChange, color, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{
        width: '28px', height: '14px', borderRadius: '7px', position: 'relative',
        background: checked ? color : 'var(--border2)',
        transition: 'background .15s', flexShrink: 0,
      }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        <div style={{
          position: 'absolute', top: '2px',
          left: checked ? '16px' : '2px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#fff', transition: 'left .15s',
        }} />
      </div>
      <span style={{ fontSize: '10px', color: checked ? color : 'var(--muted)', fontWeight: 600 }}>{label}</span>
    </label>
  )
}

export default function IndicatorPanel() {
  const smcLayers    = useStore(s => s.smcLayers)
  const setSMCLayer  = useStore(s => s.setSMCLayer)
  const sessions     = useStore(s => s.sessions)
  const setSession   = useStore(s => s.setSession)
  const brStrategy   = useStore(s => s.brStrategy)
  const setBrStrategy = useStore(s => s.setBrStrategy)

  return (
    <div className="side-panel">

      {/* SMC Overlays */}
      <div className="panel-section">
        <div className="panel-title">SMC Overlays</div>
        {SMC_LAYERS.map(layer => (
          <div key={layer.key} className="indicator-row">
            <span className="indicator-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: layer.color, display: 'inline-block', flexShrink: 0 }} />
              {layer.label}
            </span>
            <Toggle checked={smcLayers[layer.key]} onChange={e => setSMCLayer(layer.key, e.target.checked)} color={layer.color} />
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="panel-section">
        <div className="panel-title">Sessions</div>
        {SESSION_DEF.map(s => (
          <div key={s.key} style={{ marginBottom: '10px' }}>
            {/* Session name + band toggle */}
            <div className="indicator-row" style={{ marginBottom: '4px' }}>
              <span className="indicator-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, opacity: 0.7, display: 'inline-block', flexShrink: 0 }} />
                <span>{s.label}</span>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'monospace' }}>{s.times}</span>
              </span>
              <Toggle checked={sessions[s.key]} onChange={e => setSession(s.key, e.target.checked)} color={s.color} />
            </div>
            {/* H/L sub-toggle — only visible when session band is on */}
            {sessions[s.key] && (
              <div style={{ paddingLeft: '16px' }}>
                <SmallToggle
                  checked={sessions[s.hlKey]}
                  onChange={e => setSession(s.hlKey, e.target.checked)}
                  color={s.color}
                  label="Show H/L"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Strategies */}
      <div className="panel-section">
        <div className="panel-title">Strategies</div>
        <div className="indicator-row">
          <span className="indicator-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '2px',
              background: '#facc15', display: 'inline-block', flexShrink: 0,
            }} />
            15m B&amp;R
          </span>
          <Toggle checked={brStrategy} onChange={e => setBrStrategy(e.target.checked)} color="#facc15" />
        </div>
        <div style={{ paddingLeft: '16px', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.4, marginTop: '-4px' }}>
          Boxes 8:00–8:15 AM ET range on any timeframe
        </div>
      </div>

    </div>
  )
}
