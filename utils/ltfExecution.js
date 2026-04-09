// utils/ltfExecution.js
// LTF Execution Engine - Institutional Entry Model
// Uses shared utilities to avoid code duplication

import {
  findSwingPoints,
  findEqualLevels,
  countTouches,
  calculateAverageRange,
  getSessionTiming,
  isInKillZone,
  isVolatilityExpanding,
} from './shared.js';

/**
 * LIQUIDITY LEVEL TYPES
 */
export const LIQUIDITY_TYPES = {
  BSL: 'BSL',
  SSL: 'SSL',
  SESSION_HIGH: 'SESSION_HIGH',
  SESSION_LOW: 'SESSION_LOW',
  PDH: 'PDH',
  PDL: 'PDL',
  EQUAL_HIGHS: 'EQUAL_HIGHS',
  EQUAL_LOWS: 'EQUAL_LOWS',
};

/**
 * Calculate liquidity strength (1-5 scale)
 */
function calculateStrength(touches) {
  if (touches >= 4) return 5;
  if (touches === 3) return 4;
  if (touches === 2) return 3;
  if (touches === 1) return 2;
  return 1;
}

/**
 * Identify session levels (Asian, London, NY for Gold)
 */
function identifySessionLevels(candles) {
  if (!candles || candles.length < 100) return [];

  const levels = [];
  const recentCandles = candles.slice(-100);

  const sessions = {
    asian: [],
    london: [],
    ny: [],
  };

  recentCandles.forEach(candle => {
    const session = getSessionTiming(candle.timestamp);
    if (session === 'ASIAN') sessions.asian.push(candle);
    else if (session === 'LONDON' || session === 'LONDON_OPEN') sessions.london.push(candle);
    else if (session === 'NEW_YORK' || session === 'NY_OPEN') sessions.ny.push(candle);
  });

  if (sessions.asian.length > 0) {
    const asianHigh = Math.max(...sessions.asian.map(c => c.high));
    const asianLow = Math.min(...sessions.asian.map(c => c.low));
    
    levels.push({
      type: LIQUIDITY_TYPES.SESSION_HIGH,
      price: asianHigh,
      strength: 3,
      touches: 1,
      description: 'Asian Session High',
    });
    
    levels.push({
      type: LIQUIDITY_TYPES.SESSION_LOW,
      price: asianLow,
      strength: 3,
      touches: 1,
      description: 'Asian Session Low',
    });
  }

  return levels;
}

/**
 * Identify Previous Day High/Low
 */
function identifyPreviousDayLevels(candles) {
  if (!candles || candles.length < 288) return { pdh: null, pdl: null };

  const yesterday = candles.slice(-576, -288);
  
  if (yesterday.length < 100) return { pdh: null, pdl: null };

  const pdh = Math.max(...yesterday.map(c => c.high));
  const pdl = Math.min(...yesterday.map(c => c.low));

  return {
    pdh: {
      type: LIQUIDITY_TYPES.PDH,
      price: pdh,
      strength: 4,
      touches: 1,
      description: 'Previous Day High',
    },
    pdl: {
      type: LIQUIDITY_TYPES.PDL,
      price: pdl,
      strength: 4,
      touches: 1,
      description: 'Previous Day Low',
    },
  };
}

/**
 * STEP 1: LTF Liquidity Mapping
 */
export function mapLTFLiquidity(candles, lookback = 50) {
  if (!candles || candles.length < lookback) {
    return [];
  }

  const recentCandles = candles.slice(-lookback);
  const liquidityLevels = [];

  const equalHighs = findEqualLevels(
    recentCandles.map(c => c.high),
    0.00015
  );

  equalHighs.forEach(level => {
    const touches = countTouches(recentCandles, level, 'high');
    liquidityLevels.push({
      type: LIQUIDITY_TYPES.BSL,
      price: level,
      strength: calculateStrength(touches),
      touches,
      description: `Equal Highs (${touches}x)`,
    });
  });

  const equalLows = findEqualLevels(
    recentCandles.map(c => c.low),
    0.00015
  );

  equalLows.forEach(level => {
    const touches = countTouches(recentCandles, level, 'low');
    liquidityLevels.push({
      type: LIQUIDITY_TYPES.SSL,
      price: level,
      strength: calculateStrength(touches),
      touches,
      description: `Equal Lows (${touches}x)`,
    });
  });

  const sessionLevels = identifySessionLevels(candles);
  liquidityLevels.push(...sessionLevels);

  const pdLevels = identifyPreviousDayLevels(candles);
  if (pdLevels.pdh) liquidityLevels.push(pdLevels.pdh);
  if (pdLevels.pdl) liquidityLevels.push(pdLevels.pdl);

  return liquidityLevels.sort((a, b) => b.price - a.price);
}

