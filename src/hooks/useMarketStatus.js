import { useState, useEffect } from 'react'

function getETTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

function getStatus() {
  const now = getETTime()
  const day = now.getDay()
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds()
  const mins = h * 60 + m
  const isWeekday = day >= 1 && day <= 5
  const RTH_OPEN = 9 * 60 + 30, RTH_CLOSE = 16 * 60

  let status = 'CLOSED'
  if (isWeekday) {
    if (mins >= RTH_OPEN && mins < RTH_CLOSE) status = 'RTH'
    else if (mins >= RTH_CLOSE + 15 || mins < RTH_OPEN) status = 'ETH'
  } else if (day === 0 && mins >= 18 * 60) status = 'ETH'

  const NY_KILL = isWeekday && mins >= 7 * 60 && mins < 10 * 60
  const LONDON_KILL = isWeekday && mins >= 2 * 60 && mins < 5 * 60
  const LONDON_CLOSE = isWeekday && mins >= 10 * 60 && mins < 12 * 60

  let sessionProgress = 0
  if (status === 'RTH') sessionProgress = Math.min(1, (mins - RTH_OPEN) / (RTH_CLOSE - RTH_OPEN))

  const h12 = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  const timeStr = `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`

  return { status, NY_KILL, LONDON_KILL, LONDON_CLOSE, sessionProgress, timeStr, now }
}

export function useMarketStatus() {
  const [state, setState] = useState(getStatus)
  useEffect(() => {
    const id = setInterval(() => setState(getStatus()), 1000)
    return () => clearInterval(id)
  }, [])
  return state
}
