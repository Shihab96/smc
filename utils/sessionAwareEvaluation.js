// utils/sessionAwareEvaluation.js
// Applies session-specific rules to signal evaluation
// Professional session-based trading logic

import { SESSIONS } from './tradingSessions';

/**
 * Evaluate signals with session-specific adjustments
 * This is the MAIN function that applies session rules to trading decisions
 */
export function evaluateSignalWithSession(
  baseEvaluation,
  sessionInfo,
  sessionParams,
  marketRegime,
  institutionalTriggers
) {
  if (!baseEvaluation || !sessionInfo || !sessionParams) {
    return baseEvaluation;
  }

  // Start with base evaluation
  const sessionEval = { ...baseEvaluation };

  // === APPLY SESSION-SPECIFIC CONFLUENCE THRESHOLD ===
  const requiredConfluence = sessionParams.confluenceThreshold;
  const currentConfluence = baseEvaluation.confluenceScore || 0;

  if (currentConfluence < requiredConfluence) {
    sessionEval.approved = false;
    sessionEval.rejectionReason = `Confluence ${currentConfluence}/6 below session minimum ${requiredConfluence}/6`;
    sessionEval.sessionRejected = true;
  }

  // === ASIAN SESSION SPECIAL RULES ===
  if (sessionInfo.session === SESSIONS.ASIAN) {
    // Asian session: ONLY allow range trading
    const isTrendSignal = baseEvaluation.strategies?.some(s => 
      s.includes('BOS') || s.includes('Continuation') || s.includes('Breakout')
    );

    if (isTrendSignal) {
      sessionEval.approved = false;
      sessionEval.rejectionReason = 'Asian Session: Trend strategies disabled. Range trading only.';
      sessionEval.sessionRejected = true;
      sessionEval.sessionWarning = '⚠️ Asian session - avoid trend trades';
    }

    // Require VERY high confluence
    if (currentConfluence < 4) {
      sessionEval.approved = false;
      sessionEval.rejectionReason = 'Asian Session: Minimum 4/6 confluence required';
      sessionEval.sessionRejected = true;
    }

    // Add Asian session warning even if approved
    if (sessionEval.approved) {
      sessionEval.sessionWarning = '⚠️ Asian session - reduce position size by 50%';
      sessionEval.positionSizeMultiplier = 0.5;
    }
  }

  // === LONDON SESSION OPTIMIZATION ===
  if (sessionInfo.session === SESSIONS.LONDON) {
    // London: BOS signals get bonus confidence
    const hasBOS = institutionalTriggers?.some(t => t.type === 'BOS');
    if (hasBOS) {
      sessionEval.sessionBonus = 'London Kill Zone: BOS signals highly reliable';
      sessionEval.confidenceBoost = 10;
    }

    // London kill zone: Can be slightly more aggressive
    if (sessionInfo.isKillZone && currentConfluence >= 3) {
      sessionEval.killZoneActive = true;
      sessionEval.sessionBonus = '🎯 London Kill Zone Active - Prime setup!';
    }
  }

  // === OVERLAP SESSION (LONDON + NY) ===
  if (sessionInfo.session === SESSIONS.OVERLAP) {
    // Highest volume session - best for all strategies
    if (sessionInfo.isKillZone && currentConfluence >= 3) {
      sessionEval.killZoneActive = true;
      sessionEval.sessionBonus = '🎯 NY Kill Zone - Highest volume period!';
      sessionEval.confidenceBoost = 15;
    }

    // Check for 8:30 AM news time
    const hour = sessionInfo.hour;
    if (hour === 8) {
      sessionEval.sessionWarning = '⚠️ 8:30 AM news window - wait 15 minutes after major releases';
      sessionEval.requireNewsCheck = true;
    }
  }

  // === NEW YORK SESSION ===
  if (sessionInfo.session === SESSIONS.NEW_YORK) {
    // After 3 PM: Reduce activity
    if (sessionInfo.hour >= 15) {
      sessionEval.sessionWarning = '⚠️ Late NY session - volume decreasing';
      sessionEval.positionSizeMultiplier = 0.75;
      
      // Require higher confluence after 3 PM
      if (currentConfluence < 4) {
        sessionEval.approved = false;
        sessionEval.rejectionReason = 'Late session: Minimum 4/6 confluence required after 3 PM';
        sessionEval.sessionRejected = true;
      }
    }
  }

  // === APPLY SESSION-SPECIFIC ATR MULTIPLIER ===
  if (baseEvaluation.risk) {
    const baseStop = baseEvaluation.risk.stopLoss;
    const sessionATR = sessionParams.atrMultiplier;
    
    sessionEval.risk = {
      ...baseEvaluation.risk,
      sessionATRMultiplier: sessionATR,
      adjustedStopLoss: applySessionStopAdjustment(baseStop, sessionATR),
      sessionNote: `Session requires ${sessionATR}x ATR stops`
    };
  }

  // === SESSION QUALITY RATING ===
  sessionEval.sessionQuality = getSessionQuality(sessionInfo, currentConfluence);
  sessionEval.sessionName = sessionInfo.name;
  sessionEval.sessionIcon = sessionInfo.icon;
  sessionEval.sessionPriority = sessionInfo.priority;

  // === EXPECTED PERFORMANCE ===
  sessionEval.expectedWinRate = sessionParams.winRateExpectation;
  sessionEval.sessionRecommendation = sessionInfo.tradingRecommendation;

  return sessionEval;
}

