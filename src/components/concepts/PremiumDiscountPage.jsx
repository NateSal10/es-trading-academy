export default function PremiumDiscountPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">SMC Core — Fibonacci Framework</div>
        <div className="card-title">Premium &amp; Discount Zones</div>
        <div className="card-sub">
          Smart money buys in <strong style={{color:'var(--text)'}}>discount</strong> (below 50% of the range) and sells in <strong style={{color:'var(--text)'}}>premium</strong> (above 50%). This framework applies to every timeframe and prevents you from buying tops or selling bottoms.
        </div>
        <svg viewBox="0 0 680 320" className="chart">
          {/* Range box */}
          <line x1="60" y1="40" x2="620" y2="40" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="4 3"/>
          <line x1="60" y1="280" x2="620" y2="280" stroke="#D85A30" strokeWidth="1.5" strokeDasharray="4 3"/>
          <text x="28" y="44" className="lbl-accent" fill="#1D9E75" textAnchor="middle">100%</text>
          <text x="28" y="284" className="lbl-accent" fill="#D85A30" textAnchor="middle">0%</text>
          {/* Equilibrium */}
          <line x1="60" y1="160" x2="620" y2="160" stroke="#4f8ef7" strokeWidth="1.5"/>
          <text x="28" y="164" className="lbl-accent" fill="#4f8ef7" textAnchor="middle">50%</text>
          <text x="340" y="150" textAnchor="middle" className="lbl-accent" fill="#4f8ef7">EQUILIBRIUM</text>
          {/* Premium zone */}
          <rect x="60" y="40" width="560" height="120" fill="rgba(216,90,48,0.07)" rx="0"/>
          <text x="340" y="80" textAnchor="middle" style={{fontSize:'18px',fill:'rgba(216,90,48,0.5)',fontWeight:'700',fontFamily:'inherit'}}>PREMIUM ZONE</text>
          <text x="340" y="100" textAnchor="middle" className="lbl" fill="#ef7a50">Sell here / Short entries / Take profit on longs</text>
          {/* Discount zone */}
          <rect x="60" y="160" width="560" height="120" fill="rgba(29,158,117,0.07)" rx="0"/>
          <text x="340" y="230" textAnchor="middle" style={{fontSize:'18px',fill:'rgba(29,158,117,0.5)',fontWeight:'700',fontFamily:'inherit'}}>DISCOUNT ZONE</text>
          <text x="340" y="250" textAnchor="middle" className="lbl" fill="#5DCAA5">Buy here / Long entries / Take profit on shorts</text>
          {/* OTE zone */}
          <line x1="60" y1="110" x2="620" y2="110" stroke="#9b94e8" strokeWidth="1" strokeDasharray="3 2"/>
          <line x1="60" y1="210" x2="620" y2="210" stroke="#9b94e8" strokeWidth="1" strokeDasharray="3 2"/>
          <text x="634" y="114" className="lbl" fill="#9b94e8">79%</text>
          <text x="634" y="214" className="lbl" fill="#9b94e8">21%</text>
          <text x="634" y="164" className="lbl" fill="#4f8ef7">50%</text>
          {/* OTE bracket */}
          <rect x="580" y="110" width="3" height="100" fill="#9b94e8" opacity="0.5"/>
          <text x="600" y="155" textAnchor="start" style={{fontSize:'9px',fill:'#9b94e8',fontFamily:'inherit',fontWeight:'700'}}>OTE</text>
          <text x="600" y="165" textAnchor="start" style={{fontSize:'9px',fill:'#9b94e8',fontFamily:'inherit'}}>Zone</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-green">How to apply</div>
          <ul className="checklist">
            <li><span className="chk">1</span>Identify the swing low (0%) and swing high (100%)</li>
            <li><span className="chk">2</span>Draw the range on your 1H or 15m chart</li>
            <li><span className="chk">3</span>Only take longs when price is below 50% (discount)</li>
            <li><span className="chk">4</span>Only take shorts when price is above 50% (premium)</li>
            <li><span className="chk">5</span>Best entries are in the 62–79% discount zone (OTE)</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-purple">OTE — Optimal Trade Entry</div>
          <p className="card-sub">The OTE is the 62%–79% retracement zone — the "sweet spot" where institutional orders are waiting. It sits in the deep discount (for longs) or deep premium (for shorts), providing the tightest stops and best R:R.</p>
          <div style={{background:'var(--purple-bg)',border:'1px solid rgba(83,74,183,0.3)',borderRadius:'8px',padding:'10px 14px',fontSize:'12px'}}>
            <div style={{marginBottom:'4px'}}><span style={{color:'#9b94e8',fontWeight:'700'}}>Fib 62%</span> → first OTE level</div>
            <div style={{marginBottom:'4px'}}><span style={{color:'#9b94e8',fontWeight:'700'}}>Fib 70.5%</span> → premium OTE</div>
            <div><span style={{color:'#9b94e8',fontWeight:'700'}}>Fib 79%</span> → deepest OTE level</div>
          </div>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-amber">ES Application</div>
        <p className="card-sub" style={{marginBottom:0}}>After a bullish BOS, measure the impulse range. Wait for price to pull back into the 50–79% discount zone. The ideal entry overlaps the OTE with an Order Block or FVG. This stacks three confluences at once: structure (discount), price action (FVG/OB), and Fibonacci (OTE).</p>
      </div>
    </>
  )
}
