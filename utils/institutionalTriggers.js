// utils/institutionalTriggers.js
// Institutional Directional Trigger Detection
// 7 Major Methods for Directional Confirmation

import { findSwingPoints } from './shared.js';

/**
 * 1️⃣ MARKET STRUCTURE BREAK (BOS/MSS)
 * Most important institutional trigger
 */
export function detectStructureBreak(candles, currentIndex) {
  if (currentIndex < 50) return null;

  const swingData = findSwingPoints(candles.slice(0, currentIndex + 1), 5);
  
  // Combine highs and lows into single array with type property
  const swingPoints = [
    ...swingData.highs.map(h => ({ ...h, type: 'high', high: h.price })),
    ...swingData.lows.map(l => ({ ...l, type: 'low', low: l.price }))
  ].sort((a, b) => a.index - b.index); // Sort by index chronologically
  
  if (swingPoints.length < 3) return null;

  const recentSwings = swingPoints.slice(-3);
  const lastSwing = recentSwings[recentSwings.length - 1];
  const prevSwing = recentSwings[recentSwings.length - 2];
  const current = candles[currentIndex];

  // Determine current structure
  const isUptrend = recentSwings[1].type === 'low' && recentSwings[2].high > recentSwings[0].high;
  const isDowntrend = recentSwings[1].type === 'high' && recentSwings[2].low < recentSwings[0].low;

  let trigger = null;

  if (isUptrend && lastSwing.type === 'high') {
    // In uptrend, break of previous high = continuation
    trigger = {
      type: 'BOS',
      direction: 'BULLISH',
      level: lastSwing.high,
      currentPrice: current.close,
      status: current.close > lastSwing.high ? 'TRIGGERED' : 'PENDING',
      description: `Above ${lastSwing.high.toFixed(2)} → Bullish Continuation`,
      invalidation: prevSwing.type === 'low' ? prevSwing.low : null,
      confidence: 85,
    };
  } else if (isDowntrend && lastSwing.type === 'low') {
    // In downtrend, break of previous low = continuation
    trigger = {
      type: 'BOS',
      direction: 'BEARISH',
      level: lastSwing.low,
      currentPrice: current.close,
      status: current.close < lastSwing.low ? 'TRIGGERED' : 'PENDING',
      description: `Below ${lastSwing.low.toFixed(2)} → Bearish Continuation`,
      invalidation: prevSwing.type === 'high' ? prevSwing.high : null,
      confidence: 85,
    };
  }

  return trigger;
}

/**
 * 2️⃣ LIQUIDITY SWEEP REVERSAL LEVEL
 * Institutions trap retail before reversing
 */
