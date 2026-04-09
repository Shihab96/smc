// app/api/backtest/route.js
// API Route for Running Backtests

import { NextResponse } from 'next/server';
import { runBacktest, runWalkForward, runMonteCarlo } from '../../../utils/backtesting/backtestEngine';
import { 
  calculateMetrics, 
  calculateMetricsByRegime,
  calculateMetricsBySession,
  calculateMetricsByStrategy,
  compareToRandom 
} from '../../../utils/backtesting/metrics';

/**
 * POST /api/backtest
 * Run a backtest on provided data
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { candles, config, type = 'standard' } = body;

    if (!candles || candles.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data (need at least 100 candles)',
      }, { status: 400 });
    }

    console.log(`\n🎯 Backtest API: ${type} test with ${candles.length} candles`);

    let results;

    switch (type) {
      case 'standard':
        results = await runStandardBacktest(candles, config);
        break;

      case 'walk_forward':
        results = await runWalkForwardBacktest(candles, config);
        break;

      case 'monte_carlo':
        results = await runMonteCarloBacktest(candles, config);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown backtest type: ${type}`,
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * Run standard backtest
 */
async function runStandardBacktest(candles, config) {
  console.log('Running standard backtest...');

  // Run backtest
  const backtestResults = await runBacktest(candles, config);

  // Calculate comprehensive metrics
  const metrics = calculateMetrics(backtestResults.trades);
  const metricsByRegime = calculateMetricsByRegime(backtestResults.trades);
  const metricsBySession = calculateMetricsBySession(backtestResults.trades);
  const metricsByStrategy = calculateMetricsByStrategy(backtestResults.trades);

  // Compare to random baseline
  const randomComparison = backtestResults.trades.length > 20
    ? compareToRandom(backtestResults.trades, 100)
    : null;

  return {
    ...backtestResults,
    metrics,
    metricsByRegime,
    metricsBySession,
    metricsByStrategy,
    randomComparison,
  };
}

/**
 * Run walk-forward test
 */
async function runWalkForwardBacktest(candles, config) {
  console.log('Running walk-forward test...');

  const walkForwardConfig = {
    ...config,
    trainPeriod: config.trainPeriod || 252,
    testPeriod: config.testPeriod || 63,
    stepSize: config.stepSize || 63,
  };

  const results = await runWalkForward(candles, walkForwardConfig);

  // Calculate aggregate metrics
  const allTrades = results.windows.flatMap(w => w.result.trades);
  const aggregateMetrics = calculateMetrics(allTrades);

  return {
    ...results,
    aggregateMetrics,
    totalTrades: allTrades.length,
  };
}

/**
 * Run Monte Carlo simulation
 */
async function runMonteCarloBacktest(candles, config) {
  console.log('Running Monte Carlo simulation...');

  // First run standard backtest to get trades
  const backtestResults = await runBacktest(candles, config);

  if (backtestResults.trades.length < 20) {
    throw new Error('Need at least 20 trades for Monte Carlo simulation');
  }

  // Run Monte Carlo
  const iterations = config.monteCarloIterations || 1000;
  const monteCarloResults = runMonteCarlo(backtestResults.trades, iterations);

  // Calculate metrics
  const metrics = calculateMetrics(backtestResults.trades);

  return {
    baselineMetrics: metrics,
    monteCarlo: monteCarloResults,
    trades: backtestResults.trades,
  };
}

/**
 * GET /api/backtest/test
 * Test endpoint
 */
export async function GET(request) {
  return NextResponse.json({
    success: true,
    message: 'Backtest API is running',
    endpoints: {
      POST: {
        '/api/backtest': {
          description: 'Run backtest',
          parameters: {
            candles: 'Array of candle data',
            config: 'Backtest configuration',
            type: 'standard | walk_forward | monte_carlo',
          },
        },
      },
    },
  });
}
