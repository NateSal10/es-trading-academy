export default function PsychologyPage() {
  const traps = [
    {
      name: 'FOMO',
      color: '#e8a93a',
      bg: 'var(--amber-bg)',
      border: 'rgba(186,117,23,0.3)',
      trigger: 'Price moves without you — you chase the entry late.',
      fix: 'No setup = no trade. Log the missed move in your journal and move on.',
    },
    {
      name: 'Revenge Trading',
      color: '#ef7a50',
      bg: 'var(--red-bg)',
      border: 'rgba(216,90,48,0.3)',
      trigger: 'You lose a trade and immediately enter another to "get it back".',
      fix: 'After a loss: 15-minute mandatory break. Re-check bias from scratch.',
    },
    {
      name: 'Moving Stops',
      color: '#ef7a50',
      bg: 'var(--red-bg)',
      border: 'rgba(216,90,48,0.3)',
      trigger: 'Trade goes against you — you move stop further to "give it room".',
      fix: 'Stop placement is pre-defined before entry. Never move it against your trade.',
    },
    {
      name: 'Overtrading',
      color: '#e8a93a',
      bg: 'var(--amber-bg)',
      border: 'rgba(186,117,23,0.3)',
      trigger: 'Boredom or a winning streak — trading every perceived setup.',
      fix: '2 trades per session max during eval. Quality over quantity, always.',
    },
    {
      name: 'Tilting after a Win',
      color: '#6aabf7',
      bg: 'var(--blue-bg)',
      border: 'rgba(24,95,165,0.3)',
      trigger: 'Big winner makes you feel invincible — you size up recklessly.',
      fix: 'Flat sizing during the eval. Every trade is 1 contract. No exceptions.',
    },
  ];

  const principles = [
    { title: 'Process Over Outcome', body: 'A good process on a losing trade is a success. A bad process on a winning trade is a problem. Judge yourself by your execution, not the result.' },
    { title: 'Accept the Loss Before Entry', body: 'Before you enter, accept the stop loss as already spent. You are buying information. If stopped out, no emotion — the market told you something.' },
    { title: 'One Trade at a Time', body: 'The only trade that matters is the one you\'re in. No projecting, no fantasizing about the P&L. Execute the current trade perfectly.' },
    { title: 'Journaling = Edge', body: 'Every trade logged, reviewed weekly, patterns found. Your journal is your second brain. Without it you repeat mistakes indefinitely.' },
    { title: 'Session Hard Stops', body: 'Set a daily loss limit (-$500 for 50K eval). When hit — stop. Shut the platform. Walk away. No emergency trades to recover.' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div className="badge b-purple">Risk &amp; Psychology</div>
        <div className="card-title">Trading Psychology</div>
        <div className="card-sub">
          90% of failed traders have the technical edge — they fail because of psychology.
          Discipline, consistency, and emotional control are the real edge.
        </div>
      </div>

      {/* The 5 Traps */}
      <div className="card">
        <div className="badge b-amber">The 5 Psychological Traps</div>
        <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
          {traps.map(t => (
            <div
              key={t.name}
              style={{
                background: t.bg,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: t.color, marginBottom: '4px', fontSize: '13px' }}>
                ⚠ {t.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                <strong style={{ color: 'var(--text)' }}>Trigger:</strong> {t.trigger}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                <strong style={{ color: '#5DCAA5' }}>Fix:</strong> {t.fix}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Principles */}
      <div className="card">
        <div className="badge b-green">5 Core Principles</div>
        <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
          {principles.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--blue-bg)', border: '1px solid rgba(24,95,165,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#6aabf7', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Routine */}
      <div className="card" style={{ background: 'var(--bg3)' }}>
        <div className="badge b-blue">Mental Routine</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: '#5DCAA5' }}>Before Market Open</div>
            {[
              'Review yesterday\'s trades — what worked?',
              'Mark HTF levels on chart (15m + 1h)',
              'Identify today\'s bias',
              'Set daily loss limit alert',
              'Complete pre-market checklist',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                <span style={{ color: '#5DCAA5' }}>→</span>{item}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: '#6aabf7' }}>After Market Close</div>
            {[
              'Log all trades in journal',
              'Screenshot best and worst setup',
              'Rate your execution (1–10)',
              'One lesson learned today',
              'Review tomorrow\'s economic calendar',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                <span style={{ color: '#6aabf7' }}>→</span>{item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mindset metrics */}
      <div className="card">
        <div className="badge b-purple">The Mindset Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
          {[
            { label: 'Avg Hold Time', target: '20–60 min', why: 'Long enough to develop, short enough to avoid chop' },
            { label: 'Win Rate', target: '40–55%', why: '2:1 R:R means 40% win rate is profitable' },
            { label: 'Max Drawdown/Day', target: '< $500', why: 'Protect capital for tomorrow\'s setups' },
            { label: 'Trades/Session', target: '1–3', why: 'Less is more — fewer, higher quality trades' },
            { label: 'Journal Streak', target: '100%', why: 'Never skip — patterns only emerge over 50+ trades' },
            { label: 'Consistency', target: '< 30%/day', why: 'Alpha Futures rule — no single day > 30% of total P&L' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#5DCAA5', marginBottom: '4px' }}>{m.target}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1.5 }}>{m.why}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
