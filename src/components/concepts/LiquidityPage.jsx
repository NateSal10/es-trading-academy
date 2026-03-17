export default function LiquidityPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-amber">Smart Money Concept — Study This</div>
        <div className="card-title">Liquidity Sweeps &amp; Stop Hunts</div>
        <div className="card-sub">Retail traders place stops in predictable locations. Institutions (smart money) deliberately push price to those levels to trigger those stops, fill their own large orders at better prices, then reverse. Understanding this changes everything about how you read charts.</div>
        <svg viewBox="0 0 680 290" className="chart">
          <line x1="20" y1="80" x2="650" y2="80" stroke="#BA7517" strokeWidth="1.2" strokeDasharray="6 4"/>
          <text x="12" y="76" textAnchor="end" className="lbl-accent" fill="#BA7517">EQH</text>
          <text x="430" y="70" className="lbl" fill="#BA7517">← Retail stops clustered here (buy stops)</text>
          <polyline points="30,220 70,175 110,195 150,140 190,160 230,100 260,90" fill="none" stroke="#8b90a8" strokeWidth="2"/>
          <circle cx="150" cy="80" r="4" fill="#BA7517" opacity="0.7"/>
          <circle cx="230" cy="80" r="4" fill="#BA7517" opacity="0.7"/>
          <line x1="270" y1="80" x2="270" y2="46" stroke="#D85A30" strokeWidth="2"/>
          <rect x="258" y="66" width="24" height="22" fill="#D85A30" rx="2"/>
          <text x="285" y="42" className="lbl-accent" fill="#D85A30">SWEEP!</text>
          <text x="285" y="55" className="lbl" fill="#D85A30">Stop orders triggered</text>
          <text x="285" y="67" className="lbl" fill="#D85A30">Institutions fill shorts</text>
          <polyline points="282,72 330,105 380,88 430,140 480,122 530,175 580,160 640,210" fill="none" stroke="#D85A30" strokeWidth="2.5"/>
          <text x="340" y="76" className="lbl-accent" fill="#D85A30">REVERSAL</text>
          <circle cx="310" cy="88" r="7" fill="#1D9E75"/>
          <text x="310" y="118" textAnchor="middle" style={{fontSize:'9px',fontWeight:'700',fill:'#5DCAA5',fontFamily:'inherit'}}>ENTRY</text>
          <text x="310" y="130" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit'}}>(short after sweep)</text>
          <line x1="20" y1="225" x2="650" y2="225" stroke="#4f8ef7" strokeWidth="1" strokeDasharray="5 3"/>
          <text x="12" y="221" textAnchor="end" className="lbl" fill="#4f8ef7">EQL</text>
          <text x="200" y="242" className="lbl" fill="#4f8ef7">← Sell-side liquidity pool (next target for price)</text>
          <text x="30" y="276" className="lbl" fill="#8b90a8">Retail: "Breakout! I'm long!"</text>
          <text x="300" y="276" className="lbl" fill="#D85A30">Smart money: positioned short, price heads to sell-side liq ↓</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-amber">Where liquidity pools live on ES</div>
          <ul className="checklist">
            <li><span className="chk">►</span>Equal highs and equal lows (EQH / EQL)</li>
            <li><span className="chk">►</span>Previous day high and low (PDH / PDL)</li>
            <li><span className="chk">►</span>Previous week high and low</li>
            <li><span className="chk">►</span>Overnight session high and low</li>
            <li><span className="chk">►</span>Round numbers (5000, 5050, 5100…)</li>
            <li><span className="chk">►</span>Opening range high/low (9:30–10:00 AM)</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-blue">The sweep trade setup</div>
          <ul className="checklist">
            <li><span className="chk">1</span>Mark the liquidity pool before market opens</li>
            <li><span className="chk">2</span>Watch for price to SPIKE through the level</li>
            <li><span className="chk">3</span>Look for a REJECTION — wick through, body closes back</li>
            <li><span className="chk">4</span>Enter on the rejection candle close</li>
            <li><span className="chk">5</span>Stop above/below the sweep wick tip</li>
            <li><span className="chk">6</span>Target = opposite liquidity pool</li>
          </ul>
        </div>
      </div>
    </>
  );
}
