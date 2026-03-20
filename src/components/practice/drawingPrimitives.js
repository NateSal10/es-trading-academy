// DrawingLayerPrimitive — lightweight-charts v5 Series Primitive
// Renders user-placed drawings (hline, line, box) on top of the chart canvas.
// Uses the same ISeriesPrimitive interface as BoxZonePrimitive in ChartContainer.jsx.

class DrawingLayerRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _series: s, _chart: c, _drawings: drawings, _preview: preview } = this._src
    if (!s || !c) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()

      const drawOne = (d, alpha) => {
        ctx.globalAlpha = alpha

        if (d.type === 'hline') {
          const y = s.priceToCoordinate(d.price)
          if (y == null) return
          ctx.strokeStyle = d.color || '#4f8ef7'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(mediaSize.width, y)
          ctx.stroke()
        }

        if (d.type === 'line') {
          const x1 = ts.timeToCoordinate(d.p1.time)
          const y1 = s.priceToCoordinate(d.p1.price)
          const x2 = ts.timeToCoordinate(d.p2.time)
          const y2 = s.priceToCoordinate(d.p2.price)
          if (x1 == null || y1 == null || x2 == null || y2 == null) return

          ctx.strokeStyle = d.color || '#4f8ef7'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          // Handle circles at endpoints
          ctx.fillStyle = d.color || '#4f8ef7'
          ctx.beginPath()
          ctx.arc(x1, y1, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x2, y2, 4, 0, Math.PI * 2)
          ctx.fill()
        }

        if (d.type === 'box') {
          const x1 = ts.timeToCoordinate(d.p1.time)
          const y1 = s.priceToCoordinate(d.p1.price)
          const x2 = ts.timeToCoordinate(d.p2.time)
          const y2 = s.priceToCoordinate(d.p2.price)
          if (x1 == null || y1 == null || x2 == null || y2 == null) return

          const left   = Math.min(x1, x2)
          const right  = Math.max(x1, x2)
          const top    = Math.min(y1, y2)
          const bottom = Math.max(y1, y2)
          const w = right - left
          const h = bottom - top

          const color  = d.color || '#4f8ef7'
          // Semi-transparent fill
          ctx.fillStyle = color.startsWith('rgba') ? color : `${color}18`
          ctx.fillRect(left, top, w, h)

          // Dashed border
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.setLineDash([5, 3])
          ctx.strokeRect(left + 0.5, top + 0.5, w, h)

          // Dashed midpoint line
          const midY = top + h / 2
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.setLineDash([6, 4])
          ctx.beginPath()
          ctx.moveTo(left, midY)
          ctx.lineTo(right, midY)
          ctx.stroke()

          ctx.setLineDash([])
        }

        ctx.globalAlpha = 1
      }

      // Draw all saved drawings at full opacity
      drawings.forEach(d => drawOne(d, 1))

      // Draw in-progress ghost preview at 50% opacity
      if (preview) drawOne(preview, 0.5)
    })
  }
}

class DrawingLayerPaneView {
  constructor(src) { this._renderer = new DrawingLayerRenderer(src) }
  renderer() { return this._renderer }
  zOrder()   { return 'top' }
}

export class DrawingLayerPrimitive {
  constructor() {
    this._drawings = []
    this._preview  = null
    this._series   = null
    this._chart    = null
    this._request  = null
    this._views    = [new DrawingLayerPaneView(this)]
  }

  attached({ series, chart, requestUpdate }) {
    this._series  = series
    this._chart   = chart
    this._request = requestUpdate
  }

  detached() {
    this._series  = null
    this._chart   = null
    this._request = null
  }

  updateDrawings(drawings) {
    this._drawings = drawings
    this._request?.()
  }

  setPreview(preview) {
    this._preview = preview
    this._request?.()
  }

  paneViews()      { return this._views }
  updateAllViews() {}
}
