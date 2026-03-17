export default function EntriesPage() {
  return (
    <div>
      {/* ── Header ── */}
      <div className="card">
        <div className="badge b-blue">SMC / ICT</div>
        <div className="card-title">Entry Techniques</div>
        <div className="card-sub">
          Precision entry models used in Smart Money Concepts — wait for confirmation,
          enter at the right price, and define risk before you pull the trigger.
        </div>
      </div>

      {/* ── 3 Core Models ── */}
      <div className="card">
        <div className="badge b-amber">The 3 Core Entry Models</div>
        <div style={{ display: 'grid', gap: '16px', marginTop: '8px' }}>

          {/* MSS Entry */}
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
              1 — Market Structure Shift (MSS)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.8 }}>
              After a liquidity sweep, price breaks the last swing high (bullish) or low (bearish)
              on a lower timeframe. That break = confirmation of intent. Enter on the next candle
              open or a shallow pull-back into the break point.
            </div>
            {/* SVG diagram */}
            <svg viewBox="0 0 320 140" width="100%" style={{ marginTop: '10px', display: 'block' }}>
              {/* Background */}
              <rect width="320" height="140" fill="var(--bg2)" rx="6" />
              {/* Price path down, sweep, then up MSS */}
              {/* Down candles */}
              {[0,1,2,3,4].map(i => (
                <g key={i}>
                  <line x1={30 + i*30} y1={30 + i*10} x2={30 + i*30} y2={60 + i*10} stroke="#ef7a50" strokeWidth="1.5"/>
                  <rect x={25 + i*30} y={35 + i*10} width="10" height="18" fill="#ef7a50" rx="1"/>
                </g>
              ))}
              {/* Sweep wick */}
              <line x1="160" y1="90" x2="160" y2="115" stroke="#ef7a50" strokeWidth="2" strokeDasharray="3,2"/>
              <text x="163" y="120" fontSize="9" fill="#ef7a50">Sweep lows</text>
              {/* Recovery + MSS */}
              {[0,1,2,3].map(i => (
                <g key={i}>
                  <line x1={175 + i*28} y1={85 - i*12} x2={175 + i*28} y2={100 - i*8} stroke="#5DCAA5" strokeWidth="1.5"/>
                  <rect x={170 + i*28} y={88 - i*10} width="10" height="14" fill="#5DCAA5" rx="1"/>
                </g>
              ))}
              {/* MSS line */}
              <line x1="170" y1="75" x2="310" y2="75" stroke="#5DCAA5" strokeWidth="1" strokeDasharray="4,3" opacity="0.7"/>
              <text x="230" y="70" fontSize="9" fill="#5DCAA5">MSS ↑ — ENTRY</text>
            </svg>
          </div>

          {/* OB Retest Entry */}
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
              2 — Order Block Retest
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.8 }}>
              After an impulsive move away from an OB, price pulls back into the OB zone.
              Enter when price wicks into the OB and closes back above (bullish) or below (bearish).
              Stop goes below the OB candle low.
            </div>
            <svg viewBox="0 0 320 130" width="100%" style={{ marginTop: '10px', display: 'block' }}>
              <rect width="320" height="130" fill="var(--bg2)" rx="6" />
              {/* OB zone */}
              <rect x="30" y="70" width="40" height="25" fill="rgba(106,171,247,0.15)" stroke="rgba(106,171,247,0.5)" strokeWidth="1" rx="3"/>
              <text x="34" y="66" fontSize="9" fill="#6aabf7">OB Zone</text>
              {/* Impulse up */}
              {[0,1,2,3,4].map(i => (
                <g key={i}>
                  <line x1={80 + i*22} y1={65 - i*10} x2={80 + i*22} y2={85 - i*8} stroke="#5DCAA5" strokeWidth="1.5"/>
                  <rect x={75 + i*22} y={68 - i*10} width="10" height="14} fill="#5DCAA5" rx="1"/>
                </g>
              ))}
              {/* Retest candles */}
              {[0,1,2].map(i => (
                <g key={i}>
                  <line x1={195 + i*22} y1={50 + i*12} x2={195 + i*22} y2={68 + i*12} stroke="#ef7a50" strokeWidth="1.5"/>
                  <rect x={190 + i*22} y={53 + i*12} width="10" height="12" fill="#ef7a50" rx="1"/>
                </g>
              ))}
              {/* Entry arrow */}
              <text x="258" y="105" fontSize="9" fill="#5DCAA5">↑ Entry</text>
              <line x1="265" y1="105" x2="265" y2="80" stroke="#5DCAA5" strokeWidth="1.5" markerEnd="url(#arr)"/>
            </svg>
          </div>

          {/* FVG Fill Entry */}
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
              3 — FVG Fill Entry
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.8 }}>
              Price leaves an imbalance (FVG) during an impulse. When it retraces into the gap,
              look for a rejection wick or a lower-timeframe MSS inside the gap to enter.
              Target the 50% midpoint or the opposing side of the FVG for the initial TP.
            </div>
          </div>
        </div>
      </div>

      {/* ── Entry Checklist ── */}
      <div className="card">
        <div className="badge b-green">Pre-Entry Checklist</div>
        <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
          {[
            'Higher timeframe bias confirmed (15m / 1h)',
            'Liquidity has been swept (you know where the stop hunt happened)',
            'Price is inside a POI — OB, FVG, or S/R level',
            'Lower timeframe (1m/3m) shows MSS or displacement candle',
            'Risk is defined — stop placed beyond the POI',
            'R:R is at least 2:1 before entry',
            'Within a kill zone (10:00–11:30 AM or 1:30–3:00 PM)',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--muted)' }}>
              <span style={{ color: '#5DCAA5', flexShrink: 0, marginTop: '1px' }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stop & Target Placement ── */}
      <div className="row2">
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-red" style={{ background: 'var(--red-bg)', color: '#ef7a50', borderColor: 'rgba(216,90,48,0.3)' }}>Stop Placement</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9, marginTop: '8px' }}>
            <div><strong style={{ color: 'var(--text)' }}>OB Entry:</strong> Below OB candle low (bearish OB: above high)</div>
            <div><strong style={{ color: 'var(--text)' }}>FVG Entry:</strong> Below the bottom of the FVG</div>
            <div><strong style={{ color: 'var(--text)' }}>MSS Entry:</strong> Below the sweep wick low</div>
            <div><strong style={{ color: 'var(--text)' }}>Rule:</strong> Never move stop into loss — widen if needed, never tighten before 1R</div>
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-green">Target Placement</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9, marginTop: '8px' }}>
            <div><strong style={{ color: 'var(--text)' }}>TP1:</strong> Previous liquidity level / swing high (50% position)</div>
            <div><strong style={{ color: 'var(--text)' }}>TP2:</strong> Equal highs / major resistance / premium zone</div>
            <div><strong style={{ color: 'var(--text)' }}>Trail:</strong> Move stop to BE at 1R, trail below swing lows</div>
            <div><strong style={{ color: 'var(--text)' }}>Avoid:</strong> Holding through 11:30–1:30 lunch chop</div>
          </div>
        </div>
      </div>
    </div>
  );
}
