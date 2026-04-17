import { useEffect, useRef } from 'react'
import clsx from 'clsx'

const DASH = '—'

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function defaultFormat(v) {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Animated numeric ticker. Eases from previous displayed value to the new
 * `value` via requestAnimationFrame, writing text directly to a ref to avoid
 * React re-renders on every frame.
 *
 * Props:
 *   value          — target number (null/undefined/NaN renders '—')
 *   decimals       — default decimal places for the default formatter
 *   format         — (v) => string — override formatting
 *   duration       — animation length in ms
 *   flashDirection — 'up' | 'down' | null — applies CSS flash class
 *   className, style
 */
export default function NumberTicker({
  value,
  decimals = 2,
  format,
  duration = 600,
  flashDirection = null,
  className,
  style,
}) {
  const nodeRef = useRef(null)
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const fromRef = useRef(null)
  const displayedRef = useRef(null)

  const formatter = format || ((v) => v.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }))

  // Animate on value change.
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    if (!isValidNumber(value)) {
      node.textContent = DASH
      displayedRef.current = null
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const from = isValidNumber(displayedRef.current) ? displayedRef.current : value
    fromRef.current = from
    const to = value

    if (from === to) {
      node.textContent = formatter(to)
      displayedRef.current = to
      return
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null

    const delta = to - from

    function step(ts) {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      const current = from + delta * eased
      displayedRef.current = current
      node.textContent = formatter(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        displayedRef.current = to
        node.textContent = formatter(to)
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // formatter changes should NOT restart animation; only value/duration do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  // Initial text so SSR / first paint isn't empty.
  const initialText = isValidNumber(value) ? formatter(value) : DASH

  const flashClass =
    flashDirection === 'up'
      ? 'number-flash-up'
      : flashDirection === 'down'
        ? 'number-flash-down'
        : null

  return (
    <span
      ref={nodeRef}
      className={clsx('num-display', flashClass, className)}
      style={style}
    >
      {initialText}
    </span>
  )
}

// Re-export default formatter for convenience/testing.
export { defaultFormat }
