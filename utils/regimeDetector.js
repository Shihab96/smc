// utils/regimeDetector.js
// Professional Market Regime Detection System
// As recommended by institutional assessment

/**
 * MARKET REGIME CLASSIFICATION
 * 
 * The AI determines market state, then applies appropriate strategy.
 * This is how professional quant funds operate.
 */

import { calculateATR } from './shared.js';

/**
 * Calculate ADX (Average Directional Index)
 * Measures trend strength
 */
function calculateADX(candles, period = 14) {
  if (candles.length < period + 1) return 0;

  const trueRanges = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
      minusDM.push(0);
    } else if (downMove > upMove && downMove > 0) {
      plusDM.push(0);
      minusDM.push(downMove);
    } else {
      plusDM.push(0);
      minusDM.push(0);
    }
  }

  // Smooth with EMA
  const smoothPlusDM = ema(plusDM.slice(-period), period);
  const smoothMinusDM = ema(minusDM.slice(-period), period);
  const smoothTR = ema(trueRanges.slice(-period), period);

  if (smoothTR === 0) return 0;

  const plusDI = (smoothPlusDM / smoothTR) * 100;
  const minusDI = (smoothMinusDM / smoothTR) * 100;

  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return dx;
}

/**
 * Simple EMA calculation
 */
function ema(values, period) {
  if (values.length === 0) return 0;
  
  const k = 2 / (period + 1);
  let emaValue = values[0];

  for (let i = 1; i < values.length; i++) {
    emaValue = (values[i] * k) + (emaValue * (1 - k));
  }

  return emaValue;
}

/**
 * Detect market structure (BOS/CHOCH)
 */
function detectMarketStructure(candles, lookback = 20) {
  if (candles.length < lookback) return { type: 'UNKNOWN', confidence: 0 };

  const recent = candles.slice(-lookback);
  
  // Find swing points
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  // Check for higher highs / higher lows (uptrend)
  let higherHighs = 0;
  let higherLows = 0;
  
  for (let i = 5; i < recent.length; i++) {
    const prevHigh = Math.max(...highs.slice(i - 5, i));
    const prevLow = Math.min(...lows.slice(i - 5, i));
    
    if (recent[i].high > prevHigh) higherHighs++;
    if (recent[i].low > prevLow) higherLows++;
  }

  // Check for lower highs / lower lows (downtrend)
  let lowerHighs = 0;
  let lowerLows = 0;
  
  for (let i = 5; i < recent.length; i++) {
    const prevHigh = Math.max(...highs.slice(i - 5, i));
    const prevLow = Math.min(...lows.slice(i - 5, i));
    
    if (recent[i].high < prevHigh) lowerHighs++;
    if (recent[i].low < prevLow) lowerLows++;
  }

  // Determine structure
  if (higherHighs >= 3 && higherLows >= 3) {
    return { type: 'UPTREND', confidence: Math.min(higherHighs + higherLows, 10) / 10 };
  } else if (lowerHighs >= 3 && lowerLows >= 3) {
    return { type: 'DOWNTREND', confidence: Math.min(lowerHighs + lowerLows, 10) / 10 };
  } else {
    return { type: 'RANGING', confidence: 0.5 };
  }
}

/**
 * Calculate Bollinger Band Width
 * Measures volatility compression/expansion
 */
function calculateBBWidth(candles, period = 20) {
  if (candles.length < period) return 0;

  const recent = candles.slice(-period);
  const closes = recent.map(c => c.close);
  
  const sma = closes.reduce((sum, c) => sum + c, 0) / period;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upperBand = sma + (2 * stdDev);
  const lowerBand = sma - (2 * stdDev);
  
  const width = ((upperBand - lowerBand) / sma) * 100;
  return width;
}

/**
 * MASTER REGIME DETECTOR
 * 
 * Professional classification as per PDF recommendations
 */
