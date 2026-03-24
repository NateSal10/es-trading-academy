import React, { useState, useEffect } from 'react';
import BacktestResults from './BacktestResults';
import TradeLog from './TradeLog';
import VisualReplay from './VisualReplay';
import PineScriptTab from './PineScriptTab';
import BacktestHistory from './BacktestHistory';

const TABS = ['Overview', 'Trades', 'Visual Replay', 'Pine Script'];

const s = {
  shell: {
    background: 'var(--card)',
    borderTop: '1px solid var(--border)',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px 0',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  tab: (active) => ({
    padding: '5px 14px',
    borderRadius: '6px 6px 0 0',
    fontSize: '11px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--text)' : 'var(--muted)',
    background: active ? 'var(--card)' : 'transparent',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    borderBottom: active ? '1px solid var(--card)' : '1px solid transparent',
    cursor: 'pointer',
    marginBottom: active ? '-1px' : 0,
  }),
};

export default function ResultsTabs({
  metrics,
  equityCurve,
  trades,
  candles,
  strategyName,
  onSelectHistory,
  onPineUse,
  initialTab,
  onTabOpened,
}) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onTabOpened?.();
    }
  }, [initialTab]);

  return (
    <div style={s.shell}>
      <div style={s.tabBar}>
        {TABS.map((tab) => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div style={{ padding: '16px' }}>
          <BacktestResults metrics={metrics} equityCurve={equityCurve} />
          <BacktestHistory onSelect={onSelectHistory} />
        </div>
      )}
      {activeTab === 'Trades' && (
        <TradeLog trades={trades} strategyName={strategyName} />
      )}
      {activeTab === 'Visual Replay' && (
        <VisualReplay candles={candles} trades={trades} />
      )}
      {activeTab === 'Pine Script' && (
        <PineScriptTab onUseStrategy={onPineUse} />
      )}
    </div>
  );
}
