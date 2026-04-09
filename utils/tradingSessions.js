// utils/tradingSessions.js
// Professional Trading Session Detection & Management
// Adapts strategy based on London, New York, or Asian session

/**
 * TRADING SESSIONS (All times in EST/EDT)
 * 
 * Asian Session: 6:00 PM - 2:00 AM EST (Low volume, ranging)
 * London Session: 2:00 AM - 6:00 AM EST (High volume, trending)  
 * London/NY Overlap: 8:00 AM - 12:00 PM EST (Highest volume, momentum)
 * New York Session: 8:00 AM - 5:00 PM EST (High volume, news-driven)
 * 
 * Key Kill Zones (Highest probability):
 * - London Open: 2:00 AM - 5:00 AM EST
 * - New York Open: 8:00 AM - 11:00 AM EST
 */

export const SESSIONS = {
  ASIAN: 'ASIAN',
  LONDON: 'LONDON',
  NEW_YORK: 'NEW_YORK',
  OVERLAP: 'OVERLAP', // London + NY overlap (most powerful)
  CLOSED: 'CLOSED'
};

export const SESSION_CONFIG = {
  [SESSIONS.LONDON]: {
    name: 'London Session',
    icon: '🇬🇧',
    color: '#00d4aa',
    timeRange: '2:00 AM - 6:00 AM EST',
    
    characteristics: [
      'High volume & liquidity',
      'Clean trending moves',
      'Institutional order flow',
      'BOS patterns most reliable',
      'Professional traders active'
    ],
    
    optimal: {
      strategies: [
        'BOS Continuation',
        'First FVG After BOS',
        'Order Block Entries'
      ],
      confluenceThreshold: 3, // Can be aggressive
      atrMultiplier: 1.0,     // Normal stops
      riskRewardMin: 2.5,
      maxPositions: 3,
      winRateExpectation: '58-62%'
    },
    
    warnings: [],
    recommendations: [
      'Best session for trend trading',
      'Follow institutional flow',
      'Trust BOS signals',
      'Be aggressive with good setups'
    ],
    
    priority: 'HIGH',
    tradingRecommendation: 'EXCELLENT - Trade actively'
  },

  [SESSIONS.OVERLAP]: {
    name: 'London/NY Overlap',
    icon: '🌍🗽',
    color: '#bc8cff',
    timeRange: '8:00 AM - 12:00 PM EST',
    
    characteristics: [
      'HIGHEST volume of entire day',
      'Maximum liquidity',
      'Strongest momentum',
      'Major news releases (8:30 AM)',
      'Reversals common at NY open'
    ],
    
    optimal: {
      strategies: [
        'BOS Continuation',
        'Liquidity Sweep',
        'News Spike Fade',
        'Momentum Trading'
      ],
      confluenceThreshold: 3,
      atrMultiplier: 1.5,     // Wider stops for volatility
      riskRewardMin: 2.5,
      maxPositions: 3,
      winRateExpectation: '55-60%'
    },
    
    warnings: [
      'Watch for 8:30 AM news events',
      'Spread may widen during news',
      'Volatility spikes possible'
    ],
    recommendations: [
      'Most powerful session',
      'Wait 15 min after 8:30 AM news',
      'Widen stops for volatility',
      'Strong momentum moves'
    ],
    
    priority: 'HIGHEST',
    tradingRecommendation: 'BEST - Prime trading hours'
  },

  [SESSIONS.NEW_YORK]: {
    name: 'New York Session',
    icon: '🗽',
    color: '#ffd60a',
    timeRange: '8:00 AM - 5:00 PM EST',
    
    characteristics: [
      'High volume',
      'News-driven moves',
      'Strong momentum',
      'Institutional participation',
      'Volume drops after 12 PM'
    ],
    
    optimal: {
      strategies: [
        'BOS Continuation',
        'Liquidity Sweep',
        'Order Block Entries'
      ],
      confluenceThreshold: 3,
      atrMultiplier: 1.5,
      riskRewardMin: 2.5,
      maxPositions: 2,
      winRateExpectation: '55-58%'
    },
    
    warnings: [
      'Volume decreases after 12 PM',
      'News at 8:30 AM, 10:00 AM common',
      'Friday afternoons riskier'
    ],
    recommendations: [
      'Best trading: 8 AM - 12 PM',
      'Reduce activity after 12 PM',
      'Watch for news events',
      'Close positions before 5 PM'
    ],
    
    priority: 'HIGH',
    tradingRecommendation: 'GOOD - Trade morning hours'
  },

  [SESSIONS.ASIAN]: {
    name: 'Asian Session',
    icon: '🌏',
    color: '#ff4976',
    timeRange: '6:00 PM - 2:00 AM EST',
    
    characteristics: [
      'LOW volume & liquidity',
      'Ranging/choppy price action',
      'False breakouts common',
      'Algo stop hunting',
      'Mean reversion behavior'
    ],
    
    optimal: {
      strategies: [
        'Range Trading ONLY',
        'Fade Breakouts',
        'Mean Reversion'
      ],
      confluenceThreshold: 4, // Be VERY selective
      atrMultiplier: 0.8,     // Tighter ranges
      riskRewardMin: 2.0,
      maxPositions: 1,
      winRateExpectation: '48-52%'
    },
    
    warnings: [
      '⚠️ LOW VOLUME - High risk session',
      'Breakouts often fail',
      'Stop hunting common',
      'Technical analysis less reliable',
      'Better to sit out'
    ],
    recommendations: [
      '🛏️ BEST STRATEGY: Go to bed!',
      'If trading: Range only',
      'Require 4+ confluence',
      'Tighter stops',
      'Reduce position size 50%',
      'Avoid breakout trades'
    ],
    
    priority: 'LOW',
    tradingRecommendation: '⚠️ AVOID - Consider not trading'
  }
};

