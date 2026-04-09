// utils/dynamicSLTP.js
// DYNAMIC STOP LOSS & TAKE PROFIT CALCULATOR
// Volatility-based SL + Structure-based TP (Swing highs/lows + Liquidity)

/**
 * CONCEPT:
 * Fixed-pip SL/TP doesn't adapt to market conditions.
 * This module uses:
 * 1. ATR-based stop loss (scales with volatility)
 * 2. Structure-based take profits (swing highs/lows, round numbers, liquidity)
 * 
 * BENEFITS:
 * - SL adapts to market noise (tight in calm, wider in volatile)
 * - TP targets actual resistance/support (not arbitrary RR)
 * - Higher win rate (exits at real levels, not random distances)
 */

/**
 * Calculate ATR (Average True Range)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current candle index
 * @param {Number} period - ATR period (default 14)
 * @returns {Number} ATR value
 */
function calculateATR(candles, currentIndex, period = 14) {
  if (currentIndex < period) {
    // Not enough data - return default for gold
    return 0.50;
  }

  let atr = 0;
  for (let i = currentIndex - period; i < currentIndex; i++) {
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
 * Find swing highs (resistance levels)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current candle index
 * @param {Number} lookback - Candles to look back (default 20)
 * @returns {Array} Swing highs sorted by distance from current price
 */
function findSwingHighs(candles, currentIndex, lookback = 20) {
  if (currentIndex < 10) return [];

  const startIndex = Math.max(0, currentIndex - lookback);
  const swingHighs = [];

  // Find swing highs (local peaks)
  for (let i = startIndex + 5; i < currentIndex - 5; i++) {
    const candle = candles[i];
    let isSwingHigh = true;

    // Check if this is higher than 5 candles on each side
    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i && candles[j].high >= candle.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swingHighs.push({
        price: candle.high,
        index: i,
        distance: Math.abs(candle.high - candles[currentIndex].close)
      });
    }
  }

  // Sort by distance from current price (nearest first)
  swingHighs.sort((a, b) => a.distance - b.distance);

  return swingHighs;
}

/**
 * Find swing lows (support levels)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current candle index
 * @param {Number} lookback - Candles to look back (default 20)
 * @returns {Array} Swing lows sorted by distance from current price
 */
function findSwingLows(candles, currentIndex, lookback = 20) {
  if (currentIndex < 10) return [];

  const startIndex = Math.max(0, currentIndex - lookback);
  const swingLows = [];

  // Find swing lows (local troughs)
  for (let i = startIndex + 5; i < currentIndex - 5; i++) {
    const candle = candles[i];
    let isSwingLow = true;

    // Check if this is lower than 5 candles on each side
    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i && candles[j].low <= candle.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swingLows.push({
        price: candle.low,
        index: i,
        distance: Math.abs(candle.low - candles[currentIndex].close)
      });
    }
  }

  // Sort by distance from current price (nearest first)
  swingLows.sort((a, b) => a.distance - b.distance);

  return swingLows;
}

/**
 * Find nearest round numbers
 * @param {Number} currentPrice - Current price
 * @param {String} direction - 'BUY' or 'SELL'
 * @param {Number} maxLevels - Max round numbers to return (default 3)
 * @returns {Array} Round number levels
 */
function findRoundNumbers(currentPrice, direction, maxLevels = 3) {
  const roundNumbers = [];
  const baseLevel = Math.floor(currentPrice / 10) * 10;

  if (direction === 'BUY') {
    // Find round numbers above
    for (let i = 1; i <= maxLevels * 2; i++) {
      const level = baseLevel + (i * 10);
      if (level > currentPrice) {
        roundNumbers.push({
          price: level,
          type: i % 5 === 0 ? 'MAJOR' : 'MINOR',
          distance: level - currentPrice
        });
        if (roundNumbers.length >= maxLevels) break;
      }
    }
  } else {
    // Find round numbers below
    for (let i = 1; i <= maxLevels * 2; i++) {
      const level = baseLevel - (i * 10);
      if (level < currentPrice) {
        roundNumbers.push({
          price: level,
          type: i % 5 === 0 ? 'MAJOR' : 'MINOR',
          distance: currentPrice - level
        });
        if (roundNumbers.length >= maxLevels) break;
      }
    }
  }

  return roundNumbers;
}

/**
 * Calculate volatility-based stop loss
 * @param {Object} params - Parameters
 * @returns {Object} Stop loss details
 */
