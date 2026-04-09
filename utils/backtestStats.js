// utils/backtestStats.js
// Advanced Backtest Statistics
// Monte Carlo, Walk-Forward, Random Baseline

/**
 * Run Monte Carlo simulation
 * Randomly shuffles trade sequence to find worst-case drawdown
 */
export function runMonteCarloSimulation(trades, accountSize, iterations = 1000) {
  console.log(`🎲 Running Monte Carlo (${iterations} iterations)...`);

  const results = [];

  for (let i = 0; i < iterations; i++) {
    // Shuffle trades
    const shuffled = [...trades].sort(() => Math.random() - 0.5);

    // Calculate equity curve
    let equity = accountSize;
    let peak = accountSize;
    let maxDrawdown = 0;

    for (const trade of shuffled) {
      equity += trade.result.pnl;
      
      if (equity > peak) {
        peak = equity;
      }

      const drawdown = peak - equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    results.push({
      finalEquity: equity,
      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / accountSize) * 100,
    });
  }

  // Sort by max drawdown
  results.sort((a, b) => b.maxDrawdown - a.maxDrawdown);

  // Statistical analysis
  const avgDrawdown = results.reduce((sum, r) => sum + r.maxDrawdown, 0) / results.length;
  const worst10Percent = results.slice(0, Math.floor(iterations * 0.1));
  const worst10AvgDD = worst10Percent.reduce((sum, r) => sum + r.maxDrawdown, 0) / worst10Percent.length;

  return {
    iterations,
    worst: results[0],
    best: results[results.length - 1],
    avgDrawdown,
    worst10AvgDD,
    percentile95: results[Math.floor(iterations * 0.05)],
    allResults: results,
  };
}

/**
 * Generate random baseline trades
 * Same frequency, same R:R, random entries
 */
export function generateRandomBaseline(candles, tradeCount, avgRR = 2.0, winRate = 0.5) {
  console.log(`🎲 Generating random baseline (${tradeCount} trades)...`);

  const trades = [];
  const step = Math.floor(candles.length / tradeCount);

  for (let i = 0; i < tradeCount; i++) {
    const entryIndex = Math.min(i * step + Math.floor(Math.random() * step), candles.length - 10);
    const entryCandle = candles[entryIndex];
    const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';

    // Random exit after 5-20 candles
    const exitIndex = entryIndex + 5 + Math.floor(Math.random() * 15);
    const exitCandle = candles[Math.min(exitIndex, candles.length - 1)];

    // Simulate random win/loss based on win rate
    const winner = Math.random() < winRate;
    const rMultiple = winner ? avgRR : -1;

    trades.push({
      entry: entryCandle.close,
      exit: exitCandle.close,
      direction,
      result: {
        winner,
        rMultiple,
        pnl: rMultiple * 100, // Assuming $100 risk
      },
      entryTimestamp: entryCandle.timestamp,
      exitTimestamp: exitCandle.timestamp,
    });
  }

  return trades;
}

/**
 * Compare strategy to random baseline
 */
export function compareToRandomBaseline(strategyTrades, randomTrades) {
  const strategyWinRate = (strategyTrades.filter(t => t.result.winner).length / strategyTrades.length) * 100;
  const randomWinRate = (randomTrades.filter(t => t.result.winner).length / randomTrades.length) * 100;

  const strategyAvgR = strategyTrades.reduce((sum, t) => sum + t.result.rMultiple, 0) / strategyTrades.length;
  const randomAvgR = randomTrades.reduce((sum, t) => sum + t.result.rMultiple, 0) / randomTrades.length;

  const strategyPnL = strategyTrades.reduce((sum, t) => sum + t.result.pnl, 0);
  const randomPnL = randomTrades.reduce((sum, t) => sum + t.result.pnl, 0);

  return {
    strategy: {
      trades: strategyTrades.length,
      winRate: strategyWinRate,
      avgR: strategyAvgR,
      totalPnL: strategyPnL,
    },
    random: {
      trades: randomTrades.length,
      winRate: randomWinRate,
      avgR: randomAvgR,
      totalPnL: randomPnL,
    },
    improvement: {
      winRate: strategyWinRate - randomWinRate,
      avgR: strategyAvgR - randomAvgR,
      totalPnL: strategyPnL - randomPnL,
      percentImprovement: ((strategyPnL - randomPnL) / Math.abs(randomPnL)) * 100,
    },
  };
}

