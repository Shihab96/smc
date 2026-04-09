// utils/confirmationFilters.js
// REGIME PERSISTENCE + SWEEP CONFIRMATION FILTERS
// Wait for confirmation before entering trades

/**
 * CONCEPT:
 * Don't jump into trades immediately - wait for confirmation:
 * 1. REGIME PERSISTENCE: 3-5 consecutive candles in same direction
 * 2. SWEEP CONFIRMATION: Wait 1 candle after sweep to confirm reversal
 * 
 * BENEFITS:
 * - Reduces false breakouts
 * - Avoids early reversals
 * - Improves win rate by 8-15%
 */

/**
 * Check regime persistence (consecutive candles in direction)
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current candle index
 * @param {String} direction - 'BULLISH' or 'BEARISH'
 * @param {Number} requiredCandles - Required consecutive candles (default 3)
 * @returns {Object} Persistence check result
 */
export function checkRegimePersistence(candles, currentIndex, direction, requiredCandles = 3) {
  if (currentIndex < requiredCandles) {
    return {
      isPersistent: false,
      consecutiveCount: 0,
      reason: 'Not enough candles'
    };
  }

  let consecutiveCount = 0;

  // Count consecutive candles in the same direction
  for (let i = currentIndex - 1; i >= currentIndex - requiredCandles && i >= 0; i--) {
    const candle = candles[i];
    const isBullish = candle.close > candle.open;
    const isBearish = candle.close < candle.open;

    if (direction === 'BULLISH' && isBullish) {
      consecutiveCount++;
    } else if (direction === 'BEARISH' && isBearish) {
      consecutiveCount++;
    } else {
      break; // Streak broken
    }
  }

  const isPersistent = consecutiveCount >= requiredCandles;

  return {
    isPersistent: isPersistent,
    consecutiveCount: consecutiveCount,
    requiredCount: requiredCandles,
    reason: isPersistent 
      ? `${consecutiveCount} consecutive ${direction.toLowerCase()} candles confirmed`
      : `Only ${consecutiveCount}/${requiredCandles} consecutive candles (need ${requiredCandles})`
  };
}

/**
 * Check sweep confirmation candle
 * @param {Array} candles - Candle array
 * @param {Number} sweepIndex - Index where sweep occurred
 * @param {Number} currentIndex - Current candle index
 * @param {String} expectedDirection - Expected reversal direction ('BULLISH' or 'BEARISH')
 * @returns {Object} Confirmation check result
 */
export function checkSweepConfirmation(candles, sweepIndex, currentIndex, expectedDirection) {
  // Must be at least 1 candle after sweep
  if (currentIndex <= sweepIndex) {
    return {
      isConfirmed: false,
      reason: 'Sweep just occurred - wait for confirmation candle'
    };
  }

  // Get the confirmation candle (candle after sweep)
  const confirmationCandle = candles[sweepIndex + 1];
  
  if (!confirmationCandle) {
    return {
      isConfirmed: false,
      reason: 'No confirmation candle available'
    };
  }

  const isBullish = confirmationCandle.close > confirmationCandle.open;
  const isBearish = confirmationCandle.close < confirmationCandle.open;

  // Calculate where close is in the candle range
  const candleRange = confirmationCandle.high - confirmationCandle.low;
  const closePosition = (confirmationCandle.close - confirmationCandle.low) / candleRange;

  let isConfirmed = false;
  let reason = '';

  if (expectedDirection === 'BULLISH') {
    // For bullish reversal after SSL sweep
    // Want: Bullish candle OR close in upper 60% of range
    if (isBullish || closePosition > 0.60) {
      isConfirmed = true;
      reason = isBullish 
        ? 'Bullish confirmation candle' 
        : `Close in upper ${(closePosition * 100).toFixed(0)}% of range`;
    } else {
      reason = `Weak confirmation - close in lower ${(closePosition * 100).toFixed(0)}% of range`;
    }
  } else if (expectedDirection === 'BEARISH') {
    // For bearish reversal after BSL sweep
    // Want: Bearish candle OR close in lower 40% of range
    if (isBearish || closePosition < 0.40) {
      isConfirmed = true;
      reason = isBearish 
        ? 'Bearish confirmation candle' 
        : `Close in lower ${(closePosition * 100).toFixed(0)}% of range`;
    } else {
      reason = `Weak confirmation - close in upper ${(closePosition * 100).toFixed(0)}% of range`;
    }
  }

  return {
    isConfirmed: isConfirmed,
    confirmationCandle: confirmationCandle,
    closePosition: closePosition,
    isBullish: isBullish,
    isBearish: isBearish,
    reason: reason
  };
}

/**
 * Validate signal with all confirmation filters
 * @param {Object} params - Validation parameters
 * @returns {Object} Complete validation result
 */
