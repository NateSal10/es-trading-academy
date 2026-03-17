import { useState, useMemo } from 'react'
import { GLOSSARY } from '../../data/glossaryData'

const ALL_CATEGORIES = ['All', ...Array.from(new Set(GLOSSARY.map(g => g.category))).sort()]

const CATEGORY_BADGE = {
  'Structure': 'b-blue',
  'SMC':       'b-purple',
  'Sessions':  'b-amber',
  'Futures':   'b-green',
  'Risk':      'b-red',
  'Prop Firm': 'b-amber',
  'Patterns':  'b-blue',
}

export default function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    return GLOSSARY
      .filter(g => {
        const matchCat = activeCategory === 'All' || g.category === activeCategory
        const matchSearch = !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)
        return matchCat && matchSearch
      })
      .sort((a, b) => a.term.localeCompare(b.term))
  }, [searchTerm, activeCategory])

  return (
    <div className="page">
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Glossary</h2>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          ES Futures &amp; SMC Trading Terminology
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          className="glossary-search"
          placeholder="Search terms or definitions…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? 'step-btn on' : 'step-btn'}
            style={{ fontFamily: 'inherit' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {GLOSSARY.length} terms
      </div>

      {/* Terms */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)', fontSize: '13px' }}>
          No terms found for "{searchTerm}". Try a different search.
        </div>
      ) : (
        filtered.map(g => (
          <div key={g.term} className="card" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', lineHeight: '1.3' }}>{g.term}</div>
              <span className={`badge ${CATEGORY_BADGE[g.category] || 'b-blue'}`} style={{ marginBottom: 0, flexShrink: 0, marginLeft: '10px' }}>
                {g.category}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.65' }}>{g.definition}</div>
          </div>
        ))
      )}
    </div>
  )
}
