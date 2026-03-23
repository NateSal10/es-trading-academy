/**
 * Aggregate lower-timeframe candles into higher-timeframe bars.
 * Used by TJR strategy to build HTF key levels from LTF data.
 *
 * @param {Array} candles - Array of OHLCV candle objects (time in seconds)
 * @param {number} targetMinutes - Target timeframe in minutes (e.g. 60 for 1h)
 * @returns {{ htfCandles: Array, ltfToHtf: Map<number, number> }}
 *   htfCandles: aggregated OHLCV bars
 *   ltfToHtf: maps LTF candle index → HTF candle index
 */
export function aggregateToTimeframe(candles, targetMinutes) {
  if (!candles || candles.length === 0) {
    return { htfCandles: [], ltfToHtf: new Map() };
  }

  const bucketSeconds = targetMinutes * 60;
  const buckets = new Map(); // bucketKey → { indices, candles }
  const ltfToHtf = new Map();

  // Group candles into time buckets
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const bucketKey = Math.floor(c.time / bucketSeconds) * bucketSeconds;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey).push({ index: i, candle: c });
  }

  // Build aggregated candles in chronological order
  const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);
  const htfCandles = [];

  for (const key of sortedKeys) {
    const group = buckets.get(key);
    const htfIndex = htfCandles.length;

    const first = group[0].candle;
    let high = first.high;
    let low = first.low;
    let volume = 0;

    for (const { index, candle } of group) {
      high = Math.max(high, candle.high);
      low = Math.min(low, candle.low);
      volume += candle.volume ?? 0;
      ltfToHtf.set(index, htfIndex);
    }

    const last = group[group.length - 1].candle;

    htfCandles.push({
      time: key,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
    });
  }

  return { htfCandles, ltfToHtf };
}
