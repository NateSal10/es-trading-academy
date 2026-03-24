import React, { useState } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

const s = {
  wrap: { padding: '16px' },
  label: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: '6px' },
  textarea: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '160px',
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: '1.5',
  },
  translateBtn: (disabled) => ({
    background: disabled ? 'var(--bg2)' : '#a855f7',
    color: disabled ? 'var(--muted)' : '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
  }),
  useBtn: {
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: '8px',
    marginTop: '10px',
  },
  summaryBox: {
    background: 'rgba(79,142,247,0.08)',
    border: '1px solid rgba(79,142,247,0.25)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: 'var(--text)',
    lineHeight: '1.5',
    marginTop: '12px',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '12px',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
};

export default function PineScriptTab({ onUseStrategy }) {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canTranslate = script.trim().length >= 50 && !loading;

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/translate-pine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.label}>Paste Pine Script Strategy</div>
      <textarea
        style={s.textarea}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder={'//@version=5\nstrategy("My Strategy")\n// paste your full Pine Script here\u2026'}
        spellCheck={false}
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button style={s.translateBtn(!canTranslate)} disabled={!canTranslate} onClick={handleTranslate}>
          {loading
            ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Translating\u2026</>
            : '\u27f3 Translate with AI'
          }
        </button>
        {result && (
          <button style={s.useBtn} onClick={() => onUseStrategy(result)}>
            <CheckCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Use This Strategy
          </button>
        )}
      </div>
      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} />
          {error.includes('ANTHROPIC_API_KEY')
            ? 'Add ANTHROPIC_API_KEY to your Vercel environment variables to enable AI translation.'
            : error}
        </div>
      )}
      {result?.summary && (
        <div style={s.summaryBox}>
          <strong>Interpreted as:</strong> {result.summary}
        </div>
      )}
    </div>
  );
}