export function detectLiquiditySweepReversal(candles, currentIndex) {
  if (currentIndex < 20) return null;

  const lookback = 20;
  const recent = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);
  const current = candles[currentIndex];

  // Find equal highs (within 0.02% tolerance)
  const highs = recent.map((c, i) => ({ price: c.high, index: i }));
  const equalHighs = findEqualLevels(highs.map(h => h.price), 0.0002);

  // Find equal lows
  const lows = recent.map((c, i) => ({ price: c.low, index: i }));
  const equalLows = findEqualLevels(lows.map(l => l.price), 0.0002);

  let trigger = null;

  // Check for sweep of equal highs followed by displacement down
  if (equalHighs.length > 0 && equalHighs[equalHighs.length - 1].length >= 2) {
    const sweepLevel = equalHighs[equalHighs.length - 1][0];
    const sweepIndex = recent.findIndex(c => Math.abs(c.high - sweepLevel) < sweepLevel * 0.0002);
    
    if (sweepIndex >= 0 && sweepIndex < recent.length - 3) {
      const sweepCandle = recent[sweepIndex];
      const afterSweep = recent.slice(sweepIndex + 1);
      
      // Check for strong displacement down
      const hasDisplacement = afterSweep.some(c => 
        (c.close - c.open) < 0 && 
        Math.abs(c.close - c.open) > (c.high - c.low) * 0.65
      );

      if (hasDisplacement && current.close < sweepCandle.low) {
        trigger = {
          type: 'LIQUIDITY_SWEEP',
          direction: 'BEARISH',
          level: sweepCandle.low,
          sweepHigh: sweepLevel,
          currentPrice: current.close,
          status: current.close < sweepCandle.low ? 'TRIGGERED' : 'PENDING',
          description: `Swept ${sweepLevel.toFixed(2)}, Below ${sweepCandle.low.toFixed(2)} → Bearish`,
          invalidation: sweepLevel,
          confidence: 80,
        };
      }
    }
  }

  // Check for sweep of equal lows followed by displacement up
  if (equalLows.length > 0 && equalLows[equalLows.length - 1].length >= 2) {
    const sweepLevel = equalLows[equalLows.length - 1][0];
    const sweepIndex = recent.findIndex(c => Math.abs(c.low - sweepLevel) < sweepLevel * 0.0002);
    
    if (sweepIndex >= 0 && sweepIndex < recent.length - 3) {
      const sweepCandle = recent[sweepIndex];
      const afterSweep = recent.slice(sweepIndex + 1);
      
      // Check for strong displacement up
      const hasDisplacement = afterSweep.some(c => 
        (c.close - c.open) > 0 && 
        Math.abs(c.close - c.open) > (c.high - c.low) * 0.65
      );

      if (hasDisplacement && current.close > sweepCandle.high) {
        trigger = {
          type: 'LIQUIDITY_SWEEP',
          direction: 'BULLISH',
          level: sweepCandle.high,
          sweepLow: sweepLevel,
          currentPrice: current.close,
          status: current.close > sweepCandle.high ? 'TRIGGERED' : 'PENDING',
          description: `Swept ${sweepLevel.toFixed(2)}, Above ${sweepCandle.high.toFixed(2)} → Bullish`,
          invalidation: sweepLevel,
          confidence: 80,
        };
      }
    }
  }

  return trigger;
}

/**
 * 3️⃣ ORDER BLOCK REACTION LEVEL
 * Last opposite candle before displacement
 */
export function detectOrderBlockReaction(candles, currentIndex) {
  if (currentIndex < 20) return null;

  const lookback = 30;
  const recent = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);
  const current = candles[currentIndex];

  let trigger = null;

  // Look for displacement moves
  for (let i = recent.length - 5; i >= 5; i--) {
    const candle = recent[i];
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    // Strong displacement candle
    if (body > range * 0.65) {
      // Find last opposite candle before displacement
      let obCandle = null;
      
      if (candle.close > candle.open) {
        // Bullish displacement - find last bearish candle
        for (let j = i - 1; j >= 0; j--) {
          if (recent[j].close < recent[j].open) {
            obCandle = recent[j];
            break;
          }
        }
        
        if (obCandle && current.close >= obCandle.low && current.close <= obCandle.high) {
          trigger = {
            type: 'ORDER_BLOCK',
            direction: 'BULLISH',
            level: obCandle.high,
            obLow: obCandle.low,
            obHigh: obCandle.high,
            currentPrice: current.close,
            status: 'IN_ZONE',
            description: `Above OB ${obCandle.high.toFixed(2)} → Bullish | Below ${obCandle.low.toFixed(2)} → Fail`,
            invalidation: obCandle.low,
            confidence: 75,
          };
          break;
        }
      } else {
        // Bearish displacement - find last bullish candle
        for (let j = i - 1; j >= 0; j--) {
          if (recent[j].close > recent[j].open) {
            obCandle = recent[j];
            break;
          }
        }
        
        if (obCandle && current.close >= obCandle.low && current.close <= obCandle.high) {
          trigger = {
            type: 'ORDER_BLOCK',
            direction: 'BEARISH',
            level: obCandle.low,
            obLow: obCandle.low,
            obHigh: obCandle.high,
            currentPrice: current.close,
            status: 'IN_ZONE',
            description: `Below OB ${obCandle.low.toFixed(2)} → Bearish | Above ${obCandle.high.toFixed(2)} → Fail`,
            invalidation: obCandle.high,
            confidence: 75,
          };
          break;
        }
      }
    }
  }

  return trigger;
}

