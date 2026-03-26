import { useState, useEffect } from 'react';
import { Sparkles, Loader } from 'lucide-react';

export default function NLBar({
  strategyId,
  apiKeyMissing,
  onApplyAndRun,
  onSaveVariant,
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="nl-bar">
      <span className="nl-label">Adjust:</span>
      <input
        className="nl-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='"target 3:1, only trade the 10 AM window, stop below FVG low"'
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
      />
      <button className="nl-btn-apply" disabled={disabled} onClick={handleApply} title={title}>
        {loading
          ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Working…</>
          : <><Sparkles size={11} /> Apply &amp; Run</>
        }
      </button>
      <button className="nl-btn-save" disabled={disabled} onClick={handleSave} title={title}>
        Save as Variant
      </button>
      {error && <span style={{ fontSize: '10px', color: 'var(--red-bright)', whiteSpace: 'nowrap' }}>{error}</span>}
    </div>
  );
}
