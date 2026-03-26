import { useMarketStatus } from '../hooks/useMarketStatus';

export default function Header({ signOut, userEmail, synced }) {
  const { status: session, timeStr } = useMarketStatus();
  const sessionColor =
    session === 'RTH' ? 'var(--green-bright)' :
    session === 'ETH' ? 'var(--amber-bright)' :
    'var(--muted)';

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="logo">
          <span style={{ color: 'var(--accent)', letterSpacing: '-0.5px' }}>Trade</span>
          <span style={{ color: 'var(--text)' }}>Forge</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: 'var(--border)', flexShrink: 0 }} />
        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.6px', textTransform: 'uppercase', fontWeight: 500 }}>ES · NQ · Futures</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: sessionColor,
            flexShrink: 0,
            boxShadow: `0 0 6px 1px ${sessionColor}55`,
          }} />
          <span style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono','Fira Code',monospace", letterSpacing: '0.3px' }}>
            {timeStr}
          </span>
          <span style={{
            color: sessionColor,
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            background: `${sessionColor}12`,
            padding: '1px 6px',
            borderRadius: '4px',
            border: `1px solid ${sessionColor}30`,
          }}>{session}</span>
        </div>

        {userEmail && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {synced === false && (
                <span style={{ fontSize: '10px', color: 'var(--amber-bright)' }}>syncing...</span>
              )}
              <span className="user-email">{userEmail}</span>
              <button className="signout-btn" onClick={signOut}>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