/**
 * 4️⃣ FAIR VALUE GAP CONTINUATION LEVEL
 * Imbalance holds = continuation
 */
export function detectFVGContinuation(candles, currentIndex) {
  if (currentIndex < 10) return null;

  const recent = candles.slice(Math.max(0, currentIndex - 20), currentIndex + 1);
  const current = candles[currentIndex];

  let trigger = null;

  // Look for FVGs
  for (let i = recent.length - 3; i >= 2; i--) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const next = recent[i + 1];

    // Bullish FVG: gap between prev high and next low
    if (next.low > prev.high && curr.close > curr.open) {
      const fvgLow = prev.high;
      const fvgHigh = next.low;
      const fvgMid = (fvgLow + fvgHigh) / 2;

      if (current.close >= fvgLow && current.close <= fvgHigh) {
        trigger = {
          type: 'FVG',
          direction: 'BULLISH',
          level: fvgMid,
          fvgLow,
          fvgHigh,
          currentPrice: current.close,
          status: 'IN_ZONE',
          description: `Hold above ${fvgMid.toFixed(2)} → Bullish | Break below → Fail`,
          invalidation: fvgLow,
          confidence: 70,
        };
        break;
      }
    }

    // Bearish FVG: gap between prev low and next high
    if (next.high < prev.low && curr.close < curr.open) {
      const fvgHigh = prev.low;
      const fvgLow = next.high;
      const fvgMid = (fvgLow + fvgHigh) / 2;

      if (current.close >= fvgLow && current.close <= fvgHigh) {
        trigger = {
          type: 'FVG',
          direction: 'BEARISH',
          level: fvgMid,
          fvgLow,
          fvgHigh,
          currentPrice: current.close,
          status: 'IN_ZONE',
          description: `Hold below ${fvgMid.toFixed(2)} → Bearish | Break above → Fail`,
          invalidation: fvgHigh,
          confidence: 70,
        };
        break;
      }
    }
  }

  return trigger;
}

/**
 * 5️⃣ RANGE EXPANSION BREAK LEVEL
 * Compression → Expansion → Continuation
 */
export function detectRangeExpansion(candles, currentIndex) {
  if (currentIndex < 30) return null;

  const recent = candles.slice(Math.max(0, currentIndex - 30), currentIndex + 1);
  const current = candles[currentIndex];

  // Find consolidation range (last 20 candles)
  const consolidation = recent.slice(-20, -1);
  const rangeHigh = Math.max(...consolidation.map(c => c.high));
  const rangeLow = Math.min(...consolidation.map(c => c.low));
  const rangeMid = (rangeHigh + rangeLow) / 2;
  const rangeSize = rangeHigh - rangeLow;

  // Check if current candle shows expansion
  const currentRange = current.high - current.low;
  const avgRange = consolidation.reduce((sum, c) => sum + (c.high - c.low), 0) / consolidation.length;

  let trigger = null;

  if (currentRange > avgRange * 1.5) {
    // Expansion detected
    if (current.close > rangeHigh) {
      trigger = {
        type: 'RANGE_EXPANSION',
        direction: 'BULLISH',
        level: rangeHigh,
        rangeLow,
        rangeHigh,
        currentPrice: current.close,
        status: 'TRIGGERED',
        description: `Broke ${rangeHigh.toFixed(2)} with expansion → Bullish Continuation`,
        invalidation: rangeMid,
        confidence: 70,
      };
    } else if (current.close < rangeLow) {
      trigger = {
        type: 'RANGE_EXPANSION',
        direction: 'BEARISH',
        level: rangeLow,
        rangeLow,
        rangeHigh,
        currentPrice: current.close,
        status: 'TRIGGERED',
        description: `Broke ${rangeLow.toFixed(2)} with expansion → Bearish Continuation`,
        invalidation: rangeMid,
        confidence: 70,
      };
    }
  }

  return trigger;
}