/**
 * Calculate sweep quality score
 */
function calculateSweepScore(params) {
  const { strength, htfAligned, wickRatio } = params;
  
  let score = 0;
  score += strength * 10;
  if (htfAligned) score += 30;
  if (wickRatio > 0.5) score += 20;
  
  return score;
}

/**
 * STEP 2: Liquidity Sweep Detection
 */
export function detectLiquiditySweep(candles, liquidityLevels, htfBias) {
  if (!candles || candles.length < 5 || !liquidityLevels) {
    return null;
  }

  const lastCandle = candles[candles.length - 1];
  const sweeps = [];

  liquidityLevels.forEach(level => {
    if (level.type === LIQUIDITY_TYPES.SSL || level.type.includes('LOW')) {
      const sweptBelow = lastCandle.low < level.price * 0.9998;
      const closedAbove = lastCandle.close > level.price;
      const bullishCandle = lastCandle.close > lastCandle.open;

      if (sweptBelow && closedAbove && bullishCandle) {
        const htfAligned = htfBias?.bias === 'BULLISH' || htfBias?.bias === 'NEUTRAL';
        
        sweeps.push({
          direction: 'BULLISH',
          level: level.price,
          liquidityType: level.type,
          strength: level.strength,
          htfAligned,
          wickSize: lastCandle.close - lastCandle.low,
          timestamp: lastCandle.timestamp,
          score: calculateSweepScore({
            strength: level.strength,
            htfAligned,
            wickRatio: (lastCandle.close - lastCandle.low) / (lastCandle.high - lastCandle.low),
          }),
        });
      }
    }

    if (level.type === LIQUIDITY_TYPES.BSL || level.type.includes('HIGH')) {
      const sweptAbove = lastCandle.high > level.price * 1.0002;
      const closedBelow = lastCandle.close < level.price;
      const bearishCandle = lastCandle.close < lastCandle.open;

      if (sweptAbove && closedBelow && bearishCandle) {
        const htfAligned = htfBias?.bias === 'BEARISH' || htfBias?.bias === 'NEUTRAL';
        
        sweeps.push({
          direction: 'BEARISH',
          level: level.price,
          liquidityType: level.type,
          strength: level.strength,
          htfAligned,
          wickSize: lastCandle.high - lastCandle.close,
          timestamp: lastCandle.timestamp,
          score: calculateSweepScore({
            strength: level.strength,
            htfAligned,
            wickRatio: (lastCandle.high - lastCandle.close) / (lastCandle.high - lastCandle.low),
          }),
        });
      }
    }
  });

  if (sweeps.length > 0) {
    return sweeps.sort((a, b) => b.score - a.score)[0];
  }

  return null;
}

/**
 * Calculate displacement quality score
 */
function calculateDisplacementScore(params) {
  const { rangeMultiplier, bodyRatio, hasFVG } = params;
  
  let score = 0;
  
  if (rangeMultiplier >= 3.5) score += 40;
  else if (rangeMultiplier >= 2.5) score += 30;
  else score += 20;
  
  if (bodyRatio >= 0.8) score += 30;
  else if (bodyRatio >= 0.65) score += 20;
  
  if (hasFVG) score += 30;
  
  return score;
}

/**
 * STEP 3: Displacement Confirmation
 */
export function detectDisplacement(candles, currentIndex) {
  if (!candles || currentIndex < 20) {
    return null;
  }

  const candle = candles[currentIndex];
  const avgRange = calculateAverageRange(candles.slice(Math.max(0, currentIndex - 20), currentIndex));

  const range = candle.high - candle.low;
  const body = Math.abs(candle.close - candle.open);
  const bodyRatio = body / range;

  const isDisplacement = range > avgRange * 2.5 && bodyRatio > 0.65;

  if (!isDisplacement) return null;

  const direction = candle.close > candle.open ? 'BULLISH' : 'BEARISH';
  const hasFVG = detectFVGInDisplacement(candles, currentIndex, direction);

  return {
    direction,
    range,
    avgRange,
    rangeMultiplier: range / avgRange,
    bodyRatio,
    hasFVG,
    timestamp: candle.timestamp,
    score: calculateDisplacementScore({
      rangeMultiplier: range / avgRange,
      bodyRatio,
      hasFVG,
    }),
  };
}

