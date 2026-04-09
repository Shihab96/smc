// utils/backtesting/regimeDetector.js
// Gold Market Regime Detection
// Segments data into: Trending, Consolidation, High Volatility

import { calculateAverageRange } from '../shared.js';

/**
 * Detect current market regime
 */
export function detectRegime(candles, currentIndex, lookback = 50) {
  if (currentIndex < lookback) {
    return { regime: 'UNKNOWN', confidence: 0 };
  }

  const recentCandles = candles.slice(currentIndex - lookback, currentIndex + 1);

  // Calculate ATR
  const atr = calculateATR(recentCandles);
  const atr20 = calculateATR(candles.slice(Math.max(0, currentIndex - 70), currentIndex - 20));
  
  // Calculate trend strength
  const trendData = analyzeTrend(recentCandles);
  
  // Calculate consolidation score
  const consolidationScore = calculateConsolidation(recentCandles);

  // Determine regime
  const regimes = [];

  // High Volatility: ATR > 1.5x average
  if (atr > atr20 * 1.5) {
    regimes.push({ regime: 'HIGH_VOLATILITY', score: (atr / atr20) * 100 });
  }

  // Trending: Strong directional movement
  if (trendData.strength > 70) {
    regimes.push({ 
      regime: trendData.direction === 1 ? 'TRENDING_UP' : 'TRENDING_DOWN',
      score: trendData.strength 
    });
  }

  // Consolidation: Low volatility + no clear trend
  if (consolidationScore > 60 && trendData.strength < 40) {
    regimes.push({ regime: 'CONSOLIDATION', score: consolidationScore });
  }

  // Return highest scoring regime
  if (regimes.length === 0) {
    return { regime: 'NEUTRAL', confidence: 50, details: { atr, trendData } };
  }

  const primary = regimes.sort((a, b) => b.score - a.score)[0];

  return {
    regime: primary.regime,
    confidence: primary.score,
    details: {
      atr,
      atr20,
      atrRatio: atr / atr20,
      trendStrength: trendData.strength,
      trendDirection: trendData.direction,
      consolidationScore,
      allRegimes: regimes,
    },
  };
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(candles, period = 14) {
  if (candles.length < period) return 0;

  const ranges = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    ranges.push(trueRange);
  }

  const recentRanges = ranges.slice(-period);
  return recentRanges.reduce((sum, r) => sum + r, 0) / recentRanges.length;
}

/**
 * Analyze trend strength and direction
 */
function analyzeTrend(candles) {
  const closes = candles.map(c => c.close);
  
  // Calculate moving averages
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  // Current values
  const currentClose = closes[closes.length - 1];
  const currentEMA20 = ema20[ema20.length - 1];
  const currentEMA50 = ema50[ema50.length - 1];

  // Trend direction
  let direction = 0; // 1 = up, -1 = down, 0 = neutral
  
  if (currentEMA20 > currentEMA50 && currentClose > currentEMA20) {
    direction = 1;
  } else if (currentEMA20 < currentEMA50 && currentClose < currentEMA20) {
    direction = -1;
  }

  // Calculate slope of EMA50
  const ema50Slope = ema50.length >= 10 
    ? (ema50[ema50.length - 1] - ema50[ema50.length - 10]) / ema50[ema50.length - 10]
    : 0;

  const slopeStrength = Math.abs(ema50Slope) * 10000; // Scale for visibility

  // Count higher highs / higher lows (for uptrend)
  let hhCount = 0;
  let hlCount = 0;
  let lhCount = 0;
  let llCount = 0;

  for (let i = 5; i < candles.length; i += 5) {
    const current = candles[i];
    const prev = candles[i - 5];

    if (current.high > prev.high) hhCount++;
    else lhCount++;

    if (current.low > prev.low) hlCount++;
    else llCount++;
  }

  const structureScore = direction === 1 
    ? ((hhCount + hlCount) / (hhCount + hlCount + lhCount + llCount)) * 100
    : ((lhCount + llCount) / (hhCount + hlCount + lhCount + llCount)) * 100;

  // Combine factors for strength
  const strength = (structureScore * 0.6) + (slopeStrength * 0.4);

  return {
    direction,
    strength: Math.min(strength, 100),
    slope: ema50Slope,
    ema20: currentEMA20,
    ema50: currentEMA50,
    structureScore,
  };
}

