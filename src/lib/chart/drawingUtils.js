export function toET(ts, opts) {
  try {
    const ms = typeof ts === 'number'
      ? ts * 1000
      : (ts?.year != null ? Date.UTC(ts.year, ts.month - 1, ts.day) : new Date(ts).valueOf())
    const s = new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts })
    if (s && s !== 'Invalid Date') return s
  } catch { /* fall through */ }
  // Safe UTC fallback — always produces a non-empty label
  try {
    const ms = typeof ts === 'number' ? ts * 1000 : Date.now()
    const d = new Date(ms)
    if (opts.hour !== undefined) {
      const h = d.getUTCHours(), m = d.getUTCMinutes()
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
    }
    if (opts.month !== undefined && opts.day !== undefined) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`
    }
    if (opts.month !== undefined) return `${d.getUTCFullYear()}`
    return `${d.getUTCFullYear()}`
  } catch { return '–' }
}

export function snapToOHLC(candles, clickedTime, clickedPrice) {
  if (!candles.length) return +clickedPrice.toFixed(2)
  const nearest = candles.reduce((best, c) =>
    Math.abs(c.time - clickedTime) < Math.abs(best.time - clickedTime) ? c : best
  )
  const ohlc = [nearest.open, nearest.high, nearest.low, nearest.close]
  const snapped = ohlc.reduce((best, p) =>
    Math.abs(p - clickedPrice) < Math.abs(best - clickedPrice) ? p : best
  )
  return +snapped.toFixed(2)
}

export const HIT_PX = 10

export function dist2D(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

export function segmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  if (dx === 0 && dy === 0) return dist2D(px, py, x1, y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return dist2D(px, py, x1 + t * dx, y1 + t * dy)
}

export function hitTestDrawing(d, mx, my, cs, ts) {
  if (d.type === 'hline') {
    const y = cs.priceToCoordinate(d.price)
    if (y == null) return null
    return Math.abs(my - y) <= HIT_PX ? 'move' : null
  }
  if (d.type === 'line') {
    const x1 = ts.timeToCoordinate(d.p1.time), y1 = cs.priceToCoordinate(d.p1.price)
    const x2 = ts.timeToCoordinate(d.p2.time), y2 = cs.priceToCoordinate(d.p2.price)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return null
    if (dist2D(mx, my, x1, y1) <= HIT_PX) return 'p1'
    if (dist2D(mx, my, x2, y2) <= HIT_PX) return 'p2'
    if (segmentDist(mx, my, x1, y1, x2, y2) <= HIT_PX) return 'move'
    return null
  }
  if (d.type === 'box') {
    const x1 = ts.timeToCoordinate(d.p1.time), y1 = cs.priceToCoordinate(d.p1.price)
    const x2 = ts.timeToCoordinate(d.p2.time), y2 = cs.priceToCoordinate(d.p2.price)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return null
    if (dist2D(mx, my, x1, y1) <= HIT_PX) return 'corner-11'
    if (dist2D(mx, my, x2, y2) <= HIT_PX) return 'corner-22'
    if (dist2D(mx, my, x1, y2) <= HIT_PX) return 'corner-12'
    if (dist2D(mx, my, x2, y1) <= HIT_PX) return 'corner-21'
    const left = Math.min(x1, x2), right = Math.max(x1, x2)
    const top  = Math.min(y1, y2), bot   = Math.max(y1, y2)
    if (mx >= left && mx <= right && my >= top && my <= bot) return 'move'
    return null
  }
  return null
}

export function applyDragPatch(orig, mode, nx, ny, dxPx, dyPx, cs, ts) {
  if (orig.type === 'hline') {
    const p = cs.coordinateToPrice(ny)
    return p != null ? { price: +p.toFixed(2) } : null
  }
  if (orig.type === 'line' || orig.type === 'box') {
    if (mode === 'p1' || mode === 'corner-11') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p1: { time: t, price: +p.toFixed(2) } } : null
    }
    if (mode === 'p2' || mode === 'corner-22') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p2: { time: t, price: +p.toFixed(2) } } : null
    }
    if (mode === 'corner-12') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p1: { ...orig.p1, time: t }, p2: { ...orig.p2, price: +p.toFixed(2) } } : null
    }
    if (mode === 'corner-21') {
      const t = ts.coordinateToTime(nx), p = cs.coordinateToPrice(ny)
      return (t && p != null) ? { p2: { ...orig.p2, time: t }, p1: { ...orig.p1, price: +p.toFixed(2) } } : null
    }
    if (mode === 'move') {
      const ox1 = ts.timeToCoordinate(orig.p1.time), oy1 = cs.priceToCoordinate(orig.p1.price)
      const ox2 = ts.timeToCoordinate(orig.p2.time), oy2 = cs.priceToCoordinate(orig.p2.price)
      if (ox1 == null || oy1 == null || ox2 == null || oy2 == null) return null
      const t1 = ts.coordinateToTime(ox1 + dxPx), p1 = cs.coordinateToPrice(oy1 + dyPx)
      const t2 = ts.coordinateToTime(ox2 + dxPx), p2 = cs.coordinateToPrice(oy2 + dyPx)
      return (t1 && p1 != null && t2 && p2 != null)
        ? { p1: { time: t1, price: +p1.toFixed(2) }, p2: { time: t2, price: +p2.toFixed(2) } }
        : null
    }
  }
  return null
}
