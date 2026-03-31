import React, { useRef, useEffect, useState } from 'react';
import { createChart, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { useChartData } from '../../hooks/useChartData';

// ── B&R Zone Box Primitive ────────────────────────────────────────────────────
// Zones: { top, bot, startTime, label } — box extends from startTime to right edge

class BrZoneRenderer {
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
        const rawStartX = ts.timeToCoordinate(z.startTime)
        if (rawStartX == null) return
        const startX = Math.max(0, rawStartX)
        const endX   = mediaSize.width + 4
        const y = Math.min(topY, botY)
        const h = Math.max(2, Math.abs(topY - botY))
        const w = endX - startX
        if (w <= 0) return
        ctx.fillStyle = 'rgba(250,204,21,0.07)'
        ctx.fillRect(startX, y, w, h)
        ctx.strokeStyle = 'rgba(250,204,21,0.50)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(startX + 0.5, y + 0.5, w, h)
        ctx.setLineDash([])
        // Midpoint dashed line
        const midY = y + h / 2
        ctx.strokeStyle = 'rgba(250,204,21,0.30)'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(startX, midY)
        ctx.lineTo(endX, midY)
        ctx.stroke()
        ctx.setLineDash([])
        // Label
        ctx.fillStyle = 'rgba(250,204,21,0.70)'
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.fillText(z.label ?? 'B&R', startX + 4, y + Math.min(11, h - 2))
      })
    })
  }
}
class BrZonePaneView {
  constructor(src) { this._renderer = new BrZoneRenderer(src) }
  renderer() { return this._renderer }
  zOrder() { return 'bottom' }
}
class BrZonePrimitive {
  constructor() {
    this._zones = []; this._series = null; this._chart = null; this._request = null
    this._views = [new BrZonePaneView(this)]
  }
  attached({ series, chart, requestUpdate }) {
    this._series = series; this._chart = chart; this._request = requestUpdate
  }
  detached() { this._series = null; this._chart = null; this._request = null }
  updateZones(zones) { this._zones = zones; this._request?.() }
  paneViews() { return this._views }
  updateAllViews() {}
}

const TF_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '4h'];

function remapToCandle(candles, tradeTime) {
  if (!candles.length) return null;
  for (let i = 0; i < candles.length - 1; i++) {
    if (candles[i].time <= tradeTime && tradeTime < candles[i + 1].time) {
      return candles[i];
    }
  }
  if (tradeTime >= candles[candles.length - 1].time) return candles[candles.length - 1];
  return candles[0];
}

function buildMarkers(trades, candles) {
  if (!trades?.length || !candles?.length) return [];
  const markers = [];
  for (const trade of trades) {
    const isLong = trade.side === 'LONG';
    const isWin = trade.pnl >= 0;
    if (trade.entryTime) {
      const c = remapToCandle(candles, trade.entryTime);
      if (c) markers.push({
        time: c.time,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#22c55e' : '#ef4444',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `${isLong ? 'L' : 'S'} ${trade.entry?.toFixed(1) ?? ''}`,
      });
    }
    if (trade.exitTime) {
      const c = remapToCandle(candles, trade.exitTime);
      if (c) markers.push({
        time: c.time,
        position: isLong ? 'aboveBar' : 'belowBar',
        color: isWin ? '#22c55e' : '#ef4444',
        shape: 'circle',
        text: `${trade.exitReason?.toUpperCase() ?? 'X'} ${trade.exitPrice?.toFixed(1) ?? ''}`,
      });
    }
  }
  markers.sort((a, b) => a.time - b.time);
  return markers;
}

const metricStyle = {
  display: 'inline-block',
  background: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '5px',
  padding: '3px 8px',
  fontSize: '11px',
  marginRight: '5px',
};

export default function ChartWithMarkers({ symbol, nativeTf, trades, metrics, brZones }) {
  const [visualTf, setVisualTf] = useState(nativeTf || '5m');
  const { candles } = useChartData(symbol, visualTf);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const zonePrimRef = useRef(null);

  useEffect(() => { setVisualTf(nativeTf || '5m'); }, [nativeTf]);

  // Update zone boxes without recreating the chart
  useEffect(() => {
    if (zonePrimRef.current) zonePrimRef.current.updateZones(brZones || []);
  }, [brZones]);

  useEffect(() => {
    if (!candles?.length || !containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 380,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    series.setData(candles);

    const markers = buildMarkers(trades, candles);
    if (markers.length) createSeriesMarkers(series, markers);

    // B&R zone overlay
    const zonePrim = new BrZonePrimitive();
    series.attachPrimitive(zonePrim);
    zonePrimRef.current = zonePrim;
    if (brZones?.length) zonePrim.updateZones(brZones);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => { chart.remove(); chartRef.current = null; zonePrimRef.current = null; };
  }, [candles, trades]);

  const pnlPositive = (metrics?.totalPnl ?? 0) >= 0;

  return (
    <div style={{ position: 'relative', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      {metrics && (
        <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 10, display: 'flex', gap: 4 }}>
          <span style={{ ...metricStyle, color: pnlPositive ? '#22c55e' : '#ef4444' }}>
            {pnlPositive ? '+' : ''}{metrics.totalPnl?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </span>
          <span style={{ ...metricStyle, color: '#e2e8f0' }}>
            {metrics.winRate?.toFixed(1)}% win
          </span>
          <span style={{ ...metricStyle, color: '#ef4444' }}>
            DD {metrics.maxDrawdown?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </span>
          <span style={{ ...metricStyle, color: '#9ca3af' }}>
            {metrics.totalTrades} trades
          </span>
        </div>
      )}
      <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, display: 'flex', gap: 3 }}>
        {TF_OPTIONS.map((tf) => (
          <button
            key={tf}
            onClick={() => setVisualTf(tf)}
            style={{
              background: visualTf === tf ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
              color: visualTf === tf ? '#fff' : '#6b7280',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {tf}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ height: '380px', width: '100%' }} />
    </div>
  );
}
