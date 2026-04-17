// useFlashOnChange — returns a flash class whenever `value` changes direction
import { useEffect, useRef, useState } from 'react'

export function useFlashOnChange(value) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(null) // 'flash-up' | 'flash-down' | null

  useEffect(() => {
    if (value === prev.current) return
    const dir = value > prev.current ? 'flash-up' : 'flash-down'
    prev.current = value
    setFlash(dir)
    const t = setTimeout(() => setFlash(null), 500)
    return () => clearTimeout(t)
  }, [value])

  return flash
}

// NumberTicker — animated counter that counts up/down to `value`
export function NumberTicker({ value, format = (v) => v.toLocaleString(), style, className }) {
  const flash = useFlashOnChange(value)
  return (
    <span
      className={`number-ticker${flash ? ' ' + flash : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      {format(value)}
    </span>
  )
}
