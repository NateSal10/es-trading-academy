import { toET } from './strategyInterface.js';
import { detectSwingPoints } from '../smcDetectors.js';

export const breakAndRetest = {
  id: 'break_retest',
  name: 'Break & Retest',
  description:
    'Trades breakouts of key S/R levels with rejection wick confirmation on the retest.',
  category: 'structure',

  params: {
    lookback: { label: 'Swing Lookback', type: 'number', default: 10, min: 3, max: 20 },
    retestTolerance: { label: 'Retest Tolerance (pts)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    slBuffer: { label: 'SL Buffer (pts)', type: 'number', default: 1, min: 0.25, max: 5, step: 0.25 },
    minRR: { label: 'Min R:R', type: 'number', default: 1.5, min: 1, max: 5, step: 0.5 },
    maxTradesPerDay: { label: 'Max Trades/Day', type: 'number', default: 2, min: 1, max: 5 },
    sessionStartHour: { label: 'Session Start (ET)', type: 'number', default: 9, min: 0, max: 23 },
    sessionStartMin: { label: 'Session Start Min', type: 'number', default: 30, min: 0, max: 59 },
    sessionEndHour: { label: 'Session End (ET)', type: 'number', default: 15, min: 0, max: 23 },
  },

  initialize(candles, params) {
    const lookback = params.lookback ?? 10;
    const swings = detectSwingPoints(candles, lookback);

    return {
      swings,
      tradesToday: new Map(),
      pendingBreaks: [], // { level, side, breakBar }
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      retestTolerance = 2,
      slBuffer = 1,
      minRR = 1.5,
      maxTradesPerDay = 2,
      sessionStartHour = 9,
      sessionStartMin = 30,
      sessionEndHour = 15,
    } = params;

    const et = toET(bar.time);
    const barMinutes = et.hours * 60 + et.minutes;
    const sessionStart = sessionStartHour * 60 + sessionStartMin;
    const sessionEnd = sessionEndHour * 60;
    const dateStr = et.dateStr;

    if (barMinutes < sessionStart || barMinutes >= sessionEnd) return null;

    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) return null;

    if (index < 3) return null;

    const { swings } = context;

    // Step 1: Check for new breaks of swing levels
    // Bullish break: close above a swing high
    for (const sh of swings.highs) {
      if (sh.index >= index) continue;
      if (index - sh.index > 100) continue; // Too old

      if (bar.close > sh.price && candles[index - 1].close <= sh.price) {
        // Fresh break on this bar
        const alreadyTracked = context.pendingBreaks.some(
          (pb) => Math.abs(pb.level - sh.price) < 0.5
        );
        if (!alreadyTracked) {
          context.pendingBreaks.push({
            level: sh.price,
            side: 'LONG',
            breakBar: index,
          });
        }
      }
    }

    // Bearish break: close below a swing low
    for (const sl of swings.lows) {
      if (sl.index >= index) continue;
      if (index - sl.index > 100) continue;

      if (bar.close < sl.price && candles[index - 1].close >= sl.price) {
        const alreadyTracked = context.pendingBreaks.some(
          (pb) => Math.abs(pb.level - sl.price) < 0.5
        );
        if (!alreadyTracked) {
          context.pendingBreaks.push({
            level: sl.price,
            side: 'SHORT',
            breakBar: index,
          });
        }
      }
    }

    // Step 2: Check pending breaks for retest + rejection wick
    // Expire stale breaks (> 50 bars old)
    context.pendingBreaks = context.pendingBreaks.filter(
      (pb) => index - pb.breakBar <= 50
    );

    for (let i = 0; i < context.pendingBreaks.length; i++) {
      const pb = context.pendingBreaks[i];

      // Don't check the break bar itself for retest
      if (index <= pb.breakBar + 1) continue;

      if (pb.side === 'LONG') {
        // Bullish retest: price pulls back to the broken level
        // Bar low should be near the level, bar closes above it
        const distToLevel = Math.abs(bar.low - pb.level);
        if (distToLevel <= retestTolerance && bar.close > pb.level) {
          // Rejection wick: lower wick >= 50% of bar range
          const barRange = bar.high - bar.low;
          const lowerWick = Math.min(bar.open, bar.close) - bar.low;
          if (barRange > 0 && lowerWick / barRange >= 0.4) {
            const entry = bar.close;
            const stopLoss = pb.level - slBuffer;
            const risk = entry - stopLoss;

            // TP: next swing high above entry
            const tp = findTarget(swings.highs, entry, 'above');
            if (!tp || risk <= 0) continue;

            const reward = tp - entry;
            if (reward / risk < minRR) continue;

            context.tradesToday.set(dateStr, tradesUsed + 1);
            context.pendingBreaks.splice(i, 1);

            return {
              side: 'LONG',
              entry,
              sl: stopLoss,
              tp,
              reason: `B&R Long: retest of ${pb.level.toFixed(2)}`,
            };
          }
        }
      } else {
        // Bearish retest: price pulls back up to the broken level
        const distToLevel = Math.abs(bar.high - pb.level);
        if (distToLevel <= retestTolerance && bar.close < pb.level) {
          // Rejection wick: upper wick >= 50% of bar range
          const barRange = bar.high - bar.low;
          const upperWick = bar.high - Math.max(bar.open, bar.close);
          if (barRange > 0 && upperWick / barRange >= 0.4) {
            const entry = bar.close;
            const stopLoss = pb.level + slBuffer;
            const risk = stopLoss - entry;

            // TP: next swing low below entry
            const tp = findTarget(swings.lows, entry, 'below');
            if (!tp || risk <= 0) continue;

            const reward = entry - tp;
            if (reward / risk < minRR) continue;

            context.tradesToday.set(dateStr, tradesUsed + 1);
            context.pendingBreaks.splice(i, 1);

            return {
              side: 'SHORT',
              entry,
              sl: stopLoss,
              tp,
              reason: `B&R Short: retest of ${pb.level.toFixed(2)}`,
            };
          }
        }
      }
    }

    return null;
  },
};

/**
 * Find the nearest swing target above or below entry price.
 */
function findTarget(swingPoints, price, direction) {
  if (direction === 'above') {
    let best = null;
    for (const sp of swingPoints) {
      if (sp.price > price + 1) {
        if (!best || sp.price < best) best = sp.price;
      }
    }
    return best;
  }
  // below
  let best = null;
  for (const sp of swingPoints) {
    if (sp.price < price - 1) {
      if (!best || sp.price > best) best = sp.price;
    }
  }
  return best;
}