/**
 * STEP 4: MSS Confirmation
 */
export function confirmMSS(candles, currentIndex, direction) {
  if (!candles || currentIndex < 10) {
    return null;
  }

  const swings = findSwingPoints(candles.slice(0, currentIndex + 1), 5);
  const lastClose = candles[currentIndex].close;

  if (direction === 'BULLISH') {
    if (swings.highs.length > 0) {
      const lastInternalHigh = swings.highs[swings.highs.length - 1].price;
      
      if (lastClose > lastInternalHigh) {
        return {
          confirmed: true,
          direction: 'BULLISH',
          brokenLevel: lastInternalHigh,
          type: 'MSS',
          score: 100,
        };
      }
    }
  }

  if (direction === 'BEARISH') {
    if (swings.lows.length > 0) {
      const lastInternalLow = swings.lows[swings.lows.length - 1].price;
      
      if (lastClose < lastInternalLow) {
        return {
          confirmed: true,
          direction: 'BEARISH',
          brokenLevel: lastInternalLow,
          type: 'MSS',
          score: 100,
        };
      }
    }
  }

  return null;
}

/**
 * STEP 5: Order Block Extraction
 */
export function extractOrderBlock(candles, displacementIndex, direction) {
  if (!candles || displacementIndex < 2) {
    return null;
  }

  for (let i = displacementIndex - 1; i >= Math.max(0, displacementIndex - 10); i--) {
    const candle = candles[i];
    const isBullish = candle.close > candle.open;
    const isBearish = candle.close < candle.open;

    if (direction === 'BULLISH' && isBearish) {
      return {
        direction: 'BULLISH',
        index: i,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        close: candle.close,
        timestamp: candle.timestamp,
        mitigation: 0,
      };
    }

    if (direction === 'BEARISH' && isBullish) {
      return {
        direction: 'BEARISH',
        index: i,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        close: candle.close,
        timestamp: candle.timestamp,
        mitigation: 0,
      };
    }
  }

  return null;
}

/**
 * Score Order Block quality
 */
export function scoreOrderBlock(ob, sweep, displacement, htfBias, dealingRange) {
  if (!ob) return 0;

  let score = 0;

  if (sweep) score += 30;
  if (displacement && displacement.score >= 70) score += 25;
  if (htfBias && htfBias.bias === ob.direction) score += 20;

  if (dealingRange) {
    const obMid = (ob.high + ob.low) / 2;
    const position = (obMid - dealingRange.low) / (dealingRange.high - dealingRange.low);
    
    if (ob.direction === 'BULLISH' && position < 0.5) {
      score += 15;
    } else if (ob.direction === 'BEARISH' && position > 0.5) {
      score += 15;
    }
  }

  if (displacement && displacement.hasFVG) score += 10;

  return score;
}

/**
 * STEP 6: FVG Detection
 */
export function detectFVG(candles, currentIndex) {
  if (!candles || currentIndex < 2) {
    return null;
  }

  const candle1 = candles[currentIndex - 2];
  const candle2 = candles[currentIndex - 1];
  const candle3 = candles[currentIndex];

  if (candle2.low > candle1.high) {
    return {
      direction: 'BULLISH',
      top: candle2.low,
      bottom: candle1.high,
      size: candle2.low - candle1.high,
      index: currentIndex - 1,
      filledPercent: 0,
      valid: true,
    };
  }

  if (candle2.high < candle1.low) {
    return {
      direction: 'BEARISH',
      top: candle1.low,
      bottom: candle2.high,
      size: candle1.low - candle2.high,
      index: currentIndex - 1,
      filledPercent: 0,
      valid: true,
    };
  }

  return null;
}

/**
 * Check if FVG exists in displacement
 */
function detectFVGInDisplacement(candles, displacementIndex, direction) {
  if (displacementIndex < 2) return false;

  const fvg = detectFVG(candles, displacementIndex);
  return fvg !== null && fvg.direction === direction;
}

/**
 * Validate FVG quality
 */
export function validateFVG(fvg, htfBias, dealingRange) {
  if (!fvg) return { valid: false, score: 0 };

  let score = 0;
  let valid = true;

  if (fvg.filledPercent === 0) score += 30;
  else if (fvg.filledPercent < 0.5) score += 15;
  else valid = false;

  if (htfBias && htfBias.bias === fvg.direction) score += 30;

  if (dealingRange) {
    const fvgMid = (fvg.top + fvg.bottom) / 2;
    const position = (fvgMid - dealingRange.low) / (dealingRange.high - dealingRange.low);
    
    if (fvg.direction === 'BULLISH' && position < 0.5) {
      score += 20;
    } else if (fvg.direction === 'BEARISH' && position > 0.5) {
      score += 20;
    }
  }

  if (fvg.size > 0.001) score += 20;

  return { valid: valid && score >= 50, score };
}

