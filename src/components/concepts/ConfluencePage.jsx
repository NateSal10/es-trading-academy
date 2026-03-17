export default function ConfluencePage() {
  const layers = [
    { label: 'Higher Timeframe Bias', color: '#6aabf7', desc: '15m/1h trend direction — defines whether we hunt longs or shorts only.' },
    { label: 'Liquidity Swept', color: '#e8a93a', desc: 'A swing high/low or equal H/L has been taken — smart money showed their hand.' },
    { label: 'Point of Interest (POI)', color: '#9b8aff', desc: 'Price is sitting at an OB, FVG, or major S/R level on the setup timeframe.' },
    { label: 'Kill Zone Timing', color: '#5DCAA5', desc: 'Setup forms inside 10:00–11:30 AM or 1:30–3:00 PM NY window.' },
    { label: 'LTF Confirmation', color: '#ef7a50', desc: '1m/3m MSS or displacement candle confirms the move from the POI.' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div className="badge b-blue">Entry Techniques</div>
        <div className="card-title">Multi-Confluence Entries</div>
        <div className="card-sub">
          An A+ setup requires multiple confluences stacking in the same direction.
          One factor is noise. Three or more is signal.
        </div>
      </div>

      {/* Confluence layers */}
      <div className="card">
        <div className="badge b-amber">The 5 Confluence Layers</div>
        <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
          {layers.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '28px', height: '28px', borderRadius: '50%',
                background: `${l.color}22`, border: `1px solid ${l.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: l.color, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: l.color, marginBottom: '2px' }}>{l.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* A+ setup diagram */}
      <div className="card">
        <div className="badge b-green">The A+ Setup — Visualized</div>
        <svg viewBox="0 0 360 220" width="100%" style={{ display: 'block', marginTop: '10px' }}>
          <rect width="360" height="220" fill="var(--bg2)" rx="8"/>

          {/* Price path: HTF down, sweep lows, rally */}
          {/* Downtrend candles */}
          {[0,1,2,3,4,5].map(i => (
            <g key={i}>
              <line x1={20 + i*20} y1={40 + i*12} x2={20 + i*20} y2={60 + i*14} stroke="#ef7a50" strokeWidth="1.5"/>
              <rect x={15 + i*20} y={44 + i*12} width="10" height="12" fill="#ef7a50" rx="1"/>
            </g>
          ))}

          {/* OB zone */}
          <rect x="10" y="40" width="30" height="18" fill="rgba(106,171,247,0.12)" stroke="rgba(106,171,247,0.4)" strokeWidth="1" rx="2"/>
          <text x="2" y="36" fontSize="8" fill="#6aabf7">OB</text>

          {/* FVG zone */}
          <rect x="115" y="130" width="30" height="20" fill="rgba(93,202,165,0.12)" stroke="rgba(93,202,165,0.4)" strokeWidth="1" rx="2"/>
          <text x="110" y="165" fontSize="8" fill="#5DCAA5">FVG</text>

          {/* Sweep wick */}
          <line x1="130" y1="140" x2="130" y2="185" stroke="#ef7a50" strokeWidth="2"/>
          <circle cx="130" cy="185" r="4" fill="#ef7a50" opacity="0.7"/>
          <text x="135" y="192" fontSize="8" fill="#ef7a50">Sweep EQ lows</text>

          {/* Recovery + MSS */}
          {[0,1,2,3,4].map(i => (
            <g key={i}>
              <line x1={145 + i*22} y1={138 - i*14} x2={145 + i*22} y2={158 - i*12} stroke="#5DCAA5" strokeWidth="1.5"/>
              <rect x={140 + i*22} y={141 - i*14} width="10" height="14" fill="#5DCAA5" rx="1"/>
            </g>
          ))}

          {/* MSS line */}
          <line x1="145" y1="120" x2="360" y2="120" stroke="#5DCAA5" strokeWidth="1" strokeDasharray="4,3" opacity="0.6"/>
          <text x="240" y="116" fontSize="8" fill="#5DCAA5">MSS ↑ — LTF Confirmation</text>

          {/* Entry arrow */}
          <text x="236" y="140" fontSize="9" fill="#5DCAA5" fontWeight="700">↑ ENTRY</text>

          {/* Labels */}
          <text x="10" y="210" fontSize="9" fill="var(--muted)">① HTF bearish → longs only from discount</text>
          <text x="10" y="10" fontSize="9" fill="#e8a93a">② Liq swept → ③ OB+FVG POI → ④ Kill zone → ⑤ LTF MSS</text>
        </svg>
      </div>

      {/* Stop & Target */}
      <div className="row2">
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-red" style={{ background: 'var(--red-bg)', color: '#ef7a50', borderColor: 'rgba(216,90,48,0.3)' }}>Stop Placement</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9, marginTop: '8px' }}>
            <div><strong style={{ color: 'var(--text)' }}>OB entry:</strong> Below OB candle low</div>
            <div><strong style={{ color: 'var(--text)' }}>FVG entry:</strong> Below bottom of FVG</div>
            <div><strong style={{ color: 'var(--text)' }}>MSS entry:</strong> Below the sweep wick</div>
            <div><strong style={{ color: 'var(--text)' }}>Rule:</strong> Never move stop against trade</div>
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-green">Target Placement</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9, marginTop: '8px' }}>
            <div><strong style={{ color: 'var(--text)' }}>TP1:</strong> Nearest liquidity / swing high (50%)</div>
            <div><strong style={{ color: 'var(--text)' }}>TP2:</strong> Equal highs / premium zone</div>
            <div><strong style={{ color: 'var(--text)' }}>Trail:</strong> Move stop to BE at 1R</div>
            <div><strong style={{ color: 'var(--text)' }}>Min R:R:</strong> 2:1 before entering</div>
          </div>
        </div>
      </div>

      {/* Pre-entry checklist */}
      <div className="card">
        <div className="badge b-purple">Pre-Entry Checklist</div>
        <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
          {[
            'HTF bias confirmed (15m + 1h aligned)',
            'Liquidity swept — stop hunt confirmed',
            'Price at a valid POI (OB, FVG, or S/R)',
            'LTF shows MSS or displacement candle',
            'R:R is at least 2:1 before entry',
            'Inside a kill zone (10–11:30 or 1:30–3:00)',
            'Daily loss limit not hit',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--muted)' }}>
              <span style={{ color: '#5DCAA5', flexShrink: 0 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
