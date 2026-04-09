// utils/goldExecution.js
// Gold-Specific Execution Simulator
// Models realistic spread, slippage, and worst-case scenarios

/**
 * Gold spread configuration (in points)
 */
export const GOLD_SPREAD = {
  NORMAL: 25,        // Normal market (1.5-3 pips = 15-30 points, using 25 conservative)
  ELEVATED: 50,      // London/NY open
  NEWS_SPIKE: 100,   // High-impact news
  ROLLOVER: 75,      // 21:00-23:00 server time
};

/**
 * Gold slippage configuration (in points)
 */
export const GOLD_SLIPPAGE = {
  NORMAL: 10,        // Normal session
  OPEN: 20,          // London/NY open
  NEWS: 50,          // High-impact news
  CONSERVATIVE: 20,  // Conservative default
};

/**
 * Detect session from timestamp
 */
export function getGoldSession(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getMinutes();
  const estHour = (hour - 5 + 24) % 24;

  // Asian Session (19:00-04:00 EST)
  if (estHour >= 19 || estHour < 4) {
    return 'ASIAN';
  }

  // London Open (3:00-4:00 EST)
  if (estHour === 3) {
    return 'LONDON_OPEN';
  }

  // London Session (4:00-12:00 EST)
  if (estHour >= 4 && estHour < 12) {
    return 'LONDON';
  }

  // NY Open (8:30-10:00 EST)
  if ((estHour === 8 && minute >= 30) || estHour === 9) {
    return 'NY_OPEN';
  }

  // NY Session (10:00-17:00 EST)
  if (estHour >= 10 && estHour < 17) {
    return 'NY';
  }

  // Rollover (avoid 21:00-23:00 server time)
  if (estHour >= 16 && estHour < 18) {
    return 'ROLLOVER';
  }

  return 'OFF_HOURS';
}

/**
 * Get spread for current session
 */
export function getSessionSpread(timestamp) {
  const session = getGoldSession(timestamp);

  switch (session) {
    case 'LONDON_OPEN':
    case 'NY_OPEN':
      return GOLD_SPREAD.ELEVATED;
    case 'ROLLOVER':
      return GOLD_SPREAD.ROLLOVER;
    default:
      return GOLD_SPREAD.NORMAL;
  }
}

/**
 * Get slippage for current session
 */
export function getSessionSlippage(timestamp) {
  const session = getGoldSession(timestamp);

  switch (session) {
    case 'LONDON_OPEN':
    case 'NY_OPEN':
      return GOLD_SLIPPAGE.OPEN;
    case 'ROLLOVER':
      return GOLD_SLIPPAGE.CONSERVATIVE;
    default:
      return GOLD_SLIPPAGE.NORMAL;
  }
}

/**
 * Check if trade should be avoided (rollover period)
 */
export function shouldAvoidTrade(timestamp) {
  const session = getGoldSession(timestamp);
  return session === 'ROLLOVER';
}

/**
 * Calculate realistic entry price with spread and slippage
 */
export function calculateEntryPrice(signal, entryCandle, timestamp) {
  const spread = getSessionSpread(timestamp);
  const slippage = getSessionSlippage(timestamp);

  const spreadPoints = spread / 10000; // Convert points to price
  const slippagePoints = slippage / 10000;

  // Entry zone midpoint
  const idealEntry = (signal.entryZone.low + signal.entryZone.high) / 2;

  // Add spread and slippage
  if (signal.direction === 'BUY') {
    return idealEntry + spreadPoints + slippagePoints;
  } else {
    return idealEntry - spreadPoints - slippagePoints;
  }
}

/**
 * Simulate trade execution on single candle
 * Returns: 'RUNNING', 'STOPPED', 'TARGET_HIT', or 'BOTH_TOUCHED'
 */