/**
 * Walk-forward analysis
 * Train on period, test on next period, roll forward
 */
export function runWalkForwardAnalysis(candles, trainPeriod = 500, testPeriod = 100) {
  console.log(`🔄 Running walk-forward analysis...`);

  const windows = [];
  let currentIndex = trainPeriod;

  while (currentIndex + testPeriod < candles.length) {
    windows.push({
      trainStart: currentIndex - trainPeriod,
      trainEnd: currentIndex,
      testStart: currentIndex,
      testEnd: currentIndex + testPeriod,
    });

    currentIndex += testPeriod;
  }

  console.log(`📊 Created ${windows.length} walk-forward windows`);

  return windows;
}

/**
 * Analyze expectancy stability over time
 */
export function analyzeExpectancyStability(trades, windowSize = 50) {
  if (trades.length < windowSize) {
    return { stable: false, reason: 'Insufficient trades' };
  }

  const expectations = [];
  
  for (let i = windowSize; i <= trades.length; i++) {
    const window = trades.slice(i - windowSize, i);
    const winners = window.filter(t => t.result.winner);
    const losers = window.filter(t => !t.result.winner);

    const winRate = winners.length / window.length;
    const avgWin = winners.length > 0 
      ? winners.reduce((sum, t) => sum + t.result.pnl, 0) / winners.length 
      : 0;
    const avgLoss = losers.length > 0 
      ? Math.abs(losers.reduce((sum, t) => sum + t.result.pnl, 0) / losers.length)
      : 0;

    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    expectations.push(expectancy);
  }

  // Check if expectancy remains positive
  const positiveWindows = expectations.filter(e => e > 0).length;
  const positivePercent = (positiveWindows / expectations.length) * 100;

  // Calculate standard deviation
  const mean = expectations.reduce((sum, e) => sum + e, 0) / expectations.length;
  const variance = expectations.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / expectations.length;
  const stdDev = Math.sqrt(variance);

  return {
    stable: positivePercent >= 80 && mean > 0,
    positivePercent,
    mean,
    stdDev,
    coefficientOfVariation: Math.abs(stdDev / mean),
    expectations,
  };
}

/**
 * Analyze profit factor stability over time
 */
export function analyzeProfitFactorStability(trades, windowSize = 50) {
  if (trades.length < windowSize) {
    return { stable: false, reason: 'Insufficient trades' };
  }

  const profitFactors = [];
  
  for (let i = windowSize; i <= trades.length; i++) {
    const window = trades.slice(i - windowSize, i);
    const grossProfit = window.filter(t => t.result.winner).reduce((sum, t) => sum + t.result.pnl, 0);
    const grossLoss = Math.abs(window.filter(t => !t.result.winner).reduce((sum, t) => sum + t.result.pnl, 0));

    const pf = grossLoss > 0 ? grossProfit / grossLoss : 0;
    profitFactors.push(pf);
  }

  const avgPF = profitFactors.reduce((sum, pf) => sum + pf, 0) / profitFactors.length;
  const minPF = Math.min(...profitFactors);
  const maxPF = Math.max(...profitFactors);

  const above1Count = profitFactors.filter(pf => pf > 1.0).length;
  const above1Percent = (above1Count / profitFactors.length) * 100;

  return {
    stable: avgPF > 1.3 && minPF > 1.0 && above1Percent >= 80,
    avgPF,
    minPF,
    maxPF,
    above1Percent,
    profitFactors,
  };
}

/**
 * Calculate consecutive loss streaks
 */