/**
 * Calculate consolidation score
 */
function calculateConsolidation(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  // Range compression
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const totalRange = maxHigh - minLow;
  const avgCandle = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
  
  const rangeRatio = totalRange / (avgCandle * candles.length);

  // Price overlap (how much candles overlap)
  let overlapCount = 0;
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    const overlap = Math.min(curr.high, prev.high) - Math.max(curr.low, prev.low);
    if (overlap > 0) overlapCount++;
  }

  const overlapRatio = overlapCount / candles.length;

  // Moving average flatness
  const ema50 = calculateEMA(closes, 50);
  const ema50Std = calculateStdDev(ema50.slice(-20));
  const priceStd = calculateStdDev(closes.slice(-20));
  const flatnessRatio = ema50Std / priceStd;

  // Combine scores
  const consolidationScore = 
    (overlapRatio * 40) +
    ((1 - rangeRatio) * 30) +
    ((1 - flatnessRatio) * 30);

  return Math.min(consolidationScore * 100, 100);
}

/**
 * Calculate EMA
 */
function calculateEMA(values, period) {
  const k = 2 / (period + 1);
  const ema = [values[0]];

  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }

  return ema;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Segment entire dataset by regimes
 */
export function segmentByRegime(candles, lookback = 50) {
  const segments = {
    TRENDING_UP: [],
    TRENDING_DOWN: [],
    CONSOLIDATION: [],
    HIGH_VOLATILITY: [],
    NEUTRAL: [],
  };

  for (let i = lookback; i < candles.length; i++) {
    const regime = detectRegime(candles, i, lookback);
    
    segments[regime.regime].push({
      index: i,
      timestamp: candles[i].timestamp,
      regime: regime.regime,
      confidence: regime.confidence,
      details: regime.details,
    });
  }

  return segments;
}

/**
 * Get regime distribution
 */
export function getRegimeDistribution(candles, lookback = 50) {
  const regimes = [];

  for (let i = lookback; i < candles.length; i++) {
    const regime = detectRegime(candles, i, lookback);
    regimes.push(regime.regime);
  }

  const distribution = {};
  regimes.forEach(r => {
    distribution[r] = (distribution[r] || 0) + 1;
  });

  // Convert to percentages
  const total = regimes.length;
  Object.keys(distribution).forEach(key => {
    distribution[key] = {
      count: distribution[key],
      percentage: (distribution[key] / total) * 100,
    };
  });

  return distribution;
}

/**
 * Check if regime is favorable for strategy
 */
export function isRegimeFavorable(regime, strategyType) {
  const favorableRegimes = {
    'SWEEP_DISPLACEMENT': ['CONSOLIDATION', 'HIGH_VOLATILITY', 'TRENDING_UP', 'TRENDING_DOWN'],
    'TREND_FOLLOWING': ['TRENDING_UP', 'TRENDING_DOWN'],
    'MEAN_REVERSION': ['CONSOLIDATION'],
    'BREAKOUT': ['HIGH_VOLATILITY', 'CONSOLIDATION'],
  };

  return favorableRegimes[strategyType]?.includes(regime) || false;
}

/**
 * Calculate regime transition matrix
 * Shows probability of transitioning from one regime to another
 */
export function calculateRegimeTransitions(candles, lookback = 50) {
  const transitions = {};
  let prevRegime = null;

  for (let i = lookback; i < candles.length; i++) {
    const regime = detectRegime(candles, i, lookback).regime;

    if (prevRegime) {
      const key = `${prevRegime}_to_${regime}`;
      transitions[key] = (transitions[key] || 0) + 1;
    }

    prevRegime = regime;
  }

  return transitions;
}
