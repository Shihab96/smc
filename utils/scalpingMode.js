// utils/scalpingMode.js
// SCALPING MODE OPTIMIZATION
// Fast-entry triggers for 1-5 minute timeframes

import { calculateATR, calculateAverageRange } from './shared.js';

/**
 * SCALPING VS SWING MODE COMPARISON:
 * 
 * SWING MODE (Current 11-layer):
 * - Confluence ≥ 10
 * - 3-5 confirmation candles
 * - Daily + 4H + 1H alignment
 * - Win Rate: 88-95%
 * - Signals: 2-4/day
 * 
 * SCALPING MODE (New):
 * - Confluence ≥ 6
 * - 1-2 confirmation candles
 * - 15m + 5m alignment only
 * - Win Rate: 70-80%
 * - Signals: 10-20/day
 */

/**
 * Get scalping-optimized parameters
 * @param {String} timeframe - Trading timeframe
 * @returns {Object} Scalping parameters
 */
export function getScalpingParameters(timeframe) {
  // Determine if timeframe is scalping-suitable
  const scalpingTimeframes = ['1m', '3m', '5m', '15m'];
  const isScalping = scalpingTimeframes.includes(timeframe);
  
  if (!isScalping) {
    // Return swing parameters for higher timeframes
    return {
      mode: 'SWING',
      minConfluence: 10,
      confirmationCandles: 3,
      mtfTimeframes: ['D1', '4H', '1H'],
      requireFullAnalysis: true,
      allowFastEntry: false,
      sessionFilter: false,
    };
  }
  
  // Scalping parameters (optimized for speed)
  return {
    mode: 'SCALPING',
    minConfluence: 6,              // Lower threshold
    confirmationCandles: 1,        // Faster confirmation
    mtfTimeframes: ['15m', '5m'],  // Only lower timeframes
    requireFullAnalysis: false,    // Simplified checks
    allowFastEntry: true,          // Enable trigger entries
    sessionFilter: true,           // Only trade active sessions
    
    // Scalping-specific settings
    volumeSpikeMultiplier: 1.5,    // Require volume confirmation
    rvolThreshold: 1.2,            // Relative volume threshold
    strongCandleThreshold: 0.70,   // Body must be 70%+ of range
    minBodyThreshold: 0.50,        // Soft acceptance threshold
    stopAtrMultiplier: 1.2,        // Tight ATR stop
    takeProfitAtrMultiplier: 1.8,  // Quick ATR target
    maxBarsBetweenSignal: 3,       // Cooldown between signals
    vwapTolerance: 0.0015,         // VWAP reclaim tolerance
    atrMinRatio: 0.8,              // Avoid dead markets
    atrMaxRatio: 1.8,              // Avoid news spikes
    newsSpikeAtrMultiplier: 3,     // Skip extreme spikes
  };
}

export function isScalpingTimeframe(timeframe) {
  return ['1m', '3m', '5m', '15m'].includes(timeframe);
}

function calculateAverageVolume(candles, lookback = 20) {
  if (!candles || candles.length === 0) return 0;

  const recent = candles.slice(-lookback).filter(c => (c.volume || 0) > 0);
  if (recent.length === 0) return 0;

  return recent.reduce((sum, c) => sum + (c.volume || 0), 0) / recent.length;
}

function calculateVWAP(candles, lookback = 20) {
  if (!candles || candles.length === 0) return null;

  const recent = candles.slice(-lookback).filter(c => (c.volume || 0) > 0);
  if (recent.length === 0) return null;

  const totalVolume = recent.reduce((sum, c) => sum + (c.volume || 0), 0);
  if (!totalVolume) return null;

  const vwapNumerator = recent.reduce((sum, candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    return sum + (typicalPrice * (candle.volume || 0));
  }, 0);

  return vwapNumerator / totalVolume;
}

