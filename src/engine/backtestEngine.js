/**
 * Core backtesting engine for ES Trading Academy.
 * Runs a strategy against historical candle data and produces
 * trades, equity curve, and performance metrics.
 */

import { calculateMetrics } from './metrics.js';

/**
 * Returns the point value (dollar value per point) for a given futures symbol.
 * @param {string} symbol - Futures symbol (ES, MES, NQ, MNQ)
 * @returns {number} Point value in dollars
 */
export function getPointValue(symbol) {
  const values = {
    ES: 50,
    MES: 5,
    NQ: 20,
    MNQ: 2,
  };
  return values[symbol] ?? 50;
}

/**
 * Runs a backtest of a strategy against historical candle data.
 *
 * @param {Array} candles - Array of OHLCV bar objects with at minimum:
 *   { time, open, high, low, close }
 * @param {object} strategy - Strategy object with initialize() and onBar() methods
 * @param {object} params - Strategy-specific parameters passed to initialize and onBar
 * @param {object} config - Backtest configuration
 * @param {number} config.startingBalance - Initial account balance
 * @param {number} config.pointValue - Dollar value per point of movement
 * @param {number} config.contractQty - Number of contracts per trade
 * @param {number} config.commission - Round-trip commission per trade in dollars
 * @returns {{ trades: Array, equityCurve: Array, metrics: object }}
 */
export function runBacktest(candles, strategy, params, config) {
  const { startingBalance, pointValue, contractQty, commission } = config;

  const trades = [];
  const equityCurve = [];
  let equity = startingBalance;
  let position = null;

  // Initialize strategy context
  const context = strategy.initialize(candles, params);

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];

    // Check if active position hit TP or SL on this bar
    if (position !== null) {
      let exitPrice = null;
      let exitReason = null;

      if (position.side === 'LONG') {
        // Check SL before TP (conservative: assume worst case first)
        if (bar.low <= position.sl) {
          exitPrice = position.sl;
          exitReason = 'sl';
        } else if (bar.high >= position.tp) {
          exitPrice = position.tp;
          exitReason = 'tp';
        }
      } else {
        // SHORT position
        // Check SL before TP (conservative)
        if (bar.high >= position.sl) {
          exitPrice = position.sl;
          exitReason = 'sl';
        } else if (bar.low <= position.tp) {
          exitPrice = position.tp;
          exitReason = 'tp';
        }
      }

      if (exitPrice !== null) {
        const pnl = calculatePnL(
          position.side,
          position.entry,
          exitPrice,
          pointValue,
          contractQty,
          commission
        );

        equity += pnl;

        const completedTrade = {
          side: position.side,
          entry: position.entry,
          sl: position.sl,
          tp: position.tp,
          entryTime: position.entryTime,
          entryBar: position.entryBar,
          exitPrice,
          exitTime: bar.time,
          exitBar: i,
          pnl: Math.round(pnl * 100) / 100,
          exitReason,
          reason: position.reason,
        };

        trades.push(completedTrade);
        position = null;
      }
    }

    // Check for new entry signal if no active position
    if (position === null) {
      const signal = strategy.onBar(bar, i, candles, context, params);

      if (signal) {
        position = {
          side: signal.side,
          entry: signal.entry,
          sl: signal.sl,
          tp: signal.tp,
          entryTime: bar.time,
          entryBar: i,
          reason: signal.reason,
        };
      }
    }

    // Record equity curve point
    equityCurve.push({
      time: bar.time,
      equity: Math.round(equity * 100) / 100,
    });
  }

  const metrics = calculateMetrics(trades, equityCurve, config);

  return { trades, equityCurve, metrics };
}

/**
 * Calculates PnL for a completed trade.
 * @param {string} side - 'LONG' or 'SHORT'
 * @param {number} entry - Entry price
 * @param {number} exit - Exit price
 * @param {number} pointValue - Dollar value per point
 * @param {number} contractQty - Number of contracts
 * @param {number} commission - Round-trip commission
 * @returns {number} Net profit/loss in dollars
 */
function calculatePnL(side, entry, exit, pointValue, contractQty, commission) {
  const rawPnL =
    side === 'LONG'
      ? (exit - entry) * pointValue * contractQty
      : (entry - exit) * pointValue * contractQty;

  return rawPnL - commission;
}
