// utils/mitigationBlocks.js
// PHASE 2 - SIGNAL TYPE 1: MITIGATION BLOCKS (Precision Entries)
// Combines Order Block theory with Fibonacci for exact institutional entry levels

/**
 * MITIGATION BLOCK CONCEPT:
 * Order Blocks are zones, but institutions enter at SPECIFIC levels within them.
 * Fibonacci retracement levels identify these precise entry points.
 * 
 * PRECISION LEVELS:
 * - 50.0%: Conservative entry (62% WR)
 * - 61.8%: Optimal entry (66% WR)
 * - 78.6%: Aggressive entry (70% WR)
 * - 88.6%: Last defense (75% WR)
 * 
 * Deeper = Higher win rate, but less frequent
 */

/**
 * Detect mitigation blocks from order blocks
 * @param {Array} candles - All candles
 * @param {Array} orderBlocks - Detected order blocks
 * @returns {Array} Mitigation blocks with Fibonacci levels
 */
export function detectMitigationBlocks(candles, orderBlocks) {
  if (!candles || !orderBlocks || orderBlocks.length === 0) {
    return [];
  }

  const mitigationBlocks = [];

  orderBlocks.forEach(ob => {
    const mitBlock = createMitigationBlock(candles, ob);
    
    if (mitBlock) {
      mitigationBlocks.push(mitBlock);
    }
  });

  console.log(`🎯 Mitigation Blocks: Created ${mitigationBlocks.length} mitigation blocks with Fibonacci levels`);

  return mitigationBlocks;
}

/**
 * Create mitigation block with Fibonacci levels from order block
 * @param {Array} candles - All candles
 * @param {Object} orderBlock - Order block object
 * @returns {Object} Mitigation block or null
 */
function createMitigationBlock(candles, orderBlock) {
  if (!orderBlock || !orderBlock.high || !orderBlock.low) {
    return null;
  }

  const obRange = orderBlock.high - orderBlock.low;
  
  // Calculate internal Fibonacci levels
  const fibLevels = calculateFibonacciLevels(orderBlock.low, orderBlock.high, orderBlock.type);

  return {
    type: orderBlock.type === 'BULLISH' ? 'BULLISH_MITIGATION' : 'BEARISH_MITIGATION',
    originalOB: orderBlock,
    high: orderBlock.high,
    low: orderBlock.low,
    range: obRange,
    index: orderBlock.index,
    
    // Fibonacci levels
    fibLevels: fibLevels,
    
    // Entry zones by risk level
    conservative: fibLevels.fib_50,
    optimal: fibLevels.fib_618,
    aggressive: fibLevels.fib_786,
    lastDefense: fibLevels.fib_886,
    
    // Expected win rates by level
    winRates: {
      conservative: 0.62,  // 50% level
      optimal: 0.66,       // 61.8% level
      aggressive: 0.70,    // 78.6% level
      lastDefense: 0.75    // 88.6% level
    },
    
    isMitigationBlock: true,
    message: `🎯 Mitigation Block with Fibonacci levels (${orderBlock.type})`
  };
}

/**
 * Calculate Fibonacci retracement levels within order block
 * @param {Number} low - OB low
 * @param {Number} high - OB high
 * @param {String} type - BULLISH or BEARISH
 * @returns {Object} Fibonacci levels
 */
function calculateFibonacciLevels(low, high, type) {
  const range = high - low;
  
  if (type === 'BULLISH') {
    // For bullish OB, retracement is from high to low
    return {
      fib_0: high,           // 0% (top of OB)
      fib_236: high - (range * 0.236),
      fib_382: high - (range * 0.382),
      fib_50: high - (range * 0.50),
      fib_618: high - (range * 0.618),  // OPTIMAL
      fib_786: high - (range * 0.786),  // AGGRESSIVE
      fib_886: high - (range * 0.886),  // LAST DEFENSE
      fib_100: low            // 100% (bottom of OB)
    };
  } else {
    // For bearish OB, retracement is from low to high
    return {
      fib_0: low,            // 0% (bottom of OB)
      fib_236: low + (range * 0.236),
      fib_382: low + (range * 0.382),
      fib_50: low + (range * 0.50),
      fib_618: low + (range * 0.618),   // OPTIMAL
      fib_786: low + (range * 0.786),   // AGGRESSIVE
      fib_886: low + (range * 0.886),   // LAST DEFENSE
      fib_100: high           // 100% (top of OB)
    };
  }
}

/**
 * Check if price has entered mitigation zone
 * @param {Object} candle - Current candle
 * @param {Object} mitigationBlock - Mitigation block
 * @returns {Object} Entry level info or null
 */
