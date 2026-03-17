export default function OrderBlocksPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-amber">Institutional Concept — Study This</div>
        <div className="card-title">Order Blocks (OB)</div>
        <div className="card-sub">An order block is the LAST opposing candle before a strong impulse move that breaks structure. It represents the candle where institutions loaded their positions. When price returns to that zone, unfilled institutional orders activate — creating a powerful reaction.</div>
        <svg viewBox="0 0 680 295" className="chart">
          <text x="10" y="18" className="lbl-md">Bullish Order Block — Last Bear Before Impulse</text>
          <line x1="60" y1="110" x2="60" y2="245" stroke="#D85A30" strokeWidth="1.5"/>
          <rect x="46" y="150" width="28" height="70" fill="#D85A30" rx="2" opacity="0.6"/>
          <line x1="105" y1="125" x2="105" y2="235" stroke="#D85A30" strokeWidth="1.5"/>
          <rect x="91" y="160" width="28" height="60" fill="#D85A30" rx="2" opacity="0.5"/>
          <line x1="150" y1="135" x2="150" y2="240" stroke="#D85A30" strokeWidth="1.5"/>
          <rect x="136" y="155" width="28" height="70" fill="#D85A30" rx="2"/>
          <rect x="132" y="131" width="36" height="78" fill="none" stroke="#BA7517" strokeWidth="2" rx="4" strokeDasharray="5 2"/>
          <text x="150" y="124" textAnchor="middle" className="lbl-accent" fill="#BA7517">OB</text>
          <text x="150" y="115" textAnchor="middle" style={{fontSize:'9px',fill:'#e8a93a',fontFamily:'inherit'}}>Last bear candle</text>
          <line x1="200" y1="68" x2="200" y2="205" stroke="#1D9E75" strokeWidth="1.5"/>
          <rect x="186" y="80" width="28" height="115" fill="#1D9E75" rx="2"/>
          <line x1="245" y1="45" x2="245" y2="130" stroke="#1D9E75" strokeWidth="1.5"/>
          <rect x="231" y="58" width="28" height="65" fill="#1D9E75" rx="2"/>
          <line x1="290" y1="30" x2="290" y2="105" stroke="#1D9E75" strokeWidth="1.5"/>
          <rect x="276" y="42" width="28" height="55" fill="#1D9E75" rx="2"/>
          <text x="245" y="20" textAnchor="middle" className="lbl-accent" fill="#1D9E75">IMPULSE</text>
          <rect x="168" y="131" width="480" height="78" fill="rgba(186,117,23,0.07)"/>
          <line x1="168" y1="131" x2="648" y2="131" stroke="#BA7517" strokeWidth="0.8" strokeDasharray="5 3"/>
          <line x1="168" y1="209" x2="648" y2="209" stroke="#BA7517" strokeWidth="0.8" strokeDasharray="5 3"/>
          <polyline points="318,40 360,68 410,50 455,100 500,150 530,165 555,155" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeDasharray="5 3"/>
          <circle cx="555" cy="157" r="8" fill="#1D9E75" fillOpacity="0.85"/>
          <text x="570" y="152" className="lbl-accent" fill="#1D9E75">ENTRY</text>
          <text x="570" y="163" className="lbl" fill="#5DCAA5">long at OB</text>
          <text x="400" y="126" className="lbl" fill="#BA7517">OB zone (high to low of the candle)</text>
          <text x="380" y="225" className="lbl" fill="#4f8ef7">← Pullback returns to OB — unfilled institutional orders activate</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-green">Bullish OB rules</div>
          <ul className="checklist">
            <li><span className="chk">►</span>Last <strong style={{color:'var(--text)'}}>bearish</strong> candle before a bullish impulse</li>
            <li><span className="chk">►</span>That impulse must break a swing high (BOS)</li>
            <li><span className="chk">►</span>Zone = OB candle high to low</li>
            <li><span className="chk">►</span>Enter long when price returns to zone</li>
            <li><span className="chk">►</span>Stop: below OB low</li>
            <li><span className="chk">►</span>Invalidated if price closes through (not just wicks)</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-red">Bearish OB rules</div>
          <ul className="checklist">
            <li><span className="chk">►</span>Last <strong style={{color:'var(--text)'}}>bullish</strong> candle before a bearish impulse</li>
            <li><span className="chk">►</span>That impulse must break a swing low (BOS)</li>
            <li><span className="chk">►</span>Enter short when price returns to zone</li>
            <li><span className="chk">►</span>Stop: above OB high</li>
            <li><span className="chk">►</span>Best OBs overlap with a bearish FVG</li>
            <li><span className="chk">►</span>Invalidated if price fully closes through</li>
          </ul>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-purple">OB + FVG Confluence — The A+ Setup</div>
        <p style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.7}}>When an Order Block and a Fair Value Gap overlap (OB forms during the same impulse that created the FVG), you have institutional supply/demand AND imbalance at the same level. This is the highest probability ES entry. Price typically reacts immediately on the first touch. Set a limit order at the 50% level of the overlapping zone.</p>
      </div>
    </>
  );
}
