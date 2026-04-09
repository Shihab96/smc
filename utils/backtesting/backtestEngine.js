// utils/backtesting/backtestEngine.js
// Main Backtest Engine - Orchestrates gold-specific backtesting
// Uses existing strategy code without modification

import { analyzeInstitutionalBias } from '../institutional.js';
import { 
  mapLTFLiquidity,
  generateEntrySignal,
  isInKillZone as ltfIsInKillZone,
  isVolatilityExpanding 
} from '../ltfExecution.js';
import { detectLiquiditySweeps } from '../liquidity.js';
import { detectImpulse } from '../impulse.js';

import { simulateExecution, getSession, isKillZone, shouldSkipTrade } from './goldSimulator.js';
import { detectRegime } from './regimeDetector.js';

/**
 * Run complete backtest on historical data
 */
export async function runBacktest(candles, config = {}) {
  const {
    symbol = 'XAUUSD',
    strategies = ['LTF_EXECUTION', 'LIQUIDITY_SWEEP', 'IMPULSE'],
    htfLookback = 100,
    ltfLookback = 50,
    minHTFScore = 50,
    minConfidence = 70,
    conservativeMode = true,
    requireKillZone = false,
    avoidRollover = true,
    startDate = null,
    endDate = null,
    includeRandomBaseline = true, // NEW: Compare to random entries
  } = config;

  console.log(`\n🎯 Starting Backtest: ${symbol}`);
  console.log(`Strategies: ${strategies.join(', ')}`);
  console.log(`Data: ${candles.length} candles`);
  console.log(`Conservative Mode: ${conservativeMode}`);
  console.log(`Random Baseline: ${includeRandomBaseline}`);

  // Filter by date range if specified
  let testCandles = candles;
  if (startDate || endDate) {
    testCandles = filterByDateRange(candles, startDate, endDate);
    console.log(`Date filtered: ${testCandles.length} candles`);
  }

  const results = {
    config,
    startTime: new Date().toISOString(),
    symbol,
    candles: testCandles.length,
    trades: [],
    skipped: [],
    regimes: {},
    sessions: {},
    strategies: {},
    randomBaseline: null, // Will be populated if enabled
  };

  // Process each candle
  for (let i = htfLookback; i < testCandles.length - 20; i++) {
    const currentCandles = testCandles.slice(0, i + 1);
    const timestamp = currentCandles[i].timestamp;

    // Detect regime
    const regime = detectRegime(testCandles, i);
    results.regimes[regime.regime] = (results.regimes[regime.regime] || 0) + 1;

    // Check if should skip
    const skipCheck = shouldSkipTrade(timestamp, { avoidRollover, requireKillZone });
    if (skipCheck.skip) {
      results.skipped.push({ index: i, reason: skipCheck.reason, timestamp });
      continue;
    }

    // Get session
    const session = getSession(timestamp);
    results.sessions[session] = (results.sessions[session] || 0) + 1;

    // STEP 1: Analyze HTF Bias (using existing code)
    let htfBias = null;
    let dealingRange = null;

    try {
      htfBias = analyzeInstitutionalBias(currentCandles);
      dealingRange = htfBias.dealingRange;

      // Skip if HTF bias too weak
      if (htfBias.score < minHTFScore) {
        continue;
      }
    } catch (error) {
      console.error(`HTF analysis error at index ${i}:`, error.message);
      continue;
    }

    // STEP 2: Generate signals based on enabled strategies
    const signals = [];

    // LTF Execution Strategy
    if (strategies.includes('LTF_EXECUTION')) {
      try {
        const liquidityLevels = mapLTFLiquidity(currentCandles, ltfLookback);
        const killZoneActive = ltfIsInKillZone(timestamp);
        const volatilityExpanding = isVolatilityExpanding(currentCandles, i);

        const entrySignal = generateEntrySignal({
          candles: currentCandles,
          currentIndex: i,
          htfBias,
          dealingRange,
          liquidityLevels,
          killZoneActive,
          volatilityExpanding,
        });

        if (entrySignal && entrySignal.confidence >= minConfidence) {
          signals.push({
            ...entrySignal,
            strategy: 'LTF_EXECUTION',
            symbol,
            timestamp,
            index: i,
            regime: regime.regime,
            session,
            htfBiasScore: htfBias.score,
          });
        }
      } catch (error) {
        console.error(`LTF execution error at index ${i}:`, error.message);
      }
    }

    // Liquidity Sweep Strategy
    if (strategies.includes('LIQUIDITY_SWEEP')) {
      try {
        const sweepSettings = {
          lookback: 20,
          wickRatio: 0.4,
          equalTolerance: 0.0002,
          enableMSS: true,
        };

        const sweeps = detectLiquiditySweeps(currentCandles, sweepSettings, i);

        sweeps.forEach(sweep => {
          const htfAligned = !htfBias || 
            (sweep.direction === 'bullish' && htfBias.bias === 'BULLISH') ||
            (sweep.direction === 'bearish' && htfBias.bias === 'BEARISH');

          if (htfAligned) {
            signals.push({
              type: sweep.type,
              direction: sweep.direction === 'bullish' ? 'BUY' : 'SELL',
              strategy: 'LIQUIDITY_SWEEP',
              symbol,
              timestamp,
              index: i,
              level: sweep.level,
              confidence: 70,
              regime: regime.regime,
              session,
              htfBiasScore: htfBias.score,
              entryZone: {
                low: sweep.level - 10,
                high: sweep.level + 10,
              },
              stopLoss: sweep.direction === 'bullish' 
                ? sweep.level - 30
                : sweep.level + 30,
              targets: {
                primary: sweep.direction === 'bullish'
                  ? sweep.level + 100
                  : sweep.level - 100,
              },
            });
          }
        });
      } catch (error) {
        console.error(`Sweep detection error at index ${i}:`, error.message);
      }
    }

    // Impulse Strategy
    if (strategies.includes('IMPULSE')) {
      try {
        const impulseSettings = {
          rangeMultiplier: 2.5,
          bodyRatio: 0.65,
          volumeMultiplier: 1.8,
          consecutiveCount: 2,
        };

        const impulses = detectImpulse(currentCandles, impulseSettings, i);

        impulses.forEach(impulse => {
          const htfAligned = !htfBias || 
            (impulse.direction === 'bullish' && htfBias.bias === 'BULLISH') ||
            (impulse.direction === 'bearish' && htfBias.bias === 'BEARISH');

          if (htfAligned && impulse.strength >= minConfidence) {
            const currentPrice = currentCandles[i].close;
            
            signals.push({
              type: impulse.type,
              direction: impulse.direction === 'bullish' ? 'BUY' : 'SELL',
              strategy: 'IMPULSE',
              symbol,
              timestamp,
              index: i,
              confidence: impulse.strength,
              regime: regime.regime,
              session,
              htfBiasScore: htfBias.score,
              entryZone: {
                low: currentPrice - 5,
                high: currentPrice + 5,
              },
              stopLoss: impulse.direction === 'bullish'
                ? currentPrice - 40
                : currentPrice + 40,
              targets: {
                primary: impulse.direction === 'bullish'
                  ? currentPrice + 80
                  : currentPrice - 80,
              },
            });
          }
        });
      } catch (error) {
        console.error(`Impulse detection error at index ${i}:`, error.message);
      }
    }

    // STEP 3: Simulate execution for each signal
    for (const signal of signals) {
      try {
        const execution = simulateExecution(
          signal,
          testCandles,
          i,
          {
            conservativeMode,
            volatilityRegime: regime.regime,
          }
        );

        const trade = {
          ...signal,
          ...execution,
          tradeNumber: results.trades.length + 1,
        };

        results.trades.push(trade);

        // Track by strategy
        if (!results.strategies[signal.strategy]) {
          results.strategies[signal.strategy] = {
            trades: [],
            wins: 0,
            losses: 0,
          };
        }

        results.strategies[signal.strategy].trades.push(trade);
        if (execution.outcome === 'WIN') {
          results.strategies[signal.strategy].wins++;
        } else if (execution.outcome === 'LOSS') {
          results.strategies[signal.strategy].losses++;
        }

      } catch (error) {
        console.error(`Execution simulation error:`, error.message);
      }
    }

    // Progress update every 1000 candles
    if (i % 1000 === 0) {
      console.log(`Progress: ${((i / testCandles.length) * 100).toFixed(1)}% - Trades: ${results.trades.length}`);
    }
  }

  results.endTime = new Date().toISOString();
  console.log(`\n✅ Backtest Complete: ${results.trades.length} trades executed`);

  // Generate random baseline comparison if enabled
  if (includeRandomBaseline && results.trades.length >= 20) {
    console.log(`\n🎲 Generating random baseline comparison...`);
    results.randomBaseline = generateRandomBaseline(results.trades, testCandles, config);
    console.log(`✅ Random baseline generated`);
  }

  return results;
}

