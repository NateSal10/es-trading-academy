import React, { useRef, useEffect } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

const card = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 14px',
  textAlign: 'center',
};

const label = {
  fontSize: '9px',
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  marginBottom: '4px',
};

const value = {
  fontSize: '16px',
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

const formatDollar = (n) => {
  const abs = Math.abs(n);
  const formatted = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2);
  return n >= 0 ? `+$${formatted}` : `-$${formatted}`;
};

const colorFor = (v, pos, neg) => {
  if (v > 0) return pos || 'var(--green-bright)';
  if (v < 0) return neg || 'var(--red-bright)';
  return 'var(--text)';
};

function MetricCard({ title, display, color }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ ...value, color }}>{display}</div>
    </div>
  );
}

function EquityCurve({ equityCurve }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!equityCurve || equityCurve.length < 2 || !containerRef.current) return;

    const startEq = equityCurve[0].equity;
    const endEq = equityCurve[equityCurve.length - 1].equity;
    const isUp = endEq >= startEq;
    const lineColor = isUp ? '#22c55e' : '#ef4444';

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 160,
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
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        horzLine: { color: 'rgba(255,255,255,0.2)' },
        vertLine: { color: 'rgba(255,255,255,0.2)' },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });

    const data = equityCurve.map((p) => ({
      time: p.time,
      value: p.equity,
    }));

    series.setData(data);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [equityCurve]);

  if (!equityCurve || equityCurve.length < 2) return null;

  const startEq = equityCurve[0].equity;
  const endEq = equityCurve[equityCurve.length - 1].equity;
  const isUp = endEq >= startEq;

  return (
    <div style={{ ...card, marginTop: '12px', padding: '14px' }}>
      <div style={{ ...label, textAlign: 'left', marginBottom: '8px' }}>Equity Curve</div>
      <div ref={containerRef} style={{ width: '100%', height: '160px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          ${startEq.toLocaleString()}
        </span>
        <span style={{
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          color: isUp ? 'var(--green-bright)' : 'var(--red-bright)',
        }}>
          ${endEq.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function BacktestResults({ metrics, equityCurve }) {
  if (!metrics) return null;

  const {
    winRate, totalPnL, profitFactor, maxDrawdown, maxDrawdownPct,
    sharpeRatio, totalTrades, avgWin, avgLoss, largestWin, largestLoss,
    avgRR, expectancy, maxConsecutiveWins, maxConsecutiveLosses,
    avgTradeDuration,
  } = metrics;

  const sharpeColor = sharpeRatio >= 1
    ? 'var(--green-bright)'
    : sharpeRatio >= 0
      ? 'var(--amber)'
      : 'var(--red-bright)';

  const primaryCards = [
    { title: 'Win Rate', display: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' },
    { title: 'Total P&L', display: formatDollar(totalPnL), color: colorFor(totalPnL) },
    { title: 'Profit Factor', display: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), color: profitFactor >= 1 ? 'var(--green-bright)' : 'var(--red-bright)' },
    { title: 'Max Drawdown', display: `$${maxDrawdown.toFixed(0)} (${maxDrawdownPct.toFixed(1)}%)`, color: 'var(--red-bright)' },
    { title: 'Sharpe Ratio', display: sharpeRatio.toFixed(2), color: sharpeColor },
    { title: 'Total Trades', display: `${totalTrades}`, color: 'var(--text)' },
  ];

  const secondaryCards = [
    { title: 'Avg Win', display: formatDollar(avgWin), color: 'var(--green-bright)' },
    { title: 'Avg Loss', display: `$${Math.abs(avgLoss).toFixed(2)}`, color: 'var(--red-bright)' },
    { title: 'Largest Win', display: formatDollar(largestWin), color: 'var(--green-bright)' },
    { title: 'Largest Loss', display: `$${Math.abs(largestLoss).toFixed(2)}`, color: 'var(--red-bright)' },
    { title: 'Avg R:R', display: avgRR.toFixed(2), color: 'var(--text)' },
    { title: 'Expectancy', display: formatDollar(expectancy), color: colorFor(expectancy) },
    { title: 'Win Streak', display: `${maxConsecutiveWins}`, color: 'var(--green-bright)' },
    { title: 'Loss Streak', display: `${maxConsecutiveLosses}`, color: 'var(--red-bright)' },
    { title: 'Avg Duration', display: `${avgTradeDuration} bars`, color: 'var(--text)' },
  ];

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '8px',
      }}>
        {primaryCards.map((c) => (
          <MetricCard key={c.title} title={c.title} display={c.display} color={c.color} />
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
        marginTop: '12px',
      }}>
        {secondaryCards.map((c) => (
          <MetricCard key={c.title} title={c.title} display={c.display} color={c.color} />
        ))}
      </div>

      <EquityCurve equityCurve={equityCurve} />
    </div>
  );
}
