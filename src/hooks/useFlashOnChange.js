import { useEffect, useRef, useState } from 'react'

/**
 * Returns 'up' | 'down' | null based on whether `value` increased or decreased
 * since the previous render. Clears back to null after `durationMs`.
 * Ignores non-numeric values and unchanged values.
 *
 * @param {number} value
 * @param {number} [durationMs=700]
 * @returns {'up'|'down'|null}
 */
export function useFlashOnChange(value, durationMs = 700) {
  const [direction, setDirection] = useState(null)
  const prevRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const isNumeric = typeof value === 'number' && Number.isFinite(value)
    if (!isNumeric) {
      prevRef.current = null
      return
    }

    const prev = prevRef.current
    prevRef.current = value

    if (prev === null || prev === value) return

    setDirection(value > prev ? 'up' : 'down')

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDirection(null)
      timerRef.current = null
    }, durationMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [value, durationMs])

  return direction
}

export default useFlashOnChange
