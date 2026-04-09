// utils/backtesting/metrics.js
// Professional Trading Metrics Calculator
// Computes all essential performance statistics

/**
 * Calculate complete performance metrics
 */
export function calculateMetrics(trades) {
  if (!trades || trades.length === 0) {
    return getEmptyMetrics();
  }

  const wins = trades.filter(t => t.outcome === 'WIN');
  const losses = trades.filter(t => t.outcome === 'LOSS' || t.outcome === 'TIMEOUT');
  
  const totalTrades = trades.length;
  const winningTrades = wins.length;
  const losingTrades = losses.length;

  // Core metrics
  const winRate = (winningTrades / totalTrades) * 100;

  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.rMultiple, 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + t.rMultiple, 0) / losses.length)
    : 0;

  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  const totalGross = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss > 0 ? totalGross / totalLoss : 0;

  // R-multiple statistics
  const rMultiples = trades.map(t => t.rMultiple);
  const avgR = rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length;
  const maxR = Math.max(...rMultiples);
  const minR = Math.min(...rMultiples);

  // Drawdown analysis
  const drawdownData = calculateDrawdown(trades);

  // Consecutive wins/losses
  const consecutive = calculateConsecutive(trades);

  // Trade duration
  const avgDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;
  const maxDuration = Math.max(...trades.map(t => t.duration));
  const minDuration = Math.min(...trades.map(t => t.duration));

  // P&L statistics
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalPnLPips = trades.reduce((sum, t) => sum + t.pnlPips, 0);

  // MFE/MAE analysis
  const avgMFE = trades.reduce((sum, t) => sum + (t.mfe || 0), 0) / trades.length;
  const avgMAE = trades.reduce((sum, t) => sum + (t.mae || 0), 0) / trades.length;

  // Execution costs
  const totalCosts = trades.reduce((sum, t) => sum + (t.totalCost || 0), 0);
  const avgCost = totalCosts / trades.length;

  // Risk-adjusted returns
  const sharpeRatio = calculateSharpeRatio(rMultiples);
  const sortinoRatio = calculateSortinoRatio(rMultiples);

  return {
    // Core metrics
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    
    // Expectancy
    expectancy,
    avgWin,
    avgLoss,
    profitFactor,
    
    // R-multiple stats
    avgR,
    maxR,
    minR,
    
    // Drawdown
    maxDrawdown: drawdownData.maxDrawdown,
    maxDrawdownPercent: drawdownData.maxDrawdownPercent,
    maxDrawdownDuration: drawdownData.maxDrawdownDuration,
    
    // Consecutive
    maxConsecutiveWins: consecutive.maxWins,
    maxConsecutiveLosses: consecutive.maxLosses,
    avgConsecutiveWins: consecutive.avgWins,
    avgConsecutiveLosses: consecutive.avgLosses,
    
    // Duration
    avgDuration,
    maxDuration,
    minDuration,
    
    // P&L
    totalPnL,
    totalPnLPips,
    
    // MFE/MAE
    avgMFE,
    avgMAE,
    
    // Costs
    totalCosts,
    avgCost,
    
    // Risk-adjusted
    sharpeRatio,
    sortinoRatio,
    
    // Quality score
    qualityScore: calculateQualityScore({
      winRate,
      expectancy,
      profitFactor,
      sharpeRatio,
      maxDrawdownPercent: drawdownData.maxDrawdownPercent,
    }),
  };
}

/**
 * Calculate drawdown statistics
 */
function calculateDrawdown(trades) {
  const equity = [10000]; // Starting capital
  let peak = 10000;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let drawdownStart = 0;
  let maxDrawdownDuration = 0;
  let currentDrawdownStart = 0;
  let inDrawdown = false;

  trades.forEach((trade, i) => {
    const riskAmount = equity[i] * 0.01; // 1% risk
    const pnl = riskAmount * trade.rMultiple;
    const newEquity = equity[i] + pnl;
    equity.push(newEquity);

    if (newEquity > peak) {
      peak = newEquity;
      
      if (inDrawdown) {
        const duration = i - currentDrawdownStart;
        if (duration > maxDrawdownDuration) {
          maxDrawdownDuration = duration;
        }
        inDrawdown = false;
      }
    } else {
      if (!inDrawdown) {
        currentDrawdownStart = i;
        inDrawdown = true;
      }

      const drawdown = peak - newEquity;
      const drawdownPercent = (drawdown / peak) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
        drawdownStart = currentDrawdownStart;
      }
    }
  });

  return {
    equity,
    maxDrawdown,
    maxDrawdownPercent,
    maxDrawdownDuration,
    maxDrawdownStart: drawdownStart,
  };
}

/**
 * Calculate consecutive wins/losses
 */
function calculateConsecutive(trades) {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  let winStreaks = [];
  let lossStreaks = [];

  trades.forEach(trade => {
    if (trade.outcome === 'WIN') {
      currentWins++;
      if (currentLosses > 0) {
        lossStreaks.push(currentLosses);
        maxLosses = Math.max(maxLosses, currentLosses);
      }
      currentLosses = 0;
    } else if (trade.outcome === 'LOSS') {
      currentLosses++;
      if (currentWins > 0) {
        winStreaks.push(currentWins);
        maxWins = Math.max(maxWins, currentWins);
      }
      currentWins = 0;
    }
  });

  // Final streak
  if (currentWins > 0) {
    winStreaks.push(currentWins);
    maxWins = Math.max(maxWins, currentWins);
  }
  if (currentLosses > 0) {
    lossStreaks.push(currentLosses);
    maxLosses = Math.max(maxLosses, currentLosses);
  }

  return {
    maxWins,
    maxLosses,
    avgWins: winStreaks.length > 0
      ? winStreaks.reduce((sum, s) => sum + s, 0) / winStreaks.length
      : 0,
    avgLosses: lossStreaks.length > 0
      ? lossStreaks.reduce((sum, s) => sum + s, 0) / lossStreaks.length
      : 0,
  };
}

