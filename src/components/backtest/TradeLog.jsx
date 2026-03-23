import React, { useMemo, useState } from 'react';
import { List, Download } from 'lucide-react';
import { tradesToCsv, downloadCsv } from '../../engine/exportCsv';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
  fontFamily: "'JetBrains Mono', monospace",
};

const thStyle = {
  padding: '8px 6px',
  textAlign: 'left',
  color: 'var(--muted)',
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
  cursor: 'pointer',
  userSelect: 'none',
};

const headerRow = {
  background: 'var(--bg2)',
  borderBottom: '1px solid var(--border)',
};

const cellStyle = { padding: '6px', whiteSpace: 'nowrap' };

const winRow = { background: 'rgba(22,163,74,0.04)', borderBottom: '1px solid var(--border)' };
const lossRow = { background: 'rgba(220,38,38,0.04)', borderBottom: '1px solid var(--border)' };

const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatTime = (ts) => {
  if (!ts) return '—';
  return timeFmt.format(new Date(ts * 1000));
};

const formatPnl = (pnl) => {
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
};

const calcRR = (entry, exit, sl) => {
  const risk = Math.abs(entry - sl);
  if (risk === 0) return '—';
  return (Math.abs(exit - entry) / risk).toFixed(2);
};

const truncate = (s, max = 30) => {
  if (!s) return '—';
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

const COLUMNS = [
  { key: 'index', label: '#' },
  { key: 'entryTime', label: 'Time' },
  { key: 'side', label: 'Side' },
  { key: 'entry', label: 'Entry' },
  { key: 'exitPrice', label: 'Exit' },
  { key: 'pnl', label: 'P&L' },
  { key: 'rr', label: 'R:R' },
  { key: 'bars', label: 'Bars' },
  { key: 'exitReason', label: 'Exit' },
  { key: 'reason', label: 'Reason' },
];

export default function TradeLog({ trades, strategyName }) {
  const [sortKey, setSortKey] = useState('entryTime');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key) => {
    if (key === 'index') return;
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const enriched = useMemo(() => {
    if (!trades) return [];
    return trades.map((t) => ({
      ...t,
      rr: Math.abs(t.entry - t.sl) === 0 ? 0 : Math.abs(t.exitPrice - t.entry) / Math.abs(t.entry - t.sl),
      bars: (t.exitBar ?? 0) - (t.entryBar ?? 0),
    }));
  }, [trades]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [enriched, sortKey, sortAsc]);

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <List size={14} color="var(--muted)" />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Trade Log</span>
        <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {trades ? trades.length : 0} trades
          {trades && trades.length > 0 && (
            <button
              onClick={() => {
                const csv = tradesToCsv(trades);
                const date = new Date().toISOString().slice(0, 10);
                downloadCsv(csv, `backtest-${strategyName || 'trades'}-${date}.csv`);
              }}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
              }}
              title="Export to CSV"
            >
              <Download size={10} />
              CSV
            </button>
          )}
        </span>
      </div>

      {(!trades || trades.length === 0) ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
          No trades to display. Run a backtest to see results.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                {COLUMNS.map((col) => (
                  <th key={col.key} style={thStyle} onClick={() => handleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const isWin = t.pnl >= 0;
                return (
                  <tr key={i} style={isWin ? winRow : lossRow}>
                    <td style={{ ...cellStyle, color: 'var(--muted)' }}>{i + 1}</td>
                    <td style={cellStyle}>{formatTime(t.entryTime)}</td>
                    <td style={{ ...cellStyle, color: t.side === 'LONG' ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
                      {t.side}
                    </td>
                    <td style={cellStyle}>{t.entry?.toFixed(2)}</td>
                    <td style={cellStyle}>{t.exitPrice?.toFixed(2)}</td>
                    <td style={{ ...cellStyle, color: isWin ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
                      {formatPnl(t.pnl)}
                    </td>
                    <td style={cellStyle}>{calcRR(t.entry, t.exitPrice, t.sl)}</td>
                    <td style={cellStyle}>{t.bars}</td>
                    <td style={{ ...cellStyle, color: t.exitReason === 'tp' ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
                      {t.exitReason?.toUpperCase()}
                    </td>
                    <td style={{ ...cellStyle, color: 'var(--muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {truncate(t.reason)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
