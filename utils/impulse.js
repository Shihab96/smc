// utils/impulse.js
// Rapid Buyer/Seller Impulse Detection Engine
// Uses shared utilities for displacement detection

import { calculateATR } from './liquidity.js';
import { detectDisplacementCandle, calculateAverageRange, calculateAverageBody } from './shared.js';

export function detectImpulse(candles, settings, currentIndex) {
  const {
    rangeMultiplier = 2.5,
    bodyRatio = 0.65,
    volumeMultiplier = 1.8,
    consecutiveMomentum = 3,
    atrMultiplier = 1.5,
    compressionLookback = 10,
    goldMode = false,
  } = settings;

  // Adjust for Gold mode (more sensitive)
  const adjustedMultiplier = goldMode ? rangeMultiplier * 0.8 : rangeMultiplier;
  const adjustedBodyRatio = goldMode ? bodyRatio * 0.9 : bodyRatio;

  if (currentIndex < 20) return null;

  const results = {
    displacement: null,
    momentum: null,
    compression: null,
  };

  // 1. Displacement Candle Detection
  const displacement = detectDisplacement(
    candles,
    currentIndex,
    adjustedMultiplier,
    adjustedBodyRatio,
    volumeMultiplier
  );
  if (displacement) {
    results.displacement = {
      ...displacement,
      index: currentIndex,
      timestamp: candles[currentIndex].timestamp,
    };
  }

  // 2. Momentum Acceleration Detection
  const momentum = detectMomentumBurst(
    candles,
    currentIndex,
    consecutiveMomentum,
    atrMultiplier
  );
  if (momentum) {
    results.momentum = {
      ...momentum,
      index: currentIndex,
      timestamp: candles[currentIndex].timestamp,
    };
  }

  // 3. Compression Breakout Detection
  const compression = detectCompressionBreakout(
    candles,
    currentIndex,
    compressionLookback,
    adjustedMultiplier
  );
  if (compression) {
    results.compression = {
      ...compression,
      index: currentIndex,
      timestamp: candles[currentIndex].timestamp,
    };
  }

  return results;
}

function detectDisplacement(
  candles,
  currentIndex,
  rangeMultiplier,
  bodyRatio,
  volumeMultiplier
) {
  const current = candles[currentIndex];
  const lookback = 20;
  
  const recentCandles = candles.slice(
    Math.max(0, currentIndex - lookback),
    currentIndex
  );

  if (recentCandles.length < 10) return null;

  // Calculate average range
  const avgRange =
    recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) /
    recentCandles.length;

  // Current candle metrics
  const currentRange = current.high - current.low;
  const currentBody = Math.abs(current.close - current.open);
  const bodyToRange = currentRange > 0 ? currentBody / currentRange : 0;

  // Check for large range expansion
  if (currentRange < avgRange * rangeMultiplier) return null;

  // Check for strong body
  if (bodyToRange < bodyRatio) return null;

  // Determine direction and close proximity
  const isBullish = current.close > current.open;
  const closeProximity = isBullish
    ? (current.high - current.close) / currentRange
    : (current.close - current.low) / currentRange;

  // Close must be near extreme (within 15%)
  if (closeProximity > 0.15) return null;

  // Check volume spike if available
  let volumeSpike = false;
  if (current.volume) {
    const avgVolume =
      recentCandles.reduce((sum, c) => sum + (c.volume || 0), 0) /
      recentCandles.length;
    volumeSpike = current.volume > avgVolume * volumeMultiplier;
  }

  return {
    type: isBullish ? 'IMPULSE_UP' : 'IMPULSE_DOWN',
    direction: isBullish ? 'bullish' : 'bearish',
    rangeRatio: currentRange / avgRange,
    bodyRatio: bodyToRange,
    volumeSpike,
    price: current.close,
    range: currentRange,
  };
}

