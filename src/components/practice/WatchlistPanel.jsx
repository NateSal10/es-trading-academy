import { useState } from 'react'
import useStore from '../../store'
import { useWatchlistPrices } from '../../hooks/useWatchlistPrices'

const POPULAR = ['ES=F', 'NQ=F', 'MES=F', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'QQQ', 'AMZN', 'META', 'GOOGL']

function displaySym(sym) {
  return sym.replace('=F', '').replace('.CME', '')
}

export default function WatchlistPanel({ activeSymbol, onSelectSymbol, collapsed = false }) {
  const watchlist          = useStore(s => s.watchlist)
  const addToWatchlist     = useStore(s => s.addToWatchlist)
  const removeFromWatchlist = useStore(s => s.removeFromWatchlist)
  const prices             = useWatchlistPrices(watchlist)

  const [query, setQuery]               = useState('')
  const [showSuggestions, setShowSugg]  = useState(false)

  function handleAdd(sym) {
    const s = sym.trim().toUpperCase()
    if (s) addToWatchlist(s)
    setQuery('')
    setShowSugg(false)
  }

  const suggestions = query
    ? POPULAR.filter(t => t.includes(query) && !watchlist.includes(t))
    : POPULAR.filter(t => !watchlist.includes(t)).slice(0, 6)
  const showCustomAdd = query && !POPULAR.includes(query) && !watchlist.includes(query)

  const [manualExpand, setManualExpand] = useState(false)
  const isCollapsed = collapsed && !manualExpand

  return (
    <div className="panel-section" style={{ borderBottom: '1px solid var(--border)', paddingBottom: isCollapsed ? 4 : 10 }}>
      <div
        className="panel-title"
        style={{ marginBottom: isCollapsed ? 0 : 8, cursor: collapsed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => { if (collapsed) setManualExpand(e => !e) }}
      >
        Watchlist
        {collapsed && (
          <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>{isCollapsed ? '▸' : '▾'}</span>
        )}
      </div>

      {isCollapsed ? null : <>
      {/* Search / Add input */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '5px 8px',
            color: 'var(--text)', fontSize: 11, fontFamily: 'Inter, monospace, sans-serif',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
            outline: 'none',
          }}
          placeholder="Search symbol…"
          value={query}
          onChange={e => { setQuery(e.target.value.toUpperCase()); setShowSugg(true) }}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 180)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) handleAdd(query)
            if (e.key === 'Escape') { setQuery(''); setShowSugg(false) }
          }}
        />

        {showSuggestions && (suggestions.length > 0 || showCustomAdd) && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: '#0e1220', border: '1px solid #2a3a5a', borderRadius: 6,
            marginTop: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.55)', overflow: 'hidden',
          }}>
            {suggestions.map(t => (
              <button
                key={t}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', background: 'none', border: 'none',
                  color: '#c0c8e0', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, monospace, sans-serif', letterSpacing: '0.04em',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onMouseDown={() => handleAdd(t)}
              >
                {displaySym(t)}
                <span style={{ fontWeight: 400, fontSize: 9, color: 'var(--muted)', marginLeft: 5 }}>{t}</span>
              </button>
            ))}
            {showCustomAdd && (
              <button
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', background: 'none',
                  borderTop: suggestions.length ? '1px solid #1a2340' : 'none',
                  border: 'none', borderTop: '1px solid #1a2340',
                  color: '#4f8ef7', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, monospace, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onMouseDown={() => handleAdd(query)}
              >
                + Add "{query}"
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ticker rows */}
      {watchlist.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
          No tickers — search above to add
        </div>
      )}

      {watchlist.map(sym => {
        const info    = prices[sym]
        const active  = sym === activeSymbol
        const isUp    = info ? info.changePct >= 0 : null
        const pctColor = isUp === null ? 'var(--muted)' : isUp ? '#22c55e' : '#ef4444'

        return (
          <div
            key={sym}
            onClick={() => onSelectSymbol(sym)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: 5, cursor: 'pointer', marginBottom: 2,
              background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
              border: active ? '1px solid rgba(79,142,247,0.25)' : '1px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Left: symbol name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: active ? '#4f8ef7' : 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                {displaySym(sym)}
              </div>
              {sym !== displaySym(sym) && (
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace' }}>{sym}</div>
              )}
            </div>

            {/* Right: price + change */}
            <div style={{ textAlign: 'right', marginRight: 6 }}>
              {info ? (
                <>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: 'var(--text)' }}>
                    {info.price < 100 ? info.price.toFixed(2) : info.price.toFixed(info.price >= 1000 ? 1 : 2)}
                  </div>
                  <div style={{ fontSize: 9, color: pctColor, fontWeight: 600 }}>
                    {isUp ? '+' : ''}{info.changePct.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>–</div>
              )}
            </div>

            {/* Remove button */}
            <button
              onClick={e => { e.stopPropagation(); removeFromWatchlist(sym) }}
              style={{
                width: 16, height: 16, borderRadius: 3,
                background: 'none', border: 'none',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, lineHeight: 1, flexShrink: 0,
              }}
              title="Remove"
            >×</button>
          </div>
        )
      })}
      </>}
    </div>
  )
}
