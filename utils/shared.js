// utils/shared.js
// Shared utility functions used across multiple modules
// This eliminates duplicate code

/**
 * Find swing points (highs and lows) in candles
 * Used by: institutional.js, ltfExecution.js, liquidity.js
 */
export function findSwingPoints(candles, depth = 5) {
  const highs = [];
  const lows = [];

  for (let i = depth; i < candles.length - depth; i++) {
    const isSwingHigh = 
      candles.slice(i - depth, i).every(c => candles[i].high >= c.high) &&
      candles.slice(i + 1, i + depth + 1).every(c => candles[i].high >= c.high);
    
    if (isSwingHigh) {
      highs.push({ 
        index: i, 
        price: candles[i].high, 
        timestamp: candles[i].timestamp 
      });
    }

    const isSwingLow = 
      candles.slice(i - depth, i).every(c => candles[i].low <= c.low) &&
      candles.slice(i + 1, i + depth + 1).every(c => candles[i].low <= c.low);
    
    if (isSwingLow) {
      lows.push({ 
        index: i, 
        price: candles[i].low, 
        timestamp: candles[i].timestamp 
      });
    }
  }

  return { highs, lows };
}

/**
 * Find equal price levels within tolerance
 * Used by: institutional.js, ltfExecution.js, liquidity.js
 */
export function findEqualLevels(prices, tolerance = 0.0003) {
  const equalLevels = [];
  
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      const diff = Math.abs(prices[i] - prices[j]);
      const avgPrice = (prices[i] + prices[j]) / 2;
      
      if (diff / avgPrice <= tolerance) {
        equalLevels.push(prices[i]);
        break;
      }
    }
  }
  
  return [...new Set(equalLevels)];
}

/**
 * Find equal level groups with metadata
 * Used by: institutional.js, ltfExecution.js
 */
export function findEqualLevelGroups(points, tolerance = 0.0003) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;

    const group = [points[i]];
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;

      const diff = Math.abs(points[i].price - points[j].price);
      const avgPrice = (points[i].price + points[j].price) / 2;

      if (diff / avgPrice <= tolerance) {
        group.push(points[j]);
        used.add(j);
      }
    }

    if (group.length >= 2) {
      const avgLevel = group.reduce((sum, p) => sum + p.price, 0) / group.length;
      groups.push({
        level: avgLevel,
        count: group.length,
        points: group,
      });
    }
  }

  return groups;
}

/**
 * Detect displacement candle (large expansion)
 * Used by: institutional.js, ltfExecution.js, impulse.js
 */
export function detectDisplacementCandle(candles, lookback = 20) {
  if (!candles || candles.length < lookback) return false;

  const ranges = candles.slice(-lookback).map(c => c.high - c.low);
  const avgRange = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;

  const recentCandles = candles.slice(-5);
  
  return recentCandles.some(candle => {
    const range = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    const bodyRatio = body / range;

    return range > avgRange * 2.5 && bodyRatio > 0.65;
  });
}

/**
 * Calculate average range (ATR proxy)
 * Used by: institutional.js, ltfExecution.js, impulse.js, liquidity.js
 */
export function calculateAverageRange(candles, lookback = 20) {
  if (!candles || candles.length < lookback) return 0;

  const recentCandles = candles.slice(-lookback);
  const ranges = recentCandles.map(c => c.high - c.low);
  
  return ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
}

/**
 * Calculate ATR (Average True Range)
 * Used by: professionalRisk.js, impulse.js, institutionalTriggers.js
 */
export function calculateATR(candles, period = 14) {
  if (!candles || candles.length < period) return 0;

  const ranges = candles.slice(-period).map(c => c.high - c.low);
  return ranges.reduce((sum, r) => sum + r, 0) / period;
}

/**
 * Calculate average body size
 * Used by: impulse.js, ltfExecution.js
 */
export function calculateAverageBody(candles, lookback = 20) {
  if (!candles || candles.length < lookback) return 0;

  const recentCandles = candles.slice(-lookback);
  const bodies = recentCandles.map(c => Math.abs(c.close - c.open));
  
  return bodies.reduce((sum, b) => sum + b, 0) / bodies.length;
}

/**
 * Count touches to a price level
 * Used by: ltfExecution.js, liquidity.js
 */
export function countTouches(candles, level, type = 'high', tolerance = 0.0002) {
  const toleranceAmount = level * tolerance;
  
  return candles.filter(c => {
    const price = type === 'high' ? c.high : c.low;
    return Math.abs(price - level) <= toleranceAmount;
  }).length;
}

/**
 * Get session timing (EST)
 * Used by: institutional.js, ltfExecution.js
 */
export function getSessionTiming(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const estHour = (hour - 5 + 24) % 24;

  if (estHour >= 19 || estHour < 4) return 'ASIAN';
  if (estHour >= 3 && estHour < 12) {
    if (estHour === 3) return 'LONDON_OPEN';
    return 'LONDON';
  }
  if (estHour >= 8 && estHour < 17) {
    if (estHour === 9) return 'NY_OPEN';
    return 'NEW_YORK';
  }
  return 'OFF_HOURS';
}

/**
 * Check if in high probability session
 * Used by: institutional.js, ltfExecution.js
 */
export function isHighProbabilitySession(timestamp) {
  const session = getSessionTiming(timestamp);
  return session === 'LONDON_OPEN' || session === 'NY_OPEN';
}

/**
 * Check if in kill zone
 * Used by: ltfExecution.js
 */
export function isInKillZone(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getMinutes();
  const estHour = (hour - 5 + 24) % 24;

  // London Kill Zone: 2:00-5:00 AM EST
  if (estHour >= 2 && estHour < 5) return true;

  // NY Kill Zone: 8:30-11:00 AM EST
  if ((estHour === 8 && minute >= 30) || (estHour >= 9 && estHour < 11)) return true;

  return false;
}

/**
 * Check if volatility is expanding
 * Used by: ltfExecution.js
 */
export function isVolatilityExpanding(candles, currentIndex, lookback = 20) {
  if (currentIndex < lookback) return false;

  const recentCandles = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);
  const ranges = recentCandles.map(c => c.high - c.low);
  
  const avgRange = ranges.slice(0, -5).reduce((sum, r) => sum + r, 0) / (ranges.length - 5);
  const currentAvgRange = ranges.slice(-5).reduce((sum, r) => sum + r, 0) / 5;

  return currentAvgRange > avgRange * 1.2;
}
