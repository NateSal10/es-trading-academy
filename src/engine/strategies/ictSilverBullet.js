import { toET } from './strategyInterface.js';
import { detectSwingPoints } from '../smcDetectors.js';

export const ictSilverBullet = {
  id: 'ict_silver_bullet',
  name: 'ICT Silver Bullet',
  description:
    'Trades liquidity sweeps followed by FVG retests during the 10-11 AM and 2-3 PM ET windows.',
  category: 'structure',

  params: {
    minRR: { label: 'Min R:R', type: 'number', default: 1.5, min: 1, max: 5, step: 0.5 },
    maxTradesPerDay: { label: 'Max Trades/Day', type: 'number', default: 1, min: 1, max: 3 },
    swingLookback: { label: 'Swing Lookback', type: 'number', default: 5, min: 3, max: 10 },
    sweepBarsBack: { label: 'Sweep Detection Bars', type: 'number', default: 20, min: 5, max: 50 },
  },

  initialize(candles, params) {
    const swingLookback = params.swingLookback ?? 5;
    const swings = detectSwingPoints(candles, swingLookback);

    // Build sorted liquidity levels for TP targeting
    const allLevels = [
      ...swings.highs.map((s) => ({ price: s.price, type: 'high', index: s.index })),
      ...swings.lows.map((s) => ({ price: s.price, type: 'low', index: s.index })),
    ].sort((a, b) => a.price - b.price);

    return {
      swings,
      allLevels,
      tradesToday: new Map(),
      pendingSweep: null,
      pendingFVG: null,
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      minRR = 1.5,
      maxTradesPerDay = 1,
      sweepBarsBack = 20,
    } = params;

    const et = toET(bar.time);
    const barMinutes = et.hours * 60 + et.minutes;
    const dateStr = et.dateStr;

    // Only trade in Silver Bullet windows: 10:00-11:00 AM or 2:00-3:00 PM ET
    const inWindow =
      (barMinutes >= 600 && barMinutes < 660) ||  // 10:00-11:00
      (barMinutes >= 840 && barMinutes < 900);    // 14:00-15:00

    if (!inWindow) {
      // Reset pending state outside windows
      context.pendingSweep = null;
      context.pendingFVG = null;
      return null;
    }

    // Check max trades per day
    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) return null;

    // Need enough history
    if (index < sweepBarsBack + 3) return null;

    const { swings, allLevels } = context;

    // Step 1: Detect liquidity sweep if we don't have a pending one
    if (!context.pendingSweep) {
      const recentSwingHighs = swings.highs.filter(
        (s) => s.index < index && index - s.index <= sweepBarsBack
      );
      const recentSwingLows = swings.lows.filter(
        (s) => s.index < index && index - s.index <= sweepBarsBack
      );

      // Bearish sweep: price wicked above swing high but closed below it
      for (const sh of recentSwingHighs) {
        if (bar.high > sh.price && bar.close < sh.price) {
          context.pendingSweep = { side: 'SHORT', level: sh.price, bar: index };
          break;
        }
      }

      // Bullish sweep: price wicked below swing low but closed above it
      if (!context.pendingSweep) {
        for (const sl of recentSwingLows) {
          if (bar.low < sl.price && bar.close > sl.price) {
            context.pendingSweep = { side: 'LONG', level: sl.price, bar: index };
            break;
          }
        }
      }

      return null; // Wait for FVG after sweep
    }

    // Step 2: Detect FVG formation after sweep
    if (!context.pendingFVG && index >= 2) {
      const prev2 = candles[index - 2];
      const prev1 = candles[index - 1];
      const curr = bar;

      if (context.pendingSweep.side === 'LONG') {
        // Bullish FVG: gap between prev2.high and curr.low
        if (prev2.high < curr.low) {
          context.pendingFVG = {
            top: curr.low,
            bot: prev2.high,
            midHigh: prev1.high,
            midLow: prev1.low,
            formBar: index,
          };
        }
      } else {
        // Bearish FVG: gap between curr.high and prev2.low
        if (prev2.low > curr.high) {
          context.pendingFVG = {
            top: prev2.low,
            bot: curr.high,
            midHigh: prev1.high,
            midLow: prev1.low,
            formBar: index,
          };
        }
      }

      return null; // Wait for retest
    }

    // Step 3: FVG retest entry
    if (context.pendingSweep && context.pendingFVG) {
      const sweep = context.pendingSweep;
      const fvg = context.pendingFVG;

      // Expire if too many bars have passed since FVG (stale setup)
      if (index - fvg.formBar > 15) {
        context.pendingSweep = null;
        context.pendingFVG = null;
        return null;
      }

      if (sweep.side === 'LONG') {
        // Bullish: price retraces down into FVG zone
        if (bar.low <= fvg.top && bar.close > fvg.bot) {
          const entry = fvg.top; // Enter at top of FVG
          const sl = fvg.midLow - 0.5; // Below FVG candle's low

          // TP: next swing high above entry
          const tpLevel = findNextLevel(allLevels, entry, 'above');
          if (!tpLevel) {
            context.pendingSweep = null;
            context.pendingFVG = null;
            return null;
          }

          const tp = tpLevel.price;
          const risk = entry - sl;
          const reward = tp - entry;

          if (risk <= 0 || reward / risk < minRR) {
            context.pendingSweep = null;
            context.pendingFVG = null;
            return null;
          }

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingSweep = null;
          context.pendingFVG = null;

          return {
            side: 'LONG',
            entry,
            sl,
            tp,
            reason: `SB Long: sweep ${sweep.level.toFixed(2)} → FVG retest`,
          };
        }
      } else {
        // Bearish: price retraces up into FVG zone
        if (bar.high >= fvg.bot && bar.close < fvg.top) {
          const entry = fvg.bot; // Enter at bottom of FVG
          const sl = fvg.midHigh + 0.5; // Above FVG candle's high

          // TP: next swing low below entry
          const tpLevel = findNextLevel(allLevels, entry, 'below');
          if (!tpLevel) {
            context.pendingSweep = null;
            context.pendingFVG = null;
            return null;
          }

          const tp = tpLevel.price;
          const risk = sl - entry;
          const reward = entry - tp;

          if (risk <= 0 || reward / risk < minRR) {
            context.pendingSweep = null;
            context.pendingFVG = null;
            return null;
          }

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingSweep = null;
          context.pendingFVG = null;

          return {
            side: 'SHORT',
            entry,
            sl,
            tp,
            reason: `SB Short: sweep ${sweep.level.toFixed(2)} → FVG retest`,
          };
        }
      }
    }

    return null;
  },
};

/**
 * Find the next liquidity level above or below a given price.
 */
function findNextLevel(levels, price, direction) {
  if (direction === 'above') {
    return levels.find((l) => l.price > price + 1);
  }
  // below — search from highest to lowest
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i].price < price - 1) return levels[i];
  }
  return null;
}