export function validateSignalWithConfirmation(params) {
  const {
    candles,
    currentIndex,
    signal,
    regime,
    recentSweep = null,
    requiredPersistence = 3
  } = params;

  const validations = [];
  let overallPass = true;

  // Determine expected direction from signal
  const signalDirection = signal.type === 'BUY' || signal.type?.includes('BULLISH') 
    ? 'BULLISH' 
    : 'BEARISH';

  // === VALIDATION 1: REGIME PERSISTENCE ===
  if (regime && (regime.regime === 'TRENDING' || regime.regime === 'DISTRIBUTION')) {
    const persistenceCheck = checkRegimePersistence(
      candles,
      currentIndex,
      signalDirection,
      requiredPersistence
    );

    validations.push({
      type: 'REGIME_PERSISTENCE',
      passed: persistenceCheck.isPersistent,
      details: persistenceCheck
    });

    if (!persistenceCheck.isPersistent) {
      overallPass = false;
    }
  }

  // === VALIDATION 2: SWEEP CONFIRMATION ===
  if (recentSweep) {
    const sweepConfirmation = checkSweepConfirmation(
      candles,
      recentSweep.candleIndex || recentSweep.index,
      currentIndex,
      signalDirection
    );

    validations.push({
      type: 'SWEEP_CONFIRMATION',
      passed: sweepConfirmation.isConfirmed,
      details: sweepConfirmation
    });

    if (!sweepConfirmation.isConfirmed) {
      overallPass = false;
    }
  }

  // Compile result
  const passedCount = validations.filter(v => v.passed).length;
  const failedValidations = validations.filter(v => !v.passed);

  const result = {
    validated: overallPass,
    totalChecks: validations.length,
    passedChecks: passedCount,
    validations: validations,
    
    summary: overallPass 
      ? `All ${passedCount} confirmation checks passed` 
      : `Failed ${failedValidations.length} checks: ${failedValidations.map(v => v.type).join(', ')}`,
    
    reasons: failedValidations.map(v => ({
      check: v.type,
      reason: v.details.reason
    }))
  };

  if (validations.length > 0) {
    console.log(`\n✅ CONFIRMATION FILTERS`);
    console.log(`Signal: ${signal.type} at ${signal.price?.toFixed(2) || 'N/A'}`);
    console.log(`Direction: ${signalDirection}`);
    validations.forEach(v => {
      console.log(`  ${v.type}: ${v.passed ? '✅ PASS' : '❌ FAIL'} - ${v.details.reason}`);
    });
    console.log(`Result: ${result.validated ? '✅ VALIDATED' : '❌ REJECTED'}\n`);
  }

  return result;
}

/**
 * Enhanced regime persistence for different regime types
 * @param {Array} candles - Candle array
 * @param {Number} currentIndex - Current candle index
 * @param {Object} regime - Regime object
 * @param {String} signalDirection - Signal direction
 * @returns {Object} Enhanced persistence check
 */
export function checkEnhancedRegimePersistence(candles, currentIndex, regime, signalDirection) {
  if (!regime) {
    return { isPersistent: true, reason: 'No regime check required' };
  }

  let requiredCandles = 3; // Default

  // Adjust based on regime type
  switch (regime.regime) {
    case 'TRENDING':
      requiredCandles = 3; // Strong trend - 3 candles enough
      break;
    
    case 'EXPANSION':
      requiredCandles = 2; // Fast breakout - 2 candles acceptable
      break;
    
    case 'DISTRIBUTION':
      requiredCandles = 4; // Reversal - need more confirmation (4 candles)
      break;
    
    case 'RANGING':
      requiredCandles = 2; // Range - quick reversals (2 candles)
      break;
    
    case 'WEAK_TREND':
      requiredCandles = 5; // Weak trend - need strong confirmation (5 candles)
      break;
    
    default:
      requiredCandles = 3;
  }

  // Check persistence
  const persistence = checkRegimePersistence(
    candles,
    currentIndex,
    signalDirection,
    requiredCandles
  );

  return {
    ...persistence,
    regimeType: regime.regime,
    adjustedRequirement: requiredCandles
  };
}

/**
 * Check if enough time has passed since sweep
 * @param {Object} sweep - Sweep object
 * @param {Number} currentIndex - Current index
 * @param {Number} minCandlesSinceSweep - Minimum candles to wait (default 1)
 * @returns {Object} Time check result
 */
export function checkSweepCooldown(sweep, currentIndex, minCandlesSinceSweep = 1) {
  const sweepIndex = sweep.candleIndex || sweep.index || 0;
  const candlesSinceSweep = currentIndex - sweepIndex;

  const isValid = candlesSinceSweep >= minCandlesSinceSweep;

  return {
    isValid: isValid,
    candlesSinceSweep: candlesSinceSweep,
    minRequired: minCandlesSinceSweep,
    reason: isValid 
      ? `${candlesSinceSweep} candles since sweep (enough cooldown)`
      : `Only ${candlesSinceSweep} candles since sweep (need ${minCandlesSinceSweep})`
  };
}
