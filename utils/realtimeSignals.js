// utils/realtimeSignals.js
// Real-time Signal Detection for Playback Mode
// Shows signals forming as conditions are met

export function detectRealtimeSignals(candles, currentIndex, htfCandles, institutionalAnalysis) {
  if (!candles || candles.length < 100 || currentIndex < 100) {
    return {
      signals: [],
      activeConditions: [],
      triggerAlerts: []
    };
  }

  // Get visible candles up to current index
  const visibleCandles = candles.slice(0, currentIndex + 1);
  const recentCandles = visibleCandles.slice(-50); // Last 50 for analysis
  const currentCandle = candles[currentIndex];

  const signals = [];
  const activeConditions = [];
  const triggerAlerts = []; // NEW signals that just formed

  // === 1. CHECK BOS (BREAK OF STRUCTURE) ===
  const bosCheck = checkBOSFormation(visibleCandles, currentIndex);
  if (bosCheck.detected) {
    activeConditions.push({
      type: 'BOS',
      direction: bosCheck.direction,
      confidence: 85,
      price: bosCheck.breakLevel,
      timestamp: currentCandle.timestamp,
      description: `${bosCheck.direction} Break of Structure at ${bosCheck.breakLevel.toFixed(2)}`
    });

    // Check if this is a NEW signal (just formed in last 3 candles)
    if (currentIndex - bosCheck.indexDetected <= 3) {
      triggerAlerts.push({
        type: 'BOS_TRIGGERED',
        direction: bosCheck.direction,
        message: `🎯 ${bosCheck.direction} BOS JUST FORMED!`,
        price: bosCheck.breakLevel,
        index: currentIndex
      });
    }
  }

  // === 2. CHECK LIQUIDITY SWEEP ===
  const sweepCheck = checkLiquiditySweep(visibleCandles, currentIndex);
  if (sweepCheck.detected) {
    activeConditions.push({
      type: 'LIQUIDITY_SWEEP',
      direction: sweepCheck.direction,
      confidence: 80,
      price: sweepCheck.sweptLevel,
      timestamp: currentCandle.timestamp,
      description: `Liquidity sweep ${sweepCheck.direction} at ${sweepCheck.sweptLevel.toFixed(2)}`
    });

    if (currentIndex - sweepCheck.indexDetected <= 2) {
      triggerAlerts.push({
        type: 'LIQUIDITY_SWEEP_TRIGGERED',
        direction: sweepCheck.direction,
        message: `💧 LIQUIDITY SWEEP ${sweepCheck.direction}!`,
        price: sweepCheck.sweptLevel,
        index: currentIndex
      });
    }
  }

  // === 3. CHECK FVG (FAIR VALUE GAP) ===
  const fvgCheck = checkFVGFormation(visibleCandles, currentIndex);
  if (fvgCheck.detected) {
    activeConditions.push({
      type: 'FVG',
      direction: fvgCheck.direction,
      confidence: 70,
      zone: { low: fvgCheck.low, high: fvgCheck.high },
      timestamp: currentCandle.timestamp,
      description: `${fvgCheck.direction} FVG: ${fvgCheck.low.toFixed(2)} - ${fvgCheck.high.toFixed(2)}`
    });

    if (currentIndex - fvgCheck.indexDetected <= 1) {
      triggerAlerts.push({
        type: 'FVG_TRIGGERED',
        direction: fvgCheck.direction,
        message: `📦 FVG FORMED ${fvgCheck.direction}!`,
        zone: { low: fvgCheck.low, high: fvgCheck.high },
        index: currentIndex
      });
    }
  }

  // === 4. CHECK ORDER BLOCK ===
  const obCheck = checkOrderBlock(visibleCandles, currentIndex);
  if (obCheck.detected) {
    activeConditions.push({
      type: 'ORDER_BLOCK',
      direction: obCheck.direction,
      confidence: 75,
      zone: { low: obCheck.low, high: obCheck.high },
      timestamp: currentCandle.timestamp,
      description: `${obCheck.direction} Order Block: ${obCheck.low.toFixed(2)} - ${obCheck.high.toFixed(2)}`
    });

    if (currentIndex - obCheck.indexDetected <= 2) {
      triggerAlerts.push({
        type: 'ORDER_BLOCK_TRIGGERED',
        direction: obCheck.direction,
        message: `🔲 ORDER BLOCK ${obCheck.direction}!`,
        zone: { low: obCheck.low, high: obCheck.high },
        index: currentIndex
      });
    }
  }

  // === 5. CHECK PREMIUM/DISCOUNT ALIGNMENT ===
  if (institutionalAnalysis?.dealingRange) {
    const dr = institutionalAnalysis.dealingRange;
    const price = currentCandle.close;
    
    if (price < dr.mid) {
      activeConditions.push({
        type: 'IN_DISCOUNT',
        direction: 'BULLISH_ZONE',
        confidence: 65,
        price: price,
        timestamp: currentCandle.timestamp,
        description: `Price in DISCOUNT zone (${price.toFixed(2)} < ${dr.mid.toFixed(2)})`
      });
    } else if (price > dr.mid) {
      activeConditions.push({
        type: 'IN_PREMIUM',
        direction: 'BEARISH_ZONE',
        confidence: 65,
        price: price,
        timestamp: currentCandle.timestamp,
        description: `Price in PREMIUM zone (${price.toFixed(2)} > ${dr.mid.toFixed(2)})`
      });
    }
  }

  // === 6. CHECK CONFLUENCE ===
  const bullishConditions = activeConditions.filter(c => 
    c.direction?.includes('BULL') || c.direction?.includes('BUY')
  ).length;
  
  const bearishConditions = activeConditions.filter(c => 
    c.direction?.includes('BEAR') || c.direction?.includes('SELL')
  ).length;

  // Generate signal when confluence reaches threshold
  if (bullishConditions >= 3) {
    signals.push({
      type: 'BUY',
      entry: currentCandle.close,
      confluence: bullishConditions,
      conditions: activeConditions.filter(c => c.direction?.includes('BULL')),
      timestamp: currentCandle.timestamp,
      index: currentIndex
    });

    // Check if confluence just reached threshold
    const prevIndex = Math.max(0, currentIndex - 1);
    const prevBullish = countBullishConditions(candles, prevIndex, htfCandles, institutionalAnalysis);
    if (prevBullish < 3 && bullishConditions >= 3) {
      triggerAlerts.push({
        type: 'SIGNAL_APPROVED',
        direction: 'BUY',
        message: `✅ BUY SIGNAL APPROVED! (${bullishConditions}/6 confluence)`,
        price: currentCandle.close,
        index: currentIndex
      });
    }
  }

  if (bearishConditions >= 3) {
    signals.push({
      type: 'SELL',
      entry: currentCandle.close,
      confluence: bearishConditions,
      conditions: activeConditions.filter(c => c.direction?.includes('BEAR')),
      timestamp: currentCandle.timestamp,
      index: currentIndex
    });

    const prevIndex = Math.max(0, currentIndex - 1);
    const prevBearish = countBearishConditions(candles, prevIndex, htfCandles, institutionalAnalysis);
    if (prevBearish < 3 && bearishConditions >= 3) {
      triggerAlerts.push({
        type: 'SIGNAL_APPROVED',
        direction: 'SELL',
        message: `✅ SELL SIGNAL APPROVED! (${bearishConditions}/6 confluence)`,
        price: currentCandle.close,
        index: currentIndex
      });
    }
  }

  return {
    signals,
    activeConditions,
    triggerAlerts,
    confluence: {
      bullish: bullishConditions,
      bearish: bearishConditions
    }
  };
}

