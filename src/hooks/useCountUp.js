import { useState, useEffect, useRef } from 'react'

/**
 * Animate a number from 0 to `target` over `duration` ms on mount.
 * Returns the current animated value.
 */
export default function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const prevTarget = useRef(null)

  useEffect(() => {
    if (target === prevTarget.current) return
    const from = prevTarget.current !== null ? value : 0
    prevTarget.current = target
    const delta = target - from

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null

    function step(ts) {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      // ease out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(from + delta * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}
