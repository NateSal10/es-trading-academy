import React from 'react';
import { History, Trash2, X } from 'lucide-react';
import useStore from '../../store';

const styles = {
  container: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  clearBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '2px 6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 14px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  date: {
    color: 'var(--muted)',
    fontSize: '10px',
    minWidth: '90px',
  },
  name: {
    fontWeight: 600,
    color: 'var(--text)',
    minWidth: '120px',
  },
  symbol: {
    color: 'var(--muted)',
    minWidth: '40px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: '2px',
    marginLeft: 'auto',
    opacity: 0.5,
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: '11px',
  },
};

export default function BacktestHistory({ onSelect }) {
  const history = useStore((s) => s.backtestHistory);
  const deleteResult = useStore((s) => s.deleteBacktestResult);
  const clearHistory = useStore((s) => s.clearBacktestHistory);

  if (!history || history.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <History size={13} color="var(--muted)" />
        <span style={styles.title}>Recent Backtests</span>
        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{history.length}</span>
        <button style={styles.clearBtn} onClick={clearHistory} title="Clear all">
          Clear All
        </button>
      </div>

      {history.slice(0, 10).map((entry) => {
        const pnl = entry.metrics?.totalPnL ?? 0;
        const winRate = entry.metrics?.winRate ?? 0;
        const isUp = pnl >= 0;

        return (
          <div
            key={entry.id}
            style={{
              ...styles.row,
              background: 'transparent',
            }}
            onClick={() => onSelect(entry)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={styles.date}>
              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span style={styles.name}>{entry.strategyName}</span>
            <span style={styles.symbol}>{entry.symbol}</span>
            <span style={{ color: isUp ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
              {isUp ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
            </span>
            <span style={{ color: winRate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
              {winRate.toFixed(0)}%
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '10px' }}>
              {entry.metrics?.totalTrades ?? 0}t
            </span>
            <button
              style={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                deleteResult(entry.id);
              }}
              title="Delete"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
