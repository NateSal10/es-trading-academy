import { toET } from './strategyInterface.js';
import { detectSwingPoints } from '../smcDetectors.js';

/**
 * Break & Retest Strategy
 *
 * Rules:
 * 1. Identify key swing high/low levels
 * 2. Wait for a clear candle CLOSE beyond the level (break confirmation)
 * 3. Wait for price to pull back and touch the broken level (retest)
 * 4. Enter on a confirmation candle that closes back in breakout direction
 * 5. SL: below/above the retested level + buffer
 * 6. TP: next swing target; fallback to R:R multiple
 */
export const breakAndRetest = {
  id: 'break_retest',
  name: 'Break & Retest',
  description:
    'Break of key swing S/R + retest with confirmation candle. Classic structural entry with R:R filtered exits.',
  category: 'structure',

  params: {
    lookback:         { label: 'Swing Lookback (bars)', type: 'number', default: 8,   min: 3,   max: 20 },
    retestTolerance:  { label: 'Retest Zone (pts)',     type: 'number', default: 4,   min: 0.5, max: 20, step: 0.5 },
    slBuffer:         { label: 'SL Buffer (pts)',        type: 'number', default: 2,   min: 0.25, max: 10, step: 0.25 },
    minRR:            { label: 'Min R:R',               type: 'number', default: 1.5, min: 1,   max: 5,  step: 0.5 },
    rrTarget:         { label: 'R:R Target (TP)',        type: 'number', default: 2,   min: 1,   max: 10, step: 0.5 },
    maxTradesPerDay:  { label: 'Max Trades/Day',         type: 'number', default: 2,   min: 1,   max: 5 },
    levelMaxAge:      { label: 'Max Level Age (bars)',   type: 'number', default: 60,  min: 10,  max: 200 },
    sessionStartHour: { label: 'Session Start (ET)',     type: 'number', default: 9,   min: 0,   max: 23 },
    sessionStartMin:  { label: 'Session Start Min',      type: 'number', default: 30,  min: 0,   max: 59 },
    sessionEndHour:   { label: 'Session End (ET)',        type: 'number', default: 15,  min: 0,   max: 23 },
  },

  initialize(candles, params) {
    const lookback = params.lookback ?? 8;
    const { highs, lows } = detectSwingPoints(candles, lookback);
    return {
      swingHighs: highs,
      swingLows: lows,
      tradesToday: new Map(),
      pendingBreaks: [], // { level, side, breakBar }
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      retestTolerance  = 4,
      slBuffer         = 2,
      minRR            = 1.5,
      rrTarget         = 2,
      maxTradesPerDay  = 2,
      levelMaxAge      = 60,
      sessionStartHour = 9,
      sessionStartMin  = 30,
      sessionEndHour   = 15,
    } = params;

    const et = toET(bar.time);
    const barMin = et.hours * 60 + et.minutes;
    const sessionStart = sessionStartHour * 60 + sessionStartMin;
    const sessionEnd   = sessionEndHour * 60;
    const dateStr = et.dateStr;

    if (barMin < sessionStart || barMin >= sessionEnd) return null;

    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) return null;
    if (index < 3) return null;

    const prev = candles[index - 1];
    const { swingHighs, swingLows } = context;

    // ── Detect fresh breaks ──────────────────────────────────────────────────

    // Bullish break: current bar closes above a swing high for the first time
    for (const sh of swingHighs) {
      if (sh.index >= index || index - sh.index > levelMaxAge) continue;
      const alreadyBroken = context.pendingBreaks.some(
        pb => Math.abs(pb.level - sh.price) < 1 && pb.side === 'LONG'
      );
      if (!alreadyBroken && bar.close > sh.price && prev.close <= sh.price) {
        context.pendingBreaks.push({ level: sh.price, side: 'LONG', breakBar: index });
      }
    }

    // Bearish break: current bar closes below a swing low for the first time
    for (const sl of swingLows) {
      if (sl.index >= index || index - sl.index > levelMaxAge) continue;
      const alreadyBroken = context.pendingBreaks.some(
        pb => Math.abs(pb.level - sl.price) < 1 && pb.side === 'SHORT'
      );
      if (!alreadyBroken && bar.close < sl.price && prev.close >= sl.price) {
        context.pendingBreaks.push({ level: sl.price, side: 'SHORT', breakBar: index });
      }
    }

    // Expire stale pending breaks
    context.pendingBreaks = context.pendingBreaks.filter(
      pb => index - pb.breakBar <= levelMaxAge
    );

    // ── Check pending breaks for retest + confirmation ───────────────────────
    for (let i = 0; i < context.pendingBreaks.length; i++) {
      const pb = context.pendingBreaks[i];

      // Must wait at least 2 bars after break before retest
      if (index <= pb.breakBar + 1) continue;

      if (pb.side === 'LONG') {
        // Retest: bar touches back within tolerance of broken level
        const nearLevel = bar.low <= pb.level + retestTolerance && bar.low >= pb.level - retestTolerance;
        // Confirmation: close above the level (level held as support)
        const confirmed = nearLevel && bar.close > pb.level;

        if (confirmed) {
          const entry = bar.close;
          const sl    = pb.level - slBuffer;
          const risk  = entry - sl;
          if (risk <= 0) continue;

          // TP: nearest swing high above entry, or fallback to R:R
          const swingTp = findNearestAbove(swingHighs, entry + risk * 0.5);
          const tp = (swingTp && (swingTp - entry) / risk >= minRR)
            ? swingTp
            : entry + risk * rrTarget;

          if ((tp - entry) / risk < minRR) continue;

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingBreaks.splice(i, 1);
          return {
            side: 'LONG', entry, sl, tp,
            reason: `B&R Long: retest of ${pb.level.toFixed(2)}`,
          };
        }
      } else {
        // SHORT: retest bar touches back near the broken support
        const nearLevel = bar.high >= pb.level - retestTolerance && bar.high <= pb.level + retestTolerance;
        const confirmed = nearLevel && bar.close < pb.level;

        if (confirmed) {
          const entry = bar.close;
          const sl    = pb.level + slBuffer;
          const risk  = sl - entry;
          if (risk <= 0) continue;

          const swingTp = findNearestBelow(swingLows, entry - risk * 0.5);
          const tp = (swingTp && (entry - swingTp) / risk >= minRR)
            ? swingTp
            : entry - risk * rrTarget;

          if ((entry - tp) / risk < minRR) continue;

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.pendingBreaks.splice(i, 1);
          return {
            side: 'SHORT', entry, sl, tp,
            reason: `B&R Short: retest of ${pb.level.toFixed(2)}`,
          };
        }
      }
    }

    return null;
  },
};

function findNearestAbove(swingHighs, minPrice) {
  let best = null;
  for (const sh of swingHighs) {
    if (sh.price > minPrice) {
      if (best === null || sh.price < best) best = sh.price;
    }
  }
  return best;
}

function findNearestBelow(swingLows, maxPrice) {
  let best = null;
  for (const sl of swingLows) {
    if (sl.price < maxPrice) {
      if (best === null || sl.price > best) best = sl.price;
    }
  }
  return best;
}