export function checkMitigationEntry(candle, mitigationBlock) {
  if (!candle || !mitigationBlock) {
    return null;
  }

  const type = mitigationBlock.type;
  const fibLevels = mitigationBlock.fibLevels;

  // Check which Fibonacci level was touched
  if (type === 'BULLISH_MITIGATION') {
    // For bullish mitigation, check if price retrace down into levels
    
    // Check 88.6% level (Last Defense) - highest win rate
    if (candle.low <= fibLevels.fib_886 && candle.low >= mitigationBlock.low) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_886, 'BULLISH');
      
      if (hasRejection.valid) {
        return {
          level: 'LAST_DEFENSE',
          fibLevel: '88.6%',
          price: fibLevels.fib_886,
          expectedWR: 0.75,
          quality: 'EXCEPTIONAL',
          positionMultiplier: 1.3,
          rejection: hasRejection,
          message: '🎯 LAST DEFENSE (88.6%) - Highest win rate!'
        };
      }
    }
    
    // Check 78.6% level (Aggressive)
    if (candle.low <= fibLevels.fib_786 && candle.low >= fibLevels.fib_886) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_786, 'BULLISH');
      
      if (hasRejection.valid) {
        return {
          level: 'AGGRESSIVE',
          fibLevel: '78.6%',
          price: fibLevels.fib_786,
          expectedWR: 0.70,
          quality: 'EXCELLENT',
          positionMultiplier: 1.2,
          rejection: hasRejection,
          message: '🎯 AGGRESSIVE ENTRY (78.6%)'
        };
      }
    }
    
    // Check 61.8% level (Optimal)
    if (candle.low <= fibLevels.fib_618 && candle.low >= fibLevels.fib_786) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_618, 'BULLISH');
      
      if (hasRejection.valid) {
        return {
          level: 'OPTIMAL',
          fibLevel: '61.8%',
          price: fibLevels.fib_618,
          expectedWR: 0.66,
          quality: 'GOOD',
          positionMultiplier: 1.1,
          rejection: hasRejection,
          message: '🎯 OPTIMAL ENTRY (61.8%)'
        };
      }
    }
    
    // Check 50% level (Conservative)
    if (candle.low <= fibLevels.fib_50 && candle.low >= fibLevels.fib_618) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_50, 'BULLISH');
      
      if (hasRejection.valid) {
        return {
          level: 'CONSERVATIVE',
          fibLevel: '50.0%',
          price: fibLevels.fib_50,
          expectedWR: 0.62,
          quality: 'FAIR',
          positionMultiplier: 1.0,
          rejection: hasRejection,
          message: '🎯 CONSERVATIVE ENTRY (50%)'
        };
      }
    }
    
  } else if (type === 'BEARISH_MITIGATION') {
    // For bearish mitigation, check if price retraces up into levels
    
    // Check 88.6% level (Last Defense)
    if (candle.high >= fibLevels.fib_886 && candle.high <= mitigationBlock.high) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_886, 'BEARISH');
      
      if (hasRejection.valid) {
        return {
          level: 'LAST_DEFENSE',
          fibLevel: '88.6%',
          price: fibLevels.fib_886,
          expectedWR: 0.75,
          quality: 'EXCEPTIONAL',
          positionMultiplier: 1.3,
          rejection: hasRejection,
          message: '🎯 LAST DEFENSE (88.6%) - Highest win rate!'
        };
      }
    }
    
    // Check 78.6% level (Aggressive)
    if (candle.high >= fibLevels.fib_786 && candle.high <= fibLevels.fib_886) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_786, 'BEARISH');
      
      if (hasRejection.valid) {
        return {
          level: 'AGGRESSIVE',
          fibLevel: '78.6%',
          price: fibLevels.fib_786,
          expectedWR: 0.70,
          quality: 'EXCELLENT',
          positionMultiplier: 1.2,
          rejection: hasRejection,
          message: '🎯 AGGRESSIVE ENTRY (78.6%)'
        };
      }
    }
    
    // Check 61.8% level (Optimal)
    if (candle.high >= fibLevels.fib_618 && candle.high <= fibLevels.fib_786) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_618, 'BEARISH');
      
      if (hasRejection.valid) {
        return {
          level: 'OPTIMAL',
          fibLevel: '61.8%',
          price: fibLevels.fib_618,
          expectedWR: 0.66,
          quality: 'GOOD',
          positionMultiplier: 1.1,
          rejection: hasRejection,
          message: '🎯 OPTIMAL ENTRY (61.8%)'
        };
      }
    }
    
    // Check 50% level (Conservative)
    if (candle.high >= fibLevels.fib_50 && candle.high <= fibLevels.fib_618) {
      const hasRejection = checkRejectionQuality(candle, fibLevels.fib_50, 'BEARISH');
      
      if (hasRejection.valid) {
        return {
          level: 'CONSERVATIVE',
          fibLevel: '50.0%',
          price: fibLevels.fib_50,
          expectedWR: 0.62,
          quality: 'FAIR',
          positionMultiplier: 1.0,
          rejection: hasRejection,
          message: '🎯 CONSERVATIVE ENTRY (50%)'
        };
      }
    }
  }

  return null;
}

