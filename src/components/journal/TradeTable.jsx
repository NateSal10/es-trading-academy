import useStore from '../../store/index'

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function fmtPrice(n) {
  if (n == null) return '—'
  return Number(n).toFixed(2)
}

function fmtPnl(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}$${Math.abs(n).toFixed(0)}`
}

function fmtRR(n) {
  if (n == null) return '—'
  return n.toFixed(2)
}

export default function TradeTable() {
  const journal = useStore(s => s.journal)
  const deleteTrade = useStore(s => s.deleteTrade)

  const sorted = [...journal].reverse()

  if (sorted.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 22px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>No trades logged yet</div>
        <div style={{ fontSize: '13px' }}>Use the form to log your first trade.</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '14px', overflowX: 'auto' }}>
      <div className="card-title">Trade Log ({sorted.length})</div>
      <table
        className="journal-table"
        style={{
          width: '100%',
          fontSize: '12px',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Date', 'Symbol', 'Dir', 'Entry', 'Exit', 'Contracts', 'P&L', 'R:R', 'Setup', 'Notes', ''].map(h => (
              <th key={h} style={{
                textAlign: 'left',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((trade, idx) => {
            const isLong = trade.direction === 'LONG'
            const dirColor = isLong ? 'var(--green)' : 'var(--red)'
            const pnlColor = trade.pnl > 0 ? 'var(--green)' : trade.pnl < 0 ? 'var(--red)' : 'var(--muted)'
            const rowBg = idx % 2 === 1 ? 'var(--bg3)' : 'transparent'

            return (
              <tr key={trade.id} style={{ background: rowBg, borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 8px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{trade.date}</td>
                <td style={{ padding: '7px 8px', fontWeight: 600 }}>{trade.symbol}</td>
                <td style={{ padding: '7px 8px', color: dirColor, fontWeight: 600 }}>{trade.direction}</td>
                <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>{fmtPrice(trade.entryPrice)}</td>
                <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>{fmtPrice(trade.exitPrice)}</td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>{trade.contracts}</td>
                <td style={{ padding: '7px 8px', color: pnlColor, fontWeight: 600, fontFamily: 'monospace' }}>
                  {fmtPnl(trade.pnl)}
                </td>
                <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>{fmtRR(trade.rr)}</td>
                <td style={{ padding: '7px 8px' }}>
                  <span className="badge" style={{
                    background: 'var(--blue-bg)',
                    color: '#6aabf7',
                    border: '1px solid rgba(24,95,165,0.3)',
                    fontSize: '10px',
                    padding: '2px 6px',
                  }}>{trade.setup}</span>
                </td>
                <td style={{ padding: '7px 8px', color: 'var(--muted)', maxWidth: '160px' }}>
                  {truncate(trade.notes, 40)}
                </td>
                <td style={{ padding: '7px 8px' }}>
                  <button
                    onClick={() => deleteTrade(trade.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      color: 'var(--muted)',
                      transition: 'color 0.15s',
                    }}
                    title="Delete trade"
                    onMouseEnter={e => e.target.style.color = 'var(--red)'}
                    onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
