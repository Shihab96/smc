// utils/tests.js
// Test suite for detection algorithms

import { detectLiquiditySweeps, calculateATR } from './liquidity.js';
import { detectImpulse, detectHighProbabilitySetup } from './impulse.js';
import { analyzeHTFBias } from './mtf.js';

// Test data generator
export function generateTestCandles(count, basePrice = 2000, volatility = 10) {
  const candles = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    candles.push({
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000 + 500,
    });

    price = close;
  }

  return candles;
}

// Test 1: Large candle detection
export function testDisplacementCandle() {
  console.log('TEST 1: Displacement Candle Detection');
  console.log('=====================================');

  const candles = generateTestCandles(30, 2000, 5);
  
  // Insert a large displacement candle
  candles.push({
    timestamp: new Date().toISOString(),
    open: 2000,
    high: 2030, // 30 pip move (6x average)
    low: 1999,
    close: 2029,
    volume: 2000,
  });

  const settings = {
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    consecutiveMomentum: 3,
    atrMultiplier: 1.5,
    compressionLookback: 10,
    goldMode: false,
  };

  const result = detectImpulse(candles, settings, candles.length - 1);

  if (result && result.displacement) {
    console.log('✅ PASS: Displacement candle detected');
    console.log(`   Type: ${result.displacement.type}`);
    console.log(`   Range Ratio: ${result.displacement.rangeRatio.toFixed(2)}x`);
    console.log(`   Body Ratio: ${(result.displacement.bodyRatio * 100).toFixed(1)}%`);
  } else {
    console.log('❌ FAIL: Displacement candle not detected');
  }
  console.log('');
}

// Test 2: Momentum burst detection
export function testMomentumBurst() {
  console.log('TEST 2: Momentum Burst Detection');
  console.log('==================================');

  const candles = generateTestCandles(20, 2000, 2);

  // Insert 3 consecutive bullish candles
  for (let i = 0; i < 3; i++) {
    const prevHigh = candles[candles.length - 1].high;
    candles.push({
      timestamp: new Date(Date.now() + candles.length * 60000).toISOString(),
      open: prevHigh - 1,
      high: prevHigh + 5,
      low: prevHigh - 2,
      close: prevHigh + 4,
      volume: 1000,
    });
  }

  const settings = {
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    consecutiveMomentum: 3,
    atrMultiplier: 1.5,
    compressionLookback: 10,
    goldMode: false,
  };

  const result = detectImpulse(candles, settings, candles.length - 1);

  if (result && result.momentum) {
    console.log('✅ PASS: Momentum burst detected');
    console.log(`   Direction: ${result.momentum.direction}`);
    console.log(`   Candles: ${result.momentum.candles}`);
    console.log(`   Pip Move: ${result.momentum.pipMove}`);
  } else {
    console.log('❌ FAIL: Momentum burst not detected');
  }
  console.log('');
}

// Test 3: Liquidity sweep without displacement
export function testSweepWithoutDisplacement() {
  console.log('TEST 3: Sweep Without Displacement = No HP Setup');
  console.log('==================================================');

  const candles = generateTestCandles(30, 2000, 5);

  // Create equal lows
  candles[15].low = 1990;
  candles[18].low = 1990.2;

  // Create sweep candle without strong displacement
  candles.push({
    timestamp: new Date().toISOString(),
    open: 1995,
    high: 1997,
    low: 1989, // Sweeps below equal lows
    close: 1992, // Closes above but weak
    volume: 800,
  });

  const settings = {
    lookback: 20,
    wickRatio: 0.4,
    equalTolerance: 0.0002,
    enableMSS: true,
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    consecutiveMomentum: 3,
    atrMultiplier: 1.5,
    compressionLookback: 10,
    goldMode: false,
  };

  const liquidityResult = detectLiquiditySweeps(candles, settings, candles.length - 1);
  const impulseResult = detectImpulse(candles, settings, candles.length - 1);
  const hpSetup = detectHighProbabilitySetup(liquidityResult, impulseResult, null, settings);

  if (liquidityResult && liquidityResult.ssl) {
    console.log('✅ Sweep detected (expected)');
  }

  if (!impulseResult || !impulseResult.displacement) {
    console.log('✅ No displacement (expected)');
  }

  if (!hpSetup) {
    console.log('✅ PASS: No high probability setup (correct)');
  } else {
    console.log('❌ FAIL: High probability setup triggered incorrectly');
  }
  console.log('');
}

