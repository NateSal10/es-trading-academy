import { toET } from './strategyInterface.js';
import { detectSwingPoints } from '../smcDetectors.js';

/**
 * ICT Silver Bullet Strategy
 *
 * Rules (per ICT methodology):
 * 1. Trade only during 10:00-11:00 AM or 2:00-3:00 PM ET windows
 * 2. Wait for a liquidity sweep: price wicks through a recent swing H/L and reverses
 * 3. After the sweep, look for a displacement move (strong impulse candle) = MSS
 * 4. Identify the FVG created by that impulse
 * 5. Enter when price retraces into the FVG
 * 6. SL: below/above the swept level; TP: next opposing liquidity pool or R:R multiple
 */
export const ictSilverBullet = {
  id: 'ict_silver_bullet',
  defaultTimeframe: '5m',
  name: 'ICT Silver Bullet',
  description:
    'Liquidity sweep → displacement impulse → FVG retest entry. Trades the 10-11 AM & 2-3 PM ET kill zones.',
  category: 'structure',

  params: {
    minRR:          { label: 'Min R:R',            type: 'number', default: 1.5, min: 1, max: 5, step: 0.5 },
    rrTarget:       { label: 'R:R Target (TP)',     type: 'number', default: 2,   min: 1, max: 10, step: 0.5 },
    maxTradesPerDay:{ label: 'Max Trades/Day',      type: 'number', default: 1,   min: 1, max: 3 },
    swingLookback:  { label: 'Swing Lookback (bars)',type: 'number', default: 5,  min: 3, max: 15 },
    sweepBarsBack:  { label: 'Sweep Lookback (bars)',type: 'number', default: 30, min: 10, max: 100 },
    fvgExpiryBars:  { label: 'FVG Expiry (bars)',   type: 'number', default: 20,  min: 5, max: 50 },
  },

  initialize(candles, params) {
    const swingLookback = params.swingLookback ?? 5;
    const { highs, lows } = detectSwingPoints(candles, swingLookback);
    return {
      swingHighs: highs,
      swingLows: lows,
      tradesToday: new Map(),
      // Active setup: { side, sweptLevel, fvg: { top, bot, midHigh, midLow, formBar } }
      activeSetup: null,
    };
  },

  onBar(bar, index, candles, context, params) {
    const {
      minRR = 1.5,
      rrTarget = 2,
      maxTradesPerDay = 1,
      sweepBarsBack = 30,
      fvgExpiryBars = 20,
    } = params;

    const et = toET(bar.time);
    const barMin = et.hours * 60 + et.minutes;
    const dateStr = et.dateStr;

    const inAMWindow = barMin >= 600 && barMin < 660;   // 10:00-11:00 AM
    const inPMWindow = barMin >= 840 && barMin < 900;   // 2:00-3:00 PM
    const inWindow   = inAMWindow || inPMWindow;

    // Clear stale setups at start of new day
    const lastDate = context._lastDate;
    if (lastDate && lastDate !== dateStr) {
      context.activeSetup = null;
    }
    context._lastDate = dateStr;

    const tradesUsed = context.tradesToday.get(dateStr) || 0;
    if (tradesUsed >= maxTradesPerDay) return null;
    if (index < 5) return null;

    // ── Step 1: Inside the window, look for a liquidity sweep ──────────────
    if (inWindow && !context.activeSetup) {
      const recentHighs = context.swingHighs.filter(
        s => s.index < index && index - s.index <= sweepBarsBack
      );
      const recentLows = context.swingLows.filter(
        s => s.index < index && index - s.index <= sweepBarsBack
      );

      // Bearish sweep: wick above a swing high, close back below it
      for (const sh of recentHighs) {
        if (bar.high > sh.price && bar.close < sh.price) {
          context.activeSetup = {
            side: 'SHORT',
            sweptLevel: sh.price,
            sweepBar: index,
            fvg: null,
          };
          break;
        }
      }

      // Bullish sweep: wick below a swing low, close back above it
      if (!context.activeSetup) {
        for (const sl of recentLows) {
          if (bar.low < sl.price && bar.close > sl.price) {
            context.activeSetup = {
              side: 'LONG',
              sweptLevel: sl.price,
              sweepBar: index,
              fvg: null,
            };
            break;
          }
        }
      }
    }

    // ── Step 2: After sweep, look for displacement FVG ─────────────────────
    if (context.activeSetup && !context.activeSetup.fvg && index >= 2) {
      const setup = context.activeSetup;
      // Expire setup if too old
      if (index - setup.sweepBar > fvgExpiryBars) {
        context.activeSetup = null;
        return null;
      }

      const c0 = candles[index - 2]; // oldest of 3-bar sequence
      const c1 = candles[index - 1]; // impulse (displacement) candle
      const c2 = bar;                 // current bar

      // Bullish FVG: c0.high < c2.low (gap), c1 is a strong up candle
      if (setup.side === 'LONG' && c0.high < c2.low) {
        const impulseSize = c1.close - c1.open;
        if (impulseSize > 0) { // c1 must be bullish
          setup.fvg = {
            top: c2.low,
            bot: c0.high,
            slLevel: setup.sweptLevel - 0.25, // SL below the swept low
            formBar: index,
          };
        }
      }

      // Bearish FVG: c0.low > c2.high, c1 is a strong down candle
      if (setup.side === 'SHORT' && c0.low > c2.high) {
        const impulseSize = c1.open - c1.close;
        if (impulseSize > 0) { // c1 must be bearish
          setup.fvg = {
            top: c0.low,
            bot: c2.high,
            slLevel: setup.sweptLevel + 0.25, // SL above the swept high
            formBar: index,
          };
        }
      }
      return null;
    }

    // ── Step 3: FVG retest entry ────────────────────────────────────────────
    if (context.activeSetup?.fvg) {
      const setup = context.activeSetup;
      const { fvg } = setup;

      // Expire stale FVG
      if (index - fvg.formBar > fvgExpiryBars) {
        context.activeSetup = null;
        return null;
      }

      const midFVG = (fvg.top + fvg.bot) / 2;

      if (setup.side === 'LONG') {
        // Price retraces into the FVG (bar low dips into zone) and closes bullish
        if (bar.low <= fvg.top && bar.low >= fvg.bot - (fvg.top - fvg.bot) && bar.close > midFVG) {
          const entry = Math.max(bar.close, fvg.bot); // enter at close or FVG bottom
          const sl    = fvg.slLevel;
          const risk  = entry - sl;
          if (risk <= 0) { context.activeSetup = null; return null; }
          const tp = entry + risk * rrTarget;

          // Skip if R:R to a natural target isn't good enough (already filtered by rrTarget)
          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.activeSetup = null;
          return {
            side: 'LONG', entry, sl, tp,
            reason: `SB Long: sweep ${setup.sweptLevel.toFixed(2)} → FVG retest`,
          };
        }
      } else {
        // Bearish: price retraces up into FVG, closes bearish
        if (bar.high >= fvg.bot && bar.high <= fvg.top + (fvg.top - fvg.bot) && bar.close < midFVG) {
          const entry = Math.min(bar.close, fvg.top);
          const sl    = fvg.slLevel;
          const risk  = sl - entry;
          if (risk <= 0) { context.activeSetup = null; return null; }
          const tp = entry - risk * rrTarget;

          context.tradesToday.set(dateStr, tradesUsed + 1);
          context.activeSetup = null;
          return {
            side: 'SHORT', entry, sl, tp,
            reason: `SB Short: sweep ${setup.sweptLevel.toFixed(2)} → FVG retest`,
          };
        }
      }
    }

    return null;
  },
};
