// utils/mtf.js
// Multi-Timeframe Confirmation Engine
// Uses shared utilities to avoid duplication

import { findSwingPoints } from './shared.js';

export const TIMEFRAME_HIERARCHY = {
  '1m': ['5m', '15m'],
  '5m': ['15m', '1h'],
  '15m': ['1h', '4h'],
  '1h': ['4h', '1D'],
  '4h': ['1D'],
  '1D': [],
};

export const TIMEFRAME_MINUTES = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1D': 1440,
};

export function getHigherTimeframes(timeframe) {
  return TIMEFRAME_HIERARCHY[timeframe] || [];
}

export function analyzeHTFBias(htfCandles, lookback = 20) {
  if (!htfCandles || htfCandles.length < lookback) {
    return { bias: 'NEUTRAL', confidence: 0 };
  }

  const recentCandles = htfCandles.slice(-lookback);
  
  // Detect higher highs and higher lows (bullish)
  const { higherHighs, higherLows } = detectStructure(recentCandles);
  
  // Detect lower highs and lower lows (bearish)
  const { lowerHighs, lowerLows } = detectStructure(recentCandles, false);

  // Determine bias
  let bias = 'NEUTRAL';
  let confidence = 0;

  if (higherHighs && higherLows) {
    bias = 'BULLISH';
    confidence = 0.8;
  } else if (lowerHighs && lowerLows) {
    bias = 'BEARISH';
    confidence = 0.8;
  } else if (higherHighs) {
    bias = 'BULLISH';
    confidence = 0.5;
  } else if (lowerLows) {
    bias = 'BEARISH';
    confidence = 0.5;
  }

  return { bias, confidence };
}

function detectStructure(candles, bullish = true) {
  if (candles.length < 6) return { higherHighs: false, higherLows: false };

  const swingPoints = findSwingPoints(candles);
  
  if (swingPoints.highs.length < 2 || swingPoints.lows.length < 2) {
    return { higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false };
  }

  if (bullish) {
    // Check for higher highs
    const higherHighs = swingPoints.highs.slice(1).every((high, i) => {
      return high.price > swingPoints.highs[i].price;
    });

    // Check for higher lows
    const higherLows = swingPoints.lows.slice(1).every((low, i) => {
      return low.price > swingPoints.lows[i].price;
    });

    return { higherHighs, higherLows };
  } else {
    // Check for lower highs
    const lowerHighs = swingPoints.highs.slice(1).every((high, i) => {
      return high.price < swingPoints.highs[i].price;
    });

    // Check for lower lows
    const lowerLows = swingPoints.lows.slice(1).every((low, i) => {
      return low.price < swingPoints.lows[i].price;
    });

    return { lowerHighs, lowerLows };
  }
}

function clusterLevels(prices, tolerance) {
  if (prices.length === 0) return [];

  const clusters = [];
  const sorted = [...prices].sort((a, b) => a - b);

  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i] - currentCluster[0]);
    const avgPrice = currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length;

    if (diff / avgPrice <= tolerance) {
      currentCluster.push(sorted[i]);
    } else {
      if (currentCluster.length >= 2) {
        const level = currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length;
        clusters.push({ level, touches: currentCluster.length });
      }
      currentCluster = [sorted[i]];
    }
  }

  // Add last cluster
  if (currentCluster.length >= 2) {
    const level = currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length;
    clusters.push({ level, touches: currentCluster.length });
  }

  return clusters;
}

export function checkMTFAlignment(ltfSignal, htfBias, htfLevels, settings) {
  if (!settings.requireHTFBias) return { aligned: true, confidence: 0.5 };

  const { type } = ltfSignal;
  
  // Check bias alignment
  const biasAligned = 
    (type === 'SSL' && htfBias.bias === 'BULLISH') ||
    (type === 'BSL' && htfBias.bias === 'BEARISH') ||
    htfBias.bias === 'NEUTRAL';

  // Check proximity to HTF support/resistance
  let nearLevel = false;
  if (ltfSignal.level && htfLevels) {
    const relevantLevels = type === 'SSL' ? htfLevels.support : htfLevels.resistance;
    nearLevel = relevantLevels.some(lvl => {
      const diff = Math.abs(ltfSignal.level - lvl.level);
      return diff / ltfSignal.level < 0.002; // Within 0.2%
    });
  }

  const aligned = settings.strictMode ? (biasAligned && nearLevel) : biasAligned;
  const confidence = aligned ? (nearLevel ? 0.9 : 0.7) : 0.3;

  return { aligned, confidence, biasAligned, nearLevel };
}

export function mapLTFtoHTF(ltfTimestamp, htfCandles, ltfTimeframe, htfTimeframe) {
  if (!htfCandles || htfCandles.length === 0) return null;

  const ltfMinutes = TIMEFRAME_MINUTES[ltfTimeframe];
  const htfMinutes = TIMEFRAME_MINUTES[htfTimeframe];

  if (!ltfMinutes || !htfMinutes) return null;

  // Find the HTF candle that contains this LTF timestamp
  const htfCandle = htfCandles.find(candle => {
    const candleStart = new Date(candle.timestamp).getTime();
    const candleEnd = candleStart + htfMinutes * 60 * 1000;
    const ltfTime = new Date(ltfTimestamp).getTime();

    return ltfTime >= candleStart && ltfTime < candleEnd;
  });

  return htfCandle || null;
}

export function detectHTFDisplacement(htfCandles, currentHTFIndex) {
  if (!htfCandles || currentHTFIndex < 20) return null;

  const current = htfCandles[currentHTFIndex];
  const previous = htfCandles.slice(Math.max(0, currentHTFIndex - 20), currentHTFIndex);

  const avgRange = previous.reduce((sum, c) => sum + (c.high - c.low), 0) / previous.length;
  const currentRange = current.high - current.low;

  if (currentRange > avgRange * 2) {
    const isBullish = current.close > current.open;
    return {
      type: 'HTF_DISPLACEMENT',
      direction: isBullish ? 'bullish' : 'bearish',
      rangeRatio: currentRange / avgRange,
    };
  }

  return null;
}
