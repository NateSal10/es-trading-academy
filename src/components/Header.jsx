import { useMarketStatus } from '../hooks/useMarketStatus';

export default function Header() {
  const { status: session, timeStr } = useMarketStatus();
  const sessionColor =
    session === 'RTH' ? 'var(--green-bright)' :
    session === 'ETH' ? 'var(--amber-bright)' :
    'var(--muted)';

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="logo">
          <span style={{ color: 'var(--accent)' }}>ES</span> Academy
        </div>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>SMC · ICT · Prop Firm Training</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: sessionColor,
            flexShrink: 0,
          }} />
          <span style={{ color: 'var(--muted2)', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
            {timeStr} ET
          </span>
          <span style={{ color: sessionColor, fontWeight: 600 }}>{session}</span>
        </div>
      </div>
    </div>
  );
}
