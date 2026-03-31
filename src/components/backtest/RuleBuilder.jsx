import React from 'react'
import { Plus } from 'lucide-react'
import ConditionRow from './ConditionRow'

const DIRECTIONS = ['LONG', 'SHORT', 'BOTH']

function newCondition(type = 'ema_cross') {
  const defaults = {
    ema_cross:   { maType: 'EMA', period: 20,  direction: 'above' },
    time_window: { start: '09:30', end: '11:00' },
    rsi:         { period: 14, operator: 'below', threshold: 30 },
    vwap:        { operator: 'above' },
    zone_time:   { startTime: '08:00', endTime: '08:15' },
    zone_manual: { high: '', low: '' },
  }
  return { id: crypto.randomUUID(), type, connector: 'AND', ...defaults[type] }
}

export const DEFAULT_RULE_CONFIG = {
  conditions: [newCondition('ema_cross')],
  tradeDirection: 'LONG',
  slPoints: 10,
  tpPoints: 20,
}

export default function RuleBuilder({ value, onChange, pointValue = 50 }) {
  const { conditions, tradeDirection, slPoints, tpPoints } = value

  const updateCondition = (index, updated) => {
    const next = conditions.map((c, i) => (i === index ? updated : c))
    onChange({ ...value, conditions: next })
  }

  const removeCondition = (index) => {
    if (conditions.length === 1) return
    onChange({ ...value, conditions: conditions.filter((_, i) => i !== index) })
  }

  const addCondition = () => {
    onChange({ ...value, conditions: [...conditions, newCondition('time_window')] })
  }

  const slDollars = (slPoints * pointValue).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const tpDollars = (tpPoints * pointValue).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
        Entry Rules
      </div>

      {/* Condition rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {conditions.map((cond, i) => (
          <ConditionRow
            key={cond.id}
            cond={cond}
            index={i}
            onChange={(updated) => updateCondition(i, updated)}
            onRemove={() => removeCondition(i)}
          />
        ))}
      </div>

      {/* Add condition */}
      <button
        onClick={addCondition}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'none',
          border: '1px dashed var(--border)',
          borderRadius: '6px',
          padding: '6px 12px',
          color: 'var(--muted)',
          fontSize: '12px',
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <Plus size={13} />
        Add condition
      </button>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Direction */}
        <div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
            Direction
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                onClick={() => onChange({ ...value, tradeDirection: d })}
                style={{
                  padding: '5px 14px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: tradeDirection === d ? 'none' : '1px solid var(--border)',
                  background: tradeDirection === d
                    ? d === 'LONG' ? 'var(--green)' : d === 'SHORT' ? 'var(--red)' : 'var(--accent)'
                    : 'var(--bg2)',
                  color: tradeDirection === d ? '#fff' : 'var(--muted)',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
            Stop Loss
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={slPoints}
              onChange={(e) => onChange({ ...value, slPoints: parseFloat(e.target.value) || 1 })}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '5px',
                color: 'var(--text)',
                padding: '5px 8px',
                fontSize: '13px',
                width: '72px',
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>pts</span>
            <span style={{ fontSize: '11px', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
              = {slDollars}
            </span>
          </div>
        </div>

        {/* Take Profit */}
        <div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
            Take Profit
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={tpPoints}
              onChange={(e) => onChange({ ...value, tpPoints: parseFloat(e.target.value) || 1 })}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '5px',
                color: 'var(--text)',
                padding: '5px 8px',
                fontSize: '13px',
                width: '72px',
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>pts</span>
            <span style={{ fontSize: '11px', color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>
              = {tpDollars}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
