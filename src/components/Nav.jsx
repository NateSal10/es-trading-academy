import { useState, useRef, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  CandlestickChart,
  BookOpen,
  BookText,
} from 'lucide-react'

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'practice',    label: 'Practice',     icon: CandlestickChart },
  { id: 'concepts',    label: 'Learn',        icon: BookOpen },
  { id: 'glossary',    label: 'Glossary',     icon: BookText },
]

export default function Nav({ active, onSelect }) {
  const navRef = useRef(null)
  const btnRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  const updateIndicator = useCallback(() => {
    const btn = btnRefs.current[active]
    const nav = navRef.current
    if (!btn || !nav) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setIndicator({
      left: btnRect.left - navRect.left + nav.scrollLeft,
      width: btnRect.width,
    })
    if (!ready) setReady(true)
  }, [active, ready])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  return (
    <nav className="tubenav" ref={navRef}>
      {/* Sliding glow indicator */}
      <div
        className="tubenav-indicator"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: `${indicator.width}px`,
          opacity: ready ? 1 : 0,
        }}
      />

      {TABS.map(t => {
        const Icon = t.icon
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            ref={el => { btnRefs.current[t.id] = el }}
            className={`tubenav-btn${isActive ? ' active' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <Icon size={15} strokeWidth={isActive ? 2.2 : 1.7} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
