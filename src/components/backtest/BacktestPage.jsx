import { useState, useCallback } from 'react'
import { Play, ArrowLeft, BarChart3, Settings2 } from 'lucide-react'
import StrategySelector from './StrategySelector'
import BacktestResults from './BacktestResults'
import BacktestHistory from './BacktestHistory'
import TradeLog from './TradeLog'
import useStore from '../../store'
import { useChartData } from '../../hooks/useChartData'
import { runBacktest, getPointValue } from '../../engine/backtestEngine'
import CustomStrategyBuilder from './CustomStrategyBuilder'
import VisualReplay from './VisualReplay'
import { openingRangeBreakout } from '../../engine/strategies/openingRangeBreakout'
import { vwapBounce } from '../../engine/strategies/vwapBounce'
import { ictSilverBullet } from '../../engine/strategies/ictSilverBullet'
import { breakAndRetest } from '../../engine/strategies/breakAndRetest'
import { tjrStrategy } from '../../engine/strategies/tjrStrategy'
import { buildCustomStrategy } from '../../engine/strategies/customStrategyRunner'

const PRESET_STRATEGIES = [openingRangeBreakout, vwapBounce, ictSilverBullet, breakAndRetest, tjrStrategy]

const SYMBOLS = ['ES=F', 'MES=F', 'NQ=F']
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D']

const styles = {
  page: {
    padding: '16px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
  },
  button: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
  },
  select: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paramGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  paramInput: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: 0,
  },
  dataInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--muted)',
  },
  dataItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dataValue: {
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: '13px',
  },
}