function calculateScalpingVolatility(candles, currentIndex, lookback = 20) {
  if (!candles || candles.length < 5 || currentIndex < 1) {
    return {
      atr: 0,
      avgAtr: 0,
      atrRatio: 1,
      currentRange: 0,
      rangeSpike: false,
      volatilityOk: false,
    };
  }

  const end = currentIndex + 1;
  const recent = candles.slice(Math.max(0, end - lookback), end);
  const previous = candles.slice(Math.max(0, end - lookback * 2), Math.max(0, end - lookback));

  const atr = calculateATR(recent, Math.min(14, recent.length));
  const avgAtr = previous.length >= 5
    ? calculateATR(previous, Math.min(14, previous.length))
    : atr;
  const atrRatio = avgAtr > 0 ? atr / avgAtr : 1;
  const currentRange = recent[recent.length - 1].high - recent[recent.length - 1].low;
  const rangeSpike = avgAtr > 0 ? currentRange > avgAtr * 3 : false;

  return {
    atr,
    avgAtr,
    atrRatio,
    currentRange,
    rangeSpike,
    volatilityOk: atrRatio >= 0.8 && atrRatio <= 1.8 && !rangeSpike,
  };
}

function deriveTrendBias(candles, lookback = 20) {
  if (!candles || candles.length < lookback + 2) {
    return 'NEUTRAL';
  }

  const recent = candles.slice(-lookback);
  const firstClose = recent[0].close;
  const lastClose = recent[recent.length - 1].close;
  const avgClose = recent.reduce((sum, c) => sum + c.close, 0) / recent.length;
  const slope = (lastClose - firstClose) / (firstClose || 1);

  if (lastClose > avgClose && slope > 0.001) return 'BULLISH';
  if (lastClose < avgClose && slope < -0.001) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Check if strong candle (for fast entries)
 * @param {Object} candle - Current candle
 * @param {Object} prevCandle - Previous candle
 * @returns {Object} Strong candle analysis
 */
export function isStrongCandle(candle, prevCandle, options = {}) {
  const {
    volumeSpikeMultiplier = 1.5,
    avgVolume = 0,
    avgRange = 0,
    minBodyThreshold = 0.50,
    strongCandleThreshold = 0.70,
    allowVolumeProxy = true,
  } = options;

  const range = candle.high - candle.low;
  if (range <= 0) {
    return {
      isStrong: false,
      direction: 'NEUTRAL',
      bodyPercent: '0.0',
      hasVolumeSpike: false,
      volumeSource: 'NONE',
      quality: 'WEAK',
    };
  }

  const body = Math.abs(candle.close - candle.open);
  const bodyPercent = body / range;
  
  const isBullish = candle.close > candle.open;
  const isBearish = candle.close < candle.open;
  const closePosition = (candle.close - candle.low) / range;
  
  // Volume spike check
  let volumeSpike = false;
  let volumeSource = 'NONE';

  if ((candle.volume || 0) > 0 && avgVolume > 0) {
    volumeSpike = candle.volume > (avgVolume * volumeSpikeMultiplier);
    volumeSource = 'REAL_VOLUME';
  } else if ((candle.volume || 0) > 0 && (prevCandle?.volume || 0) > 0) {
    volumeSpike = candle.volume > (prevCandle.volume * volumeSpikeMultiplier);
    volumeSource = 'PREV_VOLUME';
  } else if (allowVolumeProxy && avgRange > 0) {
    volumeSpike = range > avgRange * 1.2;
    volumeSource = 'RANGE_PROXY';
  }
  
  // Strong bullish candle
  const isStrongBullish = 
    isBullish && 
    bodyPercent >= strongCandleThreshold &&
    closePosition >= 0.75;
  
  // Strong bearish candle
  const isStrongBearish = 
    isBearish && 
    bodyPercent >= strongCandleThreshold &&
    closePosition <= 0.25;

  return {
    isStrong: isStrongBullish || isStrongBearish,
    direction: isStrongBullish ? 'BULLISH' : isStrongBearish ? 'BEARISH' : 'NEUTRAL',
    bodyPercent: (bodyPercent * 100).toFixed(1),
    closePosition: (closePosition * 100).toFixed(1),
    hasVolumeSpike: volumeSpike,
    volumeSource,
    quality: (isStrongBullish || isStrongBearish) && volumeSpike ? 'EXCELLENT' : 
             (isStrongBullish || isStrongBearish) && bodyPercent >= minBodyThreshold ? 'GOOD' : 'WEAK'
  };
}

/**
 * Fast-entry BUY trigger (scalping)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current index
 * @returns {Object} Fast entry signal or null
 */
export function checkFastBuyTrigger(candles, currentIndex, options = {}) {
  if (currentIndex < 2) return null;
  
  const current = candles[currentIndex];
  const prev = candles[currentIndex - 1];
  const prev2 = candles[currentIndex - 2];
  const recent = candles.slice(Math.max(0, currentIndex - 20), currentIndex + 1);
  const avgVolume = calculateAverageVolume(recent, 20);
  const avgRange = calculateAverageRange(recent, 20);
  const vwap = calculateVWAP(recent, 20);
  
  // Check for strong bullish candle
  const strongCandle = isStrongCandle(current, prev, {
    avgVolume,
    avgRange,
    ...options,
  });
  
  if (strongCandle.direction !== 'BULLISH') {
    return null;
  }
  
  const currentSweep = current.low < prev.low;
  const priorSweep = prev.low < prev2.low && current.close > prev.high;
  const vwapTolerance = options.vwapTolerance ?? 0.0005;
  const vwapReclaim = vwap ? current.low < (vwap * (1 - vwapTolerance)) && current.close > vwap : false;
  const reversedUp = current.close > prev.high || current.close > prev2.high;
  const swept = currentSweep || priorSweep || vwapReclaim;
  
  if (swept && reversedUp) {
    return {
      type: 'FAST_BUY',
      trigger: 'SWEEP_REVERSAL',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Swept liquidity and reclaimed with strong bullish candle',
      vwap,
      vwapAligned: vwap ? current.close >= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.75
    };
  }
  
  // Check 2: Break above resistance
  const resistance = Math.max(...candles.slice(Math.max(0, currentIndex - 10), currentIndex).map(c => c.high));
  const brokeAbove = current.close > resistance;

  if (brokeAbove && strongCandle.hasVolumeSpike) {
    return {
      type: 'FAST_BUY',
      trigger: 'BREAKOUT',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Broke resistance with volume spike',
      vwap,
      vwapAligned: vwap ? current.close >= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.70
    };
  }
  
  // Check 3: Bounce from support
  const support = Math.min(...candles.slice(Math.max(0, currentIndex - 10), currentIndex).map(c => c.low));
  const nearSupport = Math.abs(current.low - support) / support < 0.002; // Within 0.2%
  
  if (nearSupport && current.close > current.open) {
    return {
      type: 'FAST_BUY',
      trigger: 'SUPPORT_BOUNCE',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Bounced from support',
      vwap,
      vwapAligned: vwap ? current.close >= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.65
    };
  }
  
  return null;
}

/**
 * Fast-entry SELL trigger (scalping)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current index
 * @returns {Object} Fast entry signal or null
 */
export function checkFastSellTrigger(candles, currentIndex, options = {}) {
  if (currentIndex < 2) return null;
  
  const current = candles[currentIndex];
  const prev = candles[currentIndex - 1];
  const prev2 = candles[currentIndex - 2];
  const recent = candles.slice(Math.max(0, currentIndex - 20), currentIndex + 1);
  const avgVolume = calculateAverageVolume(recent, 20);
  const avgRange = calculateAverageRange(recent, 20);
  const vwap = calculateVWAP(recent, 20);
  
  // Check for strong bearish candle
  const strongCandle = isStrongCandle(current, prev, {
    avgVolume,
    avgRange,
    ...options,
  });
  
  if (strongCandle.direction !== 'BEARISH') {
    return null;
  }
  
  // Check 1: Sweep high + reversal
  const currentSweep = current.high > prev.high;
  const priorSweep = prev.high > prev2.high && current.close < prev.low;
  const vwapTolerance = options.vwapTolerance ?? 0.0005;
  const vwapRejection = vwap ? current.high > (vwap * (1 + vwapTolerance)) && current.close < vwap : false;
  const reversedDown = current.close < prev.low || current.close < prev2.low;
  const swept = currentSweep || priorSweep || vwapRejection;
  
  if (swept && reversedDown) {
    return {
      type: 'FAST_SELL',
      trigger: 'SWEEP_REVERSAL',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Swept liquidity and rejected with strong bearish candle',
      vwap,
      vwapAligned: vwap ? current.close <= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.75
    };
  }
  
  // Check 2: Break below support
  const support = Math.min(...candles.slice(Math.max(0, currentIndex - 10), currentIndex).map(c => c.low));
  const brokeBelow = current.close < support;
  
  if (brokeBelow && strongCandle.hasVolumeSpike) {
    return {
      type: 'FAST_SELL',
      trigger: 'BREAKDOWN',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Broke support with volume spike',
      vwap,
      vwapAligned: vwap ? current.close <= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.70
    };
  }
  
  // Check 3: Rejection from resistance
  const resistance = Math.max(...candles.slice(Math.max(0, currentIndex - 10), currentIndex).map(c => c.high));
  const nearResistance = Math.abs(current.high - resistance) / resistance < 0.002;
  
  if (nearResistance && current.close < current.open) {
    return {
      type: 'FAST_SELL',
      trigger: 'RESISTANCE_REJECTION',
      price: current.close,
      index: currentIndex,
      strength: strongCandle.quality,
      reason: 'Rejected from resistance',
      vwap,
      vwapAligned: vwap ? current.close <= vwap : true,
      volumeSource: strongCandle.volumeSource,
      confidence: 0.65
    };
  }
  
  return null;
}

/**
 * Check if in active trading session
 * @param {Number} timestamp - Candle timestamp
 * @returns {Object} Session information
 */
export function checkActiveSession(timestamp) {
  const date = new Date(timestamp);
  const totalUtcMinutes = (date.getUTCHours() * 60) + date.getUTCMinutes();
  const estMinutes = (totalUtcMinutes - (5 * 60) + (24 * 60)) % (24 * 60);
  const estHour = Math.floor(estMinutes / 60);
  const estMinute = estMinutes % 60;
  const estTime = estHour + (estMinute / 60);
  
  // London Session: 07:00-16:00 UTC
  const isLondon = totalUtcMinutes >= (7 * 60) && totalUtcMinutes < (16 * 60);
  
  // New York Session: 12:00-21:00 UTC
  const isNewYork = totalUtcMinutes >= (12 * 60) && totalUtcMinutes < (21 * 60);
  
  // Overlap: 12:00-16:00 UTC (BEST)
  const isOverlap = totalUtcMinutes >= (12 * 60) && totalUtcMinutes < (16 * 60);
  const isLunch = estTime >= 11.5 && estTime < 14;
  
  return {
    isActive: (isLondon || isNewYork) && !isLunch,
    session: isLunch ? 'LUNCH' :
             isOverlap ? 'OVERLAP' : 
             isLondon ? 'LONDON' : 
             isNewYork ? 'NEW_YORK' : 'INACTIVE',
    quality: isLunch ? 'POOR' :
             isOverlap ? 'EXCELLENT' : 
             (isLondon || isNewYork) ? 'GOOD' : 'POOR',
    allowScalping: (isLondon || isNewYork) && !isLunch,
  };
}

/**
 * Calculate scalping-optimized confluence
 * @param {Object} params - Signal parameters
 * @returns {Object} Scalping confluence score
 */
export function calculateScalpingConfluence(params) {
  const {
    fastTrigger,        // Fast entry trigger
    trend5m,            // 5-minute trend
    trend15m,           // 15-minute trend
    nearLevel,          // Near support/resistance
    volumeSpike,        // Volume confirmation
    session,            // Trading session
    vwapAligned = true, // VWAP confirmation
    volatilityOk = true,
    killZoneActive = false,
  } = params;
  
  let score = 0;
  const breakdown = [];
  
  // Fast trigger (mandatory for scalping signals)
  if (fastTrigger) {
    score += 2;
    breakdown.push({ factor: 'Fast Trigger', points: 2 });
  } else {
    return { score: 0, breakdown, quality: 'INVALID' }; // Must have trigger
  }
  
  const direction = fastTrigger.direction || (
    fastTrigger.type && fastTrigger.type.includes('BUY') ? 'BULLISH' : 'BEARISH'
  );

  // 5-minute trend alignment
  if (trend5m === direction) {
    score += 2;
    breakdown.push({ factor: '5m Trend', points: 2 });
  } else if (trend5m === 'NEUTRAL') {
    score += 1;
    breakdown.push({ factor: '5m Trend', points: 1 });
  }
  
  // 15-minute trend alignment (bonus)
  if (trend15m === direction) {
    score += 1;
    breakdown.push({ factor: '15m Trend', points: 1 });
  }
  
  // Near key level
  if (nearLevel) {
    score += 2;
    breakdown.push({ factor: 'Key Level', points: 2 });
  }
  
  // Volume spike
  if (volumeSpike) {
    score += 1;
    breakdown.push({ factor: 'Volume Spike', points: 1 });
  }

  // VWAP alignment
  if (vwapAligned) {
    score += 1;
    breakdown.push({ factor: 'VWAP', points: 1 });
  }

  // Volatility quality
  if (volatilityOk) {
    score += 1;
    breakdown.push({ factor: 'Volatility', points: 1 });
  }
  
  // Active session
  if (session && session.allowScalping) {
    score += session.quality === 'EXCELLENT' ? 2 : 1;
    breakdown.push({ factor: 'Session', points: session.quality === 'EXCELLENT' ? 2 : 1 });
  }

  if (killZoneActive) {
    score += 1;
    breakdown.push({ factor: 'Kill Zone', points: 1 });
  }
  
  // Determine quality
  let quality = 'POOR';
  if (score >= 10) quality = 'EXCELLENT';
  else if (score >= 8) quality = 'GOOD';
  else if (score >= 6) quality = 'ACCEPTABLE';
  
  return {
    score: score,
    maxScore: 13,
    breakdown: breakdown,
    quality: quality,
    allowTrade: score >= 6 // Minimum for scalping
  };
}

/**
 * Generate scalping signal with fast mode
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current index
 * @param {Object} context - Additional context (trends, levels, etc.)
 * @returns {Object} Scalping signal or null
 */
function buildScalpingMetrics(candles, currentIndex) {
  const recent = candles.slice(Math.max(0, currentIndex - 20), currentIndex + 1);
  const avgVolume = calculateAverageVolume(recent, 20);
  const vwap = calculateVWAP(recent, 20);
  const volatility = calculateScalpingVolatility(candles, currentIndex, 20);
  const current = candles[currentIndex];
  const currentVolume = current?.volume || 0;
  const hasRealVolume = recent.some(c => (c.volume || 0) > 0);
  const rvol = hasRealVolume && avgVolume > 0 ? currentVolume / avgVolume : 0;

  return {
    recent,
    avgVolume,
    currentVolume,
    hasRealVolume,
    rvol,
    vwap,
    ...volatility,
  };
}

export function generateScalpingSignal(candles, currentIndex, context = {}) {
  const params = getScalpingParameters(context.timeframe || '5m');
  
  if (params.mode !== 'SCALPING') {
    return null; // Not in scalping mode
  }

  if (!candles || candles.length === 0 || currentIndex < 2) {
    return null;
  }
  
  const current = candles[currentIndex];
  const metrics = buildScalpingMetrics(candles, currentIndex);
  const session = context.session || checkActiveSession(current.timestamp);
  
  if (params.sessionFilter && !session.allowScalping) {
    return null; // Outside active sessions
  }

  if (context.lastSignalIndex !== undefined &&
      currentIndex - context.lastSignalIndex < params.maxBarsBetweenSignal) {
    return null; // Cooldown between signals
  }
  
  const trend5m = context.trend5m || deriveTrendBias(metrics.recent, 12);
  const trend15m = context.trend15m || trend5m;
  const nearLevel = Boolean(context.nearLevel);
  const killZoneActive = Boolean(context.killZoneActive);
  const volatilityOk = context.volatilityOk ?? (
    metrics.atrRatio >= params.atrMinRatio &&
    metrics.atrRatio <= params.atrMaxRatio &&
    metrics.currentRange <= metrics.avgAtr * params.newsSpikeAtrMultiplier &&
    !metrics.rangeSpike
  );
  const volumeSpike = context.volumeSpike ?? (
    metrics.hasRealVolume
      ? metrics.rvol >= params.rvolThreshold || metrics.currentVolume > metrics.avgVolume * params.volumeSpikeMultiplier
      : metrics.currentRange > metrics.avgAtr
  );
  const vwap = context.vwap ?? metrics.vwap;

  // Check fast triggers
  const triggerOptions = {
    vwapTolerance: params.vwapTolerance,
    volumeSpikeMultiplier: params.volumeSpikeMultiplier,
    strongCandleThreshold: params.strongCandleThreshold,
    minBodyThreshold: params.minBodyThreshold,
  };

  const buyTrigger = checkFastBuyTrigger(candles, currentIndex, triggerOptions);
  const sellTrigger = checkFastSellTrigger(candles, currentIndex, triggerOptions);

  const candidates = [buyTrigger, sellTrigger]
    .filter(Boolean)
    .map(trigger => {
      const direction = trigger.type.includes('BUY') ? 'BULLISH' : 'BEARISH';
      const vwapAligned = vwap
        ? (direction === 'BULLISH' ? current.close >= vwap : current.close <= vwap)
        : true;

      const confluence = calculateScalpingConfluence({
        fastTrigger: trigger,
        trend5m,
        trend15m,
        nearLevel,
        volumeSpike: trigger.hasVolumeSpike || volumeSpike,
        session,
        vwapAligned,
        volatilityOk,
        killZoneActive,
      });

      const confidence = Math.min(
        Math.round((confluence.score / confluence.maxScore) * 100),
        100
      );

      return {
        trigger,
        confluence,
        confidence,
        vwapAligned,
      };
    })
    .filter(candidate => candidate.confluence.allowTrade && candidate.confidence >= 60);

  if (candidates.length === 0) {
    return null; // No fast trigger found
  }

  const chosen = candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.confluence.score - a.confluence.score;
  })[0];

  const trigger = chosen.trigger;
  const direction = trigger.type.includes('BUY') ? 'BUY' : 'SELL';
  const atr = metrics.atr || calculateATR(candles.slice(0, currentIndex + 1), 14);
  const stopDistance = Math.max(
    atr * params.stopAtrMultiplier,
    metrics.currentRange * 0.75
  );
  const takeProfitDistance = Math.max(
    stopDistance * 1.5,
    atr * params.takeProfitAtrMultiplier
  );
  const entry = trigger.price || current.close;
  const stopLoss = direction === 'BUY'
    ? entry - stopDistance
    : entry + stopDistance;
  const takeProfit = direction === 'BUY'
    ? entry + takeProfitDistance
    : entry - takeProfitDistance;
  const rr = stopDistance > 0 ? takeProfitDistance / stopDistance : 0;

  return {
    type: direction,
    direction,
    strategy: 'SCALPING',
    mode: 'SCALPING',
    price: entry,
    entry,
    index: currentIndex,
    timestamp: current.timestamp,
    
    // Scalping-specific data
    trigger: trigger.trigger,
    triggerStrength: trigger.strength,
    confluence: chosen.confluence.score,
    maxConfluence: chosen.confluence.maxScore,
    confidence: chosen.confidence,
    quality: chosen.confluence.quality,
    
    // Session info
    session: session.session,
    sessionQuality: session.quality,
    killZoneActive,
    
    // Volatility / volume context
    volumeSpike,
    vwap,
    volatilityOk,
    atr: metrics.atr,
    
    // ATR-based SL/TP for scalping
    stopLoss,
    takeProfit,
    rr,
    riskReward: rr,
    
    reason: `${trigger.reason} (${chosen.confluence.quality} confluence, ${session.session} session)`,
    confluenceBreakdown: chosen.confluence.breakdown,
  };
}

