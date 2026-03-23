import { useState } from 'react';
import {
  TrendingUp,
  Activity,
  BarChart2,
  Layers,
  Wrench,
} from 'lucide-react';

const CATEGORY_ICONS = {
  breakout: TrendingUp,
  scalp: Activity,
  mean_reversion: BarChart2,
  structure: Layers,
  custom: Wrench,
};

const CATEGORY_COLORS = {
  breakout: {
    background: 'var(--amber-bg)',
    color: 'var(--amber)',
    border: '1px solid var(--amber)',
  },
  scalp: {
    background: 'var(--purple-bg)',
    color: 'var(--purple)',
    border: '1px solid var(--purple)',
  },
  mean_reversion: {
    background: 'var(--blue-bg)',
    color: 'var(--blue)',
    border: '1px solid var(--blue)',
  },
  structure: {
    background: 'var(--green-bg)',
    color: 'var(--green)',
    border: '1px solid var(--green)',
  },
  custom: {
    background: 'rgba(45,212,191,0.1)',
    color: 'var(--teal)',
    border: '1px solid var(--teal)',
  },
};

const CUSTOM_STRATEGY = {
  id: 'custom',
  name: 'Custom Strategy',
  description: 'Build your own strategy with entry/exit conditions',
  category: 'custom',
  params: {},
};

const badgeStyle = (category) => ({
  ...CATEGORY_COLORS[category],
  fontSize: '10px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '999px',
  textTransform: 'capitalize',
  lineHeight: '16px',
  whiteSpace: 'nowrap',
});

const baseCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '14px 16px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const selectedCardStyle = {
  border: '1px solid var(--accent)',
  background: 'rgba(79,142,247,0.06)',
};

const hoveredCardStyle = {
  border: '1px solid var(--border2)',
};

function StrategyCard({ strategy, isSelected, isHovered, onMouseEnter, onMouseLeave, onClick }) {
  const Icon = CATEGORY_ICONS[strategy.category] || Layers;
  const isCustom = strategy.id === 'custom';

  const cardStyle = {
    ...baseCardStyle,
    ...(isCustom ? { borderStyle: 'dashed' } : {}),
    ...(isHovered && !isSelected ? hoveredCardStyle : {}),
    ...(isSelected ? selectedCardStyle : {}),
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Icon
          size={18}
          style={{ color: CATEGORY_COLORS[strategy.category]?.color || 'var(--muted)' }}
        />
        <span style={badgeStyle(strategy.category)}>
          {strategy.category.replace('_', ' ')}
        </span>
      </div>

      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
        {strategy.name}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--muted)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {strategy.description}
      </div>
    </div>
  );
}

function StrategySelector({ strategies = [], selected, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  const allStrategies = [...strategies, CUSTOM_STRATEGY];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '10px',
      }}
    >
      {allStrategies.map((strategy) => (
        <StrategyCard
          key={strategy.id}
          strategy={strategy}
          isSelected={selected?.id === strategy.id}
          isHovered={hoveredId === strategy.id}
          onMouseEnter={() => setHoveredId(strategy.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onSelect(strategy.id === 'custom' ? CUSTOM_STRATEGY : strategy)}
        />
      ))}
    </div>
  );
}

export default StrategySelector;
