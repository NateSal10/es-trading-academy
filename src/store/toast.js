import { create } from 'zustand'

// Auto-dismiss duration for every toast.
const AUTO_DISMISS_MS = 4000

// Track auto-dismiss timers outside state (not serializable).
const timers = new Map()

/**
 * Lightweight toast store.
 * Shape:
 *   toasts: Array<{ id, kind, title, msg, createdAt }>
 *   push(toast)    — accepts { kind?, title?, msg? }
 *   dismiss(id)
 *
 * `kind` is one of 'fill' | 'violation' | 'info' | 'error'.
 */
const useToastStore = create((set, get) => ({
  toasts: [],

  push: (toast = {}) => {
    const id = toast.id ?? (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    )
    const entry = {
      id,
      kind: toast.kind ?? 'info',
      title: toast.title ?? '',
      msg: toast.msg ?? '',
      createdAt: Date.now(),
    }

    set((s) => ({ toasts: [...s.toasts, entry] }))

    const timer = setTimeout(() => {
      get().dismiss(id)
    }, AUTO_DISMISS_MS)
    timers.set(id, timer)

    return id
  },

  dismiss: (id) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export default useToastStore
