import { useMarketStatus } from '../../hooks/useMarketStatus'

const SESSIONS = [
  { name: 'Asia', start: '8:00 PM', end: '4:00 AM ET', color: '#9b94e8', desc: 'Low volume, range-bound. Sets up the liquidity that NY hunts.' },
  { name: 'London', start: '3:00 AM', end: '12:00 PM ET', color: '#4f8ef7', desc: 'High volatility. Often sets the daily high or low. London Kill Zone: 2–5 AM ET.' },
  { name: 'New York', start: '8:00 AM', end: '5:00 PM ET', color: '#1D9E75', desc: 'Highest volume. ES most active. NY Kill Zone: 7–10 AM ET (best setups).' },
]

const KILL_ZONES = [
  { name: 'London Kill Zone', time: '2:00–5:00 AM ET', badge: 'b-blue', desc: 'London open. Institutions hunt Asia range liquidity. Strong directional moves.' },
  { name: 'NY Kill Zone', time: '7:00–10:00 AM ET', badge: 'b-green', desc: 'Best window for ES. Opening range forms. Most A+ setups occur here. 9:30–10:00 AM is the opening range — watch, don\'t trade.' },
  { name: 'London Close', time: '10:00 AM–12:00 PM ET', badge: 'b-amber', desc: 'London books close. Can cause sharp reversals as European positions are liquidated.' },
  { name: 'NY Afternoon', time: '1:30–3:00 PM ET', badge: 'b-purple', desc: 'Second window. Less reliable than NY morning. Avoid 11:30–1:30 (lunch chop).' },
]

export default function SessionsPage() {
  const { status, NY_KILL, LONDON_KILL, LONDON_CLOSE, timeStr } = useMarketStatus()

  return (
    <>
      <div className="card">
        <div className="badge b-blue">Sessions &amp; Kill Zones</div>
        <div className="card-title">When Smart Money Moves</div>
        <div className="card-sub">Not all hours are equal. Institutions operate in predictable windows. Trading outside kill zones means fighting illiquid, choppy conditions. 80% of high-quality ES setups occur in just 3 hours per day.</div>

        {/* Live session indicator */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'12px 0',padding:'10px 14px',background:'var(--bg3)',borderRadius:'8px',border:'1px solid var(--border)'}}>
          <span style={{fontFamily:'monospace',fontSize:'20px',fontWeight:'700',color:'var(--text)'}}>{timeStr} ET</span>
          <span className={`session-badge ${status === 'RTH' ? 'session-rth' : status === 'ETH' ? 'session-eth' : 'session-closed'}`}>
            {status}
          </span>
          {NY_KILL && <span className="kill-zone-badge">🎯 NY Kill Zone</span>}
          {LONDON_KILL && <span className="kill-zone-badge">🎯 London Kill Zone</span>}
          {LONDON_CLOSE && <span className="kill-zone-badge">⚠ London Close</span>}
        </div>

        {/* 24h timeline SVG */}
        <svg viewBox="0 0 680 80" className="chart">
          {/* Background */}
          <rect x="0" y="20" width="680" height="30" fill="var(--bg3)" rx="4"/>
          {/* Asia: 20:00–04:00 (0–33% of 24h) */}
          <rect x="0" y="20" width="113" height="30" fill="rgba(155,148,232,0.2)" rx="0"/>
          <rect x="567" y="20" width="113" height="30" fill="rgba(155,148,232,0.2)" rx="0"/>
          {/* London: 03:00–12:00 */}
          <rect x="85" y="20" width="255" height="30" fill="rgba(79,142,247,0.2)" rx="0"/>
          {/* NY: 08:00–17:00 */}
          <rect x="227" y="20" width="255" height="30" fill="rgba(29,158,117,0.2)" rx="0"/>
          {/* Kill zones */}
          <rect x="57" y="20" width="85" height="30" fill="rgba(79,142,247,0.4)" rx="0"/>
          <rect x="198" y="20" width="85" height="30" fill="rgba(29,158,117,0.4)" rx="0"/>
          {/* Labels */}
          <text x="28" y="10" textAnchor="middle" className="lbl" fill="#9b94e8">Asia</text>
          <text x="212" y="10" textAnchor="middle" className="lbl" fill="#4f8ef7">London</text>
          <text x="354" y="10" textAnchor="middle" className="lbl" fill="#1D9E75">New York</text>
          <text x="99" y="12" textAnchor="middle" style={{fontSize:'9px',fill:'#4f8ef7',fontFamily:'inherit',fontWeight:'700'}}>LKZ</text>
          <text x="240" y="12" textAnchor="middle" style={{fontSize:'9px',fill:'#1D9E75',fontFamily:'inherit',fontWeight:'700'}}>NY KZ</text>
          {/* Hour marks */}
          {[0,4,8,12,16,20,24].map((h,i) => (
            <g key={h}>
              <line x1={i*113} y1="20" x2={i*113} y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              <text x={i*113} y="68" textAnchor="middle" className="lbl">{h === 24 ? '0' : h}:00</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="row2">
        {SESSIONS.map(s => (
          <div key={s.name} className="card">
            <div className="badge" style={{background:`rgba(79,142,247,0.1)`,color:s.color,border:`1px solid ${s.color}40`}}>{s.name} Session</div>
            <div style={{fontSize:'12px',color:'var(--muted)',marginBottom:'4px'}}>{s.start} – {s.end}</div>
            <p className="card-sub" style={{marginBottom:0}}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="badge b-green">Kill Zones</div>
        <div className="card-title">High-Probability Trading Windows</div>
        {KILL_ZONES.map(kz => (
          <div key={kz.name} style={{display:'flex',gap:'12px',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{flexShrink:0,paddingTop:'2px'}}>
              <span className={`badge ${kz.badge}`} style={{margin:0}}>{kz.time}</span>
            </div>
            <div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text)',marginBottom:'3px'}}>{kz.name}</div>
              <div style={{fontSize:'12px',color:'var(--muted)',lineHeight:'1.6'}}>{kz.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{background:'var(--bg3)'}}>
        <div className="badge b-amber">The Dead Zones — Avoid These</div>
        <div className="row2" style={{gap:'8px',marginTop:'4px'}}>
          <div>
            <div style={{fontSize:'12px',color:'#ef7a50',fontWeight:'700',marginBottom:'4px'}}>11:30 AM – 1:30 PM ET (Lunch Chop)</div>
            <p style={{fontSize:'12px',color:'var(--muted)'}}>Volume dries up. Price oscillates randomly in a tight range. Most stop-outs happen here. Walk away and come back for the afternoon session.</p>
          </div>
          <div>
            <div style={{fontSize:'12px',color:'#ef7a50',fontWeight:'700',marginBottom:'4px'}}>After 3:30 PM ET</div>
            <p style={{fontSize:'12px',color:'var(--muted)'}}>End-of-day position squaring creates erratic moves. No new entries. Close runners by 3:50 PM. Overnight gaps can gap through your stops.</p>
          </div>
        </div>
      </div>
    </>
  )
}
