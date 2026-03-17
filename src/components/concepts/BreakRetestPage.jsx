export default function BreakRetestPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">Entry Technique</div>
        <div className="card-title">Break &amp; Retest (B&amp;R)</div>
        <div className="card-sub">After a key structural level is broken with momentum, price frequently returns to "retest" that level — which now acts in the opposite role. Old resistance becomes new support. Old support becomes new resistance. The retest is your entry opportunity.</div>
        <svg viewBox="0 0 680 275" className="chart">
          <line x1="20" y1="110" x2="340" y2="110" stroke="#8b90a8" strokeWidth="1.5"/>
          <text x="14" y="107" textAnchor="end" className="lbl-accent" fill="#8b90a8">RES</text>
          <polyline points="20,225 65,168 105,188 148,128 168,138 200,112" fill="none" stroke="#8b90a8" strokeWidth="2"/>
          <circle cx="148" cy="110" r="4" fill="#8b90a8" opacity="0.7"/>
          <line x1="225" y1="48" x2="225" y2="128" stroke="#1D9E75" strokeWidth="2"/>
          <rect x="211" y="62" width="28" height="58" fill="#1D9E75" rx="3"/>
          <text x="225" y="42" textAnchor="middle" className="lbl-accent" fill="#1D9E75">BREAK</text>
          <polyline points="253,68 290,52 330,60" fill="none" stroke="#1D9E75" strokeWidth="2"/>
          <polyline points="330,60 370,88 415,108 438,112" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeDasharray="5 3"/>
          <line x1="211" y1="110" x2="640" y2="110" stroke="#1D9E75" strokeWidth="1" strokeDasharray="4 2"/>
          <text x="645" y="114" className="lbl-accent" fill="#1D9E75">SUP</text>
          <rect x="408" y="96" width="90" height="28" fill="rgba(29,158,117,0.15)" rx="4"/>
          <text x="453" y="114" textAnchor="middle" className="lbl-accent" fill="#1D9E75">ENTRY ZONE</text>
          <polyline points="498,108 530,78 565,58 600,42 640,30" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
          <line x1="408" y1="132" x2="498" y2="132" stroke="#D85A30" strokeWidth="1" strokeDasharray="4 2"/>
          <text x="453" y="147" textAnchor="middle" className="lbl" fill="#D85A30">STOP (below old resistance)</text>
          <text x="580" y="35" className="lbl-accent" fill="#1D9E75">TARGET</text>
          <text x="30" y="260" className="lbl" fill="#8b90a8">Old resistance = new support. Wait for rejection candle before entering.</text>
          <text x="365" y="78" className="lbl" fill="#4f8ef7">retest</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-blue">Entry confirmation checklist</div>
          <ul className="checklist">
            <li><span className="chk">✓</span>Clear breakout with a strong momentum candle</li>
            <li><span className="chk">✓</span>Wait for price to return to the broken level</li>
            <li><span className="chk">✓</span>Look for a rejection candle at the level (hammer, engulfing)</li>
            <li><span className="chk">✓</span>Best if level also has an OB or FVG overlap</li>
            <li><span className="chk">✓</span>Enter on the close of the rejection candle</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-red">Common mistakes</div>
          <ul className="checklist">
            <li><span style={{color:'#ef7a50',fontWeight:'700'}}>✗</span>Chasing the breakout candle (FOMO)</li>
            <li><span style={{color:'#ef7a50',fontWeight:'700'}}>✗</span>No retest = no trade (move on, there will be more)</li>
            <li><span style={{color:'#ef7a50',fontWeight:'700'}}>✗</span>Entering without a rejection candle (premature)</li>
            <li><span style={{color:'#ef7a50',fontWeight:'700'}}>✗</span>Ignoring the HTF structure (trading against the trend)</li>
          </ul>
        </div>
      </div>
    </>
  );
}
