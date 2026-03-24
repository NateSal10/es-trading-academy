import { useState, useCallback } from 'react'
import useStore from '../../store'
import { useChartData } from '../../hooks/useChartData'
import { runBacktest, getPointValue } from '../../engine/backtestEngine'
import { openingRangeBreakout } from '../../engine/strategies/openingRangeBreakout'
import { vwapBounce } from '../../engine/strategies/vwapBounce'
import { ictSilverBullet } from '../../engine/strategies/ictSilverBullet'
import { breakAndRetest } from '../../engine/strategies/breakAndRetest'
import { tjrStrategy } from '../../engine/strategies/tjrStrategy'
import { buildCustomStrategy } from '../../engine/strategies/customStrategyRunner'
import StrategyChipBar from './StrategyChipBar'
import NLBar from './NLBar'
import ChartWithMarkers from './ChartWithMarkers'
import ResultsTabs from './ResultsTabs'
import CustomStrategyBuilder from './CustomStrategyBuilder'

const PRESET_STRATEGIES = [
  openingRangeBreakout,
  vwapBounce,
  ictSilverBullet,
  breakAndRetest,
  tjrStrategy,
]

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [symbol, setSymbol] = useState('ES=F')
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [customConfig, setCustomConfig] = useState(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [pineTabTrigger, setPineTabTrigger] = useState(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const strategyVariants = useStore((s) => s.strategyVariants)
  const addVariant = useStore((s) => s.addVariant)
  const saveBacktestResult = useStore((s) => s.saveBacktestResult)

  const nativeTf = selectedVariant
    ? (PRESET_STRATEGIES.find((s) => s.id === selectedVariant.baseStrategy)?.defaultTimeframe ?? '5m')
    : (selectedStrategy?.defaultTimeframe ?? '5m')

  const { candles, loading } = useChartData(symbol, nativeTf)

  const selectedId = selectedVariant?.id ?? selectedStrategy?.id ?? null
  const canRun = !!(selectedStrategy || selectedVariant) && candles.length > 0 && !loading && !running

  const handleSelectPreset = useCallback((strategy) => {
    setSelectedStrategy(strategy)
    setSelectedVariant(null)
  }, [])

  const handleSelectVariant = useCallback((variant) => {
    setSelectedVariant(variant)
    setSelectedStrategy(PRESET_STRATEGIES.find((s) => s.id === variant.baseStrategy) ?? null)
  }, [])

  const runWith = useCallback((strategy, params, label) => {
    if (!candles.length) return
    setRunning(true)
    setTimeout(() => {
      const config = {
        startingBalance: 10000,
        pointValue: getPointValue(symbol.replace('=F', '')),
        contractQty: 1,
        commission: 0,
      }
      const result = runBacktest(candles, strategy, params, config)
      setResults({ ...result, strategyLabel: label })
      saveBacktestResult({
        strategyId: strategy.id,
        strategyName: label,
        symbol,
        timeframe: nativeTf,
        params,
        metrics: result.metrics,
        trades: result.trades,
        equityCurve: result.equityCurve,
      })
      setRunning(false)
    }, 50)
  }, [candles, symbol, nativeTf, saveBacktestResult])

  const handleRun = useCallback(() => {
    if (!canRun) return
    if (selectedVariant) {
      const isCustom = selectedVariant.baseStrategy === 'custom'
      const strategy = isCustom
        ? buildCustomStrategy(selectedVariant.config)
        : (PRESET_STRATEGIES.find((s) => s.id === selectedVariant.baseStrategy) ?? selectedStrategy)
      runWith(strategy, isCustom ? {} : selectedVariant.config, selectedVariant.name)
    } else if (selectedStrategy?.id === 'custom') {
      runWith(buildCustomStrategy(customConfig), {}, 'Custom Strategy')
    } else if (selectedStrategy) {
      const params = {}
      for (const [key, def] of Object.entries(selectedStrategy.params ?? {})) {
        params[key] = def.default ?? def.min ?? 0
      }
      runWith(selectedStrategy, params, selectedStrategy.name)
    }
  }, [canRun, selectedStrategy, selectedVariant, customConfig, runWith])

  const interpretNL = async (text) => {
    const baseId = selectedStrategy?.id ?? 'custom'
    const res = await fetch('/api/interpret-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseStrategy: baseId }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.error?.includes('ANTHROPIC_API_KEY')) setApiKeyMissing(true)
      throw new Error(data.error || 'Interpretation failed')
    }
    return data
  }

  const handleApplyAndRun = async (text) => {
    const config = await interpretNL(text)
    const strategy = buildCustomStrategy(config)
    runWith(strategy, {}, `${selectedStrategy?.name ?? 'Custom'} (adjusted)`)
  }

  const handleSaveVariant = async (text, name) => {
    const config = await interpretNL(text)
    const willPrune = strategyVariants.length >= 20 &&
      !strategyVariants.find((v) => v.name === name)
    const variant = {
      id: crypto.randomUUID(),
      name,
      baseStrategy: selectedStrategy?.id ?? 'custom',
      config,
      createdAt: new Date().toISOString(),
    }
    addVariant(variant)
    if (willPrune) {
      console.info('Oldest variant removed to stay under 20 limit')
    }
  }

  const handlePineUse = useCallback((config) => {
    setCustomConfig(config)
    const strategy = buildCustomStrategy(config)
    setSelectedStrategy({ ...strategy, name: 'Pine Script Strategy' })
    setSelectedVariant(null)
    setPineTabTrigger(null)
  }, [])

  const handleLoadHistory = useCallback((entry) => {
    setResults({
      trades: entry.trades,
      equityCurve: entry.equityCurve,
      metrics: entry.metrics,
      strategyLabel: entry.strategyName,
    })
  }, [])

  const overlayMetrics = results ? {
    totalPnl: results.metrics?.totalPnl,
    winRate: results.metrics?.winRate,
    maxDrawdown: results.metrics?.maxDrawdown,
    totalTrades: results.metrics?.totalTrades,
  } : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      <StrategyChipBar
        presets={PRESET_STRATEGIES}
        variants={strategyVariants}
        selectedId={selectedId}
        symbol={symbol}
        onSelectPreset={handleSelectPreset}
        onSelectVariant={handleSelectVariant}
        onSymbolChange={setSymbol}
        onPineScript={() => setPineTabTrigger('Pine Script')}
        onNewStrategy={() => setShowCustomModal(true)}
        onRun={handleRun}
        running={running}
        canRun={canRun}
      />

      <NLBar
        strategyId={selectedStrategy?.id ?? 'custom'}
        apiKeyMissing={apiKeyMissing}
        onApplyAndRun={handleApplyAndRun}
        onSaveVariant={handleSaveVariant}
      />

      <ChartWithMarkers
        symbol={symbol}
        nativeTf={nativeTf}
        trades={results?.trades ?? null}
        metrics={overlayMetrics}
      />

      <ResultsTabs
        metrics={results?.metrics ?? null}
        equityCurve={results?.equityCurve ?? null}
        trades={results?.trades ?? null}
        candles={candles}
        strategyName={results?.strategyLabel ?? selectedStrategy?.name}
        onSelectHistory={handleLoadHistory}
        onPineUse={handlePineUse}
        initialTab={pineTabTrigger}
        onTabOpened={() => setPineTabTrigger(null)}
      />

      {showCustomModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={() => setShowCustomModal(false)}
        >
          <div
            style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CustomStrategyBuilder
              config={customConfig}
              onChange={(cfg) => {
                setCustomConfig(cfg)
                setSelectedStrategy({ id: 'custom', name: 'Custom Strategy', defaultTimeframe: '5m', params: {} })
                setSelectedVariant(null)
              }}
            />
            <button
              onClick={() => setShowCustomModal(false)}
              style={{
                width: '100%', marginTop: 8, padding: '8px',
                background: 'var(--bg2)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