// === HELPER FUNCTIONS ===

function checkBOSFormation(candles, currentIndex) {
  if (currentIndex < 20) return { detected: false };

  const lookback = 20;
  const recentCandles = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);
  
  // Find swing high and low
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  let swingHighIndex = -1;
  let swingLowIndex = -1;

  for (let i = 5; i < recentCandles.length - 5; i++) {
    const candle = recentCandles[i];
    const isSwingHigh = recentCandles.slice(i - 5, i).every(c => c.high < candle.high) &&
                        recentCandles.slice(i + 1, i + 6).every(c => c.high < candle.high);
    const isSwingLow = recentCandles.slice(i - 5, i).every(c => c.low > candle.low) &&
                       recentCandles.slice(i + 1, i + 6).every(c => c.low > candle.low);

    if (isSwingHigh && candle.high > swingHigh) {
      swingHigh = candle.high;
      swingHighIndex = i;
    }
    if (isSwingLow && candle.low < swingLow) {
      swingLow = candle.low;
      swingLowIndex = i;
    }
  }

  const currentCandle = candles[currentIndex];

  // Check bullish BOS (break above swing high)
  if (swingHigh > -Infinity && currentCandle.close > swingHigh) {
    return {
      detected: true,
      direction: 'BULLISH',
      breakLevel: swingHigh,
      indexDetected: currentIndex
    };
  }

  // Check bearish BOS (break below swing low)
  if (swingLow < Infinity && currentCandle.close < swingLow) {
    return {
      detected: true,
      direction: 'BEARISH',
      breakLevel: swingLow,
      indexDetected: currentIndex
    };
  }

  return { detected: false };
}