export function analyzeConsecutiveLosses(trades) {
  const streaks = [];
  let currentStreak = 0;

  for (const trade of trades) {
    if (trade.result.winner) {
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }
      currentStreak = 0;
    } else {
      currentStreak++;
    }
  }

  if (currentStreak > 0) {
    streaks.push(currentStreak);
  }

  if (streaks.length === 0) {
    return {
      maxStreak: 0,
      avgStreak: 0,
      streaks: [],
    };
  }

  return {
    maxStreak: Math.max(...streaks),
    avgStreak: streaks.reduce((sum, s) => sum + s, 0) / streaks.length,
    streaks,
  };
}

/**
 * Detect overfitting
 * Returns warnings if results look too good to be true
 */
export function detectOverfitting(summary, tradeCount) {
  const warnings = [];

  // Win rate too high
  if (summary.winRate > 70) {
    warnings.push({
      type: 'HIGH_WIN_RATE',
      severity: 'HIGH',
      message: `Win rate of ${summary.winRate.toFixed(1)}% is unusually high for institutional strategies (expected 45-55%)`,
    });
  }

  // Profit factor too high
  if (summary.profitFactor > 2.5) {
    warnings.push({
      type: 'HIGH_PROFIT_FACTOR',
      severity: 'MEDIUM',
      message: `Profit factor of ${summary.profitFactor.toFixed(2)} is very high (expected 1.3-1.6 for Gold)`,
    });
  }

  // Drawdown too low
  if (summary.maxDrawdown.percentage < 10 && tradeCount > 100) {
    warnings.push({
      type: 'LOW_DRAWDOWN',
      severity: 'MEDIUM',
      message: `Max drawdown of ${summary.maxDrawdown.percentage.toFixed(1)}% seems too perfect (expected 15-25% for Gold)`,
    });
  }

  // Too few consecutive losses
  if (summary.maxConsecutiveLosses < 5 && tradeCount > 100) {
    warnings.push({
      type: 'LOW_CONSECUTIVE_LOSSES',
      severity: 'LOW',
      message: `Only ${summary.maxConsecutiveLosses} consecutive losses is uncommon (expected 6-12 for Gold)`,
    });
  }

  // Average R too high
  if (summary.avgR > 2.0) {
    warnings.push({
      type: 'HIGH_AVG_R',
      severity: 'MEDIUM',
      message: `Average R of ${summary.avgR.toFixed(2)} is very high (expected 0.3-0.8 for realistic execution)`,
    });
  }

  return {
    overfitted: warnings.filter(w => w.severity === 'HIGH').length > 0,
    warnings,
  };
}

/**
 * Calculate risk-adjusted returns (Sharpe Ratio)
 */
export function calculateSharpeRatio(equityCurve, riskFreeRate = 0.02) {
  if (equityCurve.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
    returns.push(ret);
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const excessReturn = avgReturn - (riskFreeRate / 252); // Daily risk-free rate
  const sharpe = stdDev > 0 ? excessReturn / stdDev : 0;

  return sharpe;
}

/**
 * Generate comprehensive statistical report
 */
export function generateStatisticalReport(results, candles) {
  console.log('📊 Generating statistical report...');

  const report = {
    basic: results.summary,
    monteCarlo: runMonteCarloSimulation(results.trades, results.config.accountSize),
    expectancyStability: analyzeExpectancyStability(results.trades),
    profitFactorStability: analyzeProfitFactorStability(results.trades),
    consecutiveLosses: analyzeConsecutiveLosses(results.trades),
    overfitting: detectOverfitting(results.summary, results.trades.length),
    sharpeRatio: calculateSharpeRatio(results.equity),
    byRegime: results.byRegime,
    bySession: results.bySession,
  };

  // Compare to random if we have enough trades
  if (results.trades.length >= 50) {
    const randomTrades = generateRandomBaseline(
      candles,
      results.trades.length,
      2.0,
      0.5
    );
    report.randomComparison = compareToRandomBaseline(results.trades, randomTrades);
  }

  return report;
}