/**
 * Apply session-specific stop loss adjustment
 */
function applySessionStopAdjustment(baseStop, sessionMultiplier) {
  // baseStop is typically ATR-based already
  // sessionMultiplier adjusts it for session volatility
  
  // Example: London = 1.0x (normal), NY = 1.5x (wider), Asian = 0.8x (tighter)
  return {
    multiplier: sessionMultiplier,
    note: sessionMultiplier > 1.0 
      ? 'Wider stops for session volatility'
      : sessionMultiplier < 1.0
      ? 'Tighter stops for low volatility session'
      : 'Normal stops for session'
  };
}

/**
 * Calculate session quality score
 */
function getSessionQuality(sessionInfo, confluenceScore) {
  let score = 0;
  let rating = 'POOR';

  // Base score from session priority
  if (sessionInfo.priority === 'HIGHEST') score += 40;
  else if (sessionInfo.priority === 'HIGH') score += 30;
  else if (sessionInfo.priority === 'MEDIUM') score += 20;
  else if (sessionInfo.priority === 'LOW') score += 10;

  // Kill zone bonus
  if (sessionInfo.isKillZone) score += 20;

  // Confluence contribution
  score += confluenceScore * 5;

  // Session-specific bonuses
  if (sessionInfo.session === SESSIONS.LONDON) score += 10;
  if (sessionInfo.session === SESSIONS.OVERLAP) score += 15;

  // Penalties
  if (sessionInfo.session === SESSIONS.ASIAN) score -= 20;
  if (sessionInfo.hour >= 15 && sessionInfo.session === SESSIONS.NEW_YORK) score -= 10;

  // Rating
  if (score >= 80) rating = 'EXCELLENT';
  else if (score >= 60) rating = 'GOOD';
  else if (score >= 40) rating = 'FAIR';
  else if (score >= 20) rating = 'POOR';
  else rating = 'AVOID';

  return {
    score,
    rating,
    description: getQualityDescription(rating)
  };
}

function getQualityDescription(rating) {
  switch (rating) {
    case 'EXCELLENT':
      return 'Prime trading conditions - High probability setups';
    case 'GOOD':
      return 'Good trading conditions - Trade with confidence';
    case 'FAIR':
      return 'Acceptable conditions - Be selective';
    case 'POOR':
      return 'Poor conditions - Only take best setups';
    case 'AVOID':
      return 'Avoid trading - Risk too high';
    default:
      return 'Unknown conditions';
  }
}

/**
 * Filter strategies based on session
 */
export function getSessionAppropriateStrategies(session, allStrategies) {
  if (!session || !allStrategies) return allStrategies;

  // Asian session: ONLY range strategies
  if (session === SESSIONS.ASIAN) {
    return allStrategies.filter(s => 
      s.includes('Range') || 
      s.includes('Mean Reversion') || 
      s.includes('Fade')
    );
  }

  // London session: Prefer trend strategies
  if (session === SESSIONS.LONDON) {
    const trendStrats = allStrategies.filter(s => 
      s.includes('BOS') || 
      s.includes('FVG') || 
      s.includes('Order Block')
    );
    return trendStrats.length > 0 ? trendStrats : allStrategies;
  }

  // Overlap: All strategies work well
  if (session === SESSIONS.OVERLAP) {
    return allStrategies;
  }

  // NY: Slightly prefer momentum and sweep strategies
  if (session === SESSIONS.NEW_YORK) {
    const preferredStrats = allStrategies.filter(s => 
      s.includes('BOS') || 
      s.includes('Liquidity') || 
      s.includes('Sweep')
    );
    return preferredStrats.length > 0 ? preferredStrats : allStrategies;
  }

  return allStrategies;
}

