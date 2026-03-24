import { toET, computeVWAP, computeEMA } from './strategyInterface.js';
import { detectSwingPoints, detectFVGs, detectOBs, detectBOS } from '../smcDetectors.js';

/**
 * Condition types available in the Custom Strategy Builder.
 */
export const CONDITION_TYPES = [
  { id: 'price_above_vwap', label: 'Price Above VWAP', category: 'price' },
  { id: 'price_below_vwap', label: 'Price Below VWAP', category: 'price' },
  { id: 'price_above_ema', label: 'Price Above EMA', category: 'price', hasParam: 'emaPeriod' },
  { id: 'price_below_ema', label: 'Price Below EMA', category: 'price', hasParam: 'emaPeriod' },
  { id: 'price_crosses_above_vwap', label: 'Price Crosses Above VWAP', category: 'price' },
  { id: 'price_crosses_below_vwap', label: 'Price Crosses Below VWAP', category: 'price' },
  { id: 'bullish_fvg', label: 'Bullish FVG Detected', category: 'smc' },
  { id: 'bearish_fvg', label: 'Bearish FVG Detected', category: 'smc' },
  { id: 'bullish_ob', label: 'Bullish OB Detected', category: 'smc' },
  { id: 'bearish_ob', label: 'Bearish OB Detected', category: 'smc' },
  { id: 'bullish_bos', label: 'Bullish BOS', category: 'smc' },
  { id: 'bearish_bos', label: 'Bearish BOS', category: 'smc' },
  { id: 'time_between', label: 'Time Window (ET)', category: 'time', hasParam: 'timeWindow' },
  { id: 'bullish_candle', label: 'Current Bar Bullish', category: 'candle' },
  { id: 'bearish_candle', label: 'Current Bar Bearish', category: 'candle' },
];

export const SL_METHODS = [
  { id: 'fixed_points', label: 'Fixed Points' },
  { id: 'below_signal_candle', label: 'Below/Above Signal Candle' },
  { id: 'swing_point', label: 'Recent Swing Point' },
];

export const TP_METHODS = [
  { id: 'rr_multiple', label: 'R:R Multiple' },
  { id: 'fixed_points', label: 'Fixed Points' },
];

/**
 * Build a strategy object from the custom builder config.
 * Returns a strategy conforming to the standard { id, name, initialize, onBar } contract.
 */
