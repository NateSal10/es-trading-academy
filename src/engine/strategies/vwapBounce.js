import { toET, computeVWAP } from './strategyInterface.js';

export const vwapBounce = {
  id: 'vwap_bounce',
  name: 'VWAP Bounce',
  description: 'Mean reversion strategy that trades bounces off VWAP with confirmation candle.',
  category: 'mean_reversion',

  params: {
    bounceThresholdPts: {
      label: 'Bounce Threshold (pts)',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
    rrTarget: { label: 'R:R Target', type: 'number', default: 2, min: 1, max: 5, step: 0.5 },
    slMultiplier: {
      label: 'SL Multiplier (of bounce range)',
      type: 'number',
      default: 1.5,
      min: 1,
      max: 3,
      step: 0.25,
    },
    sessionStartHour: { label: 'Session Start (ET)', type: 'number', default: 9, min: 0, max: 23 },
    sessionStartMin: { label: 'Session Start Min', type: 'number', default: 30, min: 0, max: 59 },
    sessionEndHour: { label: 'Session End (ET)', type: 'number', default: 15, min: 0, max: 23 },
  },

  initialize(candles, params) {
    const vwapByIndex = new Array(candles.length).fill(null);

    // Group candle indices by ET trading day
    const dayIndices = new Map();

    for (let i = 0; i < candles.length; i++) {
      const dateStr = toET(candles[i].time).dateStr;
      if (!dayIndices.has(dateStr)) {
        dayIndices.set(dateStr, []);
      }
      dayIndices.get(dateStr).push(i);
    }

    // For each day, compute cumulative VWAP bar by bar
    for (const [, indices] of dayIndices) {
      const dayStart = indices[0];

      for (const idx of indices) {
        vwapByIndex[idx] = computeVWAP(candles, dayStart, idx);
      }
    }

    return { vwapByIndex };
  },

  onBar(bar, index, candles, context, params) {
    const {
      bounceThresholdPts = 2,
      rrTarget = 2,
      slMultiplier = 1.5,
      sessionStartHour = 9,
      sessionStartMin = 30,
      sessionEndHour = 15,
    } = params;

    const vwap = context.vwapByIndex[index];
    if (vwap == null) {
      return null;
    }

    // Check session hours
    const et = toET(bar.time);
    const barMinutes = et.hours * 60 + et.minutes;
    const sessionStart = sessionStartHour * 60 + sessionStartMin;
    const sessionEnd = sessionEndHour * 60;

    if (barMinutes < sessionStart || barMinutes >= sessionEnd) {
      return null;
    }

    // Need at least 2 prior bars
    if (index < 2) {
      return null;
    }

    const prev = candles[index - 1];
    const prevVwap = context.vwapByIndex[index - 1];

    if (prevVwap == null) {
      return null;
    }

    // Bullish bounce: prev low near VWAP, prev closed above VWAP, current confirms
    const prevLowToVwap = Math.abs(prev.low - prevVwap);
    if (
      prevLowToVwap <= bounceThresholdPts &&
      prev.close > prevVwap &&
      bar.close > prev.close
    ) {
      const entry = bar.close;
      const bounceRange = bar.close - prev.low;
      const sl = entry - bounceRange * slMultiplier;
      const riskPts = entry - sl;
      const tp = entry + riskPts * rrTarget;

      return {
        side: 'LONG',
        entry,
        sl,
        tp,
        reason: 'VWAP Bounce Long: confirmation above VWAP',
      };
    }

    // Bearish bounce: prev high near VWAP, prev closed below VWAP, current confirms
    const prevHighToVwap = Math.abs(prev.high - prevVwap);
    if (
      prevHighToVwap <= bounceThresholdPts &&
      prev.close < prevVwap &&
      bar.close < prev.close
    ) {
      const entry = bar.close;
      const bounceRange = prev.high - bar.close;
      const sl = entry + bounceRange * slMultiplier;
      const riskPts = sl - entry;
      const tp = entry - riskPts * rrTarget;

      return {
        side: 'SHORT',
        entry,
        sl,
        tp,
        reason: 'VWAP Bounce Short: rejection at VWAP',
      };
    }

    return null;
  },
};