/**
 * Check if signal should be blocked by session rules
 */
export function isSignalBlockedBySession(signalType, sessionInfo) {
  if (!sessionInfo) return false;

  // Asian session blocks
  if (sessionInfo.session === SESSIONS.ASIAN) {
    // Block breakout and trend continuation signals
    const blockedTypes = ['BOS', 'BREAKOUT', 'TREND', 'CONTINUATION'];
    return blockedTypes.some(type => signalType?.toUpperCase().includes(type));
  }

  // Weekend blocks (if somehow detected)
  if (sessionInfo.session === 'CLOSED') {
    return true;
  }

  // Late Friday blocks
  const day = new Date().getDay();
  if (day === 5 && sessionInfo.hour >= 15) {
    return true; // Block new positions late Friday
  }

  return false;
}

/**
 * Get session-appropriate position size multiplier
 */
export function getSessionPositionMultiplier(sessionInfo, confluenceScore) {
  let multiplier = 1.0;

  // Asian session: Always reduce
  if (sessionInfo.session === SESSIONS.ASIAN) {
    multiplier = 0.5; // 50% size
  }

  // Late sessions: Reduce
  if (sessionInfo.hour >= 15) {
    multiplier *= 0.75; // 75% size
  }

  // Kill zones: Can be slightly more aggressive if high confluence
  if (sessionInfo.isKillZone && confluenceScore >= 4) {
    multiplier = Math.min(multiplier * 1.2, 1.5); // Max 1.5x
  }

  // Low confluence: Always reduce
  if (confluenceScore < 3) {
    multiplier *= 0.5;
  }

  return multiplier;
}

/**
 * Generate session-specific trading advice
 */
export function getSessionTradingAdvice(sessionInfo, tradeability, confluenceScore) {
  const advice = [];

  // Session-specific advice
  if (sessionInfo.session === SESSIONS.ASIAN) {
    advice.push('🌏 Asian Session: Low volume, high risk');
    advice.push('📊 Only trade ranges, avoid breakouts');
    advice.push('💤 Best strategy: Go to bed, trade London tomorrow');
    advice.push('⚠️ If trading: Require 4+/6 confluence, reduce size 50%');
  }

  if (sessionInfo.session === SESSIONS.LONDON) {
    advice.push('🇬🇧 London Session: Prime trading hours');
    advice.push('📈 Best for trend trading and BOS signals');
    advice.push('💪 Can be aggressive with 3+/6 confluence');
    if (sessionInfo.isKillZone) {
      advice.push('🎯 KILL ZONE ACTIVE: Highest probability setups!');
    }
  }

  if (sessionInfo.session === SESSIONS.OVERLAP) {
    advice.push('🌍🗽 London/NY Overlap: Maximum volume');
    advice.push('⚡ Strongest momentum of the day');
    advice.push('📰 Watch for 8:30 AM news events');
    if (sessionInfo.isKillZone) {
      advice.push('🎯 NY KILL ZONE: Best trading time of day!');
    }
  }

  if (sessionInfo.session === SESSIONS.NEW_YORK) {
    advice.push('🗽 New York Session: Good trading conditions');
    advice.push('📊 Best hours: 8 AM - 12 PM');
    if (sessionInfo.hour >= 15) {
      advice.push('⚠️ After 3 PM: Volume decreasing, be selective');
    }
    if (sessionInfo.hour >= 16) {
      advice.push('🔴 After 4 PM: Close positions, avoid new entries');
    }
  }

  // Confluence-based advice
  if (confluenceScore >= 5) {
    advice.push('✅ Excellent confluence (5-6/6): High probability setup');
  } else if (confluenceScore === 4) {
    advice.push('👍 Good confluence (4/6): Acceptable setup');
  } else if (confluenceScore === 3) {
    advice.push('⚠️ Minimum confluence (3/6): Only if session supports it');
  } else {
    advice.push('🚫 Low confluence (<3/6): Skip this trade');
  }

  // Tradeability advice
  if (!tradeability?.shouldTrade) {
    advice.push(`🛑 ${tradeability?.reason}`);
  }

  return advice;
}

export default {
  evaluateSignalWithSession,
  getSessionAppropriateStrategies,
  isSignalBlockedBySession,
  getSessionPositionMultiplier,
  getSessionTradingAdvice
};