export function detectMarketRegime(candles, currentIndex) {
  if (candles.length < 50 || currentIndex < 50) {
    return {
      regime: 'INSUFFICIENT_DATA',
      confidence: 0,
      characteristics: {},
      bestStrategies: [],
    };
  }

  const relevantCandles = candles.slice(0, currentIndex + 1);
  const recent50 = relevantCandles.slice(-50);

  // Calculate regime indicators
  const adx = calculateADX(relevantCandles, 14);
  const atr = calculateATR(relevantCandles, 14);
  const avgATR = calculateATR(relevantCandles.slice(-50), 14);
  const structure = detectMarketStructure(relevantCandles, 20);
  const bbWidth = calculateBBWidth(relevantCandles, 20);

  // Calculate directional consistency
  const last10 = recent50.slice(-10);
  const bullishCandles = last10.filter(c => c.close > c.open).length;
  const bearishCandles = last10.filter(c => c.close < c.open).length;
  const directionalConsistency = Math.max(bullishCandles, bearishCandles) / 10;

  // Volatility ratio
  const volatilityRatio = avgATR > 0 ? atr / avgATR : 1;

  // REGIME CLASSIFICATION (Professional Logic)
  
  // 1. STRONG TRENDING (ADX > 25, Clear BOS, Consecutive HH/LL)
  if (adx > 25 && directionalConsistency > 0.7 && 
      (structure.type === 'UPTREND' || structure.type === 'DOWNTREND')) {
    
    const direction = structure.type === 'UPTREND' ? 'BULLISH' : 'BEARISH';
    
    return {
      regime: `STRONG_TREND_${direction}`,
      confidence: 0.8 + (structure.confidence * 0.2),
      characteristics: {
        adx,
        structure: structure.type,
        directionalConsistency,
        volatilityRatio,
      },
      bestStrategies: [
        'BOS_CONTINUATION',
        'FIRST_FVG_AFTER_BOS',
        'DISPLACEMENT_ENTRY',
      ],
      description: `Strong ${direction.toLowerCase()} trend with clear market structure`,
      stopLossRecommendation: atr * 1.5, // ATR-based (professional recommendation)
    };
  }

  // 2. RANGING / CONSOLIDATION (ADX < 20, Price oscillating)
  if (adx < 20 && bbWidth < 2.0) {
    return {
      regime: 'RANGING',
      confidence: 0.75,
      characteristics: {
        adx,
        bbWidth,
        structure: structure.type,
        volatilityRatio,
      },
      bestStrategies: [
        'LIQUIDITY_GRAB_EQUAL_HIGHS_LOWS',
        'TRENDLINE_LIQUIDITY_TRAP',
        'ORDER_BLOCK_FVG_CONFLUENCE',
      ],
      description: 'Consolidation - trade liquidity sweeps and mean reversion',
      stopLossRecommendation: atr * 1.2,
    };
  }

  // 3. HIGH VOLATILITY (ATR > 1.5x average)
  if (volatilityRatio > 1.5) {
    return {
      regime: 'HIGH_VOLATILITY',
      confidence: 0.7,
      characteristics: {
        atr,
        avgATR,
        volatilityRatio,
        adx,
      },
      bestStrategies: [
        'VOLUME_CLIMAX_REVERSAL',
        'NEWS_SPIKE_WAIT_15MIN',
        'LIQUIDITY_SWEEP_AFTER_VOLATILITY',
      ],
      description: 'High volatility - wait for stabilization or trade reversals',
      stopLossRecommendation: atr * 2.0, // Wider stops in volatility
    };
  }

  // 4. REVERSAL / CHOCH (Break of structure against trend)
  if (structure.type === 'RANGING' && directionalConsistency < 0.6 && adx > 15) {
    return {
      regime: 'REVERSAL_CHOCH',
      confidence: 0.65,
      characteristics: {
        structure: structure.type,
        adx,
        directionalConsistency,
      },
      bestStrategies: [
        'BREAKER_BLOCK_REVERSAL',
        'CHOCH_RETEST_ENTRY',
        'SMT_DIVERGENCE_FVG',
      ],
      description: 'Potential reversal - look for CHOCH and structure breaks',
      stopLossRecommendation: atr * 1.8,
    };
  }

  // 5. WEAK TREND (Default)
  return {
    regime: 'WEAK_TREND',
    confidence: 0.5,
    characteristics: {
      adx,
      structure: structure.type,
      volatilityRatio,
    },
    bestStrategies: [
      'ORDER_BLOCK_FVG_CONFLUENCE',
      'LIQUIDITY_SWEEP_MSS',
    ],
    description: 'Weak trend - be selective, wait for high-quality setups',
    stopLossRecommendation: atr * 1.5,
  };
}

/**
 * Get strategy recommendation based on regime
 */
export function getStrategyForRegime(regime) {
  const strategyMap = {
    'STRONG_TREND_BULLISH': {
      entry: 'Buy on pullback to FVG or Order Block',
      stop: 'Below recent swing low (ATR-based)',
      target: '1:2.5 RR minimum',
      confidence: 'High (60-65% win rate expected)',
    },
    'STRONG_TREND_BEARISH': {
      entry: 'Sell on pullback to FVG or Order Block',
      stop: 'Above recent swing high (ATR-based)',
      target: '1:2.5 RR minimum',
      confidence: 'High (60-65% win rate expected)',
    },
    'RANGING': {
      entry: 'Fade the extremes - buy low, sell high',
      stop: 'Outside range + ATR buffer',
      target: 'Opposite side of range',
      confidence: 'Medium (50-55% win rate expected)',
    },
    'HIGH_VOLATILITY': {
      entry: 'Wait 15 minutes after spike, trade reversals',
      stop: 'Wide stops (2x ATR)',
      target: '1:2 RR (conservative)',
      confidence: 'Low (45-50% win rate, but larger moves)',
    },
    'REVERSAL_CHOCH': {
      entry: 'Enter on CHOCH confirmation + retest',
      stop: 'Beyond structure break point',
      target: '1:3 RR (catch full reversal)',
      confidence: 'Medium (50-55% win rate expected)',
    },
    'WEAK_TREND': {
      entry: 'Wait for strong confluence (3+ factors)',
      stop: '1.5x ATR',
      target: '1:2 RR',
      confidence: 'Medium-Low (48-52% win rate)',
    },
  };

  return strategyMap[regime] || {
    entry: 'Wait for clearer conditions',
    stop: 'ATR-based',
    target: '1:2 RR minimum',
    confidence: 'Low - be patient',
  };
}

/**
 * Calculate realistic win rate expectations
 * Per PDF: NO strategy maintains 80-90%, target 50-55%
 */
export function getRealisticWinRate(regime, confluence) {
  // Base win rates (professional expectations)
  const baseRates = {
    'STRONG_TREND_BULLISH': 0.58,
    'STRONG_TREND_BEARISH': 0.58,
    'RANGING': 0.52,
    'HIGH_VOLATILITY': 0.48,
    'REVERSAL_CHOCH': 0.52,
    'WEAK_TREND': 0.50,
  };

  const baseRate = baseRates[regime] || 0.50;
  
  // Confluence boost (max +5%)
  const confluenceBoost = Math.min(confluence * 0.05, 0.05);
  
  const finalRate = baseRate + confluenceBoost;
  
  // Cap at 65% (anything higher is unrealistic)
  return Math.min(finalRate, 0.65);
}
