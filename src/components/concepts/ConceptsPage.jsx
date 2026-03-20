import { useState } from 'react';
import useStore from '../../store';
import CandlesPage from './CandlesPage';
import StructurePage from './StructurePage';
import FVGPage from './FVGPage';
import LiquidityPage from './LiquidityPage';
import OrderBlocksPage from './OrderBlocksPage';
import BreakRetestPage from './BreakRetestPage';
import PremiumDiscountPage from './PremiumDiscountPage';
import SessionsPage from './SessionsPage';
import VWAPPage from './VWAPPage';
import RiskPage from './RiskPage';
import PowerOf3Page from './PowerOf3Page';
import ConfluencePage from './ConfluencePage';
import { CONCEPT_META, CONCEPT_CATEGORIES } from '../../data/conceptsData';

// Map concept id → Page component
const PAGE_MAP = {
  candles:          CandlesPage,
  structure:        StructurePage,
  fvg:              FVGPage,
  liq:              LiquidityPage,
  ob:               OrderBlocksPage,
  bnr:              BreakRetestPage,
  premium_discount: PremiumDiscountPage,
  sessions:         SessionsPage,
  vwap:             VWAPPage,
  risk:             RiskPage,
  power_of_3:       PowerOf3Page,
  confluence:       ConfluencePage,
};

function DiffBadge({ difficulty }) {
  return <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>;
}

export default function ConceptsPage() {
  const [activeId, setActiveId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const completedConcepts = useStore(s => s.completedConcepts);
  const markConceptDone   = useStore(s => s.markConceptDone);
  const unmarkConceptDone = useStore(s => s.unmarkConceptDone);

  // If a concept is open, render it
  if (activeId) {
    const concept = CONCEPT_META.find(c => c.id === activeId);
    const Page = PAGE_MAP[activeId];
    const done = completedConcepts.includes(activeId);

    if (!Page) {
      return (
        <div className="page">
          <button className="back-btn" onClick={() => setActiveId(null)}>← Back to Concepts</button>
          <div className="card"><p className="card-sub">This concept lesson is coming soon.</p></div>
        </div>
      );
    }

    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <button className="back-btn" onClick={() => setActiveId(null)}>← All Concepts</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DiffBadge difficulty={concept.difficulty} />
            <button
              onClick={() => done ? unmarkConceptDone(activeId) : markConceptDone(activeId)}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: '1px solid',
                background: done ? 'var(--green-bg)' : 'var(--card)',
                borderColor: done ? 'var(--green)' : 'var(--border)',
                color: done ? '#5DCAA5' : 'var(--muted)',
              }}
            >
              {done ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>
        </div>
        <Page />
      </div>
    );
  }

  // Grid view
  const filtered = activeCategory === 'All'
    ? CONCEPT_META
    : CONCEPT_META.filter(c => c.category === activeCategory);

  return (
    <div className="page">
      {/* Category filter */}
      <div className="cat-filter">
        {['All', ...CONCEPT_CATEGORIES].map(cat => (
          <button key={cat} className={`cat-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Concept grid */}
      <div className="concept-grid">
        {filtered.map(c => {
          const done = completedConcepts.includes(c.id);
          const hasPage = !!PAGE_MAP[c.id];
          return (
            <div
              key={c.id}
              className={`concept-card${done ? ' done' : ''}`}
              onClick={() => setActiveId(c.id)}
              style={!hasPage ? { opacity: 0.6 } : {}}
            >
              <div className="c-icon">{c.icon}</div>
              <div className="c-title">{c.label}</div>
              <div className="c-desc">{c.description}</div>
              <div className="c-footer">
                <DiffBadge difficulty={c.difficulty} />
                <span>
                  {done && <span className="done-check">✓</span>}
                  {!hasPage && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Soon</span>}
                  {hasPage && !done && <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Start →</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
