import { useState } from 'react';

export default function QuizQuestion({ question, index, total, score, onNext }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(i) {
    if (selected !== null) return;
    setSelected(i);
  }

  const answered = selected !== null;
  const correct = answered && selected === question.ans;

  return (
    <>
      <div className="q-bar">
        <div className="q-fill" style={{ width: `${Math.round((index / total) * 100)}%` }} />
      </div>
      <div className="q-counter">
        Question {index + 1} of {total} &nbsp;·&nbsp; Score: {score} / {index}
      </div>
      <div className="card">
        <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)', lineHeight: 1.5 }}>
          {question.q}
        </p>
        {question.opts.map((opt, i) => {
          let cls = 'quiz-opt';
          if (answered) {
            if (i === question.ans) cls += ' correct';
            else if (i === selected) cls += ' wrong';
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={answered}
              onClick={() => handleSelect(i)}
            >
              {String.fromCharCode(65 + i)}.&nbsp;&nbsp;{opt}
            </button>
          );
        })}
        {answered && (
          <div className={`quiz-feedback ${correct ? 'fb-c' : 'fb-w'}`}>
            <strong>{correct ? '✓ Correct!' : '✗ Not quite.'}</strong> {question.exp}
          </div>
        )}
      </div>
      {answered && (
        <button className="next-btn" onClick={() => onNext(correct)}>
          {index + 1 < total ? 'Next question →' : 'See my results →'}
        </button>
      )}
    </>
  );
}
