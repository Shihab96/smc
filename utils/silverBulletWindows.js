// utils/silverBulletWindows.js
// PHASE 2 - SIGNAL TYPE 2: SILVER BULLET TIME WINDOWS
// Algorithms execute major orders at specific times - restrict highest-confidence signals to these windows

/**
 * SILVER BULLET CONCEPT:
 * Institutional algorithms execute major orders during specific 60-minute windows.
 * Trading during these windows with proper setup = significantly higher win rate.
 * 
 * PRIMARY WINDOWS (EST):
 * 1. London Silver Bullet: 3:00-4:00 AM (2x position)
 * 2. NY AM Silver Bullet: 10:00-11:00 AM (2x position)
 * 3. NY PM Silver Bullet: 2:00-3:00 PM (2x position)
 * 
 * SETUP REQUIREMENTS:
 * - Must occur within 60-minute window
 * - Combine FVG formation + Liquidity Sweep
 * - Minimum 6/11 confluence score
 * - HTF alignment required
 * 
 * BONUS: +15% win rate during optimal windows
 * Position size: 2x normal
 */

/**
 * Silver Bullet Window definitions (EST timezone)
 */
export const SILVER_BULLET_WINDOWS = {
  LONDON: {
    name: 'London Silver Bullet',
    startHour: 3,
    startMinute: 0,
    endHour: 4,
    endMinute: 0,
    timezone: 'EST',
    positionMultiplier: 2.0,
    winRateBonus: 0.15,  // +15%
    priority: 'MAXIMUM',
    description: 'London institutional execution window'
  },
  
  NY_AM: {
    name: 'NY AM Silver Bullet',
    startHour: 10,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    timezone: 'EST',
    positionMultiplier: 2.0,
    winRateBonus: 0.15,  // +15%
    priority: 'MAXIMUM',
    description: 'New York morning institutional execution window'
  },
  
  NY_PM: {
    name: 'NY PM Silver Bullet',
    startHour: 14,  // 2 PM
    startMinute: 0,
    endHour: 15,    // 3 PM
    endMinute: 0,
    timezone: 'EST',
    positionMultiplier: 2.0,
    winRateBonus: 0.15,  // +15%
    priority: 'MAXIMUM',
    description: 'New York afternoon institutional execution window'
  }
};

/**
 * Check if timestamp is within a Silver Bullet window
 * @param {Number|String|Date} timestamp - Timestamp to check
 * @returns {Object} Window info or null
 */
export function checkSilverBulletWindow(timestamp) {
  const date = new Date(timestamp);
  
  // Convert to EST (UTC-5, or UTC-4 during DST)
  // For simplicity, we'll work with UTC and adjust
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  
  // Convert UTC to EST (EST is UTC-5)
  // Note: This is a simplified conversion; production should handle DST properly
  let estHours = utcHours - 5;
  if (estHours < 0) estHours += 24;
  
  const estMinutes = utcMinutes;

  // Check each window
  for (const [key, window] of Object.entries(SILVER_BULLET_WINDOWS)) {
    if (isWithinWindow(estHours, estMinutes, window)) {
      return {
        active: true,
        window: key,
        name: window.name,
        positionMultiplier: window.positionMultiplier,
        winRateBonus: window.winRateBonus,
        priority: window.priority,
        startTime: `${window.startHour}:${String(window.startMinute).padStart(2, '0')} ${window.timezone}`,
        endTime: `${window.endHour}:${String(window.endMinute).padStart(2, '0')} ${window.timezone}`,
        message: `🎯 ${window.name} ACTIVE - 2x position, +15% WR`
      };
    }
  }

  return {
    active: false,
    window: null,
    message: 'Outside Silver Bullet windows'
  };
}

/**
 * Check if time is within a specific window
 * @param {Number} hours - Hours (0-23)
 * @param {Number} minutes - Minutes (0-59)
 * @param {Object} window - Window definition
 * @returns {Boolean} True if within window
 */
