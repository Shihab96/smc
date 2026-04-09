// utils/liquidityMapEngine.js
// FINAL LAYER 2: ADVANCED LIQUIDITY MAP ENGINE
// Track institutional liquidity zones for Gold (XAUUSD)

/**
 * LIQUIDITY MAP CONCEPT:
 * Institutions don't trade indicators - they trade LIQUIDITY.
 * Liquidity = clusters of stop losses above/below key levels.
 * 
 * KEY LIQUIDITY SOURCES:
 * 1. Previous Day High/Low (PDH/PDL)
 * 2. Session Highs/Lows (Asia/London/NY)
 * 3. Equal Highs/Lows (stop loss clusters)
 * 4. Round numbers (psychological levels)
 * 
 * INSTITUTIONAL BEHAVIOR:
 * - Sweep liquidity BEFORE reversing
 * - Use Asia range for manipulation
 * - Target BSL (above highs) for shorts
 * - Target SSL (below lows) for longs
 * 
 * IMPROVES: Entry precision, reduces fakeouts
 */

/**
 * Session definitions (UTC times)
 */
export const SESSIONS = {
  ASIA: {
    name: 'Asian Session',
    startHour: 0,
    endHour: 6,
    timezone: 'UTC'
  },
  LONDON: {
    name: 'London Session',
    startHour: 7,
    endHour: 10,
    timezone: 'UTC'
  },
  NEW_YORK: {
    name: 'New York Session',
    startHour: 12,
    endHour: 16,
    timezone: 'UTC'
  }
};

/**
 * Get current session based on UTC time
 * @param {Date} timestamp - Current timestamp
 * @returns {String} Session name
 */
function getCurrentSession(timestamp) {
  const date = new Date(timestamp);
  const utcHours = date.getUTCHours();

  if (utcHours >= SESSIONS.ASIA.startHour && utcHours < SESSIONS.ASIA.endHour) {
    return 'ASIA';
  } else if (utcHours >= SESSIONS.LONDON.startHour && utcHours < SESSIONS.LONDON.endHour) {
    return 'LONDON';
  } else if (utcHours >= SESSIONS.NEW_YORK.startHour && utcHours < SESSIONS.NEW_YORK.endHour) {
    return 'NEW_YORK';
  } else if (utcHours >= SESSIONS.LONDON.startHour && utcHours < SESSIONS.NEW_YORK.endHour) {
    return 'OVERLAP';
  }
  
  return 'ASIA'; // Default
}

/**
 * Calculate previous day levels
 * @param {Array} candles - All candles
 * @returns {Object} Previous day levels
 */
function calculatePreviousDayLevels(candles) {
  if (candles.length < 288) { // Need at least 1 day of 5-min data
    return {
      pdh: null,
      pdl: null,
      pdc: null,
      error: 'Insufficient data'
    };
  }

  // Get yesterday's date
  const lastCandle = candles[candles.length - 1];
  const currentDate = new Date(lastCandle.timestamp);
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);

  // Filter candles from previous day
  const previousDayStart = new Date(previousDate);
  previousDayStart.setHours(0, 0, 0, 0);
  
  const previousDayEnd = new Date(previousDate);
  previousDayEnd.setHours(23, 59, 59, 999);

  const previousDayCandles = candles.filter(c => {
    const candleDate = new Date(c.timestamp);
    return candleDate >= previousDayStart && candleDate <= previousDayEnd;
  });

  if (previousDayCandles.length === 0) {
    return {
      pdh: null,
      pdl: null,
      pdc: null,
      error: 'No previous day data'
    };
  }

  const pdh = Math.max(...previousDayCandles.map(c => c.high));
  const pdl = Math.min(...previousDayCandles.map(c => c.low));
  const pdc = previousDayCandles[previousDayCandles.length - 1].close;

  return {
    pdh: pdh,
    pdl: pdl,
    pdc: pdc,
    pdMid: (pdh + pdl) / 2,
    pdRange: pdh - pdl
  };
}

/**
 * Calculate session levels (Asia/London/NY)
 * @param {Array} candles - All candles
 * @returns {Object} Session levels
 */
