import React, { useState, useEffect } from 'react';
import { Sparkles, Loader } from 'lucide-react';

const s = {
  bar: {
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    padding: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  input: {
    flex: 1,
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  applyBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : 'var(--green)',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  }),
  saveBtn: (disabled) => ({
    background: 'var(--bg2)',
    color: disabled ? 'var(--muted)' : 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '11px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }),
  errorText: {
    fontSize: '10px',
    color: 'var(--red)',
    whiteSpace: 'nowrap',
  },
};

export default function NLBar({
  strategyId,        // current strategy id — clears text when this changes
  apiKeyMissing,     // bool — disables buttons if true
  onApplyAndRun,     // (nlText) => Promise<void>
  onSaveVariant,     // (nlText, name) => Promise<void>
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset text when strategy changes
  useEffect(() => { setText(''); setError(null); }, [strategyId]);

  const disabled = apiKeyMissing || !text.trim() || loading;

  const handleApply = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onApplyAndRun(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (disabled) return;
    const name = window.prompt('Save variant as:', `${strategyId} (custom)`);
    if (!name?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSaveVariant(text, name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = apiKeyMissing
    ? 'Add ANTHROPIC_API_KEY to Vercel environment variables to enable AI editing'
    : undefined;

  return (
    <div style={s.bar}>
      <span style={s.label}>Adjust strategy:</span>
      <input
        style={s.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='"e.g. target 3:1, only trade the 10 AM window, stop below FVG low"'
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
      />
      <button style={s.applyBtn(disabled)} disabled={disabled} onClick={handleApply} title={title}>
        {loading
          ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Working…</>
          : <><Sparkles size={11} /> Apply &amp; Run</>
        }
      </button>
      <button style={s.saveBtn(disabled)} disabled={disabled} onClick={handleSave} title={title}>
        Save as Variant
      </button>
      {error && <span style={s.errorText}>{error}</span>}
    </div>
  );
}
