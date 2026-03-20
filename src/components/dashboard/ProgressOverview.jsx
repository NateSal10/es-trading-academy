import { format } from 'date-fns'
import useStore from '../../store/index'

export default function ProgressOverview() {
  const quizHistory = useStore(s => s.quizHistory)

  const recentQuizzes = [...quizHistory].reverse().slice(0, 5)

  return (
    <div className="card">
      <div className="card-title">Learning Progress</div>

      {/* Recent quiz history */}
      <div className="card-sub" style={{ marginBottom: '8px' }}>Recent Quizzes</div>
      {recentQuizzes.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
          No quiz history yet — take a quiz to track your progress.
        </div>
      ) : (
        <div>
          {recentQuizzes.map(entry => {
            const pctScore = entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0
            const dateStr = entry.date ? format(new Date(entry.date), 'MMM d') : '—'
            const scoreColor = pctScore >= 80 ? 'var(--green)' : pctScore >= 60 ? '#e8a93a' : 'var(--red)'
            return (
              <div key={entry.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '13px',
              }}>
                <span style={{ color: 'var(--muted)' }}>{entry.category || 'General'}</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: scoreColor, fontWeight: 600 }}>
                    {entry.score}/{entry.total}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{dateStr}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