function calculateSessionLevels(candles) {
  if (candles.length < 100) {
    return {
      asia: null,
      london: null,
      newYork: null
    };
  }

  const sessions = {
    asia: { high: -Infinity, low: Infinity },
    london: { high: -Infinity, low: Infinity },
    newYork: { high: -Infinity, low: Infinity }
  };

  // Analyze last 24 hours of candles
  const recentCandles = candles.slice(-288); // Last 24 hours (5-min candles)

  recentCandles.forEach(candle => {
    const session = getCurrentSession(candle.timestamp);
    
    if (session === 'ASIA') {
      sessions.asia.high = Math.max(sessions.asia.high, candle.high);
      sessions.asia.low = Math.min(sessions.asia.low, candle.low);
    } else if (session === 'LONDON') {
      sessions.london.high = Math.max(sessions.london.high, candle.high);
      sessions.london.low = Math.min(sessions.london.low, candle.low);
    } else if (session === 'NEW_YORK') {
      sessions.newYork.high = Math.max(sessions.newYork.high, candle.high);
      sessions.newYork.low = Math.min(sessions.newYork.low, candle.low);
    }
  });

  return {
    asia: sessions.asia.high !== -Infinity ? {
      high: sessions.asia.high,
      low: sessions.asia.low,
      mid: (sessions.asia.high + sessions.asia.low) / 2,
      range: sessions.asia.high - sessions.asia.low
    } : null,
    
    london: sessions.london.high !== -Infinity ? {
      high: sessions.london.high,
      low: sessions.london.low,
      mid: (sessions.london.high + sessions.london.low) / 2,
      range: sessions.london.high - sessions.london.low
    } : null,
    
    newYork: sessions.newYork.high !== -Infinity ? {
      high: sessions.newYork.high,
      low: sessions.newYork.low,
      mid: (sessions.newYork.high + sessions.newYork.low) / 2,
      range: sessions.newYork.high - sessions.newYork.low
    } : null
  };
}

/**
 * Detect equal highs (liquidity pools above)
 * @param {Array} candles - Candles
 * @param {Number} threshold - Similarity threshold (default 0.0005 = 0.05%)
 * @returns {Array} Equal high clusters
 */
