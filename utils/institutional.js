// utils/institutional.js
// Professional ICT-Style HTF Bias Detection
// Uses shared utilities to avoid code duplication

import {
  findSwingPoints,
  findEqualLevels,
  findEqualLevelGroups,
  detectDisplacementCandle,
  calculateAverageRange,
  getSessionTiming,
  isHighProbabilitySession,
} from './shared.js';

/**
 * PROPER HTF TIMEFRAME MAPPING FOR GOLD (XAUUSD)
 */
export const GOLD_HTF_MAPPING = {
  '1m': '15m',
  '5m': '1h',
  '15m': '4h',
  '1h': '1D',
  '4h': '1W',
};

/**
 * STEP 1: Define Dealing Range
 */
export function identifyDealingRange(candles, lookback = 100) {
  if (!candles || candles.length < lookback) {
    return null;
  }

  const recentCandles = candles.slice(-lookback);
  const swings = findSwingPoints(recentCandles, 10);
  
  if (!swings.highs.length || !swings.lows.length) {
    return null;
  }

  const swingHigh = swings.highs[swings.highs.length - 1];
  const swingLow = swings.lows[swings.lows.length - 1];

  const high = swingHigh.price;
  const low = swingLow.price;
  const mid = (high + low) / 2;
  const range = high - low;

  return {
    high,
    low,
    mid,
    range,
    highIndex: swingHigh.index,
    lowIndex: swingLow.index,
    premium: {
      start: mid,
      end: high,
      percentage: 0.5,
    },
    discount: {
      start: low,
      end: mid,
      percentage: 0.5,
    },
  };
}

/**
 * STEP 2: Determine Premium/Discount Position
 */
export function getPremiumDiscountPosition(currentPrice, dealingRange) {
  if (!dealingRange) return 'UNKNOWN';

  const { high, low, mid } = dealingRange;
  const position = (currentPrice - low) / (high - low);

  if (position > 0.7) return 'EXTREME_PREMIUM';
  if (position > 0.5) return 'PREMIUM';
  if (position > 0.3) return 'DISCOUNT';
  return 'EXTREME_DISCOUNT';
}

/**
 * STEP 3: Identify Liquidity Objective
 */
export function identifyLiquidityObjective(candles, dealingRange, lookback = 200) {
  if (!candles || candles.length < lookback) {
    return { bullishObjective: null, bearishObjective: null };
  }

  const recentCandles = candles.slice(-lookback);
  const currentPrice = candles[candles.length - 1].close;

  const equalHighs = findEqualLevels(
    recentCandles.map(c => c.high).filter(h => h > currentPrice),
    0.0003
  );

  const equalLows = findEqualLevels(
    recentCandles.map(c => c.low).filter(l => l < currentPrice),
    0.0003
  );

  const periodHigh = Math.max(...recentCandles.map(c => c.high));
  const periodLow = Math.min(...recentCandles.map(c => c.low));

  const bullishObjective = {
    equalHighs: equalHighs.filter(h => h > currentPrice),
    periodHigh: periodHigh > currentPrice ? periodHigh : null,
    nearest: equalHighs.length > 0 
      ? Math.min(...equalHighs.filter(h => h > currentPrice))
      : periodHigh,
  };

  const bearishObjective = {
    equalLows: equalLows.filter(l => l < currentPrice),
    periodLow: periodLow < currentPrice ? periodLow : null,
    nearest: equalLows.length > 0
      ? Math.max(...equalLows.filter(l => l < currentPrice))
      : periodLow,
  };

  return {
    bullishObjective,
    bearishObjective,
    primaryObjective: 
      bullishObjective.nearest && bearishObjective.nearest
        ? (currentPrice - bearishObjective.nearest) < (bullishObjective.nearest - currentPrice)
          ? 'BEARISH'
          : 'BULLISH'
        : bullishObjective.nearest
          ? 'BULLISH'
          : 'BEARISH',
  };
}

/**
 * STEP 4: Detect Structure State
 */