// Test 4: Complete high probability setup
export function testHighProbabilitySetup() {
  console.log('TEST 4: High Probability Setup Detection');
  console.log('=========================================');

  const candles = generateTestCandles(30, 2000, 3);

  // Create equal lows
  candles[15].low = 1990;
  candles[18].low = 1990.1;

  // Create sweep + displacement + MSS
  candles.push({
    timestamp: new Date(Date.now() + candles.length * 60000).toISOString(),
    open: 1995,
    high: 1997,
    low: 1989, // Sweeps below
    close: 1996, // Strong close above
    volume: 1500,
  });

  // Add displacement candle
  candles.push({
    timestamp: new Date(Date.now() + candles.length * 60000).toISOString(),
    open: 1996,
    high: 2015, // Large displacement
    low: 1995,
    close: 2014,
    volume: 2000,
  });

  // Add MSS confirmation (higher high)
  candles.push({
    timestamp: new Date(Date.now() + candles.length * 60000).toISOString(),
    open: 2014,
    high: 2018,
    low: 2012,
    close: 2017,
    volume: 1200,
  });

  const settings = {
    lookback: 20,
    wickRatio: 0.3,
    equalTolerance: 0.0002,
    enableMSS: true,
    rangeMultiplier: 2.0,
    bodyRatio: 0.6,
    volumeMultiplier: 1.5,
    consecutiveMomentum: 3,
    atrMultiplier: 1.5,
    compressionLookback: 10,
    goldMode: true,
  };

  // Test sweep
  const liquidityResult = detectLiquiditySweeps(candles, settings, candles.length - 3);
  
  // Test displacement
  const impulseResult = detectImpulse(candles, settings, candles.length - 2);
  
  // Test MSS
  const mssResult = detectLiquiditySweeps(candles, settings, candles.length - 1);

  // Check HP setup
  const hpSetup = detectHighProbabilitySetup(
    liquidityResult || mssResult,
    impulseResult,
    { bias: { bias: 'BULLISH' } },
    settings
  );

  console.log(`Sweep detected: ${liquidityResult?.ssl ? '✅' : '❌'}`);
  console.log(`Displacement detected: ${impulseResult?.displacement ? '✅' : '❌'}`);
  console.log(`MSS detected: ${mssResult?.mss ? '✅' : '❌'}`);

  if (hpSetup) {
    console.log('✅ PASS: High probability institutional setup detected');
    console.log(`   Direction: ${hpSetup.direction}`);
    console.log(`   Confidence: ${hpSetup.confidence}`);
  } else {
    console.log('❌ FAIL: High probability setup not detected');
  }
  console.log('');
}

// Test 5: HTF bias detection
export function testHTFBias() {
  console.log('TEST 5: Higher Timeframe Bias Detection');
  console.log('========================================');

  // Create bullish HTF structure (higher highs, higher lows)
  const bullishCandles = [];
  for (let i = 0; i < 20; i++) {
    bullishCandles.push({
      timestamp: new Date(Date.now() + i * 3600000).toISOString(),
      open: 2000 + i * 2,
      high: 2005 + i * 2,
      low: 1998 + i * 2,
      close: 2003 + i * 2,
      volume: 1000,
    });
  }

  const bullishBias = analyzeHTFBias(bullishCandles, 15);
  
  console.log(`Bullish structure detected: ${bullishBias.bias === 'BULLISH' ? '✅' : '❌'}`);
  console.log(`  Bias: ${bullishBias.bias}`);
  console.log(`  Confidence: ${bullishBias.confidence}`);

  // Create bearish HTF structure
  const bearishCandles = [];
  for (let i = 0; i < 20; i++) {
    bearishCandles.push({
      timestamp: new Date(Date.now() + i * 3600000).toISOString(),
      open: 2000 - i * 2,
      high: 2002 - i * 2,
      low: 1995 - i * 2,
      close: 1997 - i * 2,
      volume: 1000,
    });
  }

  const bearishBias = analyzeHTFBias(bearishCandles, 15);

  console.log(`Bearish structure detected: ${bearishBias.bias === 'BEARISH' ? '✅' : '❌'}`);
  console.log(`  Bias: ${bearishBias.bias}`);
  console.log(`  Confidence: ${bearishBias.confidence}`);
  console.log('');
}

// Test 6: Gold mode sensitivity
export function testGoldMode() {
  console.log('TEST 6: Gold Aggressive Mode');
  console.log('=============================');

  const candles = generateTestCandles(30, 2000, 5);

  // Insert medium-sized candle (should trigger only in Gold mode)
  candles.push({
    timestamp: new Date().toISOString(),
    open: 2000,
    high: 2018, // 18 pips (2.2x average, below standard 2.5x)
    low: 1999,
    close: 2017,
    volume: 1500,
  });

  const standardSettings = {
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    goldMode: false,
  };

  const goldSettings = {
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    goldMode: true,
  };

  const standardResult = detectImpulse(candles, standardSettings, candles.length - 1);
  const goldResult = detectImpulse(candles, goldSettings, candles.length - 1);

  console.log(`Standard mode detects: ${standardResult?.displacement ? 'YES' : 'NO'}`);
  console.log(`Gold mode detects: ${goldResult?.displacement ? 'YES' : 'NO'}`);

  if (!standardResult?.displacement && goldResult?.displacement) {
    console.log('✅ PASS: Gold mode is more sensitive (correct)');
  } else {
    console.log('❌ FAIL: Gold mode sensitivity not working');
  }
  console.log('');
}

// Run all tests
export function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   LIQUIDITY SWEEP TRADER - DETECTION ALGORITHM TESTS   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');

  testDisplacementCandle();
  testMomentumBurst();
  testSweepWithoutDisplacement();
  testHighProbabilitySetup();
  testHTFBias();
  testGoldMode();

  console.log('═══════════════════════════════════════════════════════');
  console.log('All tests completed!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  window.runTests = runAllTests;
}