/**
 * 6️⃣ PREMIUM / DISCOUNT THRESHOLD
 * Institutional dealing range logic
 */
export function detectPremiumDiscountShift(candles, currentIndex) {
  if (currentIndex < 50) return null;

  const recent = candles.slice(Math.max(0, currentIndex - 50), currentIndex + 1);
  const current = candles[currentIndex];

  // Calculate dealing range
  const high = Math.max(...recent.map(c => c.high));
  const low = Math.min(...recent.map(c => c.low));
  const mid = (high + low) / 2;

  // Determine structure
  const swingData = findSwingPoints(recent, 5);
  
  // Combine highs and lows into single array with type property
  const swingPoints = [
    ...swingData.highs.map(h => ({ ...h, type: 'high', high: h.price })),
    ...swingData.lows.map(l => ({ ...l, type: 'low', low: l.price }))
  ].sort((a, b) => a.index - b.index);
  
  const recentSwings = swingPoints.slice(-3);
  
  let isUptrend = false;
  let isDowntrend = false;

  if (recentSwings.length >= 3) {
    const higherHighs = recentSwings.filter(s => s.type === 'high').every((s, i, arr) => i === 0 || s.high > arr[i-1].high);
    const higherLows = recentSwings.filter(s => s.type === 'low').every((s, i, arr) => i === 0 || s.low > arr[i-1].low);
    
    const lowerHighs = recentSwings.filter(s => s.type === 'high').every((s, i, arr) => i === 0 || s.high < arr[i-1].high);
    const lowerLows = recentSwings.filter(s => s.type === 'low').every((s, i, arr) => i === 0 || s.low < arr[i-1].low);

    isUptrend = higherHighs && higherLows;
    isDowntrend = lowerHighs && lowerLows;
  }

  let trigger = null;

  if (isUptrend) {
    // In uptrend, closing below mid = weakness
    if (current.close < mid) {
      trigger = {
        type: 'PREMIUM_DISCOUNT',
        direction: 'BEARISH',
        level: mid,
        premium: high,
        discount: low,
        currentPrice: current.close,
        status: 'TRIGGERED',
        description: `Uptrend closed below ${mid.toFixed(2)} → Weakness Signal`,
        invalidation: high,
        confidence: 65,
      };
    } else {
      trigger = {
        type: 'PREMIUM_DISCOUNT',
        direction: 'BULLISH',
        level: mid,
        premium: high,
        discount: low,
        currentPrice: current.close,
        status: 'HOLDING',
        description: `Uptrend holding above ${mid.toFixed(2)} → Strength`,
        invalidation: mid,
        confidence: 60,
      };
    }
  } else if (isDowntrend) {
    // In downtrend, closing above mid = strength
    if (current.close > mid) {
      trigger = {
        type: 'PREMIUM_DISCOUNT',
        direction: 'BULLISH',
        level: mid,
        premium: high,
        discount: low,
        currentPrice: current.close,
        status: 'TRIGGERED',
        description: `Downtrend closed above ${mid.toFixed(2)} → Strength Signal`,
        invalidation: low,
        confidence: 65,
      };
    } else {
      trigger = {
        type: 'PREMIUM_DISCOUNT',
        direction: 'BEARISH',
        level: mid,
        premium: high,
        discount: low,
        currentPrice: current.close,
        status: 'HOLDING',
        description: `Downtrend holding below ${mid.toFixed(2)} → Weakness`,
        invalidation: mid,
        confidence: 60,
      };
    }
  }

  return trigger;
}

