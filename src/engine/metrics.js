/**
 * Backtesting metrics calculator.
 * Computes performance statistics from a set of trades and equity curve.
 */

function round2(val) {
  return Math.round(val * 100) / 100;
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function maxConsecutive(trades, predicate) {
  let max = 0;
  let current = 0;
  for (const trade of trades) {
    if (predicate(trade)) {
      current += 1;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

export function calculateMetrics(trades, equityCurve, config) {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      largestWin: 0,
      largestLoss: 0,
      avgRR: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      avgTradeDuration: 0,
      sharpeRatio: 0,
    };
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);

  const wins = winningTrades.length;
  const losses = losingTrades.length;
  const winRate = round2((wins / totalTrades) * 100);

  const totalPnL = round2(trades.reduce((sum, t) => sum + t.pnl, 0));

  const grossProfit = round2(
    winningTrades.reduce((sum, t) => sum + t.pnl, 0)
  );
  const grossLoss = round2(
    Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
  );

  const profitFactor =
    grossLoss === 0 ? Infinity : round2(grossProfit / grossLoss);

  const winPnls = winningTrades.map((t) => t.pnl);
  const losePnls = losingTrades.map((t) => t.pnl);

  const avgWin = round2(mean(winPnls));
  const avgLoss = round2(Math.abs(mean(losePnls)));

  const expectancy = round2(
    (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss
  );

  const largestWin = round2(
    winningTrades.length > 0 ? Math.max(...winPnls) : 0
  );
  const largestLoss = round2(
    losingTrades.length > 0 ? Math.min(...losePnls) : 0
  );

  // avgRR: average reward-to-risk ratio for winning trades
  let avgRR = 0;
  if (winningTrades.length > 0) {
    const rrValues = winningTrades.map((t) => {
      const risk = Math.abs(t.entry - t.sl);
      if (risk === 0) return 0;
      return Math.abs(t.exitPrice - t.entry) / risk;
    });
    avgRR = round2(mean(rrValues));
  }

  // Max drawdown from equity curve
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let peak = equityCurve.length > 0 ? equityCurve[0].equity : 0;

  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = peak - point.equity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  }
  maxDrawdown = round2(maxDrawdown);
  maxDrawdownPct = round2(maxDrawdownPct);

  const maxConsecutiveWins = maxConsecutive(trades, (t) => t.pnl > 0);
  const maxConsecutiveLosses = maxConsecutive(trades, (t) => t.pnl <= 0);

  const avgTradeDuration = round2(
    mean(trades.map((t) => t.exitBar - t.entryBar))
  );

  // Sharpe ratio: annualized using sqrt(252) — computed on DAILY equity returns
  // to avoid inflating when multiple trades close on the same calendar day.
  let sharpeRatio = 0;
  if (equityCurve.length >= 2) {
    // Bucket equity by calendar date (UTC), take the last equity reading per day
    const dayMap = new Map();
    for (const pt of equityCurve) {
      const d = new Date(pt.time * 1000).toISOString().slice(0, 10);
      dayMap.set(d, pt.equity);
    }
    const dailyEquities = [...dayMap.values()];
    if (dailyEquities.length >= 2) {
      const dailyReturns = [];
      for (let i = 1; i < dailyEquities.length; i++) {
        dailyReturns.push((dailyEquities[i] - dailyEquities[i - 1]) / dailyEquities[i - 1]);
      }
      const meanReturn = mean(dailyReturns);
      const stdReturn  = stdev(dailyReturns);
      sharpeRatio = stdReturn === 0 ? 0 : round2((meanReturn / stdReturn) * Math.sqrt(252));
    }
  }

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnL,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    expectancy,
    largestWin,
    largestLoss,
    avgRR,
    maxDrawdown,
    maxDrawdownPct,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgTradeDuration,
    sharpeRatio,
  };
}