/**
 * Detect current trading session based on time
 * @param {Date} timestamp - Current time (defaults to now)
 * @returns {Object} Session info
 */
export function detectCurrentSession(timestamp = new Date()) {
  const estHour = getESTHour(timestamp);
  const estDay = timestamp.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Market closed on weekends
  if (estDay === 0 || estDay === 6) {
    return {
      session: SESSIONS.CLOSED,
      name: 'Market Closed',
      icon: '🔒',
      color: '#8b949e',
      isKillZone: false,
      tradingRecommendation: 'CLOSED - No trading',
      nextSession: getNextSessionTime(timestamp),
      priority: 'NONE'
    };
  }
  
  // London Session: 2:00 AM - 6:00 AM EST
  if (estHour >= 2 && estHour < 8) {
    const isKillZone = estHour >= 2 && estHour < 5; // London Kill Zone
    return {
      session: SESSIONS.LONDON,
      ...SESSION_CONFIG[SESSIONS.LONDON],
      isKillZone,
      killZoneLabel: isKillZone ? '🎯 LONDON KILL ZONE' : null,
      hour: estHour
    };
  }
  
  // Overlap (London + NY): 8:00 AM - 12:00 PM EST
  if (estHour >= 8 && estHour < 12) {
    const isKillZone = estHour >= 8 && estHour < 11; // NY Open Kill Zone
    return {
      session: SESSIONS.OVERLAP,
      ...SESSION_CONFIG[SESSIONS.OVERLAP],
      isKillZone,
      killZoneLabel: isKillZone ? '🎯 NY KILL ZONE' : null,
      hour: estHour
    };
  }
  
  // New York Session: 12:00 PM - 5:00 PM EST
  if (estHour >= 12 && estHour < 17) {
    return {
      session: SESSIONS.NEW_YORK,
      ...SESSION_CONFIG[SESSIONS.NEW_YORK],
      isKillZone: false,
      killZoneLabel: null,
      hour: estHour,
      note: estHour >= 15 ? '⚠️ Late session - volume decreasing' : null
    };
  }
  
  // Asian Session: 6:00 PM - 2:00 AM EST
  if (estHour >= 18 || estHour < 2) {
    return {
      session: SESSIONS.ASIAN,
      ...SESSION_CONFIG[SESSIONS.ASIAN],
      isKillZone: false,
      killZoneLabel: null,
      hour: estHour
    };
  }
  
  // Between sessions (rare edge cases)
  return {
    session: SESSIONS.CLOSED,
    name: 'Between Sessions',
    icon: '⏸️',
    color: '#8b949e',
    isKillZone: false,
    tradingRecommendation: 'WAIT - Low activity period',
    hour: estHour,
    priority: 'NONE'
  };
}

/**
 * Get EST hour from any timestamp
 * Handles timezone conversion
 */
function getESTHour(timestamp) {
  // Convert to EST (UTC-5) or EDT (UTC-4 during daylight saving)
  const utcHour = timestamp.getUTCHours();
  const month = timestamp.getUTCMonth();
  
  // Daylight saving time (March-November in US)
  const isDST = month >= 2 && month < 10; // Rough estimate
  const estOffset = isDST ? -4 : -5;
  
  let estHour = utcHour + estOffset;
  if (estHour < 0) estHour += 24;
  if (estHour >= 24) estHour -= 24;
  
  return estHour;
}

