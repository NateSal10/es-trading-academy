import { useState, useMemo } from 'react';
import { QUESTIONS } from '../../data/quizData';
import QuizQuestion from './QuizQuestion';
import QuizScore from './QuizScore';
import useStore from '../../store';
import { format } from 'date-fns';

const CATEGORIES = ['All', ...Array.from(new Set(QUESTIONS.map(q => q.category)))];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage({ onNavigate }) {
  const [started, setStarted]     = useState(false);
  const [category, setCategory]   = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [index, setIndex]         = useState(0);
  const [score, setScore]         = useState(0);

  const quizHistory = useStore(s => s.quizHistory);

  const filteredBase = useMemo(() =>
    QUESTIONS.filter(q =>
      (category === 'All' || q.category === category) &&
      (difficulty === 'All' || q.difficulty === difficulty)
    ), [category, difficulty]);

  function startQuiz() {
    setQuestions(shuffle(filteredBase));
    setIndex(0);
    setScore(0);
    setStarted(true);
  }

  function handleNext(wasCorrect) {
    if (wasCorrect) setScore(s => s + 1);
    setIndex(i => i + 1);
  }

  function handleRetake() {
    setQuestions(shuffle(filteredBase));
    setIndex(0);
    setScore(0);
  }

  const done = started && index >= questions.length;

  // Setup screen
  if (!started) {
    return (
      <div className="page">
        <div className="card">
          <div className="badge b-blue">Quiz</div>
          <div className="card-title">Test Your Knowledge</div>
          <div className="card-sub">{QUESTIONS.length} questions covering all major ES trading concepts. Filter by category or difficulty, then start.</div>

          {/* Category filter */}
          <div style={{ marginBottom: '12px' }}>
            <div className="form-label" style={{ marginBottom: '6px' }}>Category</div>
            <div className="quiz-cat-filter">
              {CATEGORIES.map(cat => (
                <button key={cat} className={`cat-btn${category === cat ? ' active' : ''}`}
                  onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Difficulty filter */}
          <div style={{ marginBottom: '16px' }}>
            <div className="form-label" style={{ marginBottom: '6px' }}>Difficulty</div>
            <div className="quiz-cat-filter">
              {['All', 'beginner', 'intermediate', 'advanced'].map(d => (
                <button key={d} className={`cat-btn${difficulty === d ? ' active' : ''}`}
                  onClick={() => setDifficulty(d)}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button className="next-btn" onClick={startQuiz} disabled={filteredBase.length === 0}>
              Start Quiz ({filteredBase.length} questions) →
            </button>
            {filteredBase.length === 0 && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No questions match filters</span>}
          </div>
        </div>

        {/* History */}
        {quizHistory.length > 0 && (
          <div className="card">
            <div className="badge b-amber">Recent History</div>
            {quizHistory.slice(-8).reverse().map(h => (
              <div key={h.id} className="quiz-history-row">
                <span style={{ color: 'var(--muted)' }}>{format(new Date(h.date), 'MMM d, h:mm a')}</span>
                <span className="badge b-blue" style={{ margin: 0 }}>{h.category}</span>
                <span style={{ fontWeight: 700, color: h.score / h.total >= 0.8 ? '#5DCAA5' : '#e8a93a' }}>
                  {h.score}/{h.total} ({Math.round(h.score / h.total * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="page">
        <QuizScore
          score={score}
          total={questions.length}
          category={category}
          onRetake={handleRetake}
          onConcepts={() => onNavigate('concepts')}
        />
        <div style={{ marginTop: '10px' }}>
          <button className="back-btn" onClick={() => setStarted(false)}>← Back to Quiz Setup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <QuizQuestion
        question={questions[index]}
        index={index}
        total={questions.length}
        score={score}
        onNext={handleNext}
      />
    </div>
  );
}