export function buildCustomStrategy(config) {
  const {
    conditions = [],
    direction = 'LONG',
    slMethod = 'fixed_points',
    slValue = 5,
    tpMethod = 'rr_multiple',
    tpValue = 2,
    maxTradesPerDay = 2,
  } = config;

  return {
    id: 'custom',
    defaultTimeframe: '5m',
    name: 'Custom Strategy',
    description: 'User-defined custom strategy',
    category: 'custom',
    params: {},

    initialize(candles, _params) {
      const ctx = {
        tradesToday: new Map(),
      };

      // Pre-compute indicators based on which conditions are used
      const needsVWAP = conditions.some((c) =>
        ['price_above_vwap', 'price_below_vwap', 'price_crosses_above_vwap', 'price_crosses_below_vwap'].includes(c.type)
      );
      const emaPeriods = conditions
        .filter((c) => ['price_above_ema', 'price_below_ema'].includes(c.type))
        .map((c) => c.emaPeriod || 21);
      const needsSMC = conditions.some((c) =>
        ['bullish_fvg', 'bearish_fvg', 'bullish_ob', 'bearish_ob', 'bullish_bos', 'bearish_bos'].includes(c.type)
      );

      // VWAP per bar
      if (needsVWAP) {
        ctx.vwapByIndex = new Array(candles.length).fill(null);
        const dayIndices = new Map();
        for (let i = 0; i < candles.length; i++) {
          const dateStr = toET(candles[i].time).dateStr;
          if (!dayIndices.has(dateStr)) dayIndices.set(dateStr, []);
          dayIndices.get(dateStr).push(i);
        }
        for (const [, indices] of dayIndices) {
          const dayStart = indices[0];
          for (const idx of indices) {
            ctx.vwapByIndex[idx] = computeVWAP(candles, dayStart, idx);
          }
        }
      }

      // EMAs
      if (emaPeriods.length > 0) {
        ctx.emas = {};
        const closes = candles.map((c) => c.close);
        for (const period of new Set(emaPeriods)) {
          ctx.emas[period] = computeEMA(closes, period);
        }
      }

      // SMC detections
      if (needsSMC) {
        ctx.swings = detectSwingPoints(candles, 5);
      }

      return ctx;
    },

    onBar(bar, index, candles, context, _params) {
      const et = toET(bar.time);
      const dateStr = et.dateStr;

      // Max trades check
      const tradesUsed = context.tradesToday.get(dateStr) || 0;
      if (tradesUsed >= maxTradesPerDay) return null;

      if (index < 3) return null;

      // Evaluate all conditions (AND logic)
      const allPass = conditions.every((cond) => {
        switch (cond.type) {
          case 'price_above_vwap':
            return context.vwapByIndex?.[index] != null && bar.close > context.vwapByIndex[index];
          case 'price_below_vwap':
            return context.vwapByIndex?.[index] != null && bar.close < context.vwapByIndex[index];
          case 'price_crosses_above_vwap': {
            if (!context.vwapByIndex || index < 1) return false;
            const prevVwap = context.vwapByIndex[index - 1];
            const currVwap = context.vwapByIndex[index];
            if (prevVwap == null || currVwap == null) return false;
            return candles[index - 1].close <= prevVwap && bar.close > currVwap;
          }
          case 'price_crosses_below_vwap': {
            if (!context.vwapByIndex || index < 1) return false;
            const prevVwap2 = context.vwapByIndex[index - 1];
            const currVwap2 = context.vwapByIndex[index];
            if (prevVwap2 == null || currVwap2 == null) return false;
            return candles[index - 1].close >= prevVwap2 && bar.close < currVwap2;
          }
          case 'price_above_ema': {
            const period = cond.emaPeriod || 21;
            return context.emas?.[period]?.[index] != null && bar.close > context.emas[period][index];
          }
          case 'price_below_ema': {
            const period2 = cond.emaPeriod || 21;
            return context.emas?.[period2]?.[index] != null && bar.close < context.emas[period2][index];
          }
          case 'bullish_fvg':
            if (index < 2) return false;
            return candles[index - 2].high < bar.low; // 3-bar bullish gap
          case 'bearish_fvg':
            if (index < 2) return false;
            return candles[index - 2].low > bar.high; // 3-bar bearish gap
          case 'bullish_ob': {
            if (index < 1) return false;
            const prev = candles[index - 1];
            return prev.close < prev.open && bar.close > bar.open && (bar.close - bar.open) > (bar.high - bar.low) * 0.45;
          }
          case 'bearish_ob': {
            if (index < 1) return false;
            const prev3 = candles[index - 1];
            return prev3.close > prev3.open && bar.close < bar.open && (bar.open - bar.close) > (bar.high - bar.low) * 0.45;
          }
          case 'bullish_bos': {
            if (!context.swings) return false;
            return context.swings.highs.some(
              (sh) => sh.index < index && index - sh.index <= 20 && bar.close > sh.price
            );
          }
          case 'bearish_bos': {
            if (!context.swings) return false;
            return context.swings.lows.some(
              (sl) => sl.index < index && index - sl.index <= 20 && bar.close < sl.price
            );
          }
          case 'time_between': {
            const startMin = (cond.startHour ?? 9) * 60 + (cond.startMin ?? 30);
            const endMin = (cond.endHour ?? 15) * 60 + (cond.endMin ?? 0);
            const barMin = et.hours * 60 + et.minutes;
            return barMin >= startMin && barMin < endMin;
          }
          case 'bullish_candle':
            return bar.close > bar.open;
          case 'bearish_candle':
            return bar.close < bar.open;
          default:
            return true;
        }
      });

      if (!allPass || conditions.length === 0) return null;

      // Build signal
      const side = direction === 'AUTO'
        ? (bar.close > bar.open ? 'LONG' : 'SHORT')
        : direction;

      const entry = bar.close;
      let sl, tp;

      // SL calculation
      if (slMethod === 'fixed_points') {
        sl = side === 'LONG' ? entry - slValue : entry + slValue;
      } else if (slMethod === 'below_signal_candle') {
        sl = side === 'LONG' ? bar.low - 0.5 : bar.high + 0.5;
      } else if (slMethod === 'swing_point') {
        if (context.swings) {
          if (side === 'LONG') {
            const recentLow = context.swings.lows
              .filter((s) => s.index < index && index - s.index <= 30)
              .sort((a, b) => b.index - a.index)[0];
            sl = recentLow ? recentLow.price - 0.5 : entry - slValue;
          } else {
            const recentHigh = context.swings.highs
              .filter((s) => s.index < index && index - s.index <= 30)
              .sort((a, b) => b.index - a.index)[0];
            sl = recentHigh ? recentHigh.price + 0.5 : entry + slValue;
          }
        } else {
          sl = side === 'LONG' ? entry - slValue : entry + slValue;
        }
      }

      const risk = Math.abs(entry - sl);
      if (risk <= 0) return null;

      // TP calculation
      if (tpMethod === 'rr_multiple') {
        tp = side === 'LONG' ? entry + risk * tpValue : entry - risk * tpValue;
      } else if (tpMethod === 'fixed_points') {
        tp = side === 'LONG' ? entry + tpValue : entry - tpValue;
      }

      context.tradesToday.set(dateStr, tradesUsed + 1);

      return {
        side,
        entry,
        sl,
        tp,
        reason: `Custom: ${conditions.map((c) => c.type).join(' + ')}`,
      };
    },
  };
}