/**
 * Get next session start time
 */
function getNextSessionTime(timestamp) {
  const estHour = getESTHour(timestamp);
  
  if (estHour < 2) return '2:00 AM EST (London Open)';
  if (estHour < 8) return '8:00 AM EST (NY Open)';
  if (estHour < 18) return '6:00 PM EST (Asian Open)';
  return 'Tomorrow 2:00 AM EST (London Open)';
}

/**
 * Adjust trading parameters based on session
 * @param {Object} sessionInfo - Current session
 * @param {Object} baseParams - Base trading parameters
 * @returns {Object} Adjusted parameters
 */
export function getSessionAdjustedParams(sessionInfo, baseParams = {}) {
  if (!sessionInfo || !sessionInfo.optimal) {
    return baseParams;
  }
  
  const { optimal } = sessionInfo;
  
  return {
    // Confluence threshold
    confluenceThreshold: optimal.confluenceThreshold,
    
    // ATR multiplier for stops
    atrMultiplier: optimal.atrMultiplier,
    
    // Risk:Reward minimum
    riskRewardMin: optimal.riskRewardMin,
    
    // Max simultaneous positions
    maxPositions: optimal.maxPositions,
    
    // Expected win rate
    winRateExpectation: optimal.winRateExpectation,
    
    // Recommended strategies
    strategies: optimal.strategies,
    
    // Session metadata
    sessionName: sessionInfo.name,
    sessionIcon: sessionInfo.icon,
    sessionPriority: sessionInfo.priority,
    isKillZone: sessionInfo.isKillZone,
    
    // Warnings
    warnings: sessionInfo.warnings || [],
    recommendations: sessionInfo.recommendations || []
  };
}

/**
 * Check if current time is good for trading
 * @param {Date} timestamp - Time to check
 * @returns {Object} Trading viability info
 */
export function shouldTrade(timestamp = new Date()) {
  const session = detectCurrentSession(timestamp);
  const estHour = getESTHour(timestamp);
  const day = timestamp.getDay();
  
  // Weekend
  if (day === 0 || day === 6) {
    return {
      shouldTrade: false,
      reason: 'Market closed (Weekend)',
      severity: 'INFO',
      session
    };
  }
  
  // Asian session - discourage
  if (session.session === SESSIONS.ASIAN) {
    return {
      shouldTrade: false,
      reason: 'Asian session - Low volume, high risk. Better to sit out.',
      severity: 'WARNING',
      alternativeAction: 'Consider going to bed and trading London session tomorrow',
      session
    };
  }
  
  // Friday afternoon - discourage
  if (day === 5 && estHour >= 15) {
    return {
      shouldTrade: false,
      reason: 'Friday afternoon - Weekend gap risk ahead',
      severity: 'WARNING',
      alternativeAction: 'Close positions or move stops to break-even',
      session
    };
  }
  
  // Late NY session - caution
  if (session.session === SESSIONS.NEW_YORK && estHour >= 15) {
    return {
      shouldTrade: true,
      reason: 'Late NY session - Volume decreasing',
      severity: 'CAUTION',
      alternativeAction: 'Reduce position size, close before 5 PM',
      session
    };
  }
  
  // Kill zones - best times
  if (session.isKillZone) {
    return {
      shouldTrade: true,
      reason: `${session.killZoneLabel} - Prime trading time!`,
      severity: 'EXCELLENT',
      session
    };
  }
  
  // London session - excellent
  if (session.session === SESSIONS.LONDON) {
    return {
      shouldTrade: true,
      reason: 'London session - High quality trading conditions',
      severity: 'EXCELLENT',
      session
    };
  }
  
  // NY/Overlap - excellent
  if (session.session === SESSIONS.OVERLAP || session.session === SESSIONS.NEW_YORK) {
    return {
      shouldTrade: true,
      reason: `${session.name} - Good trading conditions`,
      severity: 'GOOD',
      session
    };
  }
  
  return {
    shouldTrade: true,
    reason: 'Normal trading conditions',
    severity: 'NORMAL',
    session
  };
}

/**
 * Get session-specific strategy recommendations
 * @param {String} currentSession - Current session type
 * @param {String} marketRegime - Current market regime
 * @returns {Array} Recommended strategies
 */
