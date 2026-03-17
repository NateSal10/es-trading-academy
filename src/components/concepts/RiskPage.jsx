export default function RiskPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-red">Risk &amp; Psychology</div>
        <div className="card-title">Risk Management — The Foundation of Longevity</div>
        <div className="card-sub">The #1 reason traders fail is not lack of strategy — it's poor risk management. One properly sized trade won't make you rich. One poorly sized trade can end your career. Control risk first; profits follow automatically from a good edge.</div>
        <svg viewBox="0 0 680 260" className="chart">
          {/* R-multiple diagram */}
          <text x="10" y="18" className="lbl-md">R-Multiple Framework</text>
          {/* Entry */}
          <line x1="60" y1="140" x2="580" y2="140" stroke="#4f8ef7" strokeWidth="1.5"/>
          <text x="14" y="144" className="lbl" fill="#4f8ef7">ENTRY</text>
          {/* Stop */}
          <line x1="60" y1="190" x2="580" y2="190" stroke="#D85A30" strokeWidth="1.5" strokeDasharray="4 3"/>
          <text x="14" y="194" className="lbl" fill="#D85A30">STOP</text>
          {/* 1R target */}
          <line x1="60" y1="90" x2="580" y2="90" stroke="#1D9E75" strokeWidth="1" strokeDasharray="3 2" opacity="0.6"/>
          <text x="14" y="94" className="lbl" fill="#5DCAA5">1R</text>
          {/* 2R target */}
          <line x1="60" y1="40" x2="580" y2="40" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="5 3"/>
          <text x="14" y="44" className="lbl" fill="#1D9E75">2R</text>
          {/* Risk zone */}
          <rect x="60" y="140" width="520" height="50" fill="rgba(216,90,48,0.08)"/>
          <text x="320" y="170" textAnchor="middle" className="lbl" fill="#ef7a50">← 1R (risk) →</text>
          {/* Reward zone */}
          <rect x="60" y="40" width="520" height="100" fill="rgba(29,158,117,0.08)"/>
          <text x="320" y="95" textAnchor="middle" className="lbl" fill="#5DCAA5">← 2R (reward) →</text>
          {/* Scale-out arrows */}
          <line x1="200" y1="90" x2="200" y2="130" stroke="#e8a93a" strokeWidth="1.5" markerEnd="url(#arr)"/>
          <text x="210" y="108" className="lbl" fill="#e8a93a">Scale 50% at 1R</text>
          <text x="210" y="120" className="lbl" fill="#e8a93a">→ move stop to entry</text>
          <line x1="400" y1="50" x2="400" y2="80" stroke="#1D9E75" strokeWidth="1.5"/>
          <text x="410" y="68" className="lbl" fill="#5DCAA5">Runner to 2R+</text>
          {/* Win Rate chart */}
          <text x="10" y="230" className="lbl-md" fill="var(--muted)">Win rate needed to break even with given R:R</text>
          {[{rr:'1:1',pct:50,x:80},{rr:'1:2',pct:34,x:180},{rr:'1:3',pct:25,x:280},{rr:'1:4',pct:20,x:380}].map(d => (
            <g key={d.rr}>
              <rect x={d.x} y={250 - d.pct} width="60" height={d.pct} fill="rgba(79,142,247,0.3)" rx="2"/>
              <text x={d.x+30} y={252} textAnchor="middle" className="lbl">{d.rr}</text>
              <text x={d.x+30} y={247 - d.pct} textAnchor="middle" style={{fontSize:'10px',fill:'#6aabf7',fontFamily:'inherit',fontWeight:'700'}}>{d.pct}%</text>
            </g>
          ))}
          <text x="460" y="235" className="lbl" fill="var(--muted)">R:R ratio → the higher the R:R,</text>
          <text x="460" y="248" className="lbl" fill="var(--muted)">the lower win rate you need to profit</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-red">Position Sizing — ES &amp; MES</div>
          <ul className="checklist">
            <li><span className="chk">►</span>ES: <strong style={{color:'var(--text)'}}>$50 per point</strong> per contract</li>
            <li><span className="chk">►</span>MES: <strong style={{color:'var(--text)'}}>$5 per point</strong> per contract (micro)</li>
            <li><span className="chk">►</span>Risk 1% of account per trade MAX</li>
            <li><span className="chk">►</span>$50K account → max $500 risk/trade</li>
            <li><span className="chk">►</span>8-pt stop on ES = $400 risk = 1 contract</li>
            <li><span className="chk">►</span>Use MES to learn sizing before scaling to ES</li>
          </ul>
        </div>
        <div className="card">
          <div className="badge b-amber">Psychology Rules</div>
          <ul className="checklist">
            <li><span className="chk">►</span>Never move your stop loss to avoid getting stopped out</li>
            <li><span className="chk">►</span>After 2 losses in a day → stop trading, review</li>
            <li><span className="chk">►</span>Revenge trading doubles your losses, never your wins</li>
            <li><span className="chk">►</span>The best trade is sometimes no trade</li>
            <li><span className="chk">►</span>Process focus beats outcome focus</li>
            <li><span className="chk">►</span>Journal every trade — patterns reveal themselves</li>
          </ul>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-purple">The Math of Survival</div>
        <p className="card-sub" style={{marginBottom:'8px'}}>A 50% drawdown requires a 100% gain to recover. A 20% drawdown only needs 25%. <strong style={{color:'var(--text)'}}>Protect capital above all else.</strong></p>
        <div className="row3" style={{gap:'8px'}}>
          {[{loss:'10%',need:'11%',col:'#5DCAA5'},{loss:'25%',need:'33%',col:'#e8a93a'},{loss:'50%',need:'100%',col:'#ef7a50'},{loss:'75%',need:'300%',col:'#D85A30'}].map(r => (
            <div key={r.loss} style={{background:'var(--card)',borderRadius:'8px',padding:'8px 12px',textAlign:'center'}}>
              <div style={{fontSize:'18px',fontWeight:'700',color:r.col}}>{r.loss}</div>
              <div style={{fontSize:'10px',color:'var(--muted)'}}>loss</div>
              <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)',margin:'4px 0'}}>{r.need}</div>
              <div style={{fontSize:'10px',color:'var(--muted)'}}>to recover</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
