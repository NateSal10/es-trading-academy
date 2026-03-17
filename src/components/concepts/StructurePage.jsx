export default function StructurePage() {
  return (
    <>
      <div className="card">
        <div className="badge b-blue">Core Skill — Read this daily</div>
        <div className="card-title">Market Structure: HH · HL · LH · LL</div>
        <div className="card-sub">Structure tells you WHO is in control of the market. Only trade WITH the dominant structure. Uptrend = make Higher Highs and Higher Lows. Downtrend = Lower Highs and Lower Lows.</div>
        <svg viewBox="0 0 680 280" className="chart">
          <polyline points="20,240 80,180 130,205 195,125 250,150 310,70" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
          <circle cx="80" cy="180" r="5" fill="#5DCAA5"/>
          <circle cx="195" cy="125" r="5" fill="#1D9E75"/>
          <circle cx="310" cy="70" r="5" fill="#1D9E75"/>
          <circle cx="130" cy="205" r="5" fill="#5DCAA5"/>
          <circle cx="250" cy="150" r="5" fill="#5DCAA5"/>
          <text x="80" y="168" textAnchor="middle" className="lbl-accent" fill="#5DCAA5">HL</text>
          <text x="130" y="220" textAnchor="middle" className="lbl-accent" fill="#5DCAA5">HL</text>
          <text x="250" y="165" textAnchor="middle" className="lbl-accent" fill="#5DCAA5">HL</text>
          <text x="195" y="113" textAnchor="middle" className="lbl-accent" fill="#1D9E75">HH</text>
          <text x="310" y="58" textAnchor="middle" className="lbl-accent" fill="#1D9E75">HH</text>
          <text x="165" y="265" textAnchor="middle" className="lbl-md" fill="#1D9E75">UPTREND</text>
          <line x1="310" y1="70" x2="395" y2="150" stroke="#BA7517" strokeWidth="1.5" strokeDasharray="6 3"/>
          <text x="365" y="105" textAnchor="middle" className="lbl-accent" fill="#BA7517">CHoCH</text>
          <polyline points="395,150 440,115 490,170 540,90 590,200" fill="none" stroke="#D85A30" strokeWidth="2.5"/>
          <circle cx="440" cy="115" r="5" fill="#D85A30"/>
          <circle cx="540" cy="90" r="5" fill="#D85A30"/>
          <circle cx="490" cy="170" r="5" fill="#ef7a50"/>
          <circle cx="590" cy="200" r="5" fill="#ef7a50"/>
          <text x="440" y="103" textAnchor="middle" className="lbl-accent" fill="#D85A30">LH</text>
          <text x="540" y="78" textAnchor="middle" className="lbl-accent" fill="#D85A30">LH</text>
          <text x="490" y="185" textAnchor="middle" className="lbl-accent" fill="#ef7a50">LL</text>
          <text x="590" y="215" textAnchor="middle" className="lbl-accent" fill="#ef7a50">LL</text>
          <text x="490" y="265" textAnchor="middle" className="lbl-md" fill="#D85A30">DOWNTREND</text>
          <rect x="360" y="122" width="40" height="18" rx="4" fill="rgba(186,117,23,0.2)"/>
          <text x="380" y="135" textAnchor="middle" style={{fontSize:'9px',fill:'#e8a93a',fontFamily:'inherit',fontWeight:'700'}}>BOS</text>
        </svg>
      </div>
      <div className="row2">
        <div className="card">
          <div className="badge b-blue">BOS — Break of Structure</div>
          <p className="card-sub" style={{marginBottom:0}}>When price breaks the prior swing high (bullish BOS) or prior swing low (bearish BOS). Confirms continuation. On 15m+ = major structural BOS. On 5m = internal BOS.</p>
        </div>
        <div className="card">
          <div className="badge b-amber">CHoCH — Change of Character</div>
          <p className="card-sub" style={{marginBottom:0}}>The FIRST break AGAINST the prevailing trend. A warning sign — structure may be reversing. Don't trade the CHoCH itself. Wait for confirmation (another BOS in the new direction).</p>
        </div>
      </div>
      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-green">ES Workflow</div>
        <div style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.7}}>
          <strong style={{color:'var(--text)'}}>Step 1:</strong> Check 1H chart — what's the macro structure? Uptrend or downtrend?<br/>
          <strong style={{color:'var(--text)'}}>Step 2:</strong> Drop to 15m — confirm direction, identify most recent BOS.<br/>
          <strong style={{color:'var(--text)'}}>Step 3:</strong> Drop to 5m — look for your FVG or OB entry in the trend direction.
        </div>
      </div>
    </>
  );
}
