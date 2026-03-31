import React from 'react'
import { X } from 'lucide-react'

const CONDITION_TYPES = [
  { value: 'ema_cross',    label: 'EMA / SMA Cross' },
  { value: 'time_window',  label: 'Time Window' },
  { value: 'rsi',          label: 'RSI' },
  { value: 'vwap',         label: 'VWAP' },
  { value: 'zone_time',    label: 'Zone (Time-based)' },
  { value: 'zone_manual',  label: 'Zone (Manual Levels)' },
  { value: 'br_zone',      label: 'Break & Retest Zone' },
]

const DEFAULTS = {
  ema_cross:   { maType: 'EMA', period: 20,  direction: 'above' },
  time_window: { start: '09:30', end: '11:00' },
  rsi:         { period: 14, operator: 'below', threshold: 30 },
  vwap:        { operator: 'above' },
  zone_time:   { startTime: '08:00', endTime: '08:15' },
  zone_manual: { high: '', low: '' },
  br_zone:     { startTime: '08:00', endTime: '08:15', rrRatio: 3 },
}

const sel = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  color: 'var(--text)',
  padding: '4px 8px',
  fontSize: '12px',
  cursor: 'pointer',
  outline: 'none',
}

const inp = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  color: 'var(--text)',
  padding: '4px 8px',
  fontSize: '12px',
  width: '72px',
  outline: 'none',
}

function TypeFields({ cond, onChange }) {
  const set = (fields) => onChange({ ...cond, ...fields })

  if (cond.type === 'ema_cross') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Price crosses</span>
      <select style={sel} value={cond.direction || 'above'} onChange={(e) => set({ direction: e.target.value })}>
        <option value="above">above</option>
        <option value="below">below</option>
      </select>
      <select style={sel} value={cond.maType || 'EMA'} onChange={(e) => set({ maType: e.target.value })}>
        <option value="EMA">EMA</option>
        <option value="SMA">SMA</option>
      </select>
      <input
        style={inp}
        type="number"
        min="1"
        max="200"
        value={cond.period ?? 20}
        onChange={(e) => set({ period: parseInt(e.target.value) || 20 })}
        placeholder="Period"
      />
    </>
  )

  if (cond.type === 'time_window') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Time is between</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.start || '09:30'}
        onChange={(e) => set({ start: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>and</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.end || '11:00'}
        onChange={(e) => set({ end: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>ET</span>
    </>
  )

  if (cond.type === 'rsi') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>RSI</span>
      <input
        style={{ ...inp, width: '52px' }}
        type="number"
        min="2"
        max="100"
        value={cond.period ?? 14}
        onChange={(e) => set({ period: parseInt(e.target.value) || 14 })}
        placeholder="14"
      />
      <select style={sel} value={cond.operator || 'below'} onChange={(e) => set({ operator: e.target.value })}>
        <option value="below">is below</option>
        <option value="above">is above</option>
      </select>
      <input
        style={{ ...inp, width: '52px' }}
        type="number"
        min="1"
        max="99"
        value={cond.threshold ?? 30}
        onChange={(e) => set({ threshold: parseInt(e.target.value) || 30 })}
        placeholder="30"
      />
    </>
  )

  if (cond.type === 'vwap') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Price is</span>
      <select style={sel} value={cond.operator || 'above'} onChange={(e) => set({ operator: e.target.value })}>
        <option value="above">above VWAP</option>
        <option value="below">below VWAP</option>
        <option value="crosses_above">crosses above VWAP</option>
        <option value="crosses_below">crosses below VWAP</option>
      </select>
    </>
  )

  if (cond.type === 'zone_time') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Price inside zone from</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.startTime || '08:00'}
        onChange={(e) => set({ startTime: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>to</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.endTime || '08:15'}
        onChange={(e) => set({ endTime: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>ET</span>
    </>
  )

  if (cond.type === 'zone_manual') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Price inside zone — High:</span>
      <input
        style={{ ...inp, width: '80px' }}
        type="number"
        step="0.25"
        value={cond.high ?? ''}
        onChange={(e) => set({ high: parseFloat(e.target.value) || '' })}
        placeholder="5200"
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Low:</span>
      <input
        style={{ ...inp, width: '80px' }}
        type="number"
        step="0.25"
        value={cond.low ?? ''}
        onChange={(e) => set({ low: parseFloat(e.target.value) || '' })}
        placeholder="5185"
      />
    </>
  )

  if (cond.type === 'br_zone') return (
    <>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Zone window</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.startTime || '08:00'}
        onChange={(e) => set({ startTime: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>–</span>
      <input
        style={{ ...inp, width: '70px' }}
        type="time"
        value={cond.endTime || '08:15'}
        onChange={(e) => set({ endTime: e.target.value })}
      />
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>ET &nbsp; RR</span>
      <input
        style={{ ...inp, width: '48px' }}
        type="number"
        min="1"
        max="10"
        step="0.5"
        value={cond.rrRatio ?? 3}
        onChange={(e) => set({ rrRatio: parseFloat(e.target.value) || 3 })}
      />
      <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(99,102,241,0.12)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
        Auto SL/TP
      </span>
    </>
  )

  return null
}

export default function ConditionRow({ cond, index, onChange, onRemove }) {
  const isFirst = index === 0

  const handleTypeChange = (e) => {
    const newType = e.target.value
    onChange({
      ...cond,
      type: newType,
      ...DEFAULTS[newType],
    })
  }

  const connectorStyle = {
    background: (cond.connector || 'AND') === 'AND' ? 'rgba(99,102,241,0.15)' : 'rgba(234,88,12,0.15)',
    border: `1px solid ${(cond.connector || 'AND') === 'AND' ? 'rgba(99,102,241,0.4)' : 'rgba(234,88,12,0.4)'}`,
    color: (cond.connector || 'AND') === 'AND' ? '#818cf8' : '#fb923c',
    borderRadius: '4px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    fontFamily: "'JetBrains Mono', monospace",
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* IF / AND / OR badge */}
      {isFirst ? (
        <span style={{
          ...connectorStyle,
          cursor: 'default',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
        }}>IF</span>
      ) : (
        <button
          style={connectorStyle}
          onClick={() => onChange({ ...cond, connector: (cond.connector || 'AND') === 'AND' ? 'OR' : 'AND' })}
          title="Click to toggle AND / OR"
        >
          {cond.connector || 'AND'}
        </button>
      )}

      {/* Condition type selector */}
      <select style={sel} value={cond.type} onChange={handleTypeChange}>
        {CONDITION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Type-specific fields */}
      <TypeFields cond={cond} onChange={onChange} />

      {/* Remove button */}
      <button
        onClick={onRemove}
        title="Remove condition"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          marginLeft: 'auto',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
