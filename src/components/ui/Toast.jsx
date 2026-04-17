import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import clsx from 'clsx'
import useToastStore from '../../store/toast'

/**
 * Fixed bottom-right stack of toasts. Each toast enters with translateY +
 * opacity, exits with a fade slide. Staggered via per-item delays based on
 * index so new toasts feel like a cascade.
 */
export default function ToastStack() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((t, i) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.04 } }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={clsx('toast', `toast-${t.kind}`, t.kind && { [`toast.${t.kind}`]: false })}
          >
            <div className={clsx('toast', t.kind)} style={{ all: 'unset', display: 'contents' }} />
            <div className="toast-body">
              {t.title ? <div className="toast-title">{t.title}</div> : null}
              {t.msg ? <div className="toast-msg">{t.msg}</div> : null}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