export function calculateVolatilityBasedSL(params) {
  const {
    candles,
    currentIndex,
    entryPrice,
    direction,
    confluence,
    atrPeriod = 14
  } = params;

  // Calculate ATR
  const atr = calculateATR(candles, currentIndex, atrPeriod);

  // Determine SL multiplier based on confluence
  let slAtrMultiplier = 2.0; // Default

  if (confluence >= 15) {
    slAtrMultiplier = 1.2; // PERFECT - tight SL
  } else if (confluence >= 13) {
    slAtrMultiplier = 1.5; // EXCEPTIONAL - tight SL
  } else if (confluence >= 10) {
    slAtrMultiplier = 1.8; // EXCELLENT - normal SL
  } else if (confluence >= 8) {
    slAtrMultiplier = 2.0; // VERY GOOD - normal SL
  } else {
    slAtrMultiplier = 2.5; // GOOD - wider SL
  }

  // Calculate SL price
  const slDistance = slAtrMultiplier * atr;
  const stopLoss = direction === 'BUY' 
    ? entryPrice - slDistance 
    : entryPrice + slDistance;

  // Ensure minimum SL for gold (20 pips = 0.20)
  const minSL = 0.20;
  const actualSlDistance = Math.max(slDistance, minSL);
  const actualStopLoss = direction === 'BUY'
    ? entryPrice - actualSlDistance
    : entryPrice + actualSlDistance;

  return {
    stopLoss: actualStopLoss,
    slDistance: actualSlDistance,
    atr: atr,
    atrMultiplier: slAtrMultiplier,
    slPips: actualSlDistance * 100,
    reason: `ATR-based: ${slAtrMultiplier.toFixed(1)}x ATR (${atr.toFixed(3)})`
  };
}

/**
 * Calculate dynamic take profit levels
 * @param {Object} params - Parameters
 * @returns {Object} Take profit details
 */
export function calculateDynamicTP(params) {
  const {
    candles,
    currentIndex,
    entryPrice,
    direction,
    slDistance,
    liquidityMap = null
  } = params;

  const currentPrice = candles[currentIndex].close;
  const targets = [];

  if (direction === 'BUY') {
    // === BUY TARGETS ===

    // Find swing highs above entry
    const swingHighs = findSwingHighs(candles, currentIndex, 20)
      .filter(sh => sh.price > entryPrice);

    // Find round numbers above
    const roundNumbers = findRoundNumbers(currentPrice, 'BUY', 3);

    // Find liquidity levels above (PDH, BSL, session highs)
    const liquidityLevels = [];
    if (liquidityMap) {
      if (liquidityMap.pdh && liquidityMap.pdh > entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.pdh,
          type: 'PDH',
          distance: liquidityMap.pdh - entryPrice
        });
      }
      if (liquidityMap.asia?.high && liquidityMap.asia.high > entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.asia.high,
          type: 'ASIA_HIGH',
          distance: liquidityMap.asia.high - entryPrice
        });
      }
      if (liquidityMap.london?.high && liquidityMap.london.high > entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.london.high,
          type: 'LONDON_HIGH',
          distance: liquidityMap.london.high - entryPrice
        });
      }
    }

    // TP1 (1.2-1.5 RR): Nearest swing high or round number
    const tp1Candidates = [
      ...swingHighs.slice(0, 2),
      ...roundNumbers.slice(0, 1)
    ].sort((a, b) => a.distance - b.distance);

    if (tp1Candidates.length > 0) {
      const tp1Target = tp1Candidates[0];
      const tp1Distance = tp1Target.price - entryPrice;
      const tp1RR = tp1Distance / slDistance;

      // Only use if RR >= 1.0
      if (tp1RR >= 1.0) {
        targets.push({
          level: 'TP1',
          price: tp1Target.price,
          distance: tp1Distance,
          riskReward: tp1RR,
          type: tp1Target.type || 'SWING_HIGH',
          pips: tp1Distance * 100
        });
      }
    }

    // TP2 (1.5-3.0 RR): Next swing high or liquidity level
    const tp2Candidates = [
      ...swingHighs.slice(1, 3),
      ...liquidityLevels,
      ...roundNumbers.slice(1, 2)
    ].filter(c => {
      const distance = c.price - entryPrice;
      const rr = distance / slDistance;
      return rr >= 1.5 && rr <= 4.0; // Reasonable range
    }).sort((a, b) => a.distance - b.distance);

    if (tp2Candidates.length > 0) {
      const tp2Target = tp2Candidates[0];
      const tp2Distance = tp2Target.price - entryPrice;
      const tp2RR = tp2Distance / slDistance;

      targets.push({
        level: 'TP2',
        price: tp2Target.price,
        distance: tp2Distance,
        riskReward: tp2RR,
        type: tp2Target.type || 'SWING_HIGH',
        pips: tp2Distance * 100
      });
    }

    // Fallback: If no structure found, use fixed RR
    if (targets.length === 0) {
      targets.push({
        level: 'TP1',
        price: entryPrice + (slDistance * 2.0),
        distance: slDistance * 2.0,
        riskReward: 2.0,
        type: 'FIXED_RR',
        pips: slDistance * 2.0 * 100
      });
    }

  } else {
    // === SELL TARGETS ===

    // Find swing lows below entry
    const swingLows = findSwingLows(candles, currentIndex, 20)
      .filter(sl => sl.price < entryPrice);

    // Find round numbers below
    const roundNumbers = findRoundNumbers(currentPrice, 'SELL', 3);

    // Find liquidity levels below (PDL, SSL, session lows)
    const liquidityLevels = [];
    if (liquidityMap) {
      if (liquidityMap.pdl && liquidityMap.pdl < entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.pdl,
          type: 'PDL',
          distance: entryPrice - liquidityMap.pdl
        });
      }
      if (liquidityMap.asia?.low && liquidityMap.asia.low < entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.asia.low,
          type: 'ASIA_LOW',
          distance: entryPrice - liquidityMap.asia.low
        });
      }
      if (liquidityMap.london?.low && liquidityMap.london.low < entryPrice) {
        liquidityLevels.push({
          price: liquidityMap.london.low,
          type: 'LONDON_LOW',
          distance: entryPrice - liquidityMap.london.low
        });
      }
    }

    // TP1 (1.2-1.5 RR): Nearest swing low or round number
    const tp1Candidates = [
      ...swingLows.slice(0, 2),
      ...roundNumbers.slice(0, 1)
    ].sort((a, b) => a.distance - b.distance);

    if (tp1Candidates.length > 0) {
      const tp1Target = tp1Candidates[0];
      const tp1Distance = entryPrice - tp1Target.price;
      const tp1RR = tp1Distance / slDistance;

      if (tp1RR >= 1.0) {
        targets.push({
          level: 'TP1',
          price: tp1Target.price,
          distance: tp1Distance,
          riskReward: tp1RR,
          type: tp1Target.type || 'SWING_LOW',
          pips: tp1Distance * 100
        });
      }
    }

    // TP2 (1.5-3.0 RR): Next swing low or liquidity level
    const tp2Candidates = [
      ...swingLows.slice(1, 3),
      ...liquidityLevels,
      ...roundNumbers.slice(1, 2)
    ].filter(c => {
      const distance = entryPrice - c.price;
      const rr = distance / slDistance;
      return rr >= 1.5 && rr <= 4.0;
    }).sort((a, b) => a.distance - b.distance);

    if (tp2Candidates.length > 0) {
      const tp2Target = tp2Candidates[0];
      const tp2Distance = entryPrice - tp2Target.price;
      const tp2RR = tp2Distance / slDistance;

      targets.push({
        level: 'TP2',
        price: tp2Target.price,
        distance: tp2Distance,
        riskReward: tp2RR,
        type: tp2Target.type || 'SWING_LOW',
        pips: tp2Distance * 100
      });
    }

    // Fallback: If no structure found, use fixed RR
    if (targets.length === 0) {
      targets.push({
        level: 'TP1',
        price: entryPrice - (slDistance * 2.0),
        distance: slDistance * 2.0,
        riskReward: 2.0,
        type: 'FIXED_RR',
        pips: slDistance * 2.0 * 100
      });
    }
  }

  return {
    targets: targets,
    primaryTP: targets[0]?.price || null,
    secondaryTP: targets[1]?.price || null,
    count: targets.length,
    hasStructure: targets.some(t => t.type !== 'FIXED_RR')
  };
}

