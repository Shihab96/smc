// app/api/backtest/run/route.js
// API Route for Running Backtests with Professional 3-Layer MTF

import { NextResponse } from 'next/server';
import { BacktestEngine } from '../../../../utils/backtestEngine';
import { generateStatisticalReport } from '../../../../utils/backtestStats';
import { setupMTFStructure, aggregateCandles } from '../../../../utils/mtfMapper';

/**
 * Fetch data from Finage API
 */
async function fetchFromFinage(symbol, timeframe, hours) {
  const apiKey = process.env.FINAGE_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ FINAGE_API_KEY not set, using sample data');
    const { generateGoldSampleData } = await import('../../../../utils/sampleData');
    return generateGoldSampleData(hours * 12, timeframe); // Approximate candles
  }

  console.log(`📊 Fetching ${timeframe} data from Finage (${hours} hours)...`);

  const finageTimeframe = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
  }[timeframe] || '5';

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const url = `https://api.finage.co.uk/history/${symbol}/forex?period=${finageTimeframe}&from=${startStr}&to=${endStr}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finage API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.results || data.results.length === 0) {
      throw new Error('No data returned from Finage');
    }

    const candles = data.results.map(item => ({
      timestamp: new Date(item.t).toISOString(),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v || 0,
    }));

    console.log(`✅ Fetched ${candles.length} ${timeframe} candles from Finage`);
    return candles;

  } catch (error) {
    console.error(`❌ Finage fetch failed:`, error);
    const { generateGoldSampleData } = await import('../../../../utils/sampleData');
    return generateGoldSampleData(hours * 12, timeframe);
  }
}

/**
 * POST /api/backtest/run
 * Run backtest with Professional 3-Layer MTF
 */
export async function POST(request) {
  try {
    const config = await request.json();

    console.log('\n🧪 Starting Professional Backtest with 3-Layer MTF...');

    // Setup MTF structure (Default: 5M entry, 15M setup, 1H direction)
    const mtfSetup = setupMTFStructure('5m');

    console.log('\n🎯 MTF Structure:');
    console.log(`   HTF (Direction): ${mtfSetup.structure.htf}`);
    console.log(`   ITF (Setup):     ${mtfSetup.structure.itf}`);
    console.log(`   LTF (Entry):     ${mtfSetup.structure.ltf}`);
    console.log(`   Fetching:        ${mtfSetup.fetchParams.hours} hours\n`);

    // PROFESSIONAL APPROACH: Fetch only LTF, build ITF/HTF via aggregation
    let ltfCandles;

    try {
      console.log('📊 Fetching LTF data...');
      ltfCandles = await fetchFromFinage('XAUUSD', mtfSetup.structure.ltf, mtfSetup.fetchParams.hours);
      console.log(`✅ Fetched ${ltfCandles.length} LTF candles`);

    } catch (error) {
      console.error('❌ Failed to fetch market data:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch market data: ' + error.message,
      }, { status: 500 });
    }

    // Aggregate LTF → ITF → HTF
    console.log('\n🔄 Aggregating candles...');
    const itfCandles = aggregateCandles(ltfCandles, mtfSetup.structure.itf);
    const htfCandles = aggregateCandles(ltfCandles, mtfSetup.structure.htf);

    console.log(`✅ Built ITF: ${itfCandles.length} candles (${mtfSetup.structure.itf})`);
    console.log(`✅ Built HTF: ${htfCandles.length} candles (${mtfSetup.structure.htf})`);

    // Create backtest config
    const backtestConfig = {
      accountSize: config.accountSize || 10000,
      riskPerTrade: config.riskPerTrade || 100,
      
      strategies: {
        htfBias: true,        // HTF direction
        mtfValidation: true,  // ITF setup
        ltfExecution: true,   // LTF entry
        liquiditySweeps: false,
        impulse: false,
      },

      filters: {
        htfMinScore: config.htfMinScore || 50,        // HTF
        mtfMinScore: config.mtfMinScore || 60,        // ITF
        ltfMinConfidence: config.ltfMinConfidence || 75, // LTF
        killZoneOnly: config.killZoneOnly !== false,
        avoidRollover: config.avoidRollover !== false,
        regimeFilter: config.regimeFilter || null,
      },

      execution: {
        useRealisticSpread: config.useRealisticSpread !== false,
        useRealisticSlippage: config.useRealisticSlippage !== false,
        worstCaseExecution: config.worstCaseExecution !== false,
        maxSlippage: 50,
      },

      startDate: config.startDate || null,
      endDate: config.endDate || null,
    };

    // Run backtest with 3-layer MTF
    console.log('\n🚀 Starting Backtest Engine...');
    console.log('Using Professional 3-Layer MTF (HTF → ITF → LTF)');
    
    const engine = new BacktestEngine(backtestConfig);
    
    // Pass all three layers
    const results = await engine.runBacktest(
      ltfCandles,   // LTF for execution
      htfCandles,   // HTF for direction
      itfCandles    // ITF for setup validation
    );

    console.log('\n📈 Backtest Complete!');
    console.log('──────────────────────────────────────');
    console.log(`Total Trades:      ${results.summary.totalTrades}`);
    console.log(`Win Rate:          ${results.summary.winRate.toFixed(1)}%`);
    console.log(`Profit Factor:     ${results.summary.profitFactor.toFixed(2)}`);
    console.log(`Total P&L:         $${results.summary.totalPnL.toFixed(2)}`);
    console.log(`Max Drawdown:      $${results.summary.maxDrawdown.amount.toFixed(2)} (${results.summary.maxDrawdown.percentage.toFixed(1)}%)`);
    console.log(`Avg R:             ${results.summary.avgR.toFixed(2)}`);
    console.log(`Expectancy:        $${results.summary.expectancy.toFixed(2)}/trade`);

    // Generate statistical report
    console.log('\n📊 Running Statistical Analysis...');
    const stats = generateStatisticalReport(results, ltfCandles);

    console.log('──────────────────────────────────────');
    console.log(`Monte Carlo Worst DD: $${stats.monteCarlo.worst.maxDrawdown.toFixed(2)}`);
    console.log(`Expectancy Stable:    ${stats.expectancyStability.stable ? '✅' : '❌'}`);
    console.log(`Profit Factor Stable: ${stats.profitFactorStability.stable ? '✅' : '❌'}`);
    console.log(`Overfitted:           ${stats.overfitting.overfitted ? '❌ YES' : '✅ NO'}`);

    if (stats.overfitting.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      stats.overfitting.warnings.forEach(w => {
        console.log(`   ${w.severity}: ${w.message}`);
      });
    }

    console.log('\n✅ Backtest Results Ready\n');

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        stats,
        mtfInfo: {
          structure: mtfSetup.structure,
          ltfCandles: ltfCandles.length,
          itfCandles: itfCandles.length,
          htfCandles: htfCandles.length,
          goldOptimized: mtfSetup.structure.recommended,
        },
      },
    });

  } catch (error) {
    console.error('❌ Backtest Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * GET /api/backtest/run
 * Get backtest status
 */
export async function GET(request) {
  return NextResponse.json({
    success: true,
    message: 'Professional 3-Layer MTF Backtest API Ready',
    dataSource: process.env.FINAGE_API_KEY ? 'Finage API' : 'Sample Data (set FINAGE_API_KEY)',
    mtfStructure: 'HTF (1H Direction) → ITF (15M Setup) → LTF (5M Entry)',
    goldOptimized: true,
    endpoints: {
      run: 'POST /api/backtest/run',
    },
  });
}