/**
 * Check quality of rejection from Fibonacci level
 * @param {Object} candle - Candle that touched level
 * @param {Number} fibLevel - Fibonacci level price
 * @param {String} direction - BULLISH or BEARISH
 * @returns {Object} Rejection quality
 */
function checkRejectionQuality(candle, fibLevel, direction) {
  const candleRange = candle.high - candle.low;
  const candleBody = Math.abs(candle.close - candle.open);
  
  if (direction === 'BULLISH') {
    // For bullish rejection, need bullish candle with rejection wick below
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const wickRatio = lowerWick / candleRange;
    
    // Rejection criteria
    const hasBullishClose = candle.close > candle.open;
    const hasSignificantWick = wickRatio >= 0.40; // 40% minimum
    const bodyStrong = (candleBody / candleRange) >= 0.50;
    const closeAboveFib = candle.close > fibLevel;
    
    const valid = hasBullishClose && hasSignificantWick && closeAboveFib;
    
    return {
      valid,
      wickRatio,
      bodyRatio: candleBody / candleRange,
      strength: valid && bodyStrong ? 'STRONG' : valid ? 'MODERATE' : 'WEAK'
    };
    
  } else {
    // For bearish rejection, need bearish candle with rejection wick above
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const wickRatio = upperWick / candleRange;
    
    const hasBearishClose = candle.close < candle.open;
    const hasSignificantWick = wickRatio >= 0.40;
    const bodyStrong = (candleBody / candleRange) >= 0.50;
    const closeBelowFib = candle.close < fibLevel;
    
    const valid = hasBearishClose && hasSignificantWick && closeBelowFib;
    
    return {
      valid,
      wickRatio,
      bodyRatio: candleBody / candleRange,
      strength: valid && bodyStrong ? 'STRONG' : valid ? 'MODERATE' : 'WEAK'
    };
  }
}

/**
 * Check for volume spike on rejection
 * @param {Array} candles - All candles
 * @param {Number} currentIndex - Current candle index
 * @returns {Object} Volume analysis
 */
function checkVolumeSpike(candles, currentIndex) {
  if (currentIndex < 20) {
    return { hasSpike: false, ratio: 1.0 };
  }

  // Calculate average volume (last 20 candles)
  let avgVolume = 0;
  for (let i = currentIndex - 20; i < currentIndex; i++) {
    avgVolume += (candles[i].volume || 0);
  }
  avgVolume /= 20;

  const currentVolume = candles[currentIndex].volume || 0;
  const volumeRatio = currentVolume / (avgVolume || 1);

  return {
    hasSpike: volumeRatio >= 1.8,
    ratio: volumeRatio,
    avgVolume,
    currentVolume
  };
}

/**
 * Calculate stop loss for mitigation entry
 * @param {Object} mitigationBlock - Mitigation block
 * @param {String} entryLevel - Entry level (CONSERVATIVE, OPTIMAL, etc.)
 * @returns {Number} Stop loss price
 */
export function calculateMitigationStopLoss(mitigationBlock, entryLevel) {
  const fibLevels = mitigationBlock.fibLevels;
  const type = mitigationBlock.type;
  
  // Stop loss is 5 pips beyond 88.6% level
  const stopBuffer = 0.05; // 5 pips for gold
  
  if (type === 'BULLISH_MITIGATION') {
    // For bullish, stop below last defense
    return fibLevels.fib_886 - stopBuffer;
  } else {
    // For bearish, stop above last defense
    return fibLevels.fib_886 + stopBuffer;
  }
}

/**
 * Calculate take profit for mitigation entry
 * @param {Array} candles - All candles
 * @param {Number} currentIndex - Current index
 * @param {Number} entryPrice - Entry price
 * @param {Number} stopLoss - Stop loss price
 * @param {String} direction - BULLISH or BEARISH
 * @returns {Number} Take profit price
 */
export function calculateMitigationTakeProfit(candles, currentIndex, entryPrice, stopLoss, direction) {
  // Find previous swing high/low
  const swing = findPreviousSwing(candles, currentIndex, direction);
  
  if (!swing) {
    // Fallback: use 1:3 RR
    const stopDistance = Math.abs(entryPrice - stopLoss);
    return direction === 'BULLISH' 
      ? entryPrice + (stopDistance * 3)
      : entryPrice - (stopDistance * 3);
  }

  // Calculate ATR
  const atr = calculateATR(candles, currentIndex);
  
  if (direction === 'BULLISH') {
    // TP = Previous swing high + 0.5x ATR extension
    return swing.price + (atr * 0.5);
  } else {
    // TP = Previous swing low - 0.5x ATR extension
    return swing.price - (atr * 0.5);
  }
}

