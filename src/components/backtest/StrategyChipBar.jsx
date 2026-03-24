import React from 'react';
import { Plus, Star } from 'lucide-react';

const s = {
  bar: {
    background: 'var(--card)',
    borderBottom: '1px solid var(--border)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chipRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  chip: (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
  variantChip: (active) => ({
    background: active ? '#22c55e22' : 'var(--bg2)',
    color: active ? 'var(--green)' : 'var(--muted)',
    border: `1px solid ${active ? '#22c55e44' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  }),
  pineChip: {
    background: 'rgba(168,85,247,0.1)',
    color: 'var(--purple)',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '11px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  newChip: {
    background: 'none',
    border: '1px dashed var(--border)',
    color: 'var(--muted)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  select: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '11px',
  },
  runBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : 'var(--accent)',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
};

const SYMBOLS = ['ES=F', 'MES=F', 'NQ=F', 'MNQ=F'];

export default function StrategyChipBar({
  presets,           // array of strategy objects
  variants,          // array of { id, name, baseStrategy, config }
  selectedId,        // currently selected strategy id or variant id
  symbol,
  onSelectPreset,    // (strategy) => void
  onSelectVariant,   // (variant) => void
  onSymbolChange,    // (symbol) => void
  onPineScript,      // () => void — opens Pine Script tab
  onNewStrategy,     // () => void — opens custom builder modal
  onRun,             // () => void
  running,
  canRun,
}) {
  return (
    <div style={s.bar}>
      <div style={s.chipRow}>
        {presets.map((strategy) => (
          <button
            key={strategy.id}
            style={s.chip(selectedId === strategy.id)}
            onClick={() => onSelectPreset(strategy)}
          >
            {strategy.name}
          </button>
        ))}

        {variants.map((variant) => (
          <button
            key={variant.id}
            style={s.variantChip(selectedId === variant.id)}
            onClick={() => onSelectVariant(variant)}
          >
            <Star size={10} />
            {variant.name}
          </button>
        ))}

        <button style={s.pineChip} onClick={onPineScript}>
          Pine Script
        </button>

        <button style={s.newChip} onClick={onNewStrategy}>
          <Plus size={11} />
          New Strategy
        </button>
      </div>

      <div style={s.controls}>
        <select style={s.select} value={symbol} onChange={(e) => onSymbolChange(e.target.value)}>
          {SYMBOLS.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>
        <button style={s.runBtn(!canRun || running)} disabled={!canRun || running} onClick={onRun}>
          {running ? '⟳ Running…' : '▶ Run Backtest'}
        </button>
      </div>
    </div>
  );
}
