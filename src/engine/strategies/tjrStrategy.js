import { toET } from './strategyInterface.js';
import { detectSwingPoints } from '../smcDetectors.js';
import { aggregateToTimeframe } from '../aggregateCandles.js';

export const tjrStrategy = {
  id: 'tjr',
  name: 'TJR Multi-TF',
  description:
    'Tyler Riches style: HTF key levels + LTF BOS/CHOCH + FVG confirmation for precision entries.',
  category: 'structure',

  params: {
    htfMinutes: { label: 'HTF Timeframe (min)', type: 'number', default: 60, min: 15, max: 240, step: 15 },
    htfSwingLookback: { label: 'HTF Swing Lookback', type: 'number', default: 5, min: 3, max: 10 },
    keyLevelProximity: { label: 'Key Level Proximity (pts)', type: 'number', default: 3, min: 1, max: 10, step: 0.5 },
    ltfSwingWindow: { label: 'LTF Swing Window', type: 'number', default: 3, min: 2, max: 8 },
    minRR: { label: 'Min R:R', type: 'number', default: 2, min: 1, max: 5, step: 0.5 },
    maxTradesPerDay: { label: 'Max Trades/Day', type: 'number', default: 1, min: 1, max: 3 },
    sessionStartHour: { label: 'Session Start (ET)', type: 'number', default: 9, min: 0, max: 23 },
    sessionStartMin: { label: 'Session Start Min', type: 'number', default: 30, min: 0, max: 59 },
    sessionEndHour: { label: 'Session End (ET)', type: 'number', default: 15, min: 0, max: 23 },
    sessionEndMin: { label: 'Session End Min', type: 'number', default: 30, min: 0, max: 59 },
  },

  initialize(candles, params) {
    const htfMinutes = params.htfMinutes ?? 60;
    const htfSwingLookback = params.htfSwingLookback ?? 5;

    // Aggregate LTF candles into HTF bars
    const { htfCandles, ltfToHtf } = aggregateToTimeframe(candles, htfMinutes);

    // Detect key levels on HTF
    const htfSwings = detectSwingPoints(htfCandles, htfSwingLookback);

    // Build sorted key levels array (all unique prices)
    const keyLevelsSet = new Set();
    for (const s of htfSwings.highs) keyLevelsSet.add(s.price);
    for (const s of htfSwings.lows) keyLevelsSet.add(s.price);
    const keyLevels = [...keyLevelsSet].sort((a, b) => a - b);

    return {
      htfCandles,
      ltfToHtf,
      keyLevels,
      tradesToday: new Map(),
      pendingSetup: null, // { side, keyLevel, bosBar }
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      keyLevelProximity = 3,
      ltfSwingWindow = 3,
      minRR = 2,
      maxTradesPerDay = 1,
      sessionStartHour = 9,
      sessionStartMin = 30,
      sessionEndHour = 15,
      sessionEndMin = 30,
    } = params;

    const et = toET(bar.time);
    const barMinutes = et.hours * 60 + et.minutes;
    const sessionStart = sessionStartHour * 60 + sessionStartMin;
    const sessionEnd = sessionEndHour * 60 + sessionEndMin;
    const dateStr = et.dateStr;

    if (barMinutes < sessionStart || barMinutes >= sessionEnd) return null;

    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) return null;

    if (index < ltfSwingWindow * 2 + 5) return null;

    const { keyLevels } = context;

    // Step 1: Check if price is near a HTF key level
    const nearLevel = findNearestLevel(keyLevels, bar.close, keyLevelProximity);
    if (!nearLevel && !context.pendingSetup) return null;

    // Step 2: Look for BOS on LTF when near a key level
    if (nearLevel && !context.pendingSetup) {
      const bos = detectRecentBOS(candles, index, ltfSwingWindow);
      if (bos) {
        context.pendingSetup = {
          side: bos.side,
          keyLevel: nearLevel,
          bosBar: index,
          invalidation: bos.invalidation,
        };
      }
      return null;
    }

    // Step 3: After BOS, look for FVG + entry
    if (context.pendingSetup) {
      const setup = context.pendingSetup;

      // Expire stale setups
      if (index - setup.bosBar > 20) {
        context.pendingSetup = null;
        return null;
      }

      // Check for FVG in setup direction
      if (index >= 2) {
        const prev2 = candles[index - 2];
        const curr = bar;

        if (setup.side === 'LONG' && prev2.high < curr.low) {
          // Bullish FVG found — enter at FVG zone
          const entry = curr.low;
          const sl = setup.invalidation - 0.5;
          const risk = entry - sl;

          // TP: next key level above entry
          const tp = findNextKeyLevel(keyLevels, entry, 'above');
          if (!tp || risk <= 0) {
            context.pendingSetup = null;
            return null;
          }

          const reward = tp - entry;
          if (reward / risk < minRR) return null;

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingSetup = null;

          return {
            side: 'LONG',
            entry,
            sl,
            tp,
            reason: `TJR Long: key ${setup.keyLevel.toFixed(0)} + BOS + FVG`,
          };
        }

        if (setup.side === 'SHORT' && prev2.low > curr.high) {
          // Bearish FVG found — enter at FVG zone
          const entry = curr.high;
          const sl = setup.invalidation + 0.5;
          const risk = sl - entry;

          // TP: next key level below entry
          const tp = findNextKeyLevel(keyLevels, entry, 'below');
          if (!tp || risk <= 0) {
            context.pendingSetup = null;
            return null;
          }

          const reward = entry - tp;
          if (reward / risk < minRR) return null;

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingSetup = null;

          return {
            side: 'SHORT',
            entry,
            sl,
            tp,
            reason: `TJR Short: key ${setup.keyLevel.toFixed(0)} + BOS + FVG`,
          };
        }
      }
    }

    return null;
  },
};