export function detectStructureState(candles, lookback = 50) {
  if (!candles || candles.length < lookback) {
    return { state: 'NEUTRAL', hasDisplacement: false };
  }

  const recentCandles = candles.slice(-lookback);
  const swings = findSwingPoints(recentCandles, 5);

  if (swings.highs.length < 3 || swings.lows.length < 3) {
    return { state: 'NEUTRAL', hasDisplacement: false };
  }

  const lastThreeHighs = swings.highs.slice(-3);
  const lastThreeLows = swings.lows.slice(-3);

  const higherHighs = 
    lastThreeHighs[1].price > lastThreeHighs[0].price &&
    lastThreeHighs[2].price > lastThreeHighs[1].price;

  const higherLows =
    lastThreeLows[1].price > lastThreeLows[0].price &&
    lastThreeLows[2].price > lastThreeLows[1].price;

  const lowerHighs =
    lastThreeHighs[1].price < lastThreeHighs[0].price &&
    lastThreeHighs[2].price < lastThreeHighs[1].price;

  const lowerLows =
    lastThreeLows[1].price < lastThreeLows[0].price &&
    lastThreeLows[2].price < lastThreeLows[1].price;

  const hasDisplacement = detectDisplacementCandle(recentCandles);

  let state = 'NEUTRAL';
  if (higherHighs && higherLows && hasDisplacement) {
    state = 'BULLISH';
  } else if (lowerHighs && lowerLows && hasDisplacement) {
    state = 'BEARISH';
  } else if (higherHighs || higherLows) {
    state = 'BULLISH_WEAK';
  } else if (lowerHighs || lowerLows) {
    state = 'BEARISH_WEAK';
  }

  return {
    state,
    hasDisplacement,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
  };
}

/**
 * STEP 5: Detect Liquidity Sweep
 */
export function detectLiquiditySweepEvent(candles, lookback = 30) {
  if (!candles || candles.length < lookback) {
    return null;
  }

  const recentCandles = candles.slice(-lookback);
  
  const lows = recentCandles.map((c, i) => ({ price: c.low, index: i }));
  const equalLowGroups = findEqualLevelGroups(lows, 0.0003);

  const highs = recentCandles.map((c, i) => ({ price: c.high, index: i }));
  const equalHighGroups = findEqualLevelGroups(highs, 0.0003);

  const lastFiveCandles = recentCandles.slice(-5);
  
  const sslSweep = equalLowGroups.find(group => {
    const level = group.level;
    return lastFiveCandles.some((candle, i) => {
      const sweptBelow = candle.low < level * 0.9998;
      const closedAbove = candle.close > level;
      const strongReversal = candle.close > candle.open;
      return sweptBelow && closedAbove && strongReversal;
    });
  });

  const bslSweep = equalHighGroups.find(group => {
    const level = group.level;
    return lastFiveCandles.some((candle, i) => {
      const sweptAbove = candle.high > level * 1.0002;
      const closedBelow = candle.close < level;
      const strongReversal = candle.close < candle.open;
      return sweptAbove && closedBelow && strongReversal;
    });
  });

  if (sslSweep) {
    return {
      type: 'SSL_SWEEP',
      level: sslSweep.level,
      direction: 'BULLISH',
      timestamp: lastFiveCandles[lastFiveCandles.length - 1].timestamp,
    };
  }

  if (bslSweep) {
    return {
      type: 'BSL_SWEEP',
      level: bslSweep.level,
      direction: 'BEARISH',
      timestamp: lastFiveCandles[lastFiveCandles.length - 1].timestamp,
    };
  }

  return null;
}

/**
 * STEP 6: Calculate HTF Bias Score
 */