export function simulateTradeExecution(trade, candle) {
  const { entry, stop, target, direction } = trade;

  if (direction === 'BUY') {
    // Check if stop was hit
    const stopHit = candle.low <= stop;
    
    // Check if target was hit
    const targetHit = candle.high >= target;

    if (stopHit && targetHit) {
      // CRITICAL: Both touched in same candle
      // Gold-specific: Assume worst case (stop hit first)
      return 'STOPPED';
    } else if (stopHit) {
      return 'STOPPED';
    } else if (targetHit) {
      return 'TARGET_HIT';
    }
  } else {
    // SELL trade
    const stopHit = candle.high >= stop;
    const targetHit = candle.low <= target;

    if (stopHit && targetHit) {
      // CRITICAL: Both touched - assume worst case
      return 'STOPPED';
    } else if (stopHit) {
      return 'STOPPED';
    } else if (targetHit) {
      return 'TARGET_HIT';
    }
  }

  return 'RUNNING';
}

/**
 * Calculate trade result with realistic execution costs
 */
export function calculateTradeResult(trade, exitPrice, exitType) {
  const { entry, stop, target, direction, riskAmount } = trade;

  // Calculate raw result
  let rawPips;
  if (direction === 'BUY') {
    rawPips = (exitPrice - entry) * 10000;
  } else {
    rawPips = (entry - exitPrice) * 10000;
  }

  // Calculate R (risk multiple)
  const stopDistance = Math.abs(entry - stop) * 10000;
  const rMultiple = rawPips / stopDistance;

  // Calculate P&L
  const pnl = riskAmount * rMultiple;

  return {
    exitPrice,
    exitType,
    rawPips,
    stopDistance,
    rMultiple,
    pnl,
    winner: rMultiple > 0,
  };
}

/**
 * Calculate realistic stop with buffer
 */
export function calculateRealisticStop(signal, candle) {
  const buffer = 0.2; // 20% buffer beyond OB
  
  if (signal.direction === 'BUY') {
    return signal.stopLoss - (Math.abs(signal.stopLoss - signal.entryZone.low) * buffer);
  } else {
    return signal.stopLoss + (Math.abs(signal.entryZone.high - signal.stopLoss) * buffer);
  }
}

/**
 * Calculate realistic target with spread consideration
 */
export function calculateRealisticTarget(signal, timestamp) {
  const spread = getSessionSpread(timestamp) / 10000;

  if (signal.direction === 'BUY') {
    return signal.targets.primary - spread;
  } else {
    return signal.targets.primary + spread;
  }
}

/**
 * Validate if entry conditions are still valid
 * (Price hasn't moved too far from signal)
 */
export function isEntryStillValid(signal, currentCandle, maxSlippage = 50) {
  const currentPrice = currentCandle.close;
  const idealEntry = (signal.entryZone.low + signal.entryZone.high) / 2;
  const slippagePoints = Math.abs(currentPrice - idealEntry) * 10000;

  return slippagePoints <= maxSlippage;
}

/**
 * Get execution quality score
 * Higher is better (lower costs)
 */
export function getExecutionQuality(timestamp) {
  const session = getGoldSession(timestamp);
  const spread = getSessionSpread(timestamp);
  const slippage = getSessionSlippage(timestamp);

  const totalCost = spread + slippage;

  if (totalCost <= 30) return 'EXCELLENT';
  if (totalCost <= 50) return 'GOOD';
  if (totalCost <= 75) return 'FAIR';
  return 'POOR';
}

/**
 * Calculate total execution cost for a trade
 */
export function calculateExecutionCost(signal, timestamp, riskAmount) {
  const spread = getSessionSpread(timestamp) / 10000;
  const slippage = getSessionSlippage(timestamp) / 10000;
  
  const stopDistance = Math.abs(signal.entryZone.high - signal.stopLoss);
  const totalCostInR = (spread + slippage) / stopDistance;

  return {
    spreadPoints: getSessionSpread(timestamp),
    slippagePoints: getSessionSlippage(timestamp),
    totalPoints: getSessionSpread(timestamp) + getSessionSlippage(timestamp),
    costInR: totalCostInR,
    costInDollars: riskAmount * totalCostInR,
  };
}
