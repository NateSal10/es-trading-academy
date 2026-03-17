import { format } from 'date-fns'
import useStore from '../../store/index'
import { CONCEPT_COUNT } from '../../data/conceptsData'

export default function ProgressOverview() {
  const completedConcepts = useStore(s => s.completedConcepts)
  const quizHistory = useStore(s => s.quizHistory)

  const completed = completedConcepts.length
  const total = CONCEPT_COUNT
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const recentQuizzes = [...quizHistory].reverse().slice(0, 5)

  return (
    <div className="card">
      <div className="card-title">Learning Progress</div>

      {/* Concepts progress */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--muted)' }}>Concepts completed</span>
          <span style={{ fontWeight: 600 }}>{completed} / {total}</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: '3px',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', textAlign: 'right' }}>
          {pct}% complete
        </div>
      </div>

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