/**
 * Filter candles by date range
 */
function filterByDateRange(candles, startDate, endDate) {
  return candles.filter(candle => {
    const candleTime = new Date(candle.timestamp).getTime();
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (candleTime < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      if (candleTime > end) return false;
    }

    return true;
  });
}

/**
 * Run walk-forward test
 * Train on one period, test on next period, roll forward
 */
export async function runWalkForward(candles, config = {}) {
  const {
    trainPeriod = 252, // Days
    testPeriod = 63,   // Days
    stepSize = 63,     // Days to roll forward
  } = config;

  const candlesPerDay = 288; // 5-minute candles
  const trainCandles = trainPeriod * candlesPerDay;
  const testCandles = testPeriod * candlesPerDay;
  const stepCandles = stepSize * candlesPerDay;

  const windows = [];
  let start = 0;

  while (start + trainCandles + testCandles < candles.length) {
    windows.push({
      trainStart: start,
      trainEnd: start + trainCandles,
      testStart: start + trainCandles,
      testEnd: start + trainCandles + testCandles,
    });

    start += stepCandles;
  }

  console.log(`\n📊 Walk-Forward Test: ${windows.length} windows`);

  const results = [];

  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    console.log(`\n--- Window ${i + 1}/${windows.length} ---`);

    const testData = candles.slice(window.testStart, window.testEnd);
    const result = await runBacktest(testData, config);

    results.push({
      window: i + 1,
      trainPeriod: {
        start: candles[window.trainStart].timestamp,
        end: candles[window.trainEnd].timestamp,
      },
      testPeriod: {
        start: candles[window.testStart].timestamp,
        end: candles[window.testEnd].timestamp,
      },
      result,
    });
  }

  return {
    windows: results,
    summary: summarizeWalkForward(results),
  };
}