export function getSessionStrategies(currentSession, marketRegime) {
  const session = SESSION_CONFIG[currentSession];
  if (!session) return [];
  
  const baseStrategies = session.optimal.strategies;
  
  // Adjust based on market regime
  if (currentSession === SESSIONS.ASIAN) {
    // Asian: ONLY range strategies regardless of regime
    return ['Range Trading', 'Fade Breakouts', 'Mean Reversion'];
  }
  
  if (currentSession === SESSIONS.LONDON || currentSession === SESSIONS.OVERLAP) {
    // London/Overlap: Trending strategies work best
    if (marketRegime?.includes('TREND')) {
      return ['BOS Continuation', 'First FVG After BOS', 'Order Block Entries'];
    }
    if (marketRegime?.includes('RANGING')) {
      return ['Liquidity Sweep', 'Range Trading', 'Order Block Entries'];
    }
  }
  
  if (currentSession === SESSIONS.NEW_YORK) {
    // NY: Mixed, depends on regime
    if (marketRegime?.includes('TREND')) {
      return ['BOS Continuation', 'Liquidity Sweep', 'Order Block Entries'];
    }
    if (marketRegime?.includes('RANGING')) {
      return ['Liquidity Sweep', 'Range Trading', 'Fade Breakouts'];
    }
  }
  
  return baseStrategies;
}

/**
 * Calculate session-based expected performance
 * @param {String} sessionType - Type of session
 * @param {Number} confluenceScore - Confluence score (0-6)
 * @returns {Object} Expected performance metrics
 */
export function getExpectedPerformance(sessionType, confluenceScore) {
  const session = SESSION_CONFIG[sessionType];
  if (!session) {
    return {
      winRate: 0.50,
      riskReward: 2.0,
      quality: 'UNKNOWN'
    };
  }
  
  // Parse win rate expectation (e.g., "58-62%" -> 0.60)
  const winRateStr = session.optimal.winRateExpectation;
  const avgWinRate = parseFloat(winRateStr.split('-')[1]) / 100 || 0.55;
  
  // Adjust for confluence
  let winRate = avgWinRate;
  if (confluenceScore >= 5) winRate += 0.03;
  if (confluenceScore === 4) winRate += 0.01;
  if (confluenceScore === 3) winRate -= 0.01;
  if (confluenceScore < 3) winRate -= 0.05;
  
  // Session quality
  let quality = 'GOOD';
  if (sessionType === SESSIONS.ASIAN) quality = 'POOR';
  if (sessionType === SESSIONS.OVERLAP) quality = 'EXCELLENT';
  if (sessionType === SESSIONS.LONDON) quality = 'EXCELLENT';
  
  return {
    winRate: Math.max(0.45, Math.min(0.65, winRate)),
    riskReward: session.optimal.riskRewardMin,
    quality,
    expectedReturn: calculateExpectedReturn(winRate, session.optimal.riskRewardMin)
  };
}

function calculateExpectedReturn(winRate, rrRatio) {
  const avgWin = 100 * rrRatio;
  const avgLoss = 100;
  return ((winRate * avgWin) - ((1 - winRate) * avgLoss)) / 100;
}

/**
 * Format session time remaining
 */
export function getSessionTimeRemaining(sessionInfo) {
  if (!sessionInfo || sessionInfo.session === SESSIONS.CLOSED) {
    return 'Market Closed';
  }
  
  const now = new Date();
  const currentHour = getESTHour(now);
  const currentMinute = now.getUTCMinutes();
  
  let endHour;
  if (sessionInfo.session === SESSIONS.LONDON) endHour = 8;
  if (sessionInfo.session === SESSIONS.OVERLAP) endHour = 12;
  if (sessionInfo.session === SESSIONS.NEW_YORK) endHour = 17;
  if (sessionInfo.session === SESSIONS.ASIAN) endHour = 2;
  
  let hoursLeft = endHour - currentHour;
  if (hoursLeft < 0) hoursLeft += 24;
  
  const minutesLeft = 60 - currentMinute;
  
  if (hoursLeft === 0) {
    return `${minutesLeft} minutes remaining`;
  }
  
  return `${hoursLeft}h ${minutesLeft}m remaining`;
}

export default {
  SESSIONS,
  SESSION_CONFIG,
  detectCurrentSession,
  getSessionAdjustedParams,
  shouldTrade,
  getSessionStrategies,
  getExpectedPerformance,
  getSessionTimeRemaining
};
