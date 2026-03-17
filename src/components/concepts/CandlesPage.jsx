export default function CandlesPage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">Foundation</div>
        <div className="card-title">Reading Candlesticks</div>
        <div className="card-sub">Each candle = one time period. Body = open-to-close distance. Wicks = extremes beyond the open/close. Color tells you who won that period.</div>
        <svg viewBox="0 0 680 240" className="chart">
          {/* Bullish candle */}
          <line x1="100" y1="20" x2="100" y2="220" stroke="#1D9E75" strokeWidth="2"/>
          <rect x="78" y="80" width="44" height="110" fill="#1D9E75" rx="3"/>
          <text x="100" y="14" textAnchor="middle" className="lbl">HIGH wick</text>
          <text x="158" y="84" className="lbl">← CLOSE (body top on bull)</text>
          <text x="158" y="194" className="lbl">← OPEN (body bottom on bull)</text>
          <text x="100" y="232" textAnchor="middle" className="lbl-accent" fill="#1D9E75">BULLISH</text>
          <line x1="125" y1="82" x2="158" y2="82" stroke="#3a3f5a" strokeWidth="0.7" strokeDasharray="3 2"/>
          <line x1="125" y1="190" x2="158" y2="190" stroke="#3a3f5a" strokeWidth="0.7" strokeDasharray="3 2"/>
          <text x="100" y="216" textAnchor="middle" className="lbl">LOW wick</text>
          {/* Bearish candle */}
          <line x1="320" y1="20" x2="320" y2="220" stroke="#D85A30" strokeWidth="2"/>
          <rect x="298" y="80" width="44" height="110" fill="#D85A30" rx="3"/>
          <text x="320" y="14" textAnchor="middle" className="lbl">HIGH wick</text>
          <text x="378" y="84" className="lbl">← OPEN (body top on bear)</text>
          <text x="378" y="194" className="lbl">← CLOSE (body bottom on bear)</text>
          <text x="320" y="232" textAnchor="middle" className="lbl-accent" fill="#D85A30">BEARISH</text>
          <line x1="344" y1="82" x2="378" y2="82" stroke="#3a3f5a" strokeWidth="0.7" strokeDasharray="3 2"/>
          <line x1="344" y1="190" x2="378" y2="190" stroke="#3a3f5a" strokeWidth="0.7" strokeDasharray="3 2"/>
          <text x="320" y="216" textAnchor="middle" className="lbl">LOW wick</text>
          {/* Doji */}
          <line x1="570" y1="30" x2="570" y2="210" stroke="#8b90a8" strokeWidth="2"/>
          <rect x="554" y="118" width="32" height="4" fill="#8b90a8" rx="1"/>
          <text x="570" y="222" textAnchor="middle" className="lbl">DOJI</text>
          <text x="570" y="232" textAnchor="middle" style={{fontSize:'9px',fill:'#5f6380',fontFamily:'inherit'}}>Indecision</text>
          {/* Hammer */}
          <line x1="470" y1="70" x2="470" y2="210" stroke="#1D9E75" strokeWidth="2"/>
          <rect x="454" y="70" width="32" height="30" fill="#1D9E75" rx="2"/>
          <text x="470" y="222" textAnchor="middle" className="lbl" fill="#1D9E75">HAMMER</text>
          <text x="470" y="232" textAnchor="middle" style={{fontSize:'9px',fill:'#5DCAA5',fontFamily:'inherit'}}>Bullish signal</text>
          {/* Shooting star */}
          <line x1="630" y1="30" x2="630" y2="170" stroke="#D85A30" strokeWidth="2"/>
          <rect x="614" y="140" width="32" height="30" fill="#D85A30" rx="2"/>
          <text x="630" y="182" textAnchor="middle" className="lbl" fill="#D85A30">SHOOTING</text>
          <text x="630" y="193" textAnchor="middle" className="lbl" fill="#D85A30">STAR</text>
          <text x="630" y="205" textAnchor="middle" style={{fontSize:'9px',fill:'#ef7a50',fontFamily:'inherit'}}>Bearish signal</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-green">Bullish patterns to know</div>
          <p className="card-sub" style={{marginBottom:0}}>
            <strong style={{color:'var(--text)'}}>Hammer</strong> — Long lower wick, small body at top. Buyers rejected lower prices hard.<br/><br/>
            <strong style={{color:'var(--text)'}}>Bullish Engulfing</strong> — A big green candle fully engulfs the prior red body. Strong reversal signal at demand zones.
          </p>
        </div>
        <div className="card">
          <div className="badge b-red">Bearish patterns to know</div>
          <p className="card-sub" style={{marginBottom:0}}>
            <strong style={{color:'var(--text)'}}>Shooting Star</strong> — Long upper wick, small body. Sellers rejected higher prices.<br/><br/>
            <strong style={{color:'var(--text)'}}>Bearish Engulfing</strong> — Big red candle engulfs the prior green body. Strong reversal at supply/FVG zones.
          </p>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-amber">Pro tip for ES</div>
        <p className="card-sub" style={{marginBottom:0}}>On ES futures, always check if a wick is sweeping a key level. A long wick through equal highs or a prior session high = liquidity sweep. The candle's body is the real story — the wick is the hunt.</p>
      </div>
    </>
  );
}
