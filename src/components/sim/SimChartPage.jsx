import { useState } from 'react';
import SimCanvas from './SimCanvas';

const LAYER_BTNS = [
  { id: 'structure', icon: '📊', label: 'Structure' },
  { id: 'fvg',       icon: '⚡', label: 'FVG' },
  { id: 'ob',        icon: '📦', label: 'Order Blocks' },
  { id: 'liq',       icon: '🎯', label: 'Liquidity' },
];

export default function SimChartPage() {
  const [layers, setLayers] = useState({ structure: true, fvg: true, ob: true, liq: true });

  function toggleLayer(id) {
    setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div className="badge b-blue">ES Futures — Simulated RTH Price Action</div>
            <div className="card-title" style={{ margin: '4px 0 2px' }}>Practice Chart — Read the Setup</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Toggle layers on/off to isolate each concept</div>
          </div>
          <div>
            {LAYER_BTNS.map(btn => (
              <button
                key={btn.id}
                className={`layer-btn${layers[btn.id] ? ' on' : ''}`}
                onClick={() => toggleLayer(btn.id)}
              >
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>
        <SimCanvas layers={layers} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', fontSize: '11px', color: 'var(--muted)' }}>
          <span><span className="legend-dot" style={{ background: '#1D9E75' }} />Bullish candle</span>
          <span><span className="legend-dot" style={{ background: '#D85A30' }} />Bearish candle</span>
          <span><span className="legend-dot" style={{ background: 'rgba(29,158,117,0.25)', border: '1px dashed #1D9E75' }} />FVG zone</span>
          <span><span className="legend-dot" style={{ background: 'rgba(186,117,23,0.25)', border: '1px dashed #BA7517' }} />Order Block</span>
          <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', verticalAlign: 'middle', marginRight: '4px' }} />Entry signal</span>
        </div>
      </div>

      <div className="row2">
        <div className="sim-info">
          <strong>How to use this chart:</strong><br />
          Toggle each layer on/off independently to train your eye. Start with ALL OFF, then enable one layer at a time. Can you spot the order block before turning that layer on? Can you see the FVG? Practice identifying them visually before checking.
        </div>
        <div className="sim-info">
          <strong>The full setup in this chart:</strong><br />
          1. Price sweeps sell-side liquidity (equal lows)<br />
          2. Last bearish candle before impulse = Order Block<br />
          3. Impulse up creates a Bullish FVG<br />
          4. Price pulls back into FVG/OB zone = Entry<br />
          5. Continuation to buy-side liquidity = Target
        </div>
      </div>
    </div>
  );
}