/**
 * 7️⃣ VOLATILITY REGIME TRIGGER
 * ATR expansion confirms direction
 */
export function detectVolatilityRegimeTrigger(candles, currentIndex) {
  if (currentIndex < 30) return null;

  const recent = candles.slice(Math.max(0, currentIndex - 30), currentIndex + 1);
  const current = candles[currentIndex];

  // Calculate ATR
  const atr = calculateATR(recent, 14);
  const prevATR = calculateATR(recent.slice(0, -10), 14);

  const isExpanding = atr > prevATR * 1.2;

  if (!isExpanding) return null;

  // Check for strong directional move
  const last5 = recent.slice(-5);
  const bullishCandles = last5.filter(c => c.close > c.open).length;
  const bearishCandles = last5.filter(c => c.close < c.open).length;

  let trigger = null;

  if (bullishCandles >= 4 && isExpanding) {
    trigger = {
      type: 'VOLATILITY_REGIME',
      direction: 'BULLISH',
      level: current.low,
      atr: atr.toFixed(2),
      currentPrice: current.close,
      status: 'EXPANDING',
      description: `ATR expanding (${atr.toFixed(2)}), Momentum up → Bullish Continuation Likely`,
      invalidation: recent[recent.length - 5].low,
      confidence: 75,
    };
  } else if (bearishCandles >= 4 && isExpanding) {
    trigger = {
      type: 'VOLATILITY_REGIME',
      direction: 'BEARISH',
      level: current.high,
      atr: atr.toFixed(2),
      currentPrice: current.close,
      status: 'EXPANDING',
      description: `ATR expanding (${atr.toFixed(2)}), Momentum down → Bearish Continuation Likely`,
      invalidation: recent[recent.length - 5].high,
      confidence: 75,
    };
  }

  return trigger;
}

/**
 * Calculate ATR
 */
function calculateATR(candles, period = 14) {
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
 * Find equal levels helper
 */
function findEqualLevels(prices, tolerance = 0.0002) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < prices.length; i++) {
    if (used.has(i)) continue;

    const group = [prices[i]];
    used.add(i);

    for (let j = i + 1; j < prices.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(prices[j] - prices[i]) <= prices[i] * tolerance) {
        group.push(prices[j]);
        used.add(j);
      }
    }

    if (group.length >= 2) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * MASTER FUNCTION: Detect All Institutional Triggers
 */
export function detectAllInstitutionalTriggers(candles, currentIndex) {
  const triggers = {
    structureBreak: detectStructureBreak(candles, currentIndex),
    liquiditySweep: detectLiquiditySweepReversal(candles, currentIndex),
    orderBlock: detectOrderBlockReaction(candles, currentIndex),
    fvg: detectFVGContinuation(candles, currentIndex),
    rangeExpansion: detectRangeExpansion(candles, currentIndex),
    premiumDiscount: detectPremiumDiscountShift(candles, currentIndex),
    volatilityRegime: detectVolatilityRegimeTrigger(candles, currentIndex),
  };

  // Filter out nulls and calculate stacked confidence
  const activeTriggers = Object.values(triggers).filter(t => t !== null);
  
  const stackedConfidence = activeTriggers.length > 0
    ? activeTriggers.reduce((sum, t) => sum + t.confidence, 0) / activeTriggers.length
    : 0;

  // Determine consensus direction
  const bullishCount = activeTriggers.filter(t => t.direction === 'BULLISH').length;
  const bearishCount = activeTriggers.filter(t => t.direction === 'BEARISH').length;
  
  let consensus = 'NEUTRAL';
  if (bullishCount > bearishCount + 1) consensus = 'BULLISH';
  if (bearishCount > bullishCount + 1) consensus = 'BEARISH';

  return {
    triggers,
    activeTriggers,
    stackedConfidence: stackedConfidence.toFixed(0),
    consensus,
    triggerCount: activeTriggers.length,
  };
}