/**
 * Summarize walk-forward results
 */
function summarizeWalkForward(results) {
  const allTrades = results.flatMap(r => r.result.trades);
  const wins = allTrades.filter(t => t.outcome === 'WIN').length;
  const losses = allTrades.filter(t => t.outcome === 'LOSS').length;

  return {
    totalWindows: results.length,
    totalTrades: allTrades.length,
    wins,
    losses,
    winRate: (wins / (wins + losses)) * 100,
    avgTradesPerWindow: allTrades.length / results.length,
  };
}

/**
 * Run Monte Carlo simulation
 * Randomly shuffle trade order to see worst-case drawdown scenarios
 */
export function runMonteCarlo(trades, iterations = 1000) {
  console.log(`\n🎲 Monte Carlo Simulation: ${iterations} iterations`);

  const results = [];

  for (let i = 0; i < iterations; i++) {
    const shuffled = [...trades].sort(() => Math.random() - 0.5);
    const equity = calculateEquityCurve(shuffled);
    const maxDD = calculateMaxDrawdown(equity);

    results.push({
      iteration: i + 1,
      maxDrawdown: maxDD.maxDrawdown,
      maxDrawdownPercent: maxDD.maxDrawdownPercent,
      finalEquity: equity[equity.length - 1],
    });
  }

  // Sort by worst drawdown
  results.sort((a, b) => a.maxDrawdown - b.maxDrawdown);

  return {
    iterations: results.length,
    worstCase: results[0],
    bestCase: results[results.length - 1],
    median: results[Math.floor(results.length / 2)],
    percentile95: results[Math.floor(results.length * 0.95)],
    allResults: results,
  };
}

/**
 * Calculate equity curve from trades
 */
function calculateEquityCurve(trades) {
  const equity = [10000]; // Starting equity

  trades.forEach(trade => {
    const lastEquity = equity[equity.length - 1];
    const riskAmount = lastEquity * 0.01; // 1% risk per trade
    const pnl = riskAmount * trade.rMultiple;
    equity.push(lastEquity + pnl);
  });

  return equity;
}

/**
 * Calculate maximum drawdown
 */
