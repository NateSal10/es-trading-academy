export class BoxZoneRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _series: s, _chart: c, _zones: zones } = this._src
    if (!s || !c || !zones.length) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()
      zones.forEach(z => {
        const topY = s.priceToCoordinate(z.top)
        const botY = s.priceToCoordinate(z.bot)
        if (topY == null || botY == null) return

        // X: start at formation candle; extend to right edge of chart
        const rawStartX = ts.timeToCoordinate(z.startTime)
        const startX = rawStartX != null ? Math.max(0, rawStartX) : 0
        let endX = mediaSize.width + 4
        if (z.endTime != null) {
          const rawEndX = ts.timeToCoordinate(z.endTime)
          if (rawEndX != null) endX = Math.min(endX, rawEndX)
        }

        const y = Math.min(topY, botY)
        const h = Math.max(2, Math.abs(topY - botY))
        const w = endX - startX
        if (w <= 0) return

        const isBull = z.type === 'bull'
        const isOB   = !!z._ob
        const isBR   = !!z._brStrategy
        const fill   = isBR
          ? 'rgba(250,204,21,0.06)'
          : isOB
            ? (isBull ? 'rgba(251,146,60,0.08)'  : 'rgba(167,139,250,0.08)')
            : (isBull ? 'rgba(34,197,94,0.08)'   : 'rgba(239,68,68,0.08)')
        const border = isBR
          ? 'rgba(250,204,21,0.50)'
          : isOB
            ? (isBull ? 'rgba(251,146,60,0.55)'  : 'rgba(167,139,250,0.55)')
            : (isBull ? 'rgba(34,197,94,0.45)'   : 'rgba(239,68,68,0.45)')

        ctx.fillStyle = fill
        ctx.fillRect(startX, y, w, h)

        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(startX + 0.5, y + 0.5, w, h)
        ctx.setLineDash([])

        // Midpoint dashed line through box center
        const midY = y + h / 2
        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(startX, midY)
        ctx.lineTo(endX, midY)
        ctx.stroke()
        ctx.setLineDash([])

        // Label inside the box
        ctx.fillStyle = border
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.fillText(z.label ?? (isBull ? 'FVG↑' : 'FVG↓'), startX + 4, y + Math.min(11, h - 2))
      })
    })
  }
}

export class BoxZonePaneView {
  constructor(src) { this._renderer = new BoxZoneRenderer(src) }
  renderer() { return this._renderer }
  zOrder()   { return 'bottom' }
}

export class BoxZonePrimitive {
  constructor() {
    this._zones   = []
    this._series  = null
    this._chart   = null
    this._request = null
    this._views   = [new BoxZonePaneView(this)]
  }
  attached({ series, chart, requestUpdate }) {
    this._series  = series
    this._chart   = chart
    this._request = requestUpdate
  }
  detached() { this._series = null; this._chart = null; this._request = null }
  updateZones(zones) { this._zones = zones; this._request?.() }
  paneViews()       { return this._views }
  updateAllViews()  {}
}

export class VerticalBandRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _series: s, _chart: c, _zones: zones } = this._src
    if (!c || !zones.length) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()
      zones.forEach(z => {
        const x1 = ts.timeToCoordinate(z.startTime)
        const x2 = ts.timeToCoordinate(z.endTime)
        if (x1 == null || x2 == null) return

        const left  = Math.max(0, x1)
        const right = Math.min(mediaSize.width, x2)
        const w = right - left
        if (w <= 0) return

        // Clip to session high/low price range if available
        let topY = 0
        let botY = mediaSize.height
        if (s && z.high != null && z.low != null) {
          const computedTop = s.priceToCoordinate(z.high)
          const computedBot = s.priceToCoordinate(z.low)
          if (computedTop != null && computedBot != null) {
            topY = Math.min(computedTop, computedBot)
            botY = Math.max(computedTop, computedBot)
          }
        }
        const bandH = botY - topY

        ctx.fillStyle = z.color
        ctx.fillRect(left, topY, w, bandH)

        // Large centered watermark label
        ctx.fillStyle = z.labelColor
        ctx.font = 'bold 42px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(z.label, left + w / 2, topY + bandH * 0.5)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      })
    })
  }
}

export class VerticalBandPaneView {
  constructor(src) { this._renderer = new VerticalBandRenderer(src) }
  renderer() { return this._renderer }
  zOrder()   { return 'bottom' }
}

export class VerticalBandPrimitive {
  constructor() {
    this._zones  = []
    this._series = null
    this._chart  = null
    this._request = null
    this._views  = [new VerticalBandPaneView(this)]
  }
  attached({ series, chart, requestUpdate }) { this._series = series; this._chart = chart; this._request = requestUpdate }
  detached() { this._series = null; this._chart = null; this._request = null }
  updateZones(zones) { this._zones = zones; this._request?.() }
  paneViews()      { return this._views }
  updateAllViews() {}
}
