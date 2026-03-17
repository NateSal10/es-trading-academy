export default function FVGPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">Key Concept — Study This</div>
        <div className="card-title">Fair Value Gap (FVG) &amp; Inverse FVG (IFVG)</div>
        <div className="card-sub">A FVG is a 3-candle imbalance. The gap between candle 1's wick and candle 3's wick is an unfilled zone — price moved so fast that orders couldn't be filled there. Institutions need to return to fill those orders, making the FVG a high-probability entry zone.</div>
        <svg viewBox="0 0 680 300" className="chart">
          <text x="10" y="18" className="lbl-md">Bullish FVG Formation</text>
          <line x1="80" y1="60" x2="80" y2="240" stroke="#D85A30" strokeWidth="2"/>
          <rect x="63" y="140" width="34" height="80" fill="#D85A30" rx="3"/>
          <text x="80" y="255" textAnchor="middle" className="lbl">Candle 1</text>
          <line x1="150" y1="35" x2="150" y2="160" stroke="#1D9E75" strokeWidth="2"/>
          <rect x="133" y="48" width="34" height="100" fill="#1D9E75" rx="3"/>
          <text x="150" y="255" textAnchor="middle" className="lbl">Candle 2</text>
          <text x="150" y="268" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit'}}>Impulse</text>
          <line x1="220" y1="65" x2="220" y2="155" stroke="#D85A30" strokeWidth="2"/>
          <rect x="203" y="75" width="34" height="50" fill="#D85A30" rx="3"/>
          <text x="220" y="255" textAnchor="middle" className="lbl">Candle 3</text>
          <rect x="55" y="60" width="200" height="80" fill="rgba(29,158,117,0.1)" rx="3"/>
          <line x1="55" y1="60" x2="255" y2="60" stroke="#1D9E75" strokeWidth="1.2" strokeDasharray="5 3"/>
          <line x1="55" y1="140" x2="255" y2="140" stroke="#1D9E75" strokeWidth="1.2" strokeDasharray="5 3"/>
          <text x="265" y="96" className="lbl-accent" fill="#1D9E75">FVG</text>
          <text x="265" y="110" className="lbl" fill="#5DCAA5">zone</text>
          <polyline points="254,55 310,48 370,90 410,88" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeDasharray="6 3"/>
          <text x="420" y="92" className="lbl" fill="#4f8ef7">pullback</text>
          <text x="420" y="104" className="lbl" fill="#4f8ef7">fills FVG</text>
          <circle cx="395" cy="88" r="7" fill="#1D9E75" fillOpacity="0.8"/>
          <text x="395" y="72" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit',fontWeight:'700'}}>ENTRY</text>
          <rect x="254" y="60" width="390" height="80" fill="rgba(29,158,117,0.05)"/>
          <line x1="254" y1="60" x2="644" y2="60" stroke="#1D9E75" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5"/>
          <line x1="254" y1="140" x2="644" y2="140" stroke="#1D9E75" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5"/>
          <text x="10" y="210" className="lbl-md">IFVG — After FVG is fully filled</text>
          <rect x="55" y="220" width="240" height="40" fill="rgba(216,90,48,0.1)" rx="3"/>
          <line x1="55" y1="220" x2="295" y2="220" stroke="#D85A30" strokeWidth="1" strokeDasharray="4 2"/>
          <line x1="55" y1="260" x2="295" y2="260" stroke="#D85A30" strokeWidth="1" strokeDasharray="4 2"/>
          <text x="305" y="236" className="lbl" fill="#ef7a50">Old demand</text>
          <text x="305" y="250" className="lbl" fill="#ef7a50">→ now SUPPLY</text>
          <text x="305" y="264" className="lbl" fill="#ef7a50">(short entry)</text>
          <polyline points="55,225 100,200 160,215 220,195 280,182" fill="none" stroke="#D85A30" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-green">Bullish FVG Entry</div>
          <ul className="checklist">
            <li><span className="chk">✓</span>Macro structure is bullish (HH/HL on 15m+)</li>
            <li><span className="chk">✓</span>A bullish FVG forms on an impulse leg</li>
            <li><span className="chk">✓</span>Price pulls back INTO the FVG zone</li>
            <li><span className="chk">✓</span>Entry at FVG midpoint or FVG low</li>
            <li><span className="chk">✓</span>Stop below the FVG low</li>
            <li><span className="chk">✓</span>Target = next liquidity pool (equal highs, prior HOD)</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-red">IFVG (Inverse FVG)</div>
          <p className="card-sub">Once price <strong style={{color:'var(--text)'}}>fully closes through</strong> a bullish FVG (body close, not just a wick), role reversal occurs.</p>
          <p className="card-sub" style={{marginBottom:0}}>The old demand zone is now supply. A return to that zone = short entry. This is one of the most powerful setups because retail traders are still buying there expecting a bounce.</p>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-amber">FVG Grading (not all FVGs are equal)</div>
        <div className="row2" style={{gap:'8px',marginTop:'4px'}}>
          <div>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#e8a93a',marginBottom:'4px'}}>HIGH QUALITY FVG</div>
            <p style={{fontSize:'12px',color:'var(--muted)'}}>Forms after a liquidity sweep · Aligns with HTF structure · Overlaps with an Order Block · In a premium/discount zone</p>
          </div>
          <div>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#8b90a8',marginBottom:'4px'}}>AVOID THIS FVG</div>
            <p style={{fontSize:'12px',color:'var(--muted)'}}>Random FVG mid-range with no sweep · Going against HTF structure · Already partially filled · Very small gap (under 3-4 ES pts)</p>
          </div>
        </div>
      </div>
    </>
  );
}