/**
 * Calculate complete SL/TP for a trade
 * @param {Object} params - Trade parameters
 * @returns {Object} Complete SL/TP details
 */
export function calculateCompleteSLTP(params) {
  const {
    candles,
    currentIndex,
    entryPrice,
    direction,
    confluence = 10,
    liquidityMap = null
  } = params;

  // Step 1: Calculate volatility-based stop loss
  const slData = calculateVolatilityBasedSL({
    candles,
    currentIndex,
    entryPrice,
    direction,
    confluence
  });

  // Step 2: Calculate dynamic take profits
  const tpData = calculateDynamicTP({
    candles,
    currentIndex,
    entryPrice,
    direction,
    slDistance: slData.slDistance,
    liquidityMap
  });

  console.log(`\n🎯 DYNAMIC SL/TP CALCULATION`);
  console.log(`Direction: ${direction}`);
  console.log(`Entry: ${entryPrice.toFixed(2)}`);
  console.log(`Confluence: ${confluence}/17`);
  console.log(`\nStop Loss:`);
  console.log(`  Price: ${slData.stopLoss.toFixed(2)}`);
  console.log(`  Distance: ${slData.slDistance.toFixed(3)} (${slData.slPips.toFixed(1)} pips)`);
  console.log(`  Reason: ${slData.reason}`);
  console.log(`\nTake Profits:`);
  tpData.targets.forEach((tp, index) => {
    console.log(`  ${tp.level}: ${tp.price.toFixed(2)} (${tp.type}, ${tp.riskReward.toFixed(2)}:1 RR, ${tp.pips.toFixed(1)} pips)`);
  });
  console.log(``);

  return {
    stopLoss: slData.stopLoss,
    slDistance: slData.slDistance,
    slPips: slData.slPips,
    slReason: slData.reason,
    atr: slData.atr,
    
    takeProfit1: tpData.primaryTP,
    takeProfit2: tpData.secondaryTP,
    targets: tpData.targets,
    
    hasStructure: tpData.hasStructure,
    recommendation: tpData.hasStructure 
      ? 'Use structure-based TPs for optimal exits' 
      : 'No clear structure - using fixed RR'
  };
}
