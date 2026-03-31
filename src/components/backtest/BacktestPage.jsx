import { useState, useCallback } from 'react'
import useStore from '../../store'
import { useChartData } from '../../hooks/useChartData'
import { runBacktest, getPointValue } from '../../engine/backtestEngine'
import { buildStrategy, computeBrZones } from '../../engine/ruleEngine'
import ChartWithMarkers from './ChartWithMarkers'
import BacktestResults from './BacktestResults'
import RuleBuilder, { DEFAULT_RULE_CONFIG } from './RuleBuilder'

const SYMBOLS = ['ES=F', 'NQ=F', 'MES=F']
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h']

const btnBase = {
  border: 'none',
  borderRadius: '6px',
  padding: '6px 14px',
  fontSize: '12px',
  cursor: 'pointer',
  fontWeight: 600,
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('ES=F')
  const [tf, setTf] = useState('5m')
  const [startingBalance, setStartingBalance] = useState(10000)
  const [ruleConfig, setRuleConfig] = useState(DEFAULT_RULE_CONFIG)
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [brZones, setBrZones] = useState([])

  const saveBacktestResult = useStore((s) => s.saveBacktestResult)
  const { candles, loading, isLive } = useChartData(symbol, tf)

  const pointValue = getPointValue(symbol.replace('=F', ''))
  const canRun = candles.length > 0 && !loading && !running && ruleConfig.conditions.length > 0

  const handleRun = useCallback(() => {
    if (!canRun) return
    setError(null)
    setRunning(true)

    setTimeout(() => {
      try {
        const strategy = buildStrategy(ruleConfig)
        const config = {
          startingBalance,
          pointValue,
          contractQty: 1,
          commission: 0,
        }
        const result = runBacktest(candles, strategy, {}, config)
        setResults(result)
        setBrZones(computeBrZones(ruleConfig, candles))
        saveBacktestResult({
          strategyId: 'custom_rule',
          strategyName: 'Custom Rule',
          symbol,
          timeframe: tf,
          params: ruleConfig,
          metrics: result.metrics,
          trades: result.trades,
          equityCurve: result.equityCurve,
        })
      } catch (err) {
        setError(err.message || 'Backtest failed')
      } finally {
        setRunning(false)
      }
    }, 50)
  }, [canRun, candles, ruleConfig, symbol, tf, startingBalance, pointValue, saveBacktestResult])

  const overlayMetrics = results ? {
    totalPnl: results.metrics?.totalPnL,
    winRate: results.metrics?.winRate,
    maxDrawdown: results.metrics?.maxDrawdown,
    totalTrades: results.metrics?.totalTrades,
  } : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>

      {/* ── Config Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {/* Symbol */}
        <select
          value={symbol}
          onChange={(e) => { setSymbol(e.target.value); setResults(null) }}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '5px',
            color: 'var(--text)',
            padding: '5px 8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {SYMBOLS.map((s) => <option key={s} value={s}>{s.replace('=F', '')}</option>)}
        </select>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Timeframe */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => { setTf(t); setResults(null) }}
              style={{
                ...btnBase,
                padding: '4px 9px',
                background: tf === t ? 'var(--accent)' : 'var(--card)',
                color: tf === t ? '#fff' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Starting Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Balance</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>$</span>
          <input
            type="number"
            min="1000"
            step="1000"
            value={startingBalance}
            onChange={(e) => setStartingBalance(parseInt(e.target.value) || 10000)}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              color: 'var(--text)',
              padding: '4px 8px',
              fontSize: '12px',
              width: '80px',
              outline: 'none',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>

        {/* Data source badge */}
        <span style={{
          fontSize: '10px',
          color: isLive ? 'var(--green-bright)' : 'var(--amber)',
          background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
          border: `1px solid ${isLive ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.25)'}`,
          borderRadius: '4px',
          padding: '2px 7px',
        }}>
          {loading ? 'Loading…' : isLive ? 'Live' : 'Sim'}
        </span>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          style={{
            ...btnBase,
            marginLeft: 'auto',
            background: canRun ? '#22c55e' : 'var(--bg2)',
            color: canRun ? '#000' : 'var(--muted)',
            border: canRun ? 'none' : '1px solid var(--border)',
            minWidth: '80px',
          }}
        >
          {running ? 'Running…' : '▶ Run'}
        </button>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      <ChartWithMarkers
        symbol={symbol}
        nativeTf={tf}
        trades={results?.trades ?? null}
        metrics={overlayMetrics}
        brZones={brZones}
      />

      {/* ── Rule Builder ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px' }}>
        <RuleBuilder
          value={ruleConfig}
          onChange={setRuleConfig}
          pointValue={pointValue}
        />
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          margin: '0 16px 16px',
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      {results && (
        <div style={{ padding: '0 16px 24px' }}>
          <BacktestResults
            metrics={results.metrics}
            equityCurve={results.equityCurve}
            trades={results.trades}
          />
        </div>
      )}
    </div>
  )
}