function checkLiquiditySweep(candles, currentIndex) {
  if (currentIndex < 10) return { detected: false };

  const lookback = 15;
  const recentCandles = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);
  
  // Find equal highs (within 0.02%)
  const equalHighs = [];
  for (let i = 0; i < recentCandles.length - 1; i++) {
    for (let j = i + 1; j < recentCandles.length; j++) {
      const diff = Math.abs(recentCandles[i].high - recentCandles[j].high);
      const avg = (recentCandles[i].high + recentCandles[j].high) / 2;
      if (diff / avg < 0.0002) {
        equalHighs.push({ level: avg, indices: [i, j] });
      }
    }
  }

  // Find equal lows
  const equalLows = [];
  for (let i = 0; i < recentCandles.length - 1; i++) {
    for (let j = i + 1; j < recentCandles.length; j++) {
      const diff = Math.abs(recentCandles[i].low - recentCandles[j].low);
      const avg = (recentCandles[i].low + recentCandles[j].low) / 2;
      if (diff / avg < 0.0002) {
        equalLows.push({ level: avg, indices: [i, j] });
      }
    }
  }

  const currentCandle = candles[currentIndex];
  const prevCandle = candles[currentIndex - 1];

  // Check if swept above equal highs then reversed
  for (const eh of equalHighs) {
    if (prevCandle.high > eh.level && currentCandle.close < eh.level) {
      return {
        detected: true,
        direction: 'BEARISH',
        sweptLevel: eh.level,
        indexDetected: currentIndex
      };
    }
  }

  // Check if swept below equal lows then reversed
  for (const el of equalLows) {
    if (prevCandle.low < el.level && currentCandle.close > el.level) {
      return {
        detected: true,
        direction: 'BULLISH',
        sweptLevel: el.level,
        indexDetected: currentIndex
      };
    }
  }

  return { detected: false };
}

function checkFVGFormation(candles, currentIndex) {
  if (currentIndex < 3) return { detected: false };

  const prev = candles[currentIndex - 2];
  const current = candles[currentIndex - 1];
  const next = candles[currentIndex];

  // Bullish FVG: next.low > prev.high
  if (next.low > prev.high) {
    return {
      detected: true,
      direction: 'BULLISH',
      low: prev.high,
      high: next.low,
      indexDetected: currentIndex
    };
  }

  // Bearish FVG: next.high < prev.low
  if (next.high < prev.low) {
    return {
      detected: true,
      direction: 'BEARISH',
      low: next.high,
      high: prev.low,
      indexDetected: currentIndex
    };
  }

  return { detected: false };
}

function checkOrderBlock(candles, currentIndex) {
  if (currentIndex < 5) return { detected: false };

  // Look for displacement candle
  const current = candles[currentIndex];
  const range = current.high - current.low;
  const body = Math.abs(current.close - current.open);
  const bodyPercent = body / range;

  // Displacement detection (body > 65% of range)
  if (bodyPercent < 0.65) return { detected: false };

  const isBullish = current.close > current.open;

  // Find last opposite candle before displacement
  for (let i = currentIndex - 1; i >= Math.max(0, currentIndex - 10); i--) {
    const candle = candles[i];
    const candleIsBullish = candle.close > candle.open;

    if (candleIsBullish !== isBullish) {
      return {
        detected: true,
        direction: isBullish ? 'BULLISH' : 'BEARISH',
        low: candle.low,
        high: candle.high,
        indexDetected: currentIndex
      };
    }
  }

  return { detected: false };
}

function countBullishConditions(candles, index, htfCandles, institutionalAnalysis) {
  if (index < 0 || index >= candles.length) return 0;
  const result = detectRealtimeSignals(candles, index, htfCandles, institutionalAnalysis);
  return result.confluence.bullish;
}

function countBearishConditions(candles, index, htfCandles, institutionalAnalysis) {
  if (index < 0 || index >= candles.length) return 0;
  const result = detectRealtimeSignals(candles, index, htfCandles, institutionalAnalysis);
  return result.confluence.bearish;
}
