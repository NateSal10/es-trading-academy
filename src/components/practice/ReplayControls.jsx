import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

const SPEEDS = [0.5, 1, 2, 4, 8]

const SESSION_DEFS = [
  { id: 'asia',   label: 'Asia', utcHour: 0,  utcMin: 0  },
  { id: 'london', label: 'LDN',  utcHour: 7,  utcMin: 0  },
  { id: 'ny',     label: 'NY',   utcHour: 13, utcMin: 30 },
]

const SESSION_COLORS = {
  asia:   'var(--amber)',
  london: 'var(--blue)',
  ny:     'var(--green)',
}

// Interval in minutes for each timeframe (for session boundary matching)
const TF_MINUTES = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1D': 1440,
}

export default function ReplayControls({
  total, index, playing, speed, candles, timeframe,
  onToggle, onStep, onReset, onSpeedChange, onSeek,
}) {
  const trackRef       = useRef(null)
  const intervalRef    = useRef(null)
  const wasPlayingRef  = useRef(false)
  const lastSeekRef    = useRef(0)

  const [dragging,       setDragging]       = useState(false)
  const [hovering,       setHovering]       = useState(false)
  const [hoverIndex,     setHoverIndex]     = useState(null)
  const [tooltipX,       setTooltipX]       = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Auto-play interval
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => onStep(), Math.max(30, 500 / speed))
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, onStep])

  const displayIdx = dragging && hoverIndex != null ? hoverIndex : (hovering && hoverIndex != null ? hoverIndex : index)
  const thumbPct   = total > 0 ? (index / total) * 100 : 0

  // ── Day boundaries ────────────────────────────────────────────────────────
  const dayBoundaries = useMemo(() => {
    if (!candles || candles.length === 0) return []
    const boundaries = []
    let prevDay = null
    for (let i = 0; i < candles.length; i++) {
      const d = new Date(candles[i].time * 1000)
      const etDate = d.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
      if (etDate !== prevDay) {
        boundaries.push({
          index: i + 1,
          date: etDate,
          label: d.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short', month: 'short', day: 'numeric',
          }),
          time: candles[i].time,
        })
        prevDay = etDate
      }
    }
    return boundaries
  }, [candles])

  // ── Session boundaries ────────────────────────────────────────────────────
  const intervalMin = TF_MINUTES[timeframe] ?? 5
  const sessionBoundaries = useMemo(() => {
    if (!candles || candles.length === 0 || timeframe === '1D') return []
    const sessions = []
    for (let i = 0; i < candles.length; i++) {
      const d = new Date(candles[i].time * 1000)
      const utcH = d.getUTCHours()
      const utcM = d.getUTCMinutes()
      for (const sess of SESSION_DEFS) {
        const diffMin = (utcH - sess.utcHour) * 60 + (utcM - sess.utcMin)
        if (diffMin >= 0 && diffMin < intervalMin) {
          sessions.push({ ...sess, index: i + 1, time: candles[i].time })
        }
      }
    }
    return sessions
  }, [candles, timeframe, intervalMin])

  // Current day label
  const currentDayLabel = useMemo(() => {
    if (!candles || index < 1) return ''
    const c = candles[Math.min(index, candles.length) - 1]
    if (!c) return ''
    return new Date(c.time * 1000).toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short', month: 'short', day: 'numeric',
    })
  }, [candles, index])

  // ── Timestamp formatting ──────────────────────────────────────────────────
  function tsAt(idx) {
    const c = candles?.[Math.max(0, idx - 1)]
    if (!c) return ''
    try {
      return new Date(c.time * 1000).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    } catch { return '' }
  }

  // ── Position helpers ──────────────────────────────────────────────────────
  function xToIndex(clientX) {
    if (!trackRef.current) return index
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.max(1, Math.floor(ratio * total))
  }

  function xToOffset(clientX) {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(rect.width, clientX - rect.left))
  }

  // ── Throttled seek ────────────────────────────────────────────────────────
  function throttledSeek(idx) {
    const now = performance.now()
    if (now - lastSeekRef.current > 16) {
      lastSeekRef.current = now
      onSeek(idx)
    }
  }

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    wasPlayingRef.current = playing
    if (playing) onToggle()

    const newIdx = xToIndex(e.clientX)
    setDragging(true)
    setHoverIndex(newIdx)
    setTooltipX(xToOffset(e.clientX))
    onSeek(newIdx)

    let latestIdx = newIdx

    function onMove(ev) {
      const idx = xToIndex(ev.clientX)
      const off = xToOffset(ev.clientX)
      latestIdx = idx
      setHoverIndex(idx)
      setTooltipX(off)
      throttledSeek(idx)
    }

    function onUp() {
      onSeek(latestIdx)
      setDragging(false)
      setHoverIndex(null)
      if (wasPlayingRef.current) onToggle()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [playing, onSeek, onToggle, total])

  // ── Touch drag ────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    wasPlayingRef.current = playing
    if (playing) onToggle()
    const touch = e.touches[0]
    const newIdx = xToIndex(touch.clientX)
    setDragging(true)
    setHoverIndex(newIdx)
    setTooltipX(xToOffset(touch.clientX))
    onSeek(newIdx)

    let latestIdx = newIdx

    function onMove(ev) {
      const t = ev.touches[0]
      const idx = xToIndex(t.clientX)
      latestIdx = idx
      setHoverIndex(idx)
      setTooltipX(xToOffset(t.clientX))
      throttledSeek(idx)
    }
    function onEnd() {
      onSeek(latestIdx)
      setDragging(false)
      setHoverIndex(null)
      if (wasPlayingRef.current) onToggle()
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, [playing, onSeek, onToggle, total])

  // ── Hover on scrubber ─────────────────────────────────────────────────────
  const handleHoverMove = useCallback((e) => {
    if (dragging) return
    setHovering(true)
    setHoverIndex(xToIndex(e.clientX))
    setTooltipX(xToOffset(e.clientX))
  }, [dragging, total])

  const handleHoverLeave = useCallback(() => {
    if (!dragging) {
      setHovering(false)
      setHoverIndex(null)
    }
  }, [dragging])

  // ── Day navigation ────────────────────────────────────────────────────────
  function goToPrevDay() {
    const curBoundaryIdx = dayBoundaries.findIndex(b => b.index > index) - 1
    const prev = Math.max(0, curBoundaryIdx - 1)
    onSeek(dayBoundaries[prev]?.index ?? 1)
  }

  function goToNextDay() {
    const next = dayBoundaries.find(b => b.index > index)
    if (next) onSeek(next.index)
  }

  // ── Session navigation ────────────────────────────────────────────────────
  function goToSession(sessId, reverse = false) {
    if (reverse) {
      const prev = [...sessionBoundaries].reverse().find(s => s.id === sessId && s.index < index)
      if (prev) onSeek(prev.index)
    } else {
      const next = sessionBoundaries.find(s => s.id === sessId && s.index > index)
        || sessionBoundaries.find(s => s.id === sessId)
      if (next) onSeek(next.index)
    }
  }

  // Close date picker on outside click
  useEffect(() => {
    if (!showDatePicker) return
    function close(e) {
      if (!e.target.closest('.replay-date-picker')) setShowDatePicker(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showDatePicker])

  return (
    <div className="replay-controls" style={{ flexWrap: 'wrap' }}>
      {/* ── Transport ── */}
      <button className="replay-btn" onClick={onReset} title="Reset to start">⏮</button>
      <button className="replay-btn" onClick={() => onStep(-5)} title="Back 5 bars">«</button>
      <button className="replay-btn" onClick={() => onStep(-1)} title="Back 1 bar">‹</button>
      <button
        className={`replay-btn${playing ? ' active' : ''}`}
        onClick={onToggle}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button className="replay-btn" onClick={() => onStep(1)} title="Forward 1 bar">›</button>
      <button className="replay-btn" onClick={() => onStep(5)} title="Forward 5 bars">»</button>

      <div className="toolbar-sep" />

      {/* ── Day navigation ── */}
      {dayBoundaries.length > 1 && (
        <>
          <button className="replay-btn" onClick={goToPrevDay} title="Previous day"
            style={{ fontSize: '11px', width: 'auto', padding: '0 5px' }}>
            ◁D
          </button>

          <div className="replay-date-picker" style={{ position: 'relative' }}>
            <button className="replay-btn" onClick={() => setShowDatePicker(p => !p)}
              title="Jump to date"
              style={{ fontSize: '10px', width: 'auto', padding: '0 8px', fontFamily: 'inherit' }}>
              {currentDayLabel || '—'} ▾
            </button>
            {showDatePicker && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0,
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: '6px', padding: '4px', zIndex: 50,
                maxHeight: '200px', overflowY: 'auto', minWidth: '140px',
                marginBottom: '4px',
              }}>
                {dayBoundaries.map(b => (
                  <button key={b.date} onClick={() => { onSeek(b.index); setShowDatePicker(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '4px 8px', background: 'transparent', border: 'none',
                      color: b.date === currentDayLabel ? 'var(--accent)' : 'var(--text)',
                      fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
                      fontWeight: b.date === currentDayLabel ? 600 : 400,
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--border)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="replay-btn" onClick={goToNextDay} title="Next day"
            style={{ fontSize: '11px', width: 'auto', padding: '0 5px' }}>
            D▷
          </button>
        </>
      )}

      {/* ── Session navigation ── */}
      {timeframe !== '1D' && sessionBoundaries.length > 0 && (
        <>
          <div className="toolbar-sep" />
          <div style={{ display: 'flex', gap: '2px' }}>
            {SESSION_DEFS.map(sess => (
              <button key={sess.id} className="speed-btn"
                title={`Jump to next ${sess.label} open (Shift+click for previous)`}
                onClick={(e) => goToSession(sess.id, e.shiftKey)}>
                {sess.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="toolbar-sep" />

      {/* ── Scrub bar ── */}
      <div
        style={{ flex: 1, position: 'relative', padding: '8px 0', cursor: 'col-resize', minWidth: '120px' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleHoverMove}
        onMouseLeave={handleHoverLeave}
      >
        {/* Timestamp tooltip */}
        {(dragging || hovering) && (
          <div style={{
            position: 'absolute',
            bottom: '26px',
            left: `${tooltipX}px`,
            transform: 'translateX(-50%)',
            background: '#1a2340',
            border: '1px solid var(--border2)',
            borderRadius: '5px',
            padding: '3px 8px',
            fontSize: '11px',
            color: 'var(--text)',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
          }}>
            {tsAt(displayIdx)}
          </div>
        )}

        {/* Track */}
        <div ref={trackRef} className="replay-progress">
          {/* Filled portion */}
          <div className="replay-progress-fill" style={{ width: `${thumbPct}%` }} />

          {/* Day boundary tick marks */}
          {dayBoundaries.map((b, i) => {
            if (i === 0) return null
            const pct = (b.index / total) * 100
            return (
              <div key={`day-${b.date}`} style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '-4px',
                width: '1px',
                height: 'calc(100% + 8px)',
                background: 'var(--border2)',
                pointerEvents: 'none',
                opacity: 0.6,
              }} />
            )
          })}

          {/* Session tick marks */}
          {timeframe !== '1D' && sessionBoundaries.map((s, i) => {
            const pct = (s.index / total) * 100
            return (
              <div key={`sess-${i}`} style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '-2px',
                width: '1px',
                height: 'calc(100% + 4px)',
                background: SESSION_COLORS[s.id],
                pointerEvents: 'none',
                opacity: 0.35,
              }} />
            )
          })}

          {/* Thumb dot */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${thumbPct}%`,
            transform: 'translate(-50%, -50%)',
            width: dragging ? '14px' : '10px',
            height: dragging ? '14px' : '10px',
            borderRadius: '50%',
            background: 'var(--accent)',
            border: '2px solid #1a2340',
            transition: dragging ? 'none' : 'width .1s, height .1s',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: dragging ? '0 0 0 3px rgba(79,142,247,0.25)' : 'none',
          }} />
        </div>
      </div>

      {/* ── Position counter + timestamp ── */}
      <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: '90px', fontFamily: 'monospace' }}>
        {index}/{total}
        {tsAt(index) && (
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>
            {tsAt(index)}
          </div>
        )}
      </div>

      {/* ── Speed ── */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            className={`speed-btn${speed === s ? ' active' : ''}`}
            onClick={() => onSpeedChange(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}
