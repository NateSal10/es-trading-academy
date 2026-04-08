import { useState, useEffect } from 'react'

async function fetchPrice(symbol) {
  try {
    const r = await fetch(
      `/api/yahoo/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=false`
    )
    const data = await r.json()
    const result = data.chart?.result?.[0]
    if (!result) return null

    const closes  = result.indicators.quote[0].close
    const opens   = result.indicators.quote[0].open

    // Last valid close = current price
    let lastClose = null
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null) { lastClose = closes[i]; break }
    }
    // First valid open = day open (for % change)
    let dayOpen = null
    for (let i = 0; i < opens.length; i++) {
      if (opens[i] != null) { dayOpen = opens[i]; break }
    }

    if (lastClose == null) return null
    const change    = dayOpen != null ? lastClose - dayOpen : 0
    const changePct = dayOpen ? (change / dayOpen) * 100 : 0
    return { price: lastClose, change, changePct }
  } catch {
    return null
  }
}

export function useWatchlistPrices(symbols) {
  const [prices, setPrices] = useState({})

  useEffect(() => {
    if (!symbols.length) return

    let cancelled = false

    async function fetchAll() {
      const entries = await Promise.all(
        symbols.map(async (sym) => [sym, await fetchPrice(sym)])
      )
      if (cancelled) return
      setPrices(prev => {
        const next = { ...prev }
        for (const [sym, info] of entries) {
          if (info) next[sym] = info
        }
        return next
      })
    }

    fetchAll()
    const id = setInterval(fetchAll, 45000)
    return () => { cancelled = true; clearInterval(id) }
  }, [symbols.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return prices
}