function detectEqualHighs(candles, threshold = 0.0005) {
  if (candles.length < 50) {
    return [];
  }

  const recentCandles = candles.slice(-50);
  const equalHighClusters = [];

  // Find swing highs
  const swingHighs = [];
  for (let i = 5; i < recentCandles.length - 5; i++) {
    const candle = recentCandles[i];
    let isSwingHigh = true;

    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i && recentCandles[j].high >= candle.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swingHighs.push({
        index: i,
        price: candle.high,
        timestamp: candle.timestamp
      });
    }
  }

  // Group equal highs
  const used = new Set();
  
  for (let i = 0; i < swingHighs.length; i++) {
    if (used.has(i)) continue;

    const cluster = [swingHighs[i]];
    used.add(i);

    for (let j = i + 1; j < swingHighs.length; j++) {
      if (used.has(j)) continue;

      const priceDiff = Math.abs(swingHighs[i].price - swingHighs[j].price);
      const percentDiff = priceDiff / swingHighs[i].price;

      if (percentDiff <= threshold) {
        cluster.push(swingHighs[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((sum, s) => sum + s.price, 0) / cluster.length;
      
      equalHighClusters.push({
        type: 'EQUAL_HIGHS',
        level: avgPrice,
        count: cluster.length,
        touches: cluster,
        liquidity: 'BSL', // Buy Side Liquidity
        strength: cluster.length,
        message: `${cluster.length} equal highs at ${avgPrice.toFixed(2)}`
      });
    }
  }

  return equalHighClusters;
}

/**
 * Detect equal lows (liquidity pools below)
 * @param {Array} candles - Candles
 * @param {Number} threshold - Similarity threshold
 * @returns {Array} Equal low clusters
 */
function detectEqualLows(candles, threshold = 0.0005) {
  if (candles.length < 50) {
    return [];
  }

  const recentCandles = candles.slice(-50);
  const equalLowClusters = [];

  // Find swing lows
  const swingLows = [];
  for (let i = 5; i < recentCandles.length - 5; i++) {
    const candle = recentCandles[i];
    let isSwingLow = true;

    for (let j = i - 5; j <= i + 5; j++) {
      if (j !== i && recentCandles[j].low <= candle.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swingLows.push({
        index: i,
        price: candle.low,
        timestamp: candle.timestamp
      });
    }
  }

  // Group equal lows
  const used = new Set();
  
  for (let i = 0; i < swingLows.length; i++) {
    if (used.has(i)) continue;

    const cluster = [swingLows[i]];
    used.add(i);

    for (let j = i + 1; j < swingLows.length; j++) {
      if (used.has(j)) continue;

      const priceDiff = Math.abs(swingLows[i].price - swingLows[j].price);
      const percentDiff = priceDiff / swingLows[i].price;

      if (percentDiff <= threshold) {
        cluster.push(swingLows[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((sum, s) => sum + s.price, 0) / cluster.length;
      
      equalLowClusters.push({
        type: 'EQUAL_LOWS',
        level: avgPrice,
        count: cluster.length,
        touches: cluster,
        liquidity: 'SSL', // Sell Side Liquidity
        strength: cluster.length,
        message: `${cluster.length} equal lows at ${avgPrice.toFixed(2)}`
      });
    }
  }

  return equalLowClusters;
}

/**
 * Detect liquidity sweeps
 * @param {Array} candles - Candles
 * @param {Array} liquidityLevels - Known liquidity levels
 * @returns {Array} Detected sweeps
 */
function detectLiquiditySweeps(candles, liquidityLevels) {
  if (candles.length < 10 || liquidityLevels.length === 0) {
    return [];
  }

  const sweeps = [];
  const recentCandles = candles.slice(-20);

  for (const level of liquidityLevels) {
    for (let i = 1; i < recentCandles.length; i++) {
      const candle = recentCandles[i];
      const prevCandle = recentCandles[i - 1];

      if (level.liquidity === 'BSL') {
        // Check if swept above
        if (candle.high > level.level && candle.close < level.level) {
          sweeps.push({
            type: 'BSL_SWEEP',
            level: level.level,
            candleIndex: i,
            timestamp: candle.timestamp,
            sweepHigh: candle.high,
            closeBack: candle.close,
            direction: 'BEARISH',
            message: `BSL swept at ${level.level.toFixed(2)} - expect down move`
          });
        }
      } else if (level.liquidity === 'SSL') {
        // Check if swept below
        if (candle.low < level.level && candle.close > level.level) {
          sweeps.push({
            type: 'SSL_SWEEP',
            level: level.level,
            candleIndex: i,
            timestamp: candle.timestamp,
            sweepLow: candle.low,
            closeBack: candle.close,
            direction: 'BULLISH',
            message: `SSL swept at ${level.level.toFixed(2)} - expect up move`
          });
        }
      }
    }
  }

  return sweeps;
}

/**
 * Detect round number levels (psychological levels)
 * @param {Number} currentPrice - Current price
 * @param {Number} range - Range to scan
 * @returns {Array} Round number levels
 */
function detectRoundNumbers(currentPrice, range = 20) {
  const roundNumbers = [];
  
  // For gold, key levels are every $10 (2340, 2350, etc.)
  const baseLevel = Math.floor(currentPrice / 10) * 10;
  
  for (let i = -range; i <= range; i++) {
    const level = baseLevel + (i * 10);
    
    if (Math.abs(level - currentPrice) <= range * 10) {
      const strength = i % 5 === 0 ? 'MAJOR' : 'MINOR'; // Every $50 is major
      
      roundNumbers.push({
        type: 'ROUND_NUMBER',
        level: level,
        strength: strength,
        liquidity: level > currentPrice ? 'BSL' : 'SSL',
        message: `${strength} round number at ${level}`
      });
    }
  }

  return roundNumbers;
}

/**
 * Build complete liquidity map
 * @param {Array} candles - All candles
 * @returns {Object} Complete liquidity map
 */
export function buildLiquidityMap(candles) {
  if (!candles || candles.length < 100) {
    return {
      error: 'Insufficient data for liquidity mapping',
      pdh: null,
      pdl: null
    };
  }

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // 1. Previous day levels
  const previousDay = calculatePreviousDayLevels(candles);

  // 2. Session levels
  const sessions = calculateSessionLevels(candles);

  // 3. Equal highs/lows
  const equalHighs = detectEqualHighs(candles);
  const equalLows = detectEqualLows(candles);

  // 4. Round numbers
  const roundNumbers = detectRoundNumbers(currentPrice);

  // 5. Combine all liquidity levels
  const allLiquidityLevels = [
    ...equalHighs,
    ...equalLows,
    ...roundNumbers
  ];

  // Add previous day levels to liquidity
  if (previousDay.pdh) {
    allLiquidityLevels.push({
      type: 'PDH',
      level: previousDay.pdh,
      liquidity: 'BSL',
      strength: 'HIGH',
      message: `Previous Day High at ${previousDay.pdh.toFixed(2)}`
    });
  }

  if (previousDay.pdl) {
    allLiquidityLevels.push({
      type: 'PDL',
      level: previousDay.pdl,
      liquidity: 'SSL',
      strength: 'HIGH',
      message: `Previous Day Low at ${previousDay.pdl.toFixed(2)}`
    });
  }

  // Add session levels to liquidity
  if (sessions.asia) {
    allLiquidityLevels.push(
      {
        type: 'ASIA_HIGH',
        level: sessions.asia.high,
        liquidity: 'BSL',
        strength: 'MEDIUM',
        message: `Asia High at ${sessions.asia.high.toFixed(2)}`
      },
      {
        type: 'ASIA_LOW',
        level: sessions.asia.low,
        liquidity: 'SSL',
        strength: 'MEDIUM',
        message: `Asia Low at ${sessions.asia.low.toFixed(2)}`
      }
    );
  }

  // 6. Detect sweeps
  const sweeps = detectLiquiditySweeps(candles, allLiquidityLevels);

  // 7. Find nearest liquidity
  const liquidityAbove = allLiquidityLevels
    .filter(l => l.level > currentPrice)
    .sort((a, b) => a.level - b.level);

  const liquidityBelow = allLiquidityLevels
    .filter(l => l.level < currentPrice)
    .sort((a, b) => b.level - a.level);

  const nearestLiquidity = {
    above: liquidityAbove.length > 0 ? liquidityAbove[0] : null,
    below: liquidityBelow.length > 0 ? liquidityBelow[0] : null,
    aboveDistance: liquidityAbove.length > 0 ? liquidityAbove[0].level - currentPrice : null,
    belowDistance: liquidityBelow.length > 0 ? currentPrice - liquidityBelow[0].level : null
  };

  console.log('\n💧 LIQUIDITY MAP');
  console.log('========================================');
  console.log(`Current Price: ${currentPrice.toFixed(2)}`);
  if (previousDay.pdh) console.log(`PDH: ${previousDay.pdh.toFixed(2)}`);
  if (previousDay.pdl) console.log(`PDL: ${previousDay.pdl.toFixed(2)}`);
  if (sessions.asia) console.log(`Asia Range: ${sessions.asia.low.toFixed(2)} - ${sessions.asia.high.toFixed(2)}`);
  console.log(`Equal Highs: ${equalHighs.length}`);
  console.log(`Equal Lows: ${equalLows.length}`);
  console.log(`Recent Sweeps: ${sweeps.length}`);
  if (nearestLiquidity.above) {
    console.log(`Next Liquidity Above: ${nearestLiquidity.above.level.toFixed(2)} (+${nearestLiquidity.aboveDistance.toFixed(2)})`);
  }
  if (nearestLiquidity.below) {
    console.log(`Next Liquidity Below: ${nearestLiquidity.below.level.toFixed(2)} (-${nearestLiquidity.belowDistance.toFixed(2)})`);
  }
  console.log('========================================\n');

  return {
    // Previous day
    pdh: previousDay.pdh,
    pdl: previousDay.pdl,
    pdc: previousDay.pdc,
    pdMid: previousDay.pdMid,
    pdRange: previousDay.pdRange,

    // Sessions
    asia: sessions.asia,
    london: sessions.london,
    newYork: sessions.newYork,

    // Liquidity pools
    equalHighs: equalHighs,
    equalLows: equalLows,
    roundNumbers: roundNumbers,

    // All levels combined
    allLiquidityLevels: allLiquidityLevels,

    // Sweeps
    recentSweeps: sweeps,
    lastSweep: sweeps.length > 0 ? sweeps[sweeps.length - 1] : null,

    // Nearest liquidity
    nearestLiquidity: nearestLiquidity,

    // Current state
    currentPrice: currentPrice,
    currentSession: getCurrentSession(currentCandle.timestamp),

    // Pre-filter score (0-3)
    preFilterScore: calculateLiquidityScore(
      currentPrice,
      previousDay,
      sessions,
      nearestLiquidity,
      sweeps
    )
  };
}

/**
 * Calculate liquidity pre-filter score (0-3)
 * @param {Number} currentPrice - Current price
 * @param {Object} previousDay - Previous day data
 * @param {Object} sessions - Session data
 * @param {Object} nearestLiquidity - Nearest liquidity
 * @param {Array} sweeps - Recent sweeps
 * @returns {Number} Score 0-3
 */
function calculateLiquidityScore(currentPrice, previousDay, sessions, nearestLiquidity, sweeps) {
  let score = 0;

  // Score 1: Near major liquidity (PDH/PDL)
  if (previousDay.pdh && previousDay.pdl) {
    const distanceToPDH = Math.abs(currentPrice - previousDay.pdh);
    const distanceToPDL = Math.abs(currentPrice - previousDay.pdl);
    const minDistance = Math.min(distanceToPDH, distanceToPDL);
    
    if (minDistance < 2) { // Within $2 of PDH/PDL
      score += 1;
    }
  }

  // Score 2: Near session liquidity
  if (sessions.asia) {
    const distanceToAsiaHigh = Math.abs(currentPrice - sessions.asia.high);
    const distanceToAsiaLow = Math.abs(currentPrice - sessions.asia.low);
    const minDistance = Math.min(distanceToAsiaHigh, distanceToAsiaLow);
    
    if (minDistance < 1) { // Within $1 of Asia high/low
      score += 1;
    }
  }

  // Score 3: Recent sweep detected
  if (sweeps.length > 0) {
    const lastSweep = sweeps[sweeps.length - 1];
    const timeSinceSweep = Date.now() - new Date(lastSweep.timestamp).getTime();
    
    if (timeSinceSweep < 3600000) { // Within last hour
      score += 1;
    }
  }

  return Math.min(score, 3);
}

/**
 * Check if signal is near key liquidity
 * @param {Object} signal - Trading signal
 * @param {Object} liquidityMap - Liquidity map
 * @returns {Object} Liquidity validation
 */
export function validateSignalNearLiquidity(signal, liquidityMap) {
  if (!signal || !liquidityMap) {
    return {
      nearLiquidity: false,
      bonus: 0
    };
  }

  const signalPrice = signal.price || signal.entry;
  let bonus = 0;
  const nearLevels = [];

  // Check distance to all liquidity levels
  for (const level of liquidityMap.allLiquidityLevels) {
    const distance = Math.abs(signalPrice - level.level);
    
    if (distance < 1.0) { // Within $1
      nearLevels.push(level);
      
      // Add bonus based on strength
      if (level.strength === 'HIGH' || level.type === 'PDH' || level.type === 'PDL') {
        bonus += 2;
      } else if (level.strength === 'MEDIUM' || level.type.includes('ASIA')) {
        bonus += 1;
      }
    }
  }

  // Check if after recent sweep
  if (liquidityMap.lastSweep) {
    const sweepDirection = liquidityMap.lastSweep.direction;
    const signalDirection = signal.type === 'BUY' ? 'BULLISH' : 'BEARISH';
    
    if (sweepDirection === signalDirection) {
      bonus += 2;
      nearLevels.push({
        type: 'SWEEP_ALIGNMENT',
        message: 'Signal aligns with recent liquidity sweep'
      });
    }
  }

  return {
    nearLiquidity: nearLevels.length > 0,
    nearLevels: nearLevels,
    bonus: Math.min(bonus, 3), // Cap at +3
    message: nearLevels.length > 0 
      ? `Near ${nearLevels.length} liquidity level(s)` 
      : 'No nearby liquidity'
  };
}

/**
 * Get Asia range for Silver Bullet setups
 * @param {Object} liquidityMap - Liquidity map
 * @returns {Object} Asia range data
 */
export function getAsiaRangeForSilverBullet(liquidityMap) {
  if (!liquidityMap || !liquidityMap.asia) {
    return {
      available: false,
      error: 'No Asia session data'
    };
  }

  const asia = liquidityMap.asia;

  return {
    available: true,
    high: asia.high,
    low: asia.low,
    mid: asia.mid,
    range: asia.range,
    
    // Silver Bullet expectations
    londonShouldSweep: asia.range < 5 ? 'HIGH_LIKELY' : 'MODERATE', // Small range = likely sweep
    nyShouldContinue: true, // NY typically continues London direction
    
    message: `Asia Range: ${asia.low.toFixed(2)} - ${asia.high.toFixed(2)} (${asia.range.toFixed(2)})`
  };
}