export function calculateHTFBiasScore(htfCandles, ltfCandles) {
  if (!htfCandles || htfCandles.length < 50) {
    return {
      bias: 'NEUTRAL',
      score: 0,
      confidence: 0,
      factors: [],
    };
  }

  let bullishScore = 0;
  let bearishScore = 0;
  const factors = [];

  const dealingRange = identifyDealingRange(htfCandles);
  if (dealingRange) {
    const currentPrice = htfCandles[htfCandles.length - 1].close;
    const position = getPremiumDiscountPosition(currentPrice, dealingRange);

    if (position === 'DISCOUNT' || position === 'EXTREME_DISCOUNT') {
      bullishScore += 15;
      factors.push({
        name: 'DISCOUNT_ZONE',
        points: 15,
        description: 'Price in discount - bullish opportunity',
      });
    } else if (position === 'PREMIUM' || position === 'EXTREME_PREMIUM') {
      bearishScore += 15;
      factors.push({
        name: 'PREMIUM_ZONE',
        points: 15,
        description: 'Price in premium - bearish opportunity',
      });
    }
  }

  const structure = detectStructureState(htfCandles);
  if (structure.state === 'BULLISH') {
    bullishScore += 30;
    factors.push({
      name: 'BULLISH_STRUCTURE',
      points: 30,
      description: 'Higher highs + higher lows with displacement',
    });
  } else if (structure.state === 'BEARISH') {
    bearishScore += 30;
    factors.push({
      name: 'BEARISH_STRUCTURE',
      points: 30,
      description: 'Lower highs + lower lows with displacement',
    });
  } else if (structure.state === 'BULLISH_WEAK') {
    bullishScore += 15;
    factors.push({
      name: 'BULLISH_STRUCTURE_WEAK',
      points: 15,
      description: 'Bullish structure without strong displacement',
    });
  } else if (structure.state === 'BEARISH_WEAK') {
    bearishScore += 15;
    factors.push({
      name: 'BEARISH_STRUCTURE_WEAK',
      points: 15,
      description: 'Bearish structure without strong displacement',
    });
  }

  const sweep = detectLiquiditySweepEvent(htfCandles);
  if (sweep) {
    if (sweep.direction === 'BULLISH') {
      bullishScore += 20;
      factors.push({
        name: 'SSL_SWEEP',
        points: 20,
        description: 'Sell-side liquidity taken - bullish reversal',
      });
    } else {
      bearishScore += 20;
      factors.push({
        name: 'BSL_SWEEP',
        points: 20,
        description: 'Buy-side liquidity taken - bearish reversal',
      });
    }
  }

  if (structure.hasDisplacement) {
    const lastCandles = htfCandles.slice(-5);
    const bullishDisplacement = lastCandles.some(c => 
      c.close > c.open && (c.close - c.open) / (c.high - c.low) > 0.7
    );
    
    if (bullishDisplacement) {
      bullishScore += 20;
      factors.push({
        name: 'BULLISH_DISPLACEMENT',
        points: 20,
        description: 'Strong upward expansion candle',
      });
    } else {
      bearishScore += 20;
      factors.push({
        name: 'BEARISH_DISPLACEMENT',
        points: 20,
        description: 'Strong downward expansion candle',
      });
    }
  }

  const liquidityObj = identifyLiquidityObjective(htfCandles, dealingRange);
  if (liquidityObj.primaryObjective === 'BULLISH') {
    bullishScore += 15;
    factors.push({
      name: 'BULLISH_LIQUIDITY_TARGET',
      points: 15,
      description: 'Untaken buy-side liquidity above',
    });
  } else if (liquidityObj.primaryObjective === 'BEARISH') {
    bearishScore += 15;
    factors.push({
      name: 'BEARISH_LIQUIDITY_TARGET',
      points: 15,
      description: 'Untaken sell-side liquidity below',
    });
  }

  const totalScore = Math.max(bullishScore, bearishScore);
  const bias = bullishScore > bearishScore ? 'BULLISH' : 
                bearishScore > bullishScore ? 'BEARISH' : 'NEUTRAL';
  
  const confidence = Math.min(totalScore / 100, 1);

  let strength;
  if (totalScore >= 70) strength = 'STRONG';
  else if (totalScore >= 50) strength = 'MODERATE';
  else if (totalScore >= 30) strength = 'WEAK';
  else strength = 'NEUTRAL';

  return {
    bias,
    score: totalScore,
    confidence,
    strength,
    bullishScore,
    bearishScore,
    factors,
    dealingRange,
    structure,
    liquidityObjective: liquidityObj,
    sweep,
  };
}

/**
 * MAIN FUNCTION: Complete HTF Bias Analysis
 */
export function analyzeInstitutionalBias(htfCandles, ltfCandles = null) {
  const analysis = calculateHTFBiasScore(htfCandles, ltfCandles);
  
  const narrative = analysis.bias === 'NEUTRAL' 
    ? 'No clear HTF bias - wait for structure development'
    : `${analysis.strength} ${analysis.bias} bias detected: ${analysis.factors.map(f => f.description).join(', ')}`;
  
  return {
    bias: analysis.bias,
    confidence: analysis.confidence,
    strength: analysis.strength,
    score: analysis.score,
    bullishScore: analysis.bullishScore,
    bearishScore: analysis.bearishScore,
    factors: analysis.factors,
    dealingRange: analysis.dealingRange,
    structure: analysis.structure,
    liquidityObjective: analysis.liquidityObjective,
    sweep: analysis.sweep,
    narrative,
  };
}