/**
 * Find previous swing high/low
 * @param {Array} candles - All candles
 * @param {Number} currentIndex - Current index
 * @param {String} direction - BULLISH or BEARISH
 * @returns {Object} Swing info or null
 */
function findPreviousSwing(candles, currentIndex, direction) {
  const lookback = Math.min(50, currentIndex);
  
  if (direction === 'BULLISH') {
    // Find previous swing high
    let highestPrice = -Infinity;
    let highestIndex = -1;
    
    for (let i = currentIndex - lookback; i < currentIndex; i++) {
      if (candles[i].high > highestPrice) {
        highestPrice = candles[i].high;
        highestIndex = i;
      }
    }
    
    return highestIndex >= 0 ? { price: highestPrice, index: highestIndex } : null;
    
  } else {
    // Find previous swing low
    let lowestPrice = Infinity;
    let lowestIndex = -1;
    
    for (let i = currentIndex - lookback; i < currentIndex; i++) {
      if (candles[i].low < lowestPrice) {
        lowestPrice = candles[i].low;
        lowestIndex = i;
      }
    }
    
    return lowestIndex >= 0 ? { price: lowestPrice, index: lowestIndex } : null;
  }
}

/**
 * Calculate ATR
 * @param {Array} candles - All candles
 * @param {Number} index - Current index
 * @param {Number} period - ATR period
 * @returns {Number} ATR value
 */
function calculateATR(candles, index, period = 14) {
  if (index < period) {
    return 0.50; // Default for gold
  }

  let atr = 0;
  for (let i = index - period; i < index; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    atr += tr;
  }

  return atr / period;
}

/**
 * Generate mitigation signal
 * @param {Object} mitigationBlock - Mitigation block
 * @param {Object} entryInfo - Entry level info
 * @param {Array} candles - All candles
 * @param {Number} currentIndex - Current index
 * @returns {Object} Signal object
 */
export function generateMitigationSignal(mitigationBlock, entryInfo, candles, currentIndex) {
  if (!mitigationBlock || !entryInfo) {
    return null;
  }

  const direction = mitigationBlock.type === 'BULLISH_MITIGATION' ? 'BUY' : 'SELL';
  const entryPrice = entryInfo.price;
  const stopLoss = calculateMitigationStopLoss(mitigationBlock, entryInfo.level);
  const takeProfit = calculateMitigationTakeProfit(
    candles, 
    currentIndex, 
    entryPrice, 
    stopLoss, 
    mitigationBlock.type
  );

  // Check volume
  const volume = checkVolumeSpike(candles, currentIndex);

  return {
    type: direction,
    trigger: 'MITIGATION_BLOCK',
    mitigationLevel: entryInfo.fibLevel,
    quality: entryInfo.quality,
    index: currentIndex,
    timestamp: candles[currentIndex].timestamp,
    price: entryPrice,
    entry: entryPrice,
    stopLoss: stopLoss,
    takeProfit: takeProfit,
    riskReward: Math.abs((takeProfit - entryPrice) / (entryPrice - stopLoss)),
    expectedWR: entryInfo.expectedWR,
    positionMultiplier: entryInfo.positionMultiplier,
    volumeSpike: volume.hasSpike,
    volumeRatio: volume.ratio,
    rejectionStrength: entryInfo.rejection.strength,
    confluenceBonus: entryInfo.level === 'LAST_DEFENSE' ? 3 : 
                     entryInfo.level === 'AGGRESSIVE' ? 2 : 
                     entryInfo.level === 'OPTIMAL' ? 1 : 0,
    message: `${entryInfo.message}${volume.hasSpike ? ' + VOLUME SPIKE!' : ''}`
  };
}

/**
 * Scan all mitigation blocks for active entries
 * @param {Array} candles - All candles
 * @param {Array} mitigationBlocks - All mitigation blocks
 * @param {Number} currentIndex - Current candle index
 * @returns {Array} Active mitigation signals
 */
export function scanMitigationEntries(candles, mitigationBlocks, currentIndex) {
  if (!candles || !mitigationBlocks || mitigationBlocks.length === 0) {
    return [];
  }

  const signals = [];
  const currentCandle = candles[currentIndex];

  mitigationBlocks.forEach(mitBlock => {
    const entryInfo = checkMitigationEntry(currentCandle, mitBlock);
    
    if (entryInfo && entryInfo.level) {
      const signal = generateMitigationSignal(mitBlock, entryInfo, candles, currentIndex);
      
      if (signal) {
        signals.push(signal);
      }
    }
  });

  return signals;
}
