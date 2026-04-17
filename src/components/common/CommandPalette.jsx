// CommandPalette — global Cmd+K / Ctrl+K search palette
// Mount once in App.jsx: <CommandPalette onNavigate={setTab} onSymbol={setSymbol} />

import { useState, useEffect, useRef, useCallback } from 'react'

const COMMANDS = [
  { id: 'practice',  label: 'Go to Practice',   icon: '📈', tab: 'practice' },
  { id: 'dashboard', label: 'Go to Dashboard',  icon: '📊', tab: 'dashboard' },
  { id: 'backtest',  label: 'Go to Backtest',   icon: '⚙️',  tab: 'backtest' },
  { id: 'concepts',  label: 'Go to Concepts',   icon: '📚', tab: 'concepts' },
  { id: 'glossary',  label: 'Go to Glossary',   icon: '📖', tab: 'glossary' },
]

const SYMBOLS = ['ES=F', 'MES=F', 'NQ=F', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'QQQ']

export default function CommandPalette({ onNavigate, onSymbol }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const q = query.toLowerCase().trim()
  const commandResults = COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q))
  const symbolResults = SYMBOLS.filter(s => !q || s.toLowerCase().includes(q)).map(s => ({
    id: 'sym-' + s,
    label: `Switch to ${s.replace('=F', '')}`,
    icon: '💱',
    symbol: s,
  }))

  const results = [...commandResults, ...symbolResults].slice(0, 8)

  const execute = useCallback((item) => {
    if (item.tab) onNavigate?.(item.tab)
    if (item.symbol) onSymbol?.(item.symbol)
    setOpen(false)
    setQuery('')
  }, [onNavigate, onSymbol])

  // Keyboard navigation
  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) execute(results[selected])
  }

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: '90vw',
          background: '#0e1220',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          animation: 'toastSlideIn 0.15s ease-out',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ color: 'var(--muted)', fontSize: 16 }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKey}
            placeholder="Type a command or symbol…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15, fontFamily: 'inherit',
            }}
          />
          <kbd style={{ fontSize: 10, color: 'var(--muted)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '2px 6px' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
          {results.length === 0 && (
            <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              No results for "{query}"
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={item.id}
              onClick={() => execute(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', cursor: 'pointer',
                background: i === selected ? 'rgba(79,142,247,0.15)' : 'transparent',
                borderLeft: i === selected ? '2px solid #4f8ef7' : '2px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: i === selected ? '#7eb5f7' : 'var(--text)', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
          <span><kbd style={{ fontFamily: 'inherit' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontFamily: 'inherit' }}>↵</kbd> select</span>
          <span><kbd style={{ fontFamily: 'inherit' }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