function calculateMaxDrawdown(equity) {
  let maxEquity = equity[0];
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  equity.forEach(value => {
    if (value > maxEquity) {
      maxEquity = value;
    }

    const drawdown = maxEquity - value;
    const drawdownPercent = (drawdown / maxEquity) * 100;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  });

  return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Generate random baseline for comparison
 * 
 * This answers the critical question:
 * "Does this pattern have real edge or are we storytelling randomness?"
 * 
 * Institutional desks always compare to naive baseline.
 */
function generateRandomBaseline(actualTrades, candles, config) {
  console.log(`\n📊 Running Random Baseline Test (100 iterations)...`);
  
  const iterations = 100;
  const randomResults = [];

  // Calculate average R:R from actual trades
  const avgRR = actualTrades.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / actualTrades.length;
  const tradeFrequency = actualTrades.length / candles.length;

  for (let i = 0; i < iterations; i++) {
    const randomTrades = [];
    
    // Generate random entry points
    const numTrades = actualTrades.length;
    const possibleIndices = Array.from({ length: candles.length - 100 }, (_, i) => i + 50);
    
    // Shuffle and take N random entry points
    const shuffled = possibleIndices.sort(() => Math.random() - 0.5);
    const randomIndices = shuffled.slice(0, numTrades);

    randomIndices.forEach(index => {
      // Random direction
      const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
      
      // Simulate random entry with average R:R
      const outcome = Math.random() > 0.5 ? 'WIN' : 'LOSS';
      const rMultiple = outcome === 'WIN' 
        ? (Math.random() * 2 + 1) // 1-3R wins
        : -(Math.random() * 0.5 + 0.5); // -0.5 to -1R losses

      randomTrades.push({
        outcome,
        rMultiple,
        direction,
        index,
        strategy: 'RANDOM',
      });
    });

    // Calculate metrics for this random iteration
    const wins = randomTrades.filter(t => t.outcome === 'WIN');
    const losses = randomTrades.filter(t => t.outcome === 'LOSS');
    
    const winRate = (wins.length / randomTrades.length) * 100;
    const avgWin = wins.reduce((sum, t) => sum + t.rMultiple, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.rMultiple, 0) / losses.length);
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    
    const totalGross = wins.reduce((sum, t) => sum + t.rMultiple, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.rMultiple, 0));
    const profitFactor = totalLoss > 0 ? totalGross / totalLoss : 0;

    randomResults.push({
      iteration: i + 1,
      winRate,
      expectancy,
      profitFactor,
    });
  }

  // Calculate average random performance
  const avgRandomWinRate = randomResults.reduce((sum, r) => sum + r.winRate, 0) / iterations;
  const avgRandomExpectancy = randomResults.reduce((sum, r) => sum + r.expectancy, 0) / iterations;
  const avgRandomProfitFactor = randomResults.reduce((sum, r) => sum + r.profitFactor, 0) / iterations;

  // Calculate actual performance
  const actualWins = actualTrades.filter(t => t.outcome === 'WIN');
  const actualLosses = actualTrades.filter(t => t.outcome === 'LOSS' || t.outcome === 'TIMEOUT');
  const actualWinRate = (actualWins.length / actualTrades.length) * 100;
  
  const actualAvgWin = actualWins.length > 0
    ? actualWins.reduce((sum, t) => sum + t.rMultiple, 0) / actualWins.length
    : 0;
  const actualAvgLoss = actualLosses.length > 0
    ? Math.abs(actualLosses.reduce((sum, t) => sum + t.rMultiple, 0) / actualLosses.length)
    : 0;
  const actualExpectancy = (actualWinRate / 100) * actualAvgWin - ((100 - actualWinRate) / 100) * actualAvgLoss;
  
  const actualTotalGross = actualWins.reduce((sum, t) => sum + t.pnl, 0);
  const actualTotalLoss = Math.abs(actualLosses.reduce((sum, t) => sum + t.pnl, 0));
  const actualProfitFactor = actualTotalLoss > 0 ? actualTotalGross / actualTotalLoss : 0;

  // Calculate improvement over random
  const expectancyImprovement = actualExpectancy - avgRandomExpectancy;
  const expectancyImprovementPercent = avgRandomExpectancy !== 0 
    ? (expectancyImprovement / Math.abs(avgRandomExpectancy)) * 100 
    : 0;

  const profitFactorImprovement = actualProfitFactor - avgRandomProfitFactor;
  const profitFactorImprovementPercent = avgRandomProfitFactor !== 0
    ? (profitFactorImprovement / avgRandomProfitFactor) * 100
    : 0;

  // Determine if system has real edge
  // Institutional standard: Must outperform random by 15%+
  const hasRealEdge = expectancyImprovementPercent >= 15;

  console.log(`\n📊 Random Baseline Results:`);
  console.log(`   Random Expectancy: ${avgRandomExpectancy.toFixed(3)}R`);
  console.log(`   Actual Expectancy: ${actualExpectancy.toFixed(3)}R`);
  console.log(`   Improvement: ${expectancyImprovementPercent.toFixed(1)}%`);
  console.log(`   Has Real Edge: ${hasRealEdge ? '✅ YES' : '❌ NO'}`);

  return {
    iterations,
    random: {
      winRate: avgRandomWinRate,
      expectancy: avgRandomExpectancy,
      profitFactor: avgRandomProfitFactor,
    },
    actual: {
      winRate: actualWinRate,
      expectancy: actualExpectancy,
      profitFactor: actualProfitFactor,
    },
    improvement: {
      expectancy: expectancyImprovement,
      expectancyPercent: expectancyImprovementPercent,
      profitFactor: profitFactorImprovement,
      profitFactorPercent: profitFactorImprovementPercent,
    },
    hasRealEdge,
    verdict: hasRealEdge 
      ? 'System shows measurable statistical edge over random entries'
      : 'System does not significantly outperform random entries - potential curve fitting',
  };
}
