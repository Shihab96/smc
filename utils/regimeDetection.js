// utils/regimeDetection.js
// Market Regime Detection & Segmentation
// Identifies trending, consolidation, and high volatility regimes

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(candles, period = 20) {
  if (candles.length < period + 1) return 0;

  const trueRanges = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(candles, period = 50) {
  if (candles.length < period) return null;

  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close * k) + (ema * (1 - k));
  }

  return ema;
}

/**
 * Calculate EMA slope
 */
function calculateEMASlope(candles, period = 50, lookback = 10) {
  if (candles.length < period + lookback) return 0;

  const prices = [];
  for (let i = candles.length - lookback; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const ema = calculateEMA(slice, period);
    if (ema !== null) prices.push(ema);
  }

  if (prices.length < 2) return 0;

  // Linear regression slope
  const n = prices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = prices.reduce((sum, p) => sum + p, 0);
  const sumXY = prices.reduce((sum, p, i) => sum + (i * p), 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Normalize by price
  return slope / prices[0];
}

/**
 * Detect market structure (Higher Highs/Higher Lows vs Lower Highs/Lower Lows)
 */
function detectMarketStructure(candles, lookback = 50) {
  if (candles.length < lookback) return 'NEUTRAL';

  const recent = candles.slice(-lookback);
  
  // Find swing points
  const swingHighs = [];
  const swingLows = [];

  for (let i = 5; i < recent.length - 5; i++) {
    // Swing high
    const isSwingHigh = 
      recent.slice(i - 5, i).every(c => recent[i].high >= c.high) &&
      recent.slice(i + 1, i + 6).every(c => recent[i].high >= c.high);
    
    if (isSwingHigh) {
      swingHighs.push({ index: i, price: recent[i].high });
    }

    // Swing low
    const isSwingLow = 
      recent.slice(i - 5, i).every(c => recent[i].low <= c.low) &&
      recent.slice(i + 1, i + 6).every(c => recent[i].low <= c.low);
    
    if (isSwingLow) {
      swingLows.push({ index: i, price: recent[i].low });
    }
  }

  if (swingHighs.length < 3 || swingLows.length < 3) {
    return 'NEUTRAL';
  }

  // Check last 3 swing highs
  const lastThreeHighs = swingHighs.slice(-3);
  const higherHighs = 
    lastThreeHighs[1].price > lastThreeHighs[0].price &&
    lastThreeHighs[2].price > lastThreeHighs[1].price;

  // Check last 3 swing lows
  const lastThreeLows = swingLows.slice(-3);
  const higherLows = 
    lastThreeLows[1].price > lastThreeLows[0].price &&
    lastThreeLows[2].price > lastThreeLows[1].price;

  const lowerHighs = 
    lastThreeHighs[1].price < lastThreeHighs[0].price &&
    lastThreeHighs[2].price < lastThreeHighs[1].price;

  const lowerLows = 
    lastThreeLows[1].price < lastThreeLows[0].price &&
    lastThreeLows[2].price < lastThreeLows[1].price;

  if (higherHighs && higherLows) return 'UPTREND';
  if (lowerHighs && lowerLows) return 'DOWNTREND';
  return 'NEUTRAL';
}

/**
 * REGIME 1: Detect Trending Regime
 */
export function isTrendingRegime(candles, currentIndex) {
  if (currentIndex < 100) return false;

  const slice = candles.slice(0, currentIndex + 1);
  
  // Check EMA slope
  const emaSlope = calculateEMASlope(slice, 50, 10);
  const strongSlope = Math.abs(emaSlope) > 0.0001;

  // Check market structure
  const structure = detectMarketStructure(slice);
  const hasStructure = structure === 'UPTREND' || structure === 'DOWNTREND';

  // Check ATR (should be expanding in trends)
  const atr = calculateATR(slice, 20);
  const prevATR = calculateATR(slice.slice(0, -20), 20);
  const atrExpanding = atr > prevATR * 1.1;

  return strongSlope && hasStructure && atrExpanding;
}

/**
 * REGIME 2: Detect Consolidation Regime
 */
export function isConsolidationRegime(candles, currentIndex) {
  if (currentIndex < 100) return false;

  const slice = candles.slice(0, currentIndex + 1);
  
  // Check ATR (should be contracting)
  const atr = calculateATR(slice, 20);
  const avgATR = calculateATR(slice, 50);
  const atrContracted = atr < avgATR * 0.8;

  // Check EMA slope (should be flat)
  const emaSlope = calculateEMASlope(slice, 50, 10);
  const flatSlope = Math.abs(emaSlope) < 0.00005;

  // Check price range compression
  const recent20 = slice.slice(-20);
  const high20 = Math.max(...recent20.map(c => c.high));
  const low20 = Math.min(...recent20.map(c => c.low));
  const range20 = high20 - low20;

  const recent50 = slice.slice(-50);
  const high50 = Math.max(...recent50.map(c => c.high));
  const low50 = Math.min(...recent50.map(c => c.low));
  const range50 = high50 - low50;

  const compressed = range20 < range50 * 0.6;

  return atrContracted && flatSlope && compressed;
}

/**
 * REGIME 3: Detect High Volatility Regime
 */
export function isHighVolatilityRegime(candles, currentIndex) {
  if (currentIndex < 100) return false;

  const slice = candles.slice(0, currentIndex + 1);
  
  // Current ATR vs average ATR
  const currentATR = calculateATR(slice, 20);
  const avgATR = calculateATR(slice, 50);
  const atrSpiked = currentATR > avgATR * 1.5;

  // Daily range check (if we have enough data)
  const recent = slice.slice(-288); // ~1 day on 5m
  if (recent.length >= 288) {
    const dailyHigh = Math.max(...recent.map(c => c.high));
    const dailyLow = Math.min(...recent.map(c => c.low));
    const dailyRange = dailyHigh - dailyLow;

    // Get average 30-day range
    const last30Days = slice.slice(-288 * 30);
    const ranges = [];
    for (let i = 0; i < last30Days.length; i += 288) {
      const daySlice = last30Days.slice(i, i + 288);
      if (daySlice.length === 288) {
        const high = Math.max(...daySlice.map(c => c.high));
        const low = Math.min(...daySlice.map(c => c.low));
        ranges.push(high - low);
      }
    }

    if (ranges.length > 0) {
      const avgRange = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
      const rangeExtreme = dailyRange > avgRange * 1.5;
      
      return atrSpiked && rangeExtreme;
    }
  }

  return atrSpiked;
}

/**
 * Get current market regime
 */
export function getCurrentRegime(candles, currentIndex) {
  if (isHighVolatilityRegime(candles, currentIndex)) {
    return 'HIGH_VOLATILITY';
  }
  
  if (isTrendingRegime(candles, currentIndex)) {
    return 'TRENDING';
  }
  
  if (isConsolidationRegime(candles, currentIndex)) {
    return 'CONSOLIDATION';
  }

  return 'NEUTRAL';
}

/**
 * Calculate regime statistics for entire dataset
 */
export function calculateRegimeStats(candles) {
  const regimes = {
    TRENDING: 0,
    CONSOLIDATION: 0,
    HIGH_VOLATILITY: 0,
    NEUTRAL: 0,
  };

  for (let i = 100; i < candles.length; i++) {
    const regime = getCurrentRegime(candles, i);
    regimes[regime]++;
  }

  const total = candles.length - 100;
  
  return {
    TRENDING: {
      count: regimes.TRENDING,
      percentage: (regimes.TRENDING / total) * 100,
    },
    CONSOLIDATION: {
      count: regimes.CONSOLIDATION,
      percentage: (regimes.CONSOLIDATION / total) * 100,
    },
    HIGH_VOLATILITY: {
      count: regimes.HIGH_VOLATILITY,
      percentage: (regimes.HIGH_VOLATILITY / total) * 100,
    },
    NEUTRAL: {
      count: regimes.NEUTRAL,
      percentage: (regimes.NEUTRAL / total) * 100,
    },
    total,
  };
}

/**
 * Get regime for date range
 */
export function getRegimeForPeriod(candles, startIndex, endIndex) {
  const regimes = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    if (i >= 100) {
      regimes.push(getCurrentRegime(candles, i));
    }
  }

  // Return most common regime in period
  const counts = {};
  regimes.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Check if we're in transition between regimes
 */
export function isRegimeTransition(candles, currentIndex, lookback = 20) {
  if (currentIndex < 120) return false;

  const currentRegime = getCurrentRegime(candles, currentIndex);
  const prevRegime = getCurrentRegime(candles, currentIndex - lookback);

  return currentRegime !== prevRegime;
}
