import { toET } from './strategyInterface.js';

export const openingRangeBreakout = {
  id: 'orb_8am',
  defaultTimeframe: '1m',
  name: '8AM Opening Range Breakout',
  description:
    'Trades breakouts of the 8:00-8:15 AM ET opening range with measured move targets. Inspired by RP Profits.',
  category: 'breakout',

  params: {
    rangeStartHour: { label: 'Range Start Hour (ET)', type: 'number', default: 8, min: 0, max: 23 },
    rangeStartMin: { label: 'Range Start Min', type: 'number', default: 0, min: 0, max: 59 },
    rangeEndHour: { label: 'Range End Hour (ET)', type: 'number', default: 8, min: 0, max: 23 },
    rangeEndMin: { label: 'Range End Min', type: 'number', default: 15, min: 0, max: 59 },
    rrTarget: { label: 'R:R Target', type: 'number', default: 2, min: 1, max: 5, step: 0.5 },
    maxTradesPerDay: { label: 'Max Trades/Day', type: 'number', default: 1, min: 1, max: 5 },
    sessionEndHour: { label: 'Session End Hour (ET)', type: 'number', default: 16, min: 0, max: 23 },
  },

  initialize(candles, params) {
    const {
      rangeStartHour = 8,
      rangeStartMin = 0,
      rangeEndHour = 8,
      rangeEndMin = 15,
    } = params;

    const rangeStartMinutes = rangeStartHour * 60 + rangeStartMin;
    const rangeEndMinutes = rangeEndHour * 60 + rangeEndMin;

    const dailyRanges = new Map();
    const dayCandles = new Map();

    // Group candles by ET trading day
    for (const candle of candles) {
      const dateStr = toET(candle.time).dateStr;
      if (!dayCandles.has(dateStr)) {
        dayCandles.set(dateStr, []);
      }
      dayCandles.get(dateStr).push(candle);
    }

    // For each day, compute the opening range
    for (const [dateStr, bars] of dayCandles) {
      let high = -Infinity;
      let low = Infinity;
      let foundRange = false;

      for (const bar of bars) {
        const et = toET(bar.time);
        const barMinutes = et.hours * 60 + et.minutes;

        if (barMinutes >= rangeStartMinutes && barMinutes < rangeEndMinutes) {
          high = Math.max(high, bar.high);
          low = Math.min(low, bar.low);
          foundRange = true;
        }
      }

      if (foundRange && high > low) {
        dailyRanges.set(dateStr, {
          high,
          low,
          rangeWidth: high - low,
        });
      }
    }

    return {
      dailyRanges,
      tradesToday: new Map(),
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      rangeEndHour = 8,
      rangeEndMin = 15,
      sessionEndHour = 16,
      rrTarget = 2,
      maxTradesPerDay = 1,
    } = params;

    const et = toET(bar.time);
    const barMinutes = et.hours * 60 + et.minutes;
    const rangeEndMinutes = rangeEndHour * 60 + rangeEndMin;
    const sessionEndMinutes = sessionEndHour * 60;

    // Still within the range window — no signal yet
    if (barMinutes < rangeEndMinutes) {
      return null;
    }

    // Past session end
    if (barMinutes >= sessionEndMinutes) {
      return null;
    }

    const dateStr = toET(bar.time).dateStr;
    const range = context.dailyRanges.get(dateStr);

    if (!range) {
      return null;
    }

    const { high, low, rangeWidth } = range;

    // Check max trades per day
    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) {
      return null;
    }

    // Bullish breakout
    if (bar.close > high) {
      context.tradesToday.set(dateStr, tradesUsed + 1);

      const entry = high;
      const sl = low;
      const tp = entry + rangeWidth * rrTarget;

      return {
        side: 'LONG',
        entry,
        sl,
        tp,
        reason: `ORB Long: break of ${high.toFixed(2)} range`,
      };
    }

    // Bearish breakout
    if (bar.close < low) {
      context.tradesToday.set(dateStr, tradesUsed + 1);

      const entry = low;
      const sl = high;
      const tp = entry - rangeWidth * rrTarget;

      return {
        side: 'SHORT',
        entry,
        sl,
        tp,
        reason: `ORB Short: break of ${low.toFixed(2)} range`,
      };
    }

    return null;
  },
};
