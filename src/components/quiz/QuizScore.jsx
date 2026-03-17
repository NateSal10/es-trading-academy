import { useEffect } from 'react';
import useStore from '../../store';

export default function QuizScore({ score, total, category, onRetake, onConcepts }) {
  const saveQuizResult = useStore(s => s.saveQuizResult);
  useEffect(() => {
    saveQuizResult({ category: category || 'All', score, total });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 90 ? 'Elite 🏆' : pct >= 80 ? 'Strong 💪' : pct >= 60 ? 'Solid 📈' : 'Keep studying 📚';
  const col = pct >= 80 ? '#1D9E75' : pct >= 60 ? '#BA7517' : '#D85A30';

  return (
    <div className="card score-wrap">
      <div className="score-num" style={{ color: col }}>{score}/{total}</div>
      <div className="score-grade">{grade}</div>
      <div className="score-pct">{pct}% correct</div>
      {pct < 80 && (
        <div style={{
          background: 'var(--amber-bg)', border: '1px solid rgba(186,117,23,0.3)',
          borderRadius: '8px', padding: '12px', marginBottom: '20px',
          fontSize: '13px', color: '#e8a93a', textAlign: 'left'
        }}>
          Focus on reviewing: <strong>FVG/IFVG concepts</strong>, <strong>Order Block identification</strong>, and <strong>Liquidity sweep setups</strong>. Go back to the Concepts tab for deeper explanations.
        </div>
      )}
      <div>
        <button className="retake-btn" onClick={onRetake}>Retake quiz</button>
        <button
          className="retake-btn"
          style={{ background: 'var(--blue-bg)', borderColor: 'rgba(24,95,165,0.4)', color: '#6aabf7' }}
          onClick={onConcepts}
        >
          Back to concepts
        </button>
      </div>
    </div>
  );
}