function detectMomentumBurst(candles, currentIndex, consecutiveCount, atrMultiplier) {
  if (currentIndex < consecutiveCount) return null;

  const recentCandles = candles.slice(
    currentIndex - consecutiveCount + 1,
    currentIndex + 1
  );

  // Check for consecutive closes in same direction
  const allBullish = recentCandles.every((c, i) => {
    if (i === 0) return c.close > c.open;
    return c.close > c.open && c.high > recentCandles[i - 1].high;
  });

  const allBearish = recentCandles.every((c, i) => {
    if (i === 0) return c.close < c.open;
    return c.close < c.open && c.low < recentCandles[i - 1].low;
  });

  if (!allBullish && !allBearish) return null;

  // Calculate total move
  const startPrice = recentCandles[0].open;
  const endPrice = recentCandles[recentCandles.length - 1].close;
  const totalMove = Math.abs(endPrice - startPrice);

  // Calculate ATR for context
  const atr = calculateATR(candles.slice(0, currentIndex + 1), 14);
  
  // Move must be significant relative to ATR
  if (totalMove < atr * atrMultiplier) return null;

  // Calculate pip move (assuming Gold ~1-2 decimals matter)
  const pipMove = Math.round(totalMove * 100) / 100;

  return {
    type: 'MOMENTUM_BURST',
    direction: allBullish ? 'bullish' : 'bearish',
    candles: consecutiveCount,
    totalMove,
    pipMove,
    atrRatio: totalMove / atr,
    startPrice,
    endPrice,
  };
}

function detectCompressionBreakout(candles, currentIndex, lookback, multiplier) {
  if (currentIndex < lookback + 1) return null;

  const current = candles[currentIndex];
  const compressionCandles = candles.slice(
    currentIndex - lookback,
    currentIndex
  );

  // Calculate compression range (high-low of entire period)
  const compressionHigh = Math.max(...compressionCandles.map(c => c.high));
  const compressionLow = Math.min(...compressionCandles.map(c => c.low));
  const compressionRange = compressionHigh - compressionLow;

  // Calculate average individual candle range during compression
  const avgCandleRange =
    compressionCandles.reduce((sum, c) => sum + (c.high - c.low), 0) /
    compressionCandles.length;

  // Current candle range
  const currentRange = current.high - current.low;

  // Check if current candle breaks out with expansion
  const breaksAbove = current.high > compressionHigh;
  const breaksBelow = current.low < compressionLow;
  const isExpansion = currentRange > avgCandleRange * multiplier;

  if (!(breaksAbove || breaksBelow) || !isExpansion) return null;

  return {
    type: 'COMPRESSION_BREAKOUT',
    direction: breaksAbove ? 'bullish' : 'bearish',
    compressionRange,
    expansionRatio: currentRange / avgCandleRange,
    compressionHigh,
    compressionLow,
  };
}

export function detectHighProbabilitySetup(
  liquidityResult,
  impulseResult,
  mtfResult,
  settings
) {
  if (!liquidityResult || !impulseResult) return null;

  const { ssl, bsl, mss } = liquidityResult;
  const { displacement } = impulseResult;

  // Require sweep + displacement + MSS
  const hasSweep = ssl || bsl;
  const hasDisplacement = displacement;
  const hasMSS = mss && mss.confirmed;

  if (!hasSweep || !hasDisplacement || !hasMSS) return null;

  // Check direction alignment
  const sweepDirection = ssl ? 'bullish' : 'bearish';
  const displacementDirection = displacement.direction;
  const mssDirection = mss.type === 'BUY' ? 'bullish' : 'bearish';

  if (
    sweepDirection !== displacementDirection ||
    sweepDirection !== mssDirection
  ) {
    return null;
  }

  // Check MTF alignment if available
  let mtfConfirmed = false;
  if (mtfResult && mtfResult.bias) {
    const mtfBias = mtfResult.bias.toLowerCase();
    mtfConfirmed = mtfBias === sweepDirection || mtfBias === 'neutral';
  }

  return {
    type: 'HIGH_PROBABILITY',
    direction: sweepDirection,
    sweep: ssl || bsl,
    displacement,
    mss,
    mtfConfirmed,
    confidence: mtfConfirmed ? 'HIGH' : 'MEDIUM',
  };
}

export function calculateGoldPipMove(priceStart, priceEnd) {
  // Gold typically traded with 2 decimal precision
  const move = Math.abs(priceEnd - priceStart);
  return Math.round(move * 100) / 100;
}