/**
 * Legacy compatibility functions
 */
export function mapLiquidityLevels(candles, timeframe) {
  const dealingRange = identifyDealingRange(candles);
  const liquidityObj = identifyLiquidityObjective(candles, dealingRange);
  
  return {
    support: liquidityObj.bearishObjective?.equalLows?.map(level => ({
      level,
      touches: 2,
      type: 'EQUAL_LOWS'
    })) || [],
    resistance: liquidityObj.bullishObjective?.equalHighs?.map(level => ({
      level,
      touches: 2,
      type: 'EQUAL_HIGHS'
    })) || [],
    dealingRange,
  };
}

export function calculateDealingRange(candles) {
  return identifyDealingRange(candles);
}

export function detectMarketPhase(candles, currentIndex) {
  if (!candles || currentIndex < 30) return 'UNKNOWN';
  
  const structure = detectStructureState(candles.slice(0, currentIndex + 1));
  const sweep = detectLiquiditySweepEvent(candles.slice(0, currentIndex + 1));
  
  if (sweep) return 'LIQUIDITY_RAID';
  if (structure.hasDisplacement) return 'DISPLACEMENT';
  if (structure.state !== 'NEUTRAL') return 'EXPANSION';
  
  return 'ACCUMULATION';
}

export { getSessionTiming, isHighProbabilitySession };

export function checkInstitutionalConfluence(ltfSignal, htfAnalysis, dealingRange, timestamp) {
  const confluence = {
    score: 0,
    factors: [],
  };

  if (htfAnalysis && htfAnalysis.bias !== 'NEUTRAL') {
    const signalDirection = ltfSignal.type === 'SSL' ? 'bullish' : 'bearish';
    const biasDirection = htfAnalysis.bias.toLowerCase();
    
    if (signalDirection === biasDirection) {
      const points = htfAnalysis.strength === 'STRONG' ? 40 : 
                     htfAnalysis.strength === 'MODERATE' ? 30 : 20;
      confluence.score += points;
      confluence.factors.push({
        name: 'HTF_BIAS_ALIGNED',
        weight: points,
        description: `${htfAnalysis.strength} ${htfAnalysis.bias} HTF bias confirms ${signalDirection} setup`,
      });
    } else {
      confluence.score -= 20;
      confluence.factors.push({
        name: 'HTF_BIAS_CONFLICT',
        weight: -20,
        description: 'Counter-trend trade (lower probability)',
      });
    }
  }

  if (dealingRange && ltfSignal.level) {
    const position = getPremiumDiscountPosition(ltfSignal.level, dealingRange);
    const signalDirection = ltfSignal.type === 'SSL' ? 'bullish' : 'bearish';
    
    if ((signalDirection === 'bullish' && (position === 'DISCOUNT' || position === 'EXTREME_DISCOUNT')) ||
        (signalDirection === 'bearish' && (position === 'PREMIUM' || position === 'EXTREME_PREMIUM'))) {
      const points = position.includes('EXTREME') ? 30 : 20;
      confluence.score += points;
      confluence.factors.push({
        name: 'OPTIMAL_ZONE',
        weight: points,
        description: `Entry in ${position} zone (institutional rule)`,
      });
    }
  }

  if (timestamp && isHighProbabilitySession(timestamp)) {
    confluence.score += 20;
    confluence.factors.push({
      name: 'SESSION_TIMING',
      weight: 20,
      description: 'London/NY Open window (high probability)',
    });
  }

  if (ltfSignal.data && ltfSignal.data.wickRatio > 0.5) {
    confluence.score += 10;
    confluence.factors.push({
      name: 'STRONG_REJECTION',
      weight: 10,
      description: 'Large wick indicates strong liquidity grab',
    });
  }

  let rating;
  if (confluence.score >= 80) rating = 'INSTITUTIONAL';
  else if (confluence.score >= 60) rating = 'HIGH_PROBABILITY';
  else if (confluence.score >= 40) rating = 'MODERATE';
  else if (confluence.score >= 20) rating = 'LOW';
  else rating = 'AVOID';

  return {
    ...confluence,
    rating,
    shouldTrade: confluence.score >= 40,
  };
}