/**
 * Calculate Sharpe Ratio
 */
function calculateSharpeRatio(returns, riskFreeRate = 0) {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = calculateStdDev(returns);
  
  return stdDev > 0 ? (mean - riskFreeRate) / stdDev : 0;
}

/**
 * Calculate Sortino Ratio (only penalize downside volatility)
 */
function calculateSortinoRatio(returns, riskFreeRate = 0) {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < riskFreeRate);
  const downsideStdDev = calculateStdDev(downsideReturns);
  
  return downsideStdDev > 0 ? (mean - riskFreeRate) / downsideStdDev : 0;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateQualityScore(metrics) {
  let score = 0;

  // Win rate (max 20 points)
  if (metrics.winRate >= 50) score += 20;
  else if (metrics.winRate >= 45) score += 15;
  else if (metrics.winRate >= 40) score += 10;

  // Expectancy (max 30 points)
  if (metrics.expectancy >= 0.5) score += 30;
  else if (metrics.expectancy >= 0.3) score += 20;
  else if (metrics.expectancy >= 0.1) score += 10;

  // Profit factor (max 25 points)
  if (metrics.profitFactor >= 1.6) score += 25;
  else if (metrics.profitFactor >= 1.4) score += 20;
  else if (metrics.profitFactor >= 1.2) score += 15;
  else if (metrics.profitFactor >= 1.0) score += 10;

  // Sharpe ratio (max 15 points)
  if (metrics.sharpeRatio >= 2.0) score += 15;
  else if (metrics.sharpeRatio >= 1.5) score += 10;
  else if (metrics.sharpeRatio >= 1.0) score += 5;

  // Max drawdown (max 10 points)
  if (metrics.maxDrawdownPercent <= 15) score += 10;
  else if (metrics.maxDrawdownPercent <= 20) score += 7;
  else if (metrics.maxDrawdownPercent <= 25) score += 5;

  return score;
}

/**
 * Get empty metrics structure
 */
function getEmptyMetrics() {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    expectancy: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    avgR: 0,
    maxR: 0,
    minR: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    maxDrawdownDuration: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    avgConsecutiveWins: 0,
    avgConsecutiveLosses: 0,
    avgDuration: 0,
    maxDuration: 0,
    minDuration: 0,
    totalPnL: 0,
    totalPnLPips: 0,
    avgMFE: 0,
    avgMAE: 0,
    totalCosts: 0,
    avgCost: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    qualityScore: 0,
  };
}

/**
 * Calculate metrics by regime
 */
export function calculateMetricsByRegime(trades) {
  const regimes = {};

  trades.forEach(trade => {
    if (!regimes[trade.regime]) {
      regimes[trade.regime] = [];
    }
    regimes[trade.regime].push(trade);
  });

  const results = {};
  Object.keys(regimes).forEach(regime => {
    results[regime] = calculateMetrics(regimes[regime]);
  });

  return results;
}

/**
 * Calculate metrics by session
 */
export function calculateMetricsBySession(trades) {
  const sessions = {};

  trades.forEach(trade => {
    if (!sessions[trade.session]) {
      sessions[trade.session] = [];
    }
    sessions[trade.session].push(trade);
  });

  const results = {};
  Object.keys(sessions).forEach(session => {
    results[session] = calculateMetrics(sessions[session]);
  });

  return results;
}

/**
 * Calculate metrics by strategy
 */
export function calculateMetricsByStrategy(trades) {
  const strategies = {};

  trades.forEach(trade => {
    if (!strategies[trade.strategy]) {
      strategies[trade.strategy] = [];
    }
    strategies[trade.strategy].push(trade);
  });

  const results = {};
  Object.keys(strategies).forEach(strategy => {
    results[strategy] = calculateMetrics(strategies[strategy]);
  });

  return results;
}

/**
 * Compare to random entry baseline
 */
export function compareToRandom(trades, iterations = 100) {
  const actualMetrics = calculateMetrics(trades);
  const randomResults = [];

  // Generate random entry results
  for (let i = 0; i < iterations; i++) {
    const randomTrades = trades.map(trade => ({
      ...trade,
      outcome: Math.random() > 0.5 ? 'WIN' : 'LOSS',
      rMultiple: Math.random() > 0.5 ? trade.avgWin || 1.5 : -(trade.avgLoss || 1),
    }));

    const metrics = calculateMetrics(randomTrades);
    randomResults.push(metrics);
  }

  // Calculate average random performance
  const avgRandomExpectancy = randomResults.reduce((sum, r) => sum + r.expectancy, 0) / iterations;
  const avgRandomWinRate = randomResults.reduce((sum, r) => sum + r.winRate, 0) / iterations;
  const avgRandomProfitFactor = randomResults.reduce((sum, r) => sum + r.profitFactor, 0) / iterations;

  return {
    actual: actualMetrics,
    random: {
      expectancy: avgRandomExpectancy,
      winRate: avgRandomWinRate,
      profitFactor: avgRandomProfitFactor,
    },
    improvement: {
      expectancy: actualMetrics.expectancy - avgRandomExpectancy,
      winRate: actualMetrics.winRate - avgRandomWinRate,
      profitFactor: actualMetrics.profitFactor - avgRandomProfitFactor,
    },
    hasEdge: actualMetrics.expectancy > avgRandomExpectancy * 1.15, // 15% better than random
  };
}
