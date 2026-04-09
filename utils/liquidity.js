// utils/liquidity.js
// Liquidity Sweep Detection Engine
// Uses shared utilities to avoid duplication

import { findSwingPoints, findEqualLevels } from './shared.js';

export function detectLiquiditySweeps(candles, settings, currentIndex) {
  const {
    lookback = 20,
    wickRatio = 0.4,
    equalTolerance = 0.0002,
    enableMSS = true,
  } = settings;

  if (currentIndex < lookback) return [];

  const sweeps = [];

  // Detect SSL (Sell Side Liquidity)
  const ssl = detectSSL(
    candles.slice(0, currentIndex + 1),
    wickRatio,
    equalTolerance
  );

  if (ssl) {
    sweeps.push({
      type: 'SSL',
      index: currentIndex,
      level: ssl.level,
      direction: 'bullish',
      data: ssl,
    });
  }

  // Detect BSL (Buy Side Liquidity)
  const bsl = detectBSL(
    candles.slice(0, currentIndex + 1),
    wickRatio,
    equalTolerance
  );

  if (bsl) {
    sweeps.push({
      type: 'BSL',
      index: currentIndex,
      level: bsl.level,
      direction: 'bearish',
      data: bsl,
    });
  }

  // Check MSS
  if (enableMSS && sweeps.length > 0) {
    const mss = detectMSS(candles, currentIndex, lookback);
    if (mss) {
      sweeps[0].mss = mss;
    }
  }

  return sweeps;
}

function detectSSL(candles, wickRatio, equalTolerance) {
  if (candles.length < 10) return null;

  const swingLows = findSwingPoints(candles, 3).lows;
  if (swingLows.length < 2) return null;

  const recentSwingLows = swingLows.map(s => s.price);
  const equalLows = findEqualLevels(recentSwingLows, equalTolerance);

  if (equalLows.length === 0) return null;

  const lastCandle = candles[candles.length - 1];
  const closestEqualLow = equalLows.reduce((closest, level) =>
    Math.abs(level - lastCandle.low) < Math.abs(closest - lastCandle.low) ? level : closest
  );

  const sweptBelow = lastCandle.low < closestEqualLow;
  const closedAbove = lastCandle.close > closestEqualLow;
  const wickLength = (lastCandle.close - lastCandle.low) / (lastCandle.high - lastCandle.low);
  const hasWick = wickLength >= wickRatio;

  if (sweptBelow && closedAbove && hasWick) {
    return {
      level: closestEqualLow,
      wickRatio: wickLength,
      sweptBy: closestEqualLow - lastCandle.low,
    };
  }

  return null;
}

function detectBSL(candles, wickRatio, equalTolerance) {
  if (candles.length < 10) return null;

  const swingHighs = findSwingPoints(candles, 3).highs;
  if (swingHighs.length < 2) return null;

  const recentSwingHighs = swingHighs.map(s => s.price);
  const equalHighs = findEqualLevels(recentSwingHighs, equalTolerance);

  if (equalHighs.length === 0) return null;

  const lastCandle = candles[candles.length - 1];
  const closestEqualHigh = equalHighs.reduce((closest, level) =>
    Math.abs(level - lastCandle.high) < Math.abs(closest - lastCandle.high) ? level : closest
  );

  const sweptAbove = lastCandle.high > closestEqualHigh;
  const closedBelow = lastCandle.close < closestEqualHigh;
  const wickLength = (lastCandle.high - lastCandle.close) / (lastCandle.high - lastCandle.low);
  const hasWick = wickLength >= wickRatio;

  if (sweptAbove && closedBelow && hasWick) {
    return {
      level: closestEqualHigh,
      wickRatio: wickLength,
      sweptBy: lastCandle.high - closestEqualHigh,
    };
  }

  return null;
}

function detectMSS(candles, currentIndex, lookback) {
  if (currentIndex < lookback) return null;

  const recentCandles = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);

  const bullishMSS = checkBullishMSS(recentCandles);
  if (bullishMSS) return bullishMSS;

  const bearishMSS = checkBearishMSS(recentCandles);
  if (bearishMSS) return bearishMSS;

  return null;
}

function checkBullishMSS(candles) {
  const swings = findSwingPoints(candles, 3);

  if (swings.highs.length < 2 || swings.lows.length < 2) return null;

  const lastHigh = swings.highs[swings.highs.length - 1];
  const previousHigh = swings.highs[swings.highs.length - 2];
  const lastLow = swings.lows[swings.lows.length - 1];
  const previousLow = swings.lows[swings.lows.length - 2];

  const higherHigh = lastHigh.price > previousHigh.price;
  const higherLow = lastLow.price > previousLow.price;

  if (higherHigh && higherLow) {
    return {
      type: 'BULLISH_MSS',
      lastHigh: lastHigh.price,
      previousHigh: previousHigh.price,
    };
  }

  return null;
}

function checkBearishMSS(candles) {
  const swings = findSwingPoints(candles, 3);

  if (swings.highs.length < 2 || swings.lows.length < 2) return null;

  const lastHigh = swings.highs[swings.highs.length - 1];
  const previousHigh = swings.highs[swings.highs.length - 2];
  const lastLow = swings.lows[swings.lows.length - 1];
  const previousLow = swings.lows[swings.lows.length - 2];

  const lowerHigh = lastHigh.price < previousHigh.price;
  const lowerLow = lastLow.price < previousLow.price;

  if (lowerHigh && lowerLow) {
    return {
      type: 'BEARISH_MSS',
      lastLow: lastLow.price,
      previousLow: previousLow.price,
    };
  }

  return null;
}

export function calculateATR(candles, period = 14) {
  if (candles.length < period) return 0;

  const ranges = candles.slice(-period).map(c => c.high - c.low);
  return ranges.reduce((sum, r) => sum + r, 0) / period;
}
