export const STRATEGY_CATEGORIES = {
  BREAKOUT: 'breakout',
  SCALP: 'scalp',
  MEAN_REVERSION: 'mean_reversion',
  STRUCTURE: 'structure',
};

/**
 * Convert a UTC unix timestamp (seconds, as returned by Yahoo Finance) to
 * { hours, minutes, dateStr } in America/New_York.
 */
export function toET(utcTimestampSecs) {
  const date = new Date(utcTimestampSecs * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: 'numeric', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value ?? '0';
  return {
    hours: parseInt(get('hour'), 10),
    minutes: parseInt(get('minute'), 10),
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

/**
 * Compute VWAP over candles[fromIndex..toIndex] (inclusive).
 * typical_price = (high + low + close) / 3
 * VWAP = sum(typical_price * volume) / sum(volume)
 * If no volume data, uses equal weights.
 */
export function computeVWAP(candles, fromIndex, toIndex) {
  let sumTPV = 0;
  let sumV = 0;

  for (let i = fromIndex; i <= toIndex; i++) {
    const c = candles[i];
    if (!c) continue;

    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume != null && c.volume > 0 ? c.volume : 1;
    sumTPV += tp * vol;
    sumV += vol;
  }

  return sumV === 0 ? 0 : sumTPV / sumV;
}

/**
 * Compute EMA for an array of numeric values.
 * Returns an array of the same length with EMA values.
 */
/**
 * Compute ATR (Average True Range) at a specific candle index.
 * Returns the ATR value using a simple rolling mean (Wilder's can be added later).
 * @param {Array} candles - full candle array
 * @param {number} period - ATR period (default 14)
 * @param {number} index - candle index to compute ATR at
 */
export function computeATR(candles, period = 14, index) {
  const from = Math.max(1, index - period + 1)
  const to   = Math.min(index, candles.length - 1)
  if (to < from) return 0

  let sum = 0
  let count = 0
  for (let i = from; i <= to; i++) {
    const c    = candles[i]
    const prev = candles[i - 1]
    const tr   = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low  - prev.close)
    )
    sum += tr
    count++
  }
  return count > 0 ? sum / count : 0
}

export function computeEMA(values, period) {
  if (!values || values.length === 0) return [];

  const k = 2 / (period + 1);
  const ema = new Array(values.length);

  ema[0] = values[0];

  for (let i = 1; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}
