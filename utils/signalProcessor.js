// utils/signalProcessor.js
// Automated Signal Processor - Runs all strategies

import { analyzeInstitutionalBias } from './institutional.js';
import { 
  mapLTFLiquidity,
  generateEntrySignal,
  isInKillZone,
  isVolatilityExpanding 
} from './ltfExecution.js';
import { detectLiquiditySweeps } from './liquidity.js';
import { detectImpulse } from './impulse.js';
import { generateScalpingSignal, isScalpingTimeframe } from './scalpingMode.js';
import { aggregateCandles, getMTFStructure } from './mtfMapper.js';

/**
 * Process candles and generate signals
 * This is the main automation entry point
 */
export async function processSignals(candles, config) {
  if (!candles || candles.length < 100) {
    return {
      success: false,
      error: 'Insufficient candle data (need at least 100 candles)',
    };
  }

  const signals = [];
  const currentIndex = candles.length - 1;
  const timestamp = candles[currentIndex].timestamp;
  const timeframe = config.timeframe || '5m';
  const scalpingEnabled = Boolean(config.strategies?.scalping) && isScalpingTimeframe(timeframe);

  try {
    // STEP 1: Analyze HTF Bias / MTF Context
    let htfBias = null;
    let dealingRange = null;
    let scalpingTrend5m = 'NEUTRAL';
    let scalpingTrend15m = 'NEUTRAL';

    if (config.strategies?.htfBias || scalpingEnabled) {
      console.log('Running HTF bias analysis...');
      if (scalpingEnabled) {
        const mtfStructure = getMTFStructure(timeframe);
        const itfCandles = aggregateCandles(candles, mtfStructure.itf);
        const htfCandles = aggregateCandles(candles, mtfStructure.htf);
        const scalpingItfBias = itfCandles.length >= 20 ? analyzeInstitutionalBias(itfCandles) : null;
        const scalpingHtfBias = htfCandles.length >= 20 ? analyzeInstitutionalBias(htfCandles) : null;

        htfBias = scalpingHtfBias || scalpingItfBias || analyzeInstitutionalBias(candles);
        dealingRange = htfBias.dealingRange;
        scalpingTrend5m = scalpingItfBias?.bias || htfBias.bias || 'NEUTRAL';
        scalpingTrend15m = scalpingHtfBias?.bias || htfBias.bias || 'NEUTRAL';

        console.log(`Scalping MTF: 5m=${scalpingTrend5m}, 15m=${scalpingTrend15m}`);
      } else {
        htfBias = analyzeInstitutionalBias(candles);
        dealingRange = htfBias.dealingRange;
      }

      console.log(`HTF Bias: ${htfBias.bias} (${htfBias.score}/100)`);

      // Only proceed if HTF bias is strong enough
      if (!scalpingEnabled && htfBias.score < 50) {
        console.log('HTF bias too weak, skipping entry signals');
        return {
          success: true,
          signals: [],
          htfBias,
          reason: 'HTF bias below threshold',
        };
      }
    }

    // STEP 2: Map LTF Liquidity
    console.log('Mapping LTF liquidity...');
    const liquidityLevels = mapLTFLiquidity(candles, 50);
    console.log(`Found ${liquidityLevels.length} liquidity levels`);

    // STEP 3: Check Kill Zone
    const killZoneActive = isInKillZone(timestamp);
    console.log(`Kill Zone: ${killZoneActive ? 'ACTIVE' : 'INACTIVE'}`);

    // STEP 4: Check Volatility
    const volatilityExpanding = isVolatilityExpanding(candles, currentIndex);
    console.log(`Volatility: ${volatilityExpanding ? 'EXPANDING' : 'STABLE'}`);

    if (scalpingEnabled) {
      console.log('Checking for scalping signals...');

      const currentPrice = candles[currentIndex].close;
      const nearLevel = liquidityLevels.some(level => (
        Math.abs(level.price - currentPrice) / currentPrice <= 0.0015
      ));

      const scalpingSignal = generateScalpingSignal(candles, currentIndex, {
        timeframe,
        trend5m: scalpingTrend5m,
        trend15m: scalpingTrend15m,
        nearLevel,
        killZoneActive,
        htfBias,
      });

      if (scalpingSignal) {
        console.log(`✅ Scalping Signal Generated: ${scalpingSignal.direction || scalpingSignal.type} (${scalpingSignal.confidence}%)`);

        signals.push({
          ...scalpingSignal,
          symbol: config.symbol,
          timeframe,
          strategy: 'SCALPING',
          htfBias: htfBias ? `${htfBias.strength} ${htfBias.bias}` : null,
          price: scalpingSignal.entry || scalpingSignal.price || currentPrice,
        });
      }

      return {
        success: true,
        signals,
        htfBias,
        killZoneActive,
        volatilityExpanding,
        liquidityLevels: liquidityLevels.length,
        processedAt: new Date().toISOString(),
      };
    }

    // STEP 5: Generate LTF Entry Signal (if enabled)
    if (config.strategies?.ltfExecution) {
      console.log('Checking for LTF entry signals...');
      
      const entrySignal = generateEntrySignal({
        candles,
        currentIndex,
        htfBias,
        dealingRange,
        liquidityLevels,
        killZoneActive,
        volatilityExpanding,
      });

      if (entrySignal && entrySignal.confidence >= 75) {
        console.log(`✅ LTF Entry Signal Generated: ${entrySignal.direction} (${entrySignal.confidence}%)`);
        
        signals.push({
          ...entrySignal,
          symbol: config.symbol,
          timeframe: config.timeframe,
          strategy: 'LTF_EXECUTION',
          htfBias: htfBias ? `${htfBias.strength} ${htfBias.bias}` : null,
          price: candles[currentIndex].close,
        });
      }
    }

    // STEP 6: Detect Liquidity Sweeps (if enabled)
    if (config.strategies?.liquiditySweeps) {
      console.log('Checking for liquidity sweeps...');
      
      const sweepSettings = {
        lookback: 20,
        wickRatio: 0.4,
        equalTolerance: 0.0002,
        enableMSS: true,
      };

      const sweeps = detectLiquiditySweeps(candles, sweepSettings, currentIndex);

      sweeps.forEach(sweep => {
        // Check HTF alignment
        const htfAligned = !htfBias || 
          (sweep.direction === 'bullish' && htfBias.bias === 'BULLISH') ||
          (sweep.direction === 'bearish' && htfBias.bias === 'BEARISH');

        if (htfAligned) {
          console.log(`✅ Liquidity Sweep: ${sweep.type} (HTF aligned)`);
          
          signals.push({
            type: sweep.type,
            direction: sweep.direction === 'bullish' ? 'BUY' : 'SELL',
            symbol: config.symbol,
            timeframe: config.timeframe,
            timestamp,
            strategy: 'LIQUIDITY_SWEEP',
            level: sweep.level,
            confidence: 70,
            htfBias: htfBias ? `${htfBias.strength} ${htfBias.bias}` : null,
            price: candles[currentIndex].close,
            data: sweep.data,
          });
        }
      });
    }

    // STEP 7: Detect Impulse Moves (if enabled)
    if (config.strategies?.impulse) {
      console.log('Checking for impulse moves...');
      
      const impulseSettings = {
        rangeMultiplier: 2.5,
        bodyRatio: 0.65,
        volumeMultiplier: 1.8,
        consecutiveCount: 2,
      };

      const impulses = detectImpulse(candles, impulseSettings, currentIndex);

      impulses.forEach(impulse => {
        // Check HTF alignment
        const htfAligned = !htfBias || 
          (impulse.direction === 'bullish' && htfBias.bias === 'BULLISH') ||
          (impulse.direction === 'bearish' && htfBias.bias === 'BEARISH');

        if (htfAligned && impulse.strength >= 70) {
          console.log(`✅ Impulse Move: ${impulse.type} (strength ${impulse.strength}%)`);
          
          signals.push({
            type: impulse.type,
            direction: impulse.direction === 'bullish' ? 'BUY' : 'SELL',
            symbol: config.symbol,
            timeframe: config.timeframe,
            timestamp,
            strategy: 'IMPULSE',
            confidence: impulse.strength,
            htfBias: htfBias ? `${htfBias.strength} ${htfBias.bias}` : null,
            price: candles[currentIndex].close,
            data: impulse.data,
          });
        }
      });
    }

    // Return results
    return {
      success: true,
      signals,
      htfBias,
      killZoneActive,
      volatilityExpanding,
      liquidityLevels: liquidityLevels.length,
      processedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Signal processing error:', error);
    return {
      success: false,
      error: error.message,
      signals: [],
    };
  }
}

/**
 * Format signal for display/notification
 */
export function formatSignal(signal) {
  const rrValue = signal.rr || signal.riskReward;

  return {
    ...signal,
    formattedTime: new Date(signal.timestamp).toLocaleString(),
    confidenceLabel: signal.confidence >= 80 ? 'High' : 
                     signal.confidence >= 60 ? 'Medium' : 'Low',
    rrLabel: rrValue ? `1:${rrValue.toFixed(1)}` : 'N/A',
  };
}

/**
 * Validate signal quality
 * Returns true if signal meets minimum quality standards
 */
export function isHighQualitySignal(signal, minConfidence = 70) {
  const isScalpingSignal = signal.mode === 'SCALPING' || signal.strategy === 'SCALPING';
  const rrValue = signal.rr || signal.riskReward;
  const requiredConfidence = isScalpingSignal ? 60 : minConfidence;

  // Must have minimum confidence
  if (signal.confidence < requiredConfidence) return false;

  // Must have HTF bias alignment (if HTF bias available)
  if (!isScalpingSignal && signal.htfBias && signal.htfBias.includes('NEUTRAL')) return false;

  // For LTF execution signals, check R:R
  if (signal.strategy === 'LTF_EXECUTION') {
    if (!signal.rr || signal.rr < 2) return false;
  }

  // For scalping, keep the R:R realistic but less strict than swing
  if (isScalpingSignal && rrValue && rrValue < 1.2) {
    return false;
  }

  return true;
}

/**
 * Get signal priority
 * Used to determine which signals to notify first
 */
export function getSignalPriority(signal) {
  let priority = 0;

  // Strategy priority
  if (signal.strategy === 'SCALPING') priority += 55;
  else if (signal.strategy === 'LTF_EXECUTION') priority += 50;
  else if (signal.strategy === 'LIQUIDITY_SWEEP') priority += 30;
  else if (signal.strategy === 'IMPULSE') priority += 20;

  // Confidence bonus
  priority += signal.confidence * 0.3;

  // R:R bonus
  if (signal.rr) {
    priority += Math.min(signal.rr * 5, 30);
  }

  // HTF bias bonus
  if (signal.htfBias && signal.htfBias.includes('STRONG')) {
    priority += 20;
  }

  return Math.round(priority);
}