function isWithinWindow(hours, minutes, window) {
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = window.startHour * 60 + window.startMinute;
  const endMinutes = window.endHour * 60 + window.endMinute;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Validate if signal meets Silver Bullet requirements
 * @param {Object} signal - Trading signal
 * @param {Object} marketConditions - Current market conditions
 * @returns {Object} Validation result
 */
export function validateSilverBulletSetup(signal, marketConditions) {
  if (!signal || !marketConditions) {
    return {
      valid: false,
      reason: 'Missing signal or market conditions'
    };
  }

  const requirements = [];
  let passed = 0;
  const total = 4;

  // Requirement 1: Within 60-minute window
  const windowCheck = checkSilverBulletWindow(signal.timestamp);
  if (windowCheck.active) {
    passed++;
    requirements.push({ name: 'Silver Bullet Window', passed: true, value: windowCheck.name });
  } else {
    requirements.push({ name: 'Silver Bullet Window', passed: false, value: 'Outside windows' });
  }

  // Requirement 2: FVG formation + Liquidity Sweep
  const hasFVG = signal.trigger === 'FVG' || marketConditions.hasFVG;
  const hasLiquiditySweep = 
    signal.trigger === 'BSL' || 
    signal.trigger === 'SSL' || 
    marketConditions.hasLiquiditySweep;
  
  const hasCombo = hasFVG && hasLiquiditySweep;
  
  if (hasCombo) {
    passed++;
    requirements.push({ name: 'FVG + Liquidity Sweep', passed: true, value: 'Both present' });
  } else {
    requirements.push({ 
      name: 'FVG + Liquidity Sweep', 
      passed: false, 
      value: `FVG: ${hasFVG}, Sweep: ${hasLiquiditySweep}` 
    });
  }

  // Requirement 3: Minimum 6/11 confluence
  const confluence = signal.confluence || marketConditions.confluence || 0;
  
  if (confluence >= 6) {
    passed++;
    requirements.push({ name: 'Minimum 6/11 Confluence', passed: true, value: `${confluence}/11` });
  } else {
    requirements.push({ name: 'Minimum 6/11 Confluence', passed: false, value: `${confluence}/11` });
  }

  // Requirement 4: HTF alignment
  const htfAligned = marketConditions.htfBias && 
    ((signal.type === 'BUY' && marketConditions.htfBias.bias === 'BULLISH') ||
     (signal.type === 'SELL' && marketConditions.htfBias.bias === 'BEARISH'));
  
  if (htfAligned) {
    passed++;
    requirements.push({ name: 'HTF Alignment', passed: true, value: marketConditions.htfBias.bias });
  } else {
    requirements.push({ 
      name: 'HTF Alignment', 
      passed: false, 
      value: marketConditions.htfBias?.bias || 'Unknown' 
    });
  }

  const valid = passed === total;

  return {
    valid,
    passed,
    total,
    requirements,
    windowInfo: windowCheck,
    message: valid 
      ? `✅ VALID SILVER BULLET SETUP (${passed}/${total})` 
      : `❌ Failed Silver Bullet requirements (${passed}/${total})`
  };
}

/**
 * Apply Silver Bullet bonus to signal
 * @param {Object} signal - Trading signal
 * @param {Object} validation - Silver Bullet validation result
 * @returns {Object} Enhanced signal
 */
export function applySilverBulletBonus(signal, validation) {
  if (!signal || !validation || !validation.valid) {
    return {
      enhanced: false,
      signal: signal,
      reason: validation?.message || 'Invalid setup'
    };
  }

  const windowInfo = validation.windowInfo;

  // Calculate enhanced metrics
  const baseWinRate = signal.expectedWR || 0.65;
  const enhancedWinRate = baseWinRate + windowInfo.winRateBonus;
  
  const enhancedSignal = {
    ...signal,
    
    // Silver Bullet enhancements
    isSilverBullet: true,
    silverBulletWindow: windowInfo.name,
    
    // Win rate boost
    baseWinRate: baseWinRate,
    silverBulletBonus: windowInfo.winRateBonus,
    enhancedWinRate: enhancedWinRate,
    
    // Position sizing
    basePositionSize: signal.positionSize || 1.0,
    positionMultiplier: windowInfo.positionMultiplier,
    enhancedPositionSize: (signal.positionSize || 1.0) * windowInfo.positionMultiplier,
    
    // Priority
    priority: windowInfo.priority,
    
    // Message
    message: `${signal.message || ''}\n🎯 ${windowInfo.message}`,
    
    // Confluence bonus
    silverBulletConfluenceBonus: 2  // +2 for being in silver bullet window
  };

  return {
    enhanced: true,
    signal: enhancedSignal,
    windowInfo: windowInfo,
    validation: validation,
    message: `Signal enhanced with Silver Bullet: ${enhancedWinRate * 100}% WR, ${windowInfo.positionMultiplier}x position`
  };
}

/**
 * Get all Silver Bullet windows for a given day
 * @param {Date} date - Date to check
 * @returns {Array} Array of window times
 */
export function getSilverBulletWindowsForDay(date) {
  const windows = [];

  for (const [key, window] of Object.entries(SILVER_BULLET_WINDOWS)) {
    const startTime = new Date(date);
    startTime.setHours(window.startHour, window.startMinute, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(window.endHour, window.endMinute, 0, 0);

    windows.push({
      name: window.name,
      key: key,
      startTime: startTime,
      endTime: endTime,
      duration: 60, // minutes
      positionMultiplier: window.positionMultiplier,
      winRateBonus: window.winRateBonus,
      description: window.description
    });
  }

  return windows;
}

/**
 * Find next Silver Bullet window
 * @param {Number|String|Date} currentTimestamp - Current time
 * @returns {Object} Next window info
 */
export function getNextSilverBulletWindow(currentTimestamp) {
  const current = new Date(currentTimestamp);
  const currentDate = new Date(current);
  
  // Get all windows for today
  let windows = getSilverBulletWindowsForDay(currentDate);
  
  // Filter to future windows
  let futureWindows = windows.filter(w => w.startTime > current);
  
  // If no future windows today, get tomorrow's first window
  if (futureWindows.length === 0) {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowWindows = getSilverBulletWindowsForDay(tomorrow);
    futureWindows = [tomorrowWindows[0]]; // First window tomorrow
  }

  // Return next window
  const nextWindow = futureWindows[0];
  
  if (!nextWindow) {
    return null;
  }

  const timeUntil = nextWindow.startTime - current;
  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

  return {
    window: nextWindow,
    timeUntil: timeUntil,
    hoursUntil: hoursUntil,
    minutesUntil: minutesUntil,
    message: `Next window: ${nextWindow.name} in ${hoursUntil}h ${minutesUntil}m`
  };
}

/**
 * Check if signal should be filtered based on Silver Bullet requirements
 * @param {Object} signal - Trading signal
 * @param {Object} marketConditions - Market conditions
 * @param {Boolean} strictMode - If true, only allow signals in Silver Bullet windows
 * @returns {Object} Filter result
 */
export function filterSignalBySilverBullet(signal, marketConditions, strictMode = false) {
  const windowCheck = checkSilverBulletWindow(signal.timestamp);
  
  if (!strictMode) {
    // Not strict mode - allow all signals, but enhance those in windows
    if (windowCheck.active) {
      const validation = validateSilverBulletSetup(signal, marketConditions);
      
      if (validation.valid) {
        return applySilverBulletBonus(signal, validation);
      }
    }
    
    return {
      enhanced: false,
      signal: signal,
      reason: 'Outside Silver Bullet window or requirements not met'
    };
  }
  
  // Strict mode - only allow signals in Silver Bullet windows with all requirements
  if (!windowCheck.active) {
    return {
      filtered: true,
      signal: null,
      reason: 'Outside Silver Bullet windows (strict mode)'
    };
  }
  
  const validation = validateSilverBulletSetup(signal, marketConditions);
  
  if (!validation.valid) {
    return {
      filtered: true,
      signal: null,
      reason: `Silver Bullet requirements not met: ${validation.message}`
    };
  }
  
  // Valid Silver Bullet setup
  return applySilverBulletBonus(signal, validation);
}

/**
 * Calculate expected performance for Silver Bullet vs regular trading
 * @param {Object} baseMetrics - Base trading metrics
 * @returns {Object} Comparison
 */
export function calculateSilverBulletImpact(baseMetrics) {
  const baseWinRate = baseMetrics.winRate || 0.65;
  const baseProfitFactor = baseMetrics.profitFactor || 2.0;
  
  // Silver Bullet improvements
  const sbWinRate = baseWinRate + 0.15;  // +15%
  const sbPositionSize = 2.0;  // 2x position
  
  // Expected trades per day
  const baseTrades = baseMetrics.tradesPerDay || 5;
  const sbTrades = 2;  // ~2 Silver Bullet setups per day
  
  // Calculate monthly returns
  const tradingDays = 20;
  
  const baseMonthlyReturn = baseTrades * tradingDays * baseWinRate * 0.02;  // 2% per winning trade
  const sbMonthlyReturn = sbTrades * tradingDays * sbWinRate * 0.02 * sbPositionSize;
  
  return {
    base: {
      winRate: baseWinRate,
      tradesPerDay: baseTrades,
      monthlyReturn: (baseMonthlyReturn * 100).toFixed(2) + '%',
      profitFactor: baseProfitFactor
    },
    
    silverBullet: {
      winRate: sbWinRate,
      tradesPerDay: sbTrades,
      monthlyReturn: (sbMonthlyReturn * 100).toFixed(2) + '%',
      profitFactor: baseProfitFactor * 1.3,  // Estimated 30% improvement
      positionMultiplier: sbPositionSize
    },
    
    improvement: {
      winRate: `+${((sbWinRate - baseWinRate) * 100).toFixed(1)}%`,
      monthlyReturn: `+${((sbMonthlyReturn - baseMonthlyReturn) * 100).toFixed(2)}%`,
      profitFactor: `+${((baseProfitFactor * 0.3) / baseProfitFactor * 100).toFixed(1)}%`
    },
    
    recommendation: sbWinRate > 0.75 
      ? 'Focus on Silver Bullet windows for maximum profitability'
      : 'Use Silver Bullet as enhancement, not exclusive strategy'
  };
}

/**
 * Get trading session info including Silver Bullet status
 * @param {Number|String|Date} timestamp - Current timestamp
 * @returns {Object} Session info
 */
export function getSessionWithSilverBullet(timestamp) {
  const date = new Date(timestamp);
  const utcHours = date.getUTCHours();
  
  // Convert to EST
  let estHours = utcHours - 5;
  if (estHours < 0) estHours += 24;
  
  // Determine session
  let session = 'ASIAN';
  if (estHours >= 2 && estHours < 8) {
    session = 'LONDON';
  } else if (estHours >= 8 && estHours < 17) {
    session = 'NEW_YORK';
  } else if (estHours >= 8 && estHours < 12) {
    session = 'OVERLAP';
  }
  
  // Check Silver Bullet window
  const silverBullet = checkSilverBulletWindow(timestamp);
  
  // Get next window
  const nextWindow = getNextSilverBulletWindow(timestamp);

  return {
    session: session,
    estHour: estHours,
    silverBullet: silverBullet,
    nextWindow: nextWindow,
    recommendation: silverBullet.active 
      ? '🎯 PRIME TRADING TIME - Silver Bullet active!'
      : `Next Silver Bullet: ${nextWindow?.message || 'Unknown'}`
  };
}
