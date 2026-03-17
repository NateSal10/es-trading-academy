export default function PowerOf3Page() {
  const phases = [
    {
      name: 'Accumulation (A)',
      color: '#6aabf7',
      bg: 'var(--blue-bg)',
      border: 'rgba(24,95,165,0.3)',
      time: 'Asian session / pre-market',
      desc: 'Smart money accumulates positions. Price consolidates in a tight range, building liquidity on both sides. This range will be swept during the next phase.',
      signals: ['Low volume, tight range', 'Equal highs & equal lows forming', 'No clear direction — avoid trading'],
    },
    {
      name: 'Manipulation (M)',
      color: '#e8a93a',
      bg: 'var(--amber-bg)',
      border: 'rgba(186,117,23,0.3)',
      time: 'London open / NY pre-market (8–9:30 AM)',
      desc: 'A false move in the opposite direction of the true intent. Price sweeps one side of the Asian range to trigger retail stop losses, then aggressively reverses.',
      signals: ['Sharp move against the daily bias', 'Sweeps overnight high or low', 'Creates a large wick / displacement candle'],
    },
    {
      name: 'Distribution (D)',
      color: '#5DCAA5',
      bg: 'var(--green-bg)',
      border: 'rgba(29,158,117,0.3)',
      time: 'NY session (9:30 AM – 3:00 PM)',
      desc: 'Price moves in the true direction. Smart money distributes their positions as price targets the opposing liquidity pool. This is where retail traders finally get the move — but late.',
      signals: ['Strong directional move in true bias direction', 'FVGs left behind that get partially filled', 'Price targets previous day high/low'],
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div className="badge b-purple">SMC Core</div>
        <div className="card-title">Power of 3 — AMD Model</div>
        <div className="card-sub">
          Every day in ES futures follows a 3-phase cycle: Accumulation → Manipulation → Distribution.
          Understanding this framework tells you when NOT to trade as much as when to enter.
        </div>
      </div>

      {/* AMD Diagram */}
      <div className="card">
        <div className="badge b-blue">The Daily Price Cycle</div>
        <svg viewBox="0 0 360 180" width="100%" style={{ display: 'block', marginTop: '10px' }}>
          <rect width="360" height="180" fill="var(--bg2)" rx="8"/>

          {/* Phase bands */}
          <rect x="0" y="0" width="100" height="180" fill="rgba(106,171,247,0.05)" rx="4"/>
          <rect x="100" y="0" width="100" height="180" fill="rgba(232,169,58,0.05)"/>
          <rect x="200" y="0" width="160" height="180" fill="rgba(93,202,165,0.05)" rx="4"/>

          {/* Phase labels */}
          <text x="30" y="16" fontSize="9" fill="#6aabf7" fontWeight="700">Accumulation</text>
          <text x="112" y="16" fontSize="9" fill="#e8a93a" fontWeight="700">Manipulation</text>
          <text x="220" y="16" fontSize="9" fill="#5DCAA5" fontWeight="700">Distribution</text>

          {/* Time labels */}
          <text x="10" y="170" fontSize="8" fill="var(--muted)">Asia / Pre</text>
          <text x="105" y="170" fontSize="8" fill="var(--muted)">London / 8–9:30</text>
          <text x="210" y="170" fontSize="8" fill="var(--muted)">NY 9:30–3:00 PM</text>

          {/* Accumulation: flat consolidation */}
          {[0,1,2,3,4,5].map(i => (
            <g key={i}>
              <line x1={10 + i*14} y1={80 + (i%2)*6} x2={10 + i*14} y2={90 + (i%2)*6} stroke="var(--muted)" strokeWidth="1.5"/>
              <rect x={6 + i*14} y={82 + (i%2)*6} width="8" height="6" fill="var(--muted)" rx="1"/>
            </g>
          ))}
          <line x1="10" y1="78" x2="90" y2="78" stroke="rgba(106,171,247,0.4)" strokeWidth="1" strokeDasharray="3,2"/>
          <line x1="10" y1="100" x2="90" y2="100" stroke="rgba(106,171,247,0.4)" strokeWidth="1" strokeDasharray="3,2"/>

          {/* Manipulation: false move down then reverse */}
          {[0,1].map(i => (
            <g key={i}>
              <line x1={105 + i*18} y1={88 + i*14} x2={105 + i*18} y2={102 + i*16} stroke="#ef7a50" strokeWidth="1.5"/>
              <rect x={101 + i*18} y={91 + i*14} width="8" height="9" fill="#ef7a50" rx="1"/>
            </g>
          ))}
          {/* Sweep wick */}
          <line x1="141" y1="116" x2="141" y2="138" stroke="#ef7a50" strokeWidth="2"/>
          <circle cx="141" cy="138" r="3.5" fill="#ef7a50" opacity="0.8"/>
          <text x="145" y="140" fontSize="8" fill="#ef7a50">Sweep</text>
          {/* Reversal candle */}
          <line x1="158" y1="88" x2="158" y2="140" stroke="#5DCAA5" strokeWidth="2"/>
          <rect x="154" y="90" width="8" height="30" fill="#5DCAA5" rx="1"/>

          {/* Distribution: strong rally */}
          {[0,1,2,3,4,5,6].map(i => (
            <g key={i}>
              <line x1={175 + i*22} y1={75 - i*9} x2={175 + i*22} y2={92 - i*8} stroke="#5DCAA5" strokeWidth="1.5"/>
              <rect x={171 + i*22} y={78 - i*9} width="8" height="12" fill="#5DCAA5" rx="1"/>
            </g>
          ))}
          {/* Target arrow */}
          <text x="315" y="32" fontSize="9" fill="#5DCAA5">← Target</text>
          <line x1="313" y1="34" x2="313" y2="22" stroke="#5DCAA5" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Three phases detail */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {phases.map((p, i) => (
          <div key={i} className="card" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: `${p.color}22`, border: `2px solid ${p.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: p.color, flexShrink: 0,
              }}>
                {['A', 'M', 'D'][i]}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: p.color, fontSize: '14px' }}>{p.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{p.time}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '8px' }}>{p.desc}</div>
            <div style={{ display: 'grid', gap: '4px' }}>
              {p.signals.map((s, j) => (
                <div key={j} style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '6px' }}>
                  <span style={{ color: p.color }}>•</span>{s}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trading notes */}
      <div className="card" style={{ background: 'var(--bg3)' }}>
        <div className="badge b-green">Key Trading Rules from AMD</div>
        <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
          {[
            { rule: 'Never trade the accumulation phase', detail: 'The Asian range is noise. Wait for the sweep to define direction.' },
            { rule: 'The manipulation move is the tell', detail: 'Which side gets swept first defines the day\'s true direction.' },
            { rule: 'Enter during distribution — not the manipulation', detail: 'Wait for the reversal confirmation (MSS or OB retest) after the sweep.' },
            { rule: 'Daily bias confirmed by 10:00 AM NY', detail: 'If you don\'t have clear direction by 10 AM, skip the morning window.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: '#5DCAA5', fontSize: '14px', flexShrink: 0 }}>→</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>{item.rule}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
