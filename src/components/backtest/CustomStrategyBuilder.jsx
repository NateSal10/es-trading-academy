import React, { useState, useCallback } from 'react';
import { Plus, X, Wrench } from 'lucide-react';
import { CONDITION_TYPES, SL_METHODS, TP_METHODS } from '../../engine/strategies/customStrategyRunner';

const s = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '12px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  select: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
  },
  input: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    width: '70px',
    boxSizing: 'border-box',
  },
  condRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  addBtn: {
    background: 'none',
    border: '1px dashed var(--border)',
    borderRadius: '6px',
    padding: '6px 12px',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: '2px',
    opacity: 0.6,
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  andBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '0 4px',
  },
  directionBtn: (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  }),
};

const DEFAULT_CONDITION = { type: 'bullish_candle' };

export default function CustomStrategyBuilder({ config, onChange }) {
  const {
    conditions = [{ ...DEFAULT_CONDITION }],
    direction = 'LONG',
    slMethod = 'fixed_points',
    slValue = 5,
    tpMethod = 'rr_multiple',
    tpValue = 2,
    maxTradesPerDay = 2,
  } = config || {};

  const update = useCallback((patch) => {
    onChange({ conditions, direction, slMethod, slValue, tpMethod, tpValue, maxTradesPerDay, ...patch });
  }, [conditions, direction, slMethod, slValue, tpMethod, tpValue, maxTradesPerDay, onChange]);

  const addCondition = () => {
    update({ conditions: [...conditions, { ...DEFAULT_CONDITION }] });
  };

  const removeCondition = (i) => {
    update({ conditions: conditions.filter((_, idx) => idx !== i) });
  };

  const updateCondition = (i, patch) => {
    update({
      conditions: conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });
  };

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>
        <Wrench size={14} color="var(--teal)" />
        Custom Strategy Builder
      </div>

      {/* Entry Conditions */}
      <div style={s.section}>
        <div style={s.label}>Entry Conditions (all must be true)</div>
        {conditions.map((cond, i) => {
          const condDef = CONDITION_TYPES.find((c) => c.id === cond.type);
          return (
            <div key={i}>
              {i > 0 && <div style={s.andBadge}>AND</div>}
              <div style={s.condRow}>
                <select
                  style={{ ...s.select, width: '220px' }}
                  value={cond.type}
                  onChange={(e) => updateCondition(i, { type: e.target.value })}
                >
                  {CONDITION_TYPES.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.label}</option>
                  ))}
                </select>

                {/* EMA period param */}
                {condDef?.hasParam === 'emaPeriod' && (
                  <div style={s.field}>
                    <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Period</span>
                    <input
                      type="number"
                      style={s.input}
                      value={cond.emaPeriod ?? 21}
                      min={2}
                      max={200}
                      onChange={(e) => updateCondition(i, { emaPeriod: Number(e.target.value) })}
                    />
                  </div>
                )}

                {/* Time window params */}
                {condDef?.hasParam === 'timeWindow' && (
                  <>
                    <div style={s.field}>
                      <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Start</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          style={{ ...s.input, width: '45px' }}
                          value={cond.startHour ?? 9}
                          min={0} max={23}
                          onChange={(e) => updateCondition(i, { startHour: Number(e.target.value) })}
                        />
                        <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>:</span>
                        <input
                          type="number"
                          style={{ ...s.input, width: '45px' }}
                          value={cond.startMin ?? 30}
                          min={0} max={59}
                          onChange={(e) => updateCondition(i, { startMin: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div style={s.field}>
                      <span style={{ fontSize: '9px', color: 'var(--muted)' }}>End</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          style={{ ...s.input, width: '45px' }}
                          value={cond.endHour ?? 15}
                          min={0} max={23}
                          onChange={(e) => updateCondition(i, { endHour: Number(e.target.value) })}
                        />
                        <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>:</span>
                        <input
                          type="number"
                          style={{ ...s.input, width: '45px' }}
                          value={cond.endMin ?? 0}
                          min={0} max={59}
                          onChange={(e) => updateCondition(i, { endMin: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {conditions.length > 1 && (
                  <button style={s.removeBtn} onClick={() => removeCondition(i)}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button style={s.addBtn} onClick={addCondition}>
          <Plus size={12} /> Add Condition
        </button>
      </div>

      {/* Direction */}
      <div style={s.section}>
        <div style={s.label}>Trade Direction</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {['LONG', 'SHORT', 'AUTO'].map((d) => (
            <button
              key={d}
              style={s.directionBtn(direction === d)}
              onClick={() => update({ direction: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Management */}
      <div style={s.section}>
        <div style={s.label}>Risk Management</div>
        <div style={s.row}>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Stop Loss Method</span>
            <select
              style={{ ...s.select, width: '180px' }}
              value={slMethod}
              onChange={(e) => update({ slMethod: e.target.value })}
            >
              {SL_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          {(slMethod === 'fixed_points') && (
            <div style={s.field}>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>SL Points</span>
              <input
                type="number"
                style={s.input}
                value={slValue}
                min={0.5} max={50} step={0.5}
                onChange={(e) => update({ slValue: Number(e.target.value) })}
              />
            </div>
          )}
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Take Profit Method</span>
            <select
              style={{ ...s.select, width: '150px' }}
              value={tpMethod}
              onChange={(e) => update({ tpMethod: e.target.value })}
            >
              {TP_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
              {tpMethod === 'rr_multiple' ? 'R:R Target' : 'TP Points'}
            </span>
            <input
              type="number"
              style={s.input}
              value={tpValue}
              min={0.5} max={10} step={0.5}
              onChange={(e) => update({ tpValue: Number(e.target.value) })}
            />
          </div>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Max Trades/Day</span>
            <input
              type="number"
              style={s.input}
              value={maxTradesPerDay}
              min={1} max={10}
              onChange={(e) => update({ maxTradesPerDay: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
