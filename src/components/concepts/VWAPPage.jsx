export default function VWAPPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">Technical Analysis — Institutional Tool</div>
        <div className="card-title">VWAP &amp; Moving Averages</div>
        <div className="card-sub">
          VWAP (Volume Weighted Average Price) is the most important intraday level for ES. Institutions use it to benchmark their fills. Price above VWAP = bullish bias, below = bearish. EMAs show trend direction and act as dynamic support/resistance.
        </div>
        <svg viewBox="0 0 680 280" className="chart">
          {/* Price action */}
          <polyline points="20,220 60,200 90,185 120,170 150,175 180,155 210,130 230,120 250,135 270,120 290,100 310,85 340,95 360,80 390,70 420,60 450,75 480,65 510,55 540,60 570,50 600,45 640,40" fill="none" stroke="#4f8ef7" strokeWidth="1" opacity="0.5"/>
          {/* VWAP */}
          <polyline points="20,215 60,195 90,180 120,165 150,170 180,148 210,125 230,115 250,128 270,115 290,97 310,83 340,92 360,78 390,68 420,58 450,72 480,62 510,52 540,57 570,47 600,42 640,37" fill="none" stroke="#e8a93a" strokeWidth="2.5" strokeDasharray="6 3"/>
          <text x="650" y="35" className="lbl" fill="#e8a93a">VWAP</text>
          {/* EMA 9 */}
          <polyline points="90,180 120,166 150,170 180,150 210,126 230,116 250,130 270,116 290,98 310,82 340,91 360,77 390,67 420,57 450,71 480,61 510,51 540,56 570,46 600,41 640,36" fill="none" stroke="#ef7a50" strokeWidth="1.5"/>
          <text x="650" y="48" className="lbl" fill="#ef7a50">EMA 9</text>
          {/* EMA 21 */}
          <polyline points="120,180 150,174 180,160 210,140 230,128 250,136 270,123 290,106 310,90 340,98 360,84 390,74 420,64 450,78 480,68 510,58 540,63 570,53 600,48 640,43" fill="none" stroke="#4f8ef7" strokeWidth="1.5"/>
          <text x="650" y="61" className="lbl" fill="#4f8ef7">EMA 21</text>
          {/* EMA 50 */}
          <polyline points="180,185 210,165 230,155 250,158 270,148 290,133 310,120 340,125 360,112 390,102 420,92 450,103 480,95 510,88 540,90 570,83 600,78 640,73" fill="none" stroke="#9b94e8" strokeWidth="2"/>
          <text x="650" y="74" className="lbl" fill="#9b94e8">EMA 50</text>
          {/* Entry zones where price bounces off EMA */}
          <circle cx="250" cy="135" r="7" fill="rgba(29,158,117,0.0)" stroke="#1D9E75" strokeWidth="1.5"/>
          <text x="250" y="150" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit'}}>bounce</text>
          <circle cx="450" cy="75" r="7" fill="rgba(29,158,117,0.0)" stroke="#1D9E75" strokeWidth="1.5"/>
          <text x="450" y="90" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit'}}>bounce</text>
          {/* Zero line */}
          <line x1="20" y1="260" x2="640" y2="260" stroke="var(--border)" strokeWidth="0.5"/>
          {/* Volume bars */}
          {[60,90,120,150,180,210,250,290,340,390,450,510,570,640].map((x,i) => (
            <rect key={x} x={x-8} y={260 - (i%3===0?30:i%2===0?20:15)} width="16" height={i%3===0?30:i%2===0?20:15}
              fill={`rgba(79,142,247,${i%3===0?0.5:0.25})`} rx="1"/>
          ))}
          <text x="20" y="276" className="lbl">Volume</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-amber">VWAP Trading Rules</div>
          <ul className="checklist">
            <li><span className="chk">►</span>Price above VWAP = bullish bias — prefer longs</li>
            <li><span className="chk">►</span>Price below VWAP = bearish bias — prefer shorts</li>
            <li><span className="chk">►</span>First touch of VWAP from below = long opportunity</li>
            <li><span className="chk">►</span>Price failing to reclaim VWAP = strong short signal</li>
            <li><span className="chk">►</span>VWAP + FVG/OB overlap = A+ zone</li>
            <li><span className="chk">►</span>Reset daily — VWAP is an intraday tool only</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-blue">EMA Strategy for ES</div>
          <ul className="checklist">
            <li><span className="chk">►</span><strong style={{color:'var(--text)'}}>EMA 9</strong> — momentum filter (fast), entry timing</li>
            <li><span className="chk">►</span><strong style={{color:'var(--text)'}}>EMA 21</strong> — short-term trend, pullback entries</li>
            <li><span className="chk">►</span><strong style={{color:'var(--text)'}}>EMA 50</strong> — medium-term trend, swing trade bias</li>
            <li><span className="chk">►</span>EMA 9 crossing above 21 = bullish momentum shift</li>
            <li><span className="chk">►</span>Price bouncing off EMA 21 with FVG = entry signal</li>
            <li><span className="chk">►</span>Price below all 3 EMAs = strong downtrend, shorts only</li>
          </ul>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-green">Dynamic S/R Confluence Stack</div>
        <p className="card-sub" style={{marginBottom:0}}>The highest-confidence ES entries occur when VWAP, an EMA (9 or 21), and a Fair Value Gap or Order Block all sit within 1–2 points of each other. This "magnet zone" concentrates institutional interest. Price often bounces immediately on the first touch — don't wait for a second chance.</p>
      </div>
    </>
  )
}