/**
 * Find the nearest key level within proximity of the given price.
 */
function findNearestLevel(keyLevels, price, proximity) {
  for (const level of keyLevels) {
    if (Math.abs(level - price) <= proximity) return level;
  }
  return null;
}

/**
 * Find the next key level above or below a given price.
 */
function findNextKeyLevel(keyLevels, price, direction) {
  if (direction === 'above') {
    return keyLevels.find((l) => l > price + 1) ?? null;
  }
  for (let i = keyLevels.length - 1; i >= 0; i--) {
    if (keyLevels[i] < price - 1) return keyLevels[i];
  }
  return null;
}

/**
 * Detect a recent Break of Structure on LTF candles.
 * Returns { side: 'LONG'|'SHORT', invalidation: number } or null.
 */
function detectRecentBOS(candles, currentIndex, swingWindow) {
  if (currentIndex < swingWindow * 2 + 2) return null;

  // Look at last few bars for a fresh BOS
  const lookback = 5;
  const startIdx = Math.max(swingWindow, currentIndex - lookback);

  // Find recent swing points in a local window
  const localStart = Math.max(0, currentIndex - 30);
  const localCandles = candles.slice(localStart, currentIndex + 1);

  const swings = detectSwingPoints(localCandles, swingWindow);

  // Check if current bar breaks a recent swing
  const bar = candles[currentIndex];

  // Bullish BOS: close above a recent swing high
  for (const sh of swings.highs) {
    const globalIdx = localStart + sh.index;
    if (globalIdx >= currentIndex) continue;
    if (currentIndex - globalIdx > 15) continue;

    if (bar.close > sh.price) {
      // Find the most recent swing low for invalidation
      const recentLow = swings.lows
        .filter((sl) => localStart + sl.index < currentIndex)
        .sort((a, b) => b.index - a.index)[0];

      return {
        side: 'LONG',
        invalidation: recentLow ? recentLow.price : bar.low,
      };
    }
  }

  // Bearish BOS: close below a recent swing low
  for (const sl of swings.lows) {
    const globalIdx = localStart + sl.index;
    if (globalIdx >= currentIndex) continue;
    if (currentIndex - globalIdx > 15) continue;

    if (bar.close < sl.price) {
      const recentHigh = swings.highs
        .filter((sh) => localStart + sh.index < currentIndex)
        .sort((a, b) => b.index - a.index)[0];

      return {
        side: 'SHORT',
        invalidation: recentHigh ? recentHigh.price : bar.high,
      };
    }
  }

  return null;
}
