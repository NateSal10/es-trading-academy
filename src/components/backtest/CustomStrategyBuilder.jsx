import React, { useState, useCallback } from 'react';
import { Plus, X, Wrench, Sparkles, AlertCircle, Loader } from 'lucide-react';
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
  textarea: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '90px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
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
  section: { marginBottom: '16px' },
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
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  andBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '0 4px',
  },
  dirBtn: (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  }),
  aiBtn: {
    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  summaryBox: {
    background: 'rgba(79,142,247,0.08)',
    border: '1px solid rgba(79,142,247,0.25)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--text)',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--red-bright)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 0',
    color: 'var(--muted)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  dividerLine: { flex: 1, height: '1px', background: 'var(--border)' },
};

const DEFAULT_CONFIG = {
  conditions: [{ type: 'bullish_candle' }],
  direction: 'LONG',
  slMethod: 'fixed_points',
  slValue: 5,
  tpMethod: 'rr_multiple',
  tpValue: 2,
  maxTradesPerDay: 2,
};

export default function CustomStrategyBuilder({ config, onChange }) {
  const [nlText, setNlText]       = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

  const cfg = config || DEFAULT_CONFIG;
  const { conditions, direction, slMethod, slValue, tpMethod, tpValue, maxTradesPerDay } = cfg;

  const update = useCallback((patch) => {
    onChange({ ...cfg, ...patch });
  }, [cfg, onChange]);

  // ── AI Interpretation ─────────────────────────────────────────────────────
  const handleInterpret = async () => {
    if (!nlText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);
    try {
      const res = await fetch('/api/interpret-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nlText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Interpretation failed');
      const { summary, ...stratConfig } = data;
      setAiSummary(summary);
      onChange({ ...DEFAULT_CONFIG, ...stratConfig });
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Conditions editor ─────────────────────────────────────────────────────
  const addCondition = () => update({ conditions: [...conditions, { type: 'bullish_candle' }] });
  const removeCondition = (i) => update({ conditions: conditions.filter((_, idx) => idx !== i) });
  const updateCondition = (i, patch) =>
    update({ conditions: conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>
        <Wrench size={14} color="var(--teal)" />
        Custom Strategy Builder
      </div>

      {/* ── Natural Language Input ─────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.label}>Describe your strategy (AI will build it)</div>
        <textarea
          style={s.textarea}
          value={nlText}
          onChange={(e) => setNlText(e.target.value)}
          placeholder={
            'Example: "Go long when price is above VWAP and a bullish FVG forms between 10 AM and 11 AM ET. ' +
            'Stop below the signal candle, target 2:1 R:R, max 1 trade per day."'
          }
        />
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={{
              ...s.aiBtn,
              opacity: aiLoading || !nlText.trim() ? 0.6 : 1,
              cursor: aiLoading || !nlText.trim() ? 'not-allowed' : 'pointer',
            }}
            disabled={aiLoading || !nlText.trim()}
            onClick={handleInterpret}
          >
            {aiLoading
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Interpreting...</>
              : <><Sparkles size={13} /> Build Strategy</>
            }
          </button>
        </div>

        {aiError && (
          <div style={s.errorBox}>
            <AlertCircle size={14} />
            {aiError.includes('ANTHROPIC_API_KEY')
              ? 'Add ANTHROPIC_API_KEY to your Vercel environment variables to enable AI interpretation.'
              : aiError}
          </div>
        )}
        {aiSummary && (
          <div style={s.summaryBox}>
            <strong>Interpreted as:</strong> {aiSummary}
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={s.divider}>
        <div style={s.dividerLine} />
        or edit conditions manually
        <div style={s.dividerLine} />
      </div>

      {/* ── Entry Conditions ──────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.label}>Entry Conditions (all must be true — AND logic)</div>
        {conditions.map((cond, i) => {
          const condDef = CONDITION_TYPES.find((c) => c.id === cond.type);
          return (
            <div key={i}>
              {i > 0 && <div style={s.andBadge}>AND</div>}
              <div style={s.condRow}>
                <select
                  style={{ ...s.select, width: '230px' }}
                  value={cond.type}
                  onChange={(e) => updateCondition(i, { type: e.target.value })}
                >
                  {CONDITION_TYPES.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.label}</option>
                  ))}
                </select>

                {condDef?.hasParam === 'emaPeriod' && (
                  <div style={s.field}>
                    <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Period</span>
                    <input
                      type="number" style={s.input}
                      value={cond.emaPeriod ?? 21} min={2} max={200}
                      onChange={(e) => updateCondition(i, { emaPeriod: Number(e.target.value) })}
                    />
                  </div>
                )}

                {condDef?.hasParam === 'timeWindow' && (
                  <>
                    <div style={s.field}>
                      <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Start (ET)</span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input type="number" style={{ ...s.input, width: '44px' }}
                          value={cond.startHour ?? 9} min={0} max={23}
                          onChange={(e) => updateCondition(i, { startHour: Number(e.target.value) })} />
                        <span style={{ color: 'var(--muted)' }}>:</span>
                        <input type="number" style={{ ...s.input, width: '44px' }}
                          value={cond.startMin ?? 30} min={0} max={59}
                          onChange={(e) => updateCondition(i, { startMin: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div style={s.field}>
                      <span style={{ fontSize: '9px', color: 'var(--muted)' }}>End (ET)</span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input type="number" style={{ ...s.input, width: '44px' }}
                          value={cond.endHour ?? 15} min={0} max={23}
                          onChange={(e) => updateCondition(i, { endHour: Number(e.target.value) })} />
                        <span style={{ color: 'var(--muted)' }}>:</span>
                        <input type="number" style={{ ...s.input, width: '44px' }}
                          value={cond.endMin ?? 0} min={0} max={59}
                          onChange={(e) => updateCondition(i, { endMin: Number(e.target.value) })} />
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

      {/* ── Direction ─────────────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.label}>Trade Direction</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {['LONG', 'SHORT', 'AUTO'].map((d) => (
            <button key={d} style={s.dirBtn(direction === d)} onClick={() => update({ direction: d })}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Risk Management ───────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.label}>Risk Management</div>
        <div style={s.row}>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Stop Loss Method</span>
            <select style={{ ...s.select, width: '190px' }} value={slMethod}
              onChange={(e) => update({ slMethod: e.target.value })}>
              {SL_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          {slMethod === 'fixed_points' && (
            <div style={s.field}>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>SL Points</span>
              <input type="number" style={s.input} value={slValue} min={0.5} max={100} step={0.5}
                onChange={(e) => update({ slValue: Number(e.target.value) })} />
            </div>
          )}
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Take Profit Method</span>
            <select style={{ ...s.select, width: '160px' }} value={tpMethod}
              onChange={(e) => update({ tpMethod: e.target.value })}>
              {TP_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
              {tpMethod === 'rr_multiple' ? 'R:R Target' : 'TP Points'}
            </span>
            <input type="number" style={s.input} value={tpValue} min={0.5} max={20} step={0.5}
              onChange={(e) => update({ tpValue: Number(e.target.value) })} />
          </div>
          <div style={s.field}>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Max Trades/Day</span>
            <input type="number" style={s.input} value={maxTradesPerDay} min={1} max={10}
              onChange={(e) => update({ maxTradesPerDay: Number(e.target.value) })} />
          </div>
        </div>
      </div>
    </div>
  );
}
