import { useEffect, useRef, useState, useCallback } from 'react'

const SPEEDS = [0.5, 1, 2, 4, 8]

export default function ReplayControls({
  total, index, playing, speed, candles,
  onToggle, onStep, onReset, onSpeedChange, onSeek,
}) {
  const trackRef    = useRef(null)
  const intervalRef = useRef(null)
  const wasPlayingRef = useRef(false)

  const [dragging,      setDragging]      = useState(false)
  const [hoverIndex,    setHoverIndex]    = useState(null)  // index under cursor while dragging
  const [tooltipX,      setTooltipX]      = useState(0)    // px from left of track

  // Auto-play interval
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => onStep(), Math.max(30, 500 / speed))
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, onStep])

  const pct         = total > 0 ? (index / total) * 100 : 0
  const displayIdx  = dragging && hoverIndex != null ? hoverIndex : index

  // Get ET timestamp string for a bar index
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

  // Convert a clientX position to a bar index
  function xToIndex(clientX) {
    if (!trackRef.current) return index
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.max(1, Math.floor(ratio * total))
  }

  // Convert a clientX to left-offset px within the track (for tooltip)
  function xToOffset(clientX) {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(rect.width, clientX - rect.left))
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()

    // Pause while scrubbing
    wasPlayingRef.current = playing
    if (playing) onToggle()

    const newIdx = xToIndex(e.clientX)
    setDragging(true)
    setHoverIndex(newIdx)
    setTooltipX(xToOffset(e.clientX))
    onSeek(newIdx)

    function onMove(ev) {
      const idx = xToIndex(ev.clientX)
      const off = xToOffset(ev.clientX)
      setHoverIndex(idx)
      setTooltipX(off)
      onSeek(idx)
    }

    function onUp() {
      setDragging(false)
      setHoverIndex(null)
      // Resume if was playing before scrub
      if (wasPlayingRef.current) onToggle()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [playing, onSeek, onToggle])

  // Touch support
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

    function onMove(ev) {
      const t = ev.touches[0]
      setHoverIndex(xToIndex(t.clientX))
      setTooltipX(xToOffset(t.clientX))
      onSeek(xToIndex(t.clientX))
    }
    function onEnd() {
      setDragging(false)
      setHoverIndex(null)
      if (wasPlayingRef.current) onToggle()
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, [playing, onSeek, onToggle])

  const thumbPct = total > 0 ? (displayIdx / total) * 100 : 0

  return (
    <div className="replay-controls">
      {/* Transport buttons */}
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
      <button className="replay-btn" onClick={() => onStep(1)}  title="Forward 1 bar">›</button>
      <button className="replay-btn" onClick={() => onStep(5)}  title="Forward 5 bars">»</button>

      {/* Scrub bar */}
      <div style={{ flex: 1, position: 'relative', padding: '8px 0', cursor: 'col-resize' }}>

        {/* Timestamp tooltip */}
        {(dragging || true) && (
          <div style={{
            position: 'absolute',
            bottom: '22px',
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
            opacity: dragging ? 1 : 0,
            transition: 'opacity .1s',
            zIndex: 20,
          }}>
            {tsAt(displayIdx)}
          </div>
        )}

        {/* Track */}
        <div
          ref={trackRef}
          className="replay-progress"
          style={{ cursor: 'col-resize' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Filled portion */}
          <div className="replay-progress-fill" style={{ width: `${thumbPct}%` }} />

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

      {/* Position counter + timestamp */}
      <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: '90px', fontFamily: 'monospace' }}>
        {displayIdx}/{total}
        {tsAt(displayIdx) && (
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>
            {tsAt(displayIdx)}
          </div>
        )}
      </div>

      {/* Speed */}
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
