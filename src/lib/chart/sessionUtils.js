export const SESSION_DEFS = {
  asia:   { startH: 0,  startM: 0,  endH: 7,  endM: 0,  color: 'rgba(30,100,210,0.10)',  labelColor: 'rgba(56,140,240,0.30)',  label: 'Asia'     },
  london: { startH: 7,  startM: 0,  endH: 12, endM: 0,  color: 'rgba(120,80,200,0.10)',  labelColor: 'rgba(167,139,250,0.30)',  label: 'London'   },
  ny:     { startH: 12, startM: 0,  endH: 21, endM: 0,  color: 'rgba(100,110,30,0.12)',  labelColor: 'rgba(170,180,40,0.28)',  label: 'New York' },
}

export function buildSessionZones(candles, sessions) {
  const active = Object.keys(SESSION_DEFS).filter(k => sessions[k])
  if (!active.length || !candles.length) return []

  // Unique UTC days present in candle data
  const days = [...new Set(candles.map(c => {
    const d = new Date(c.time * 1000)
    return `${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()}`
  }))]

  const zones = []
  days.forEach(dayStr => {
    const [y, m, d] = dayStr.split(',').map(Number)
    active.forEach(key => {
      const def = SESSION_DEFS[key]
      const windowStart = Math.floor(Date.UTC(y, m, d, def.startH, def.startM) / 1000)
      const windowEnd   = Math.floor(Date.UTC(y, m, d, def.endH,   def.endM)   / 1000)

      // Collect actual candles inside this session window
      const sc = candles.filter(c => c.time >= windowStart && c.time <= windowEnd)
      if (!sc.length) return

      // Use real candle timestamps — timeToCoordinate always resolves these.
      // Avoids null coords when the session boundary falls in a data gap
      // (e.g. NY 21:00 UTC lands exactly on the CME maintenance break).
      zones.push({
        startTime:  sc[0].time,
        endTime:    sc[sc.length - 1].time,
        color:      def.color,
        labelColor: def.labelColor,
        label:      def.label,
        high:       Math.max(...sc.map(c => c.high)),
        low:        Math.min(...sc.map(c => c.low)),
      })
    })
  })
  return zones
}

export function calcSessionHL(candles, sessions) {
  const hlActive = Object.keys(SESSION_DEFS).filter(k => sessions[k] && sessions[k + 'HL'])
  if (!hlActive.length || !candles.length) return []

  // Only last 2 days — beyond that the H/L lines get noisy
  const days = [...new Set(candles.map(c => {
    const d = new Date(c.time * 1000)
    return `${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()}`
  }))].slice(-2)

  const levels = []
  days.forEach(dayStr => {
    const [y, m, d] = dayStr.split(',').map(Number)
    hlActive.forEach(key => {
      const def = SESSION_DEFS[key]
      const startTs = Math.floor(Date.UTC(y, m, d, def.startH, def.startM) / 1000)
      const endTs   = Math.floor(Date.UTC(y, m, d, def.endH,   def.endM)   / 1000)
      const sc = candles.filter(c => c.time >= startTs && c.time < endTs)
      if (!sc.length) return
      levels.push({ price: Math.max(...sc.map(c => c.high)), color: def.labelColor, title: `${def.label} H` })
      levels.push({ price: Math.min(...sc.map(c => c.low)),  color: def.labelColor, title: `${def.label} L` })
    })
  })
  return levels
}

// ── ICT Kill Zone definitions (UTC hours) ────────────────────────────────────
export const KILL_ZONE_DEFS = [
  { label: 'London Open',  startH: 7,  startM: 0,  endH: 10, endM: 0,  color: 'rgba(56,140,240,0.09)',  labelColor: 'rgba(56,140,240,0.22)' },
  { label: 'NY Open',      startH: 14, startM: 30, endH: 16, endM: 0,  color: 'rgba(34,197,94,0.09)',   labelColor: 'rgba(34,197,94,0.22)' },
  { label: 'NY Lunch',     startH: 17, startM: 0,  endH: 18, endM: 0,  color: 'rgba(245,158,11,0.09)',  labelColor: 'rgba(245,158,11,0.22)' },
  { label: 'NY Close',     startH: 20, startM: 0,  endH: 21, endM: 0,  color: 'rgba(239,68,68,0.09)',   labelColor: 'rgba(239,68,68,0.22)' },
]

export function buildKillZones(candles) {
  if (!candles.length) return []
  const days = [...new Set(candles.map(c => {
    const d = new Date(c.time * 1000)
    return `${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()}`
  }))]
  const zones = []
  days.forEach(dayStr => {
    const [y, m, d] = dayStr.split(',').map(Number)
    KILL_ZONE_DEFS.forEach(def => {
      const windowStart = Math.floor(Date.UTC(y, m, d, def.startH, def.startM) / 1000)
      const windowEnd   = Math.floor(Date.UTC(y, m, d, def.endH,   def.endM)   / 1000)
      const sc = candles.filter(c => c.time >= windowStart && c.time <= windowEnd)
      if (!sc.length) return
      zones.push({
        startTime:  sc[0].time,
        endTime:    sc[sc.length - 1].time,
        color:      def.color,
        labelColor: def.labelColor,
        label:      def.label,
      })
    })
  })
  return zones
}