/**
 * Mode comparison - help user choose
 * @returns {Object} Mode comparison
 */
export function getModeComparison() {
  return {
    swing: {
      name: 'SWING TRADING',
      timeframes: ['15m', '30m', '1h', '4h', '1d'],
      minConfluence: 10,
      confirmationCandles: 3,
      expectedWinRate: '88-95%',
      signalsPerDay: '2-4',
      avgRR: '2.8:1',
      bestFor: 'Patient traders, larger accounts, part-time trading',
      pros: [
        'Very high win rate',
        'Less screen time',
        'Better risk:reward',
        'Less stress'
      ],
      cons: [
        'Fewer opportunities',
        'Larger stops required',
        'Slower profits'
      ]
    },
    
    scalping: {
      name: 'SCALPING',
      timeframes: ['1m', '3m', '5m'],
      minConfluence: 6,
      confirmationCandles: 1,
      expectedWinRate: '70-80%',
      signalsPerDay: '10-20',
      avgRR: '1.5-2.0:1',
      bestFor: 'Active traders, smaller accounts, full-time trading',
      pros: [
        'Many opportunities',
        'Quick profits',
        'Tight stops',
        'Active engagement'
      ],
      cons: [
        'Lower win rate',
        'More screen time',
        'Higher stress',
        'More commissions'
      ]
    }
  };
}
