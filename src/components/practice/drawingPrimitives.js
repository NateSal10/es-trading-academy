// DrawingLayerPrimitive — lightweight-charts v5 Series Primitive
// Renders user-placed drawings (hline, line, box) on top of the chart canvas.
// Uses the same ISeriesPrimitive interface as BoxZonePrimitive in ChartContainer.jsx.

class DrawingLayerRenderer {
  constructor(src) { this._src = src }

  draw(target) {
    const { _series: s, _chart: c, _drawings: drawings, _preview: preview, _selectedId: selId } = this._src
    if (!s || !c) return

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = c.timeScale()

      const drawOne = (d, alpha, selected) => {
        ctx.globalAlpha = alpha
        const baseColor = d.color || '#4f8ef7'
        const color = selected ? '#facc15' : baseColor

        if (d.type === 'hline') {
          const y = s.priceToCoordinate(d.price)
          if (y == null) { ctx.globalAlpha = 1; return }

          if (selected) {
            ctx.strokeStyle = 'rgba(250,204,21,0.25)'
            ctx.lineWidth = 7
            ctx.setLineDash([])
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mediaSize.width, y); ctx.stroke()
          }
          ctx.strokeStyle = color
          ctx.lineWidth = selected ? 2 : 1.5
          ctx.setLineDash([])
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mediaSize.width, y); ctx.stroke()

          if (selected) {
            ctx.fillStyle = '#facc15'
            ctx.beginPath(); ctx.arc(mediaSize.width * 0.25, y, 5, 0, Math.PI * 2); ctx.fill()
            ctx.beginPath(); ctx.arc(mediaSize.width * 0.75, y, 5, 0, Math.PI * 2); ctx.fill()
          }
        }

        if (d.type === 'line') {
          const x1 = ts.timeToCoordinate(d.p1.time), y1 = s.priceToCoordinate(d.p1.price)
          const x2 = ts.timeToCoordinate(d.p2.time), y2 = s.priceToCoordinate(d.p2.price)
          if (x1 == null || y1 == null || x2 == null || y2 == null) { ctx.globalAlpha = 1; return }

          if (selected) {
            ctx.strokeStyle = 'rgba(250,204,21,0.25)'
            ctx.lineWidth = 7
            ctx.setLineDash([])
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
          }
          ctx.strokeStyle = color
          ctx.lineWidth = selected ? 2 : 1.5
          ctx.setLineDash([])
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()

          const hr = selected ? 6 : 4
          ctx.fillStyle = color
          ctx.beginPath(); ctx.arc(x1, y1, hr, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(x2, y2, hr, 0, Math.PI * 2); ctx.fill()
        }

        if (d.type === 'box') {
          const x1 = ts.timeToCoordinate(d.p1.time), y1 = s.priceToCoordinate(d.p1.price)
          const x2 = ts.timeToCoordinate(d.p2.time), y2 = s.priceToCoordinate(d.p2.price)
          if (x1 == null || y1 == null || x2 == null || y2 == null) { ctx.globalAlpha = 1; return }

          const left  = Math.min(x1, x2), right = Math.max(x1, x2)
          const top   = Math.min(y1, y2), bot   = Math.max(y1, y2)
          const w = right - left, h = bot - top

          ctx.fillStyle = color.startsWith('rgba') ? color : `${color}18`
          ctx.fillRect(left, top, w, h)

          ctx.strokeStyle = color
          ctx.lineWidth = selected ? 1.5 : 1
          ctx.setLineDash([5, 3])
          ctx.strokeRect(left + 0.5, top + 0.5, w, h)

          // Midpoint dashed line
          const midY = top + h / 2
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.setLineDash([6, 4])
          ctx.beginPath(); ctx.moveTo(left, midY); ctx.lineTo(right, midY); ctx.stroke()
          ctx.setLineDash([])

          // Corner handles when selected
          if (selected) {
            ctx.fillStyle = '#facc15'
            ;[[x1, y1], [x2, y2], [x1, y2], [x2, y1]].forEach(([cx, cy]) => {
              ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill()
            })
          }
        }

        ctx.globalAlpha = 1
      }

      drawings.forEach(d => drawOne(d, 1, d.id != null && d.id === selId))
      if (preview) drawOne(preview, 0.5, false)
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
    this._drawings   = []
    this._preview    = null
    this._selectedId = null
    this._series     = null
    this._chart      = null
    this._request    = null
    this._views      = [new DrawingLayerPaneView(this)]
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

  updateDrawings(drawings) { this._drawings = drawings; this._request?.() }
  setPreview(preview)      { this._preview  = preview;  this._request?.() }
  setSelectedId(id)        { this._selectedId = id;     this._request?.() }

  paneViews()      { return this._views }
  updateAllViews() {}
}
