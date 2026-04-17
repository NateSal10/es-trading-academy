// Toast system — a global stacking toast for trade fills, rule violations, etc.
// Usage:
//   import { useToast, ToastStack } from './ToastStack'
//   const toast = useToast()
//   toast({ message: 'Filled: LONG ES @ 5280', type: 'success' })
//   <ToastStack /> mounted once in App.jsx or PracticePage

import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

let _addToast = null

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [{ id, message, type }, ...prev])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  _addToast = add

  return (
    <ToastContext.Provider value={add}>
      {children}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </ToastContext.Provider>
  )
}

const TYPE_STYLES = {
  success: { bg: 'rgba(22,163,74,0.18)', border: 'rgba(34,197,94,0.45)', icon: '✓', color: '#4ade80' },
  error:   { bg: 'rgba(220,38,38,0.18)', border: 'rgba(239,68,68,0.45)',  icon: '✕', color: '#f87171' },
  warning: { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.45)', icon: '⚠', color: '#fbbf24' },
  info:    { bg: 'rgba(79,142,247,0.15)', border: 'rgba(79,142,247,0.40)', icon: 'ℹ', color: '#7eb5f7' },
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t, i) => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info
        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: 'var(--text)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              pointerEvents: 'all',
              cursor: 'pointer',
              maxWidth: 340,
              animation: 'toastSlideIn 0.3s ease-out',
              transform: `translateY(${i * -4}px)`,
              transition: 'transform 0.2s ease',
            }}
          >
            <span style={{ fontSize: 14, color: s.color, flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{t.message}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>✕</span>
          </div>
        )
      })}
    </div>
  )
}