function formatET(timestamp) {
  if (!timestamp) return '—'
  const d = new Date(timestamp * 1000)
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initParamValues(strategy) {
  if (!strategy?.params) return {}
  const values = {}
  for (const [key, def] of Object.entries(strategy.params)) {
    values[key] = def.default ?? def.min ?? 0
  }
  return values
}

export default function BacktestPage() {
  const [view, setView] = useState('config')
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [strategyParams, setStrategyParams] = useState({})
  const [symbol, setSymbol] = useState('ES=F')
  const [timeframe, setTimeframe] = useState('5m')
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [customConfig, setCustomConfig] = useState(null)
  const [showReplay, setShowReplay] = useState(false)

  const saveBacktestResult = useStore((s) => s.saveBacktestResult)
  const { candles, loading, isLive } = useChartData(symbol, timeframe)

  const handleSelectStrategy = useCallback((strategy) => {
    setSelectedStrategy(strategy)
    setStrategyParams(initParamValues(strategy))
  }, [])

  const handleParamChange = useCallback((key, value) => {
    setStrategyParams((prev) => ({ ...prev, [key]: Number(value) }))
  }, [])

  const handleRun = useCallback(() => {
    if (!selectedStrategy || !candles.length) return
    setRunning(true)
    setTimeout(() => {
      const config = {
        startingBalance: 10000,
        pointValue: getPointValue(symbol.replace('=F', '')),
        contractQty: 1,
        commission: 0,
      }
      const isCustom = selectedStrategy.id === 'custom'
      const strategy = isCustom ? buildCustomStrategy(customConfig) : selectedStrategy
      const params = isCustom ? {} : strategyParams
      const result = runBacktest(candles, strategy, params, config)
      setResults(result)
      saveBacktestResult({
        strategyId: selectedStrategy.id,
        strategyName: isCustom ? 'Custom Strategy' : selectedStrategy.name,
        symbol,
        timeframe,
        params: isCustom ? customConfig : strategyParams,
        metrics: result.metrics,
        trades: result.trades,
        equityCurve: result.equityCurve,
      })
      setView('results')
      setRunning(false)
    }, 50)
  }, [selectedStrategy, candles, strategyParams, customConfig, symbol])

  const handleBack = useCallback(() => {
    setView('config')
  }, [])

  const handleLoadHistory = useCallback((entry) => {
    setResults({
      trades: entry.trades,
      equityCurve: entry.equityCurve,
      metrics: entry.metrics,
    })
    // Find matching strategy for the header display
    const matchedStrategy = PRESET_STRATEGIES.find((s) => s.id === entry.strategyId)
    if (matchedStrategy) setSelectedStrategy(matchedStrategy)
    setView('results')
  }, [])

  if (view === 'results' && results) {
    return (
      <div style={styles.page}>
        <div style={styles.headerBar}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={14} />
            Back to Config
          </button>
          <span style={styles.title}>
            <BarChart3 size={18} />
            {selectedStrategy?.name ?? 'Backtest Results'}
          </span>
          <button
            style={{
              ...styles.button,
              background: showReplay ? 'var(--accent)' : 'var(--bg2)',
              color: showReplay ? '#fff' : 'var(--text)',
              border: showReplay ? 'none' : '1px solid var(--border)',
            }}
            onClick={() => setShowReplay((prev) => !prev)}
          >
            <Play size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {showReplay ? 'Hide Chart' : 'Visual Replay'}
          </button>
        </div>

        {showReplay && (
          <VisualReplay candles={candles} trades={results.trades} />
        )}

        <BacktestResults metrics={results.metrics} equityCurve={results.equityCurve} />

        <div style={{ marginTop: '16px' }}>
          <TradeLog trades={results.trades} strategyName={selectedStrategy?.id} />
        </div>
      </div>
    )
  }

  const firstCandle = candles[0]
  const lastCandle = candles[candles.length - 1]
  const isCustom = selectedStrategy?.id === 'custom'
  const customReady = isCustom ? customConfig?.conditions?.length > 0 : true
  const canRun = selectedStrategy && candles.length > 0 && !loading && !running && customReady

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.headerBar}>
        <span style={styles.title}>
          <Settings2 size={18} />
          Backtest
        </span>
        <div style={styles.controls}>
          <div>
            <div style={styles.label}>Symbol</div>
            <select
              style={styles.select}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={styles.label}>Timeframe</div>
            <select
              style={styles.select}
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Strategy Selector */}
      <StrategySelector
        strategies={PRESET_STRATEGIES}
        selected={selectedStrategy}
        onSelect={handleSelectStrategy}
      />

      {/* Strategy Params or Custom Builder */}
      {selectedStrategy?.id === 'custom' ? (
        <CustomStrategyBuilder config={customConfig} onChange={setCustomConfig} />
      ) : (
        selectedStrategy?.params && Object.keys(selectedStrategy.params).length > 0 && (
          <div style={{ ...styles.card, marginTop: '12px' }}>
            <div style={{ ...styles.label, marginBottom: '8px' }}>
              Strategy Parameters
            </div>
            <div style={styles.paramGrid}>
              {Object.entries(selectedStrategy.params).map(([key, def]) => (
                <div key={key}>
                  <div style={styles.label}>{def.label ?? key}</div>
                  <input
                    type="number"
                    style={styles.paramInput}
                    value={strategyParams[key] ?? ''}
                    min={def.min}
                    max={def.max}
                    step={def.step ?? 1}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Data Info */}
      <div style={{ ...styles.card, marginTop: '12px' }}>
        <div style={{ ...styles.label, marginBottom: '8px' }}>Data Info</div>
        <div style={styles.dataInfo}>
          <div style={styles.dataItem}>
            <span style={styles.label}>Symbol</span>
            <span style={styles.dataValue}>{symbol}</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.label}>Timeframe</span>
            <span style={styles.dataValue}>{timeframe}</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.label}>Candles</span>
            <span style={styles.dataValue}>
              {loading ? 'Loading...' : candles.length.toLocaleString()}
            </span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.label}>From</span>
            <span style={styles.dataValue}>
              {formatET(firstCandle?.time ?? firstCandle?.timestamp)}
            </span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.label}>To</span>
            <span style={styles.dataValue}>
              {formatET(lastCandle?.time ?? lastCandle?.timestamp)}
            </span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.label}>Source</span>
            <span style={styles.dataValue}>{isLive ? 'Live' : 'Simulated'}</span>
          </div>
        </div>
      </div>

      {/* History */}
      <BacktestHistory onSelect={handleLoadHistory} />

      {/* Run Button */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={{
            ...styles.button,
            opacity: canRun ? 1 : 0.5,
            cursor: canRun ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          disabled={!canRun}
          onClick={handleRun}
        >
          <Play size={14} />
          {running ? 'Running...' : 'Run Backtest'}
        </button>
      </div>
    </div>
  )
}
