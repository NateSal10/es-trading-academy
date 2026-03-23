import React, { useRef, useEffect } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const containerStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '14px',
  marginTop: '12px',
};

const labelStyle = {
  fontSize: '10px',
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  fontWeight: 600,
  marginBottom: '8px',
};

const legendStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '8px',
  fontSize: '10px',
  color: 'var(--muted)',
};

const dotStyle = (color) => ({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '4px',
  verticalAlign: 'middle',
});

export default function VisualReplay({ candles, trades }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!candles || candles.length < 2 || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
        horzLine: { color: 'rgba(255,255,255,0.2)' },
        vertLine: { color: 'rgba(255,255,255,0.2)' },
      },
    });

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(candles);

    // Add trade markers
    if (trades && trades.length > 0) {
      const markers = [];

      for (const trade of trades) {
        const isLong = trade.side === 'LONG';
        const isWin = trade.pnl >= 0;

        // Entry marker
        markers.push({
          time: trade.entryTime,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: isLong ? '#22c55e' : '#ef4444',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: `${isLong ? 'L' : 'S'} ${trade.entry?.toFixed(1) ?? ''}`,
        });

        // Exit marker
        if (trade.exitTime) {
          markers.push({
            time: trade.exitTime,
            position: isLong ? 'aboveBar' : 'belowBar',
            color: isWin ? '#22c55e' : '#ef4444',
            shape: 'circle',
            text: `${trade.exitReason?.toUpperCase() ?? 'X'} ${trade.exitPrice?.toFixed(1) ?? ''}`,
          });
        }
      }

      // Sort markers by time (required by lightweight-charts)
      markers.sort((a, b) => a.time - b.time);
      candleSeries.setMarkers(markers);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, trades]);

  if (!candles || candles.length < 2) return null;

  const tradeCount = trades?.length ?? 0;
  const wins = trades?.filter((t) => t.pnl >= 0).length ?? 0;
  const losses = tradeCount - wins;

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>
        Visual Replay — {tradeCount} trades ({wins}W / {losses}L)
      </div>
      <div ref={chartContainerRef} />
      <div style={legendStyle}>
        <span><span style={dotStyle('#22c55e')} /> Long Entry</span>
        <span><span style={dotStyle('#ef4444')} /> Short Entry</span>
        <span><span style={dotStyle('#22c55e')} /> TP Hit</span>
        <span><span style={dotStyle('#ef4444')} /> SL Hit</span>
      </div>
    </div>
  );
}
