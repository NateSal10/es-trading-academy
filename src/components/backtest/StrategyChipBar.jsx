import { Plus, Star } from 'lucide-react';

const SYMBOLS = ['ES=F', 'MES=F', 'NQ=F', 'MNQ=F'];

export default function StrategyChipBar({
  presets,
  variants,
  selectedId,
  symbol,
  onSelectPreset,
  onSelectVariant,
  onSymbolChange,
  onPineScript,
  onNewStrategy,
  onRun,
  running,
  canRun,
}) {
  return (
    <div className="chip-bar">
      <div className="chip-row">
        {presets.map((strategy) => (
          <button
            key={strategy.id}
            className={`chip${selectedId === strategy.id ? ' chip-active' : ''}`}
            onClick={() => onSelectPreset(strategy)}
          >
            {strategy.name}
          </button>
        ))}

        {variants.map((variant) => (
          <button
            key={variant.id}
            className={`chip-variant${selectedId === variant.id ? ' chip-variant-active' : ''}`}
            onClick={() => onSelectVariant(variant)}
          >
            <Star size={10} />
            {variant.name}
          </button>
        ))}

        <button className="chip-pine" onClick={onPineScript}>
          Pine Script
        </button>

        <button className="chip-new" onClick={onNewStrategy}>
          <Plus size={11} />
          New Strategy
        </button>
      </div>

      <div className="chip-controls">
        <select className="chip-select" value={symbol} onChange={(e) => onSymbolChange(e.target.value)}>
          {SYMBOLS.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>
        <button
          className="run-btn"
          disabled={!canRun || running}
          onClick={onRun}
        >
          {running ? '⟳ Running…' : '▶ Run Backtest'}
        </button>
      </div>
    </div>
  );
}