/**
 * STEP 7: Entry Trigger Logic
 */
export function generateEntrySignal(params) {
  const {
    candles,
    currentIndex,
    htfBias,
    dealingRange,
    liquidityLevels,
    killZoneActive,
    volatilityExpanding,
  } = params;

  if (!htfBias || htfBias.score < 70) {
    return null;
  }

  const sweep = detectLiquiditySweep(candles.slice(0, currentIndex + 1), liquidityLevels, htfBias);
  if (!sweep || !sweep.htfAligned) return null;

  const displacement = detectDisplacement(candles, currentIndex);
  if (!displacement || displacement.direction !== sweep.direction) return null;

  const mss = confirmMSS(candles, currentIndex, displacement.direction);
  if (!mss || !mss.confirmed) return null;

  const ob = extractOrderBlock(candles, currentIndex, displacement.direction);
  if (!ob) return null;

  const obScore = scoreOrderBlock(ob, sweep, displacement, htfBias, dealingRange);
  if (obScore < 70) return null;

  const fvg = detectFVG(candles, currentIndex);
  const fvgValidation = fvg ? validateFVG(fvg, htfBias, dealingRange) : null;

  if (!killZoneActive) return null;
  if (!volatilityExpanding) return null;

  const targets = projectTargets(candles, currentIndex, displacement.direction, liquidityLevels);

  const executionScore = calculateExecutionScore({
    htfBias,
    sweep,
    displacement,
    mss,
    obScore,
    fvgValidation,
    killZoneActive,
    volatilityExpanding,
  });

  if (executionScore < 75) return null;

  const entryZone = {
    low: ob.low,
    high: ob.high,
  };

  const stopLoss = displacement.direction === 'BULLISH' 
    ? ob.low - (ob.high - ob.low) * 0.2
    : ob.high + (ob.high - ob.low) * 0.2;

  const riskReward = targets.primary 
    ? Math.abs((targets.primary - entryZone.high) / (entryZone.high - stopLoss))
    : 0;

  return {
    type: 'AGGRESSION_ALERT',
    direction: displacement.direction === 'BULLISH' ? 'BUY' : 'SELL',
    entryZone,
    stopLoss,
    targets,
    rr: riskReward,
    confidence: executionScore,
    timestamp: candles[currentIndex].timestamp,
    details: {
      sweep,
      displacement,
      mss,
      ob,
      fvg,
      obScore,
      executionScore,
    },
  };
}

/**
 * STEP 8: Target Projection
 */
export function projectTargets(candles, currentIndex, direction, liquidityLevels) {
  const currentPrice = candles[currentIndex].close;

  const relevantLevels = liquidityLevels.filter(level => {
    if (direction === 'BULLISH') {
      return (level.type === LIQUIDITY_TYPES.BSL || level.type.includes('HIGH')) && 
             level.price > currentPrice;
    } else {
      return (level.type === LIQUIDITY_TYPES.SSL || level.type.includes('LOW')) && 
             level.price < currentPrice;
    }
  });

  relevantLevels.sort((a, b) => {
    const distA = Math.abs(a.price - currentPrice);
    const distB = Math.abs(b.price - currentPrice);
    return distA - distB;
  });

  return {
    primary: relevantLevels[0]?.price || null,
    secondary: relevantLevels[1]?.price || null,
    final: relevantLevels[2]?.price || null,
  };
}

/**
 * STEP 9: Execution Scoring
 */
export function calculateExecutionScore(params) {
  const {
    htfBias,
    sweep,
    displacement,
    mss,
    obScore,
    fvgValidation,
    killZoneActive,
    volatilityExpanding,
  } = params;

  let score = 0;

  if (htfBias && htfBias.score >= 70) score += 20;
  if (sweep && sweep.htfAligned) score += 20;
  if (displacement && displacement.score >= 70) score += 15;
  if (mss && mss.confirmed) score += 15;
  if (obScore >= 70) score += 10;
  if (fvgValidation && fvgValidation.valid) score += 10;
  if (killZoneActive) score += 5;
  if (volatilityExpanding) score += 5;

  return score;
}

// Re-export shared functions for convenience
export { isInKillZone, isVolatilityExpanding };

