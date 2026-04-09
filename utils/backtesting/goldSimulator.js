// utils/backtesting/goldSimulator.js
// Gold-Specific Execution Simulation
// Models realistic XAUUSD behavior with spread, slippage, and session dynamics

/**
 * Gold spread configuration by session
 * Based on institutional desk standards for XAUUSD
 * 
 * Typical retail spread: 1.5-3.0 pips (15-30 points)
 * During news: can widen 5-10x
 * During rollover: spreads distort heavily
 */
export const GOLD_SPREAD_CONFIG = {
  NORMAL: 25,           // 2.5 pips = 25 points (institutional baseline)
  ASIAN: 20,            // Tighter during Asian compression
  LONDON_OPEN: 35,      // Wider at London open (expansion phase)
  NY_OPEN: 40,          // Wider at NY open (strongest impulse)
  NEWS: 150,            // During high-impact news (5-10x normal)
  ROLLOVER: 50,         // During rollover periods (avoid 21:00-23:00 server time)
};

/**
 * Gold slippage configuration
 * Professional conservative assumptions:
 * - Normal: 5-15 points
 * - London/NY Open: 10-25 points
 * - High-impact news: 30-80+ points
 * 
 * Conservative backtest rule: Fixed 20 points per trade
 * OR 0.1R slippage penalty
 */
export const GOLD_SLIPPAGE_CONFIG = {
  NORMAL: 20,           // Conservative baseline (0.1R penalty equivalent)
  LONDON_OPEN: 25,      // London open expansion
  NY_OPEN: 25,          // NY open (strongest impulsive behavior)
  NEWS: 60,             // High-impact news (30-80+ realistic)
  HIGH_VOLATILITY: 30,  // High volatility regime
};

/**
 * Get spread for current conditions
 */
export function getSpread(timestamp, isNews = false, volatilityRegime = 'NORMAL') {
  if (isNews) return GOLD_SPREAD_CONFIG.NEWS;
  
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const estHour = (hour - 5 + 24) % 24;

  // Rollover period (avoid)
  if (estHour >= 21 || estHour < 1) {
    return GOLD_SPREAD_CONFIG.ROLLOVER;
  }

  // London open (2-5 AM EST)
  if (estHour >= 2 && estHour < 5) {
    return GOLD_SPREAD_CONFIG.LONDON_OPEN;
  }

  // NY open (8:30-11 AM EST)
  if (estHour >= 8 && estHour < 11) {
    return GOLD_SPREAD_CONFIG.NY_OPEN;
  }

  // Asian session (7 PM - 4 AM EST)
  if (estHour >= 19 || estHour < 4) {
    return GOLD_SPREAD_CONFIG.ASIAN;
  }

  return GOLD_SPREAD_CONFIG.NORMAL;
}

/**
 * Get slippage for current conditions
 */
export function getSlippage(timestamp, isNews = false, volatilityRegime = 'NORMAL') {
  if (isNews) return GOLD_SLIPPAGE_CONFIG.NEWS;
  if (volatilityRegime === 'HIGH') return GOLD_SLIPPAGE_CONFIG.HIGH_VOLATILITY;

  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const estHour = (hour - 5 + 24) % 24;

  // London open
  if (estHour >= 2 && estHour < 5) {
    return GOLD_SLIPPAGE_CONFIG.LONDON_OPEN;
  }

  // NY open
  if (estHour >= 8 && estHour < 11) {
    return GOLD_SLIPPAGE_CONFIG.NY_OPEN;
  }

  return GOLD_SLIPPAGE_CONFIG.NORMAL;
}

/**
 * Simulate trade execution with realistic costs
 */
export function simulateExecution(signal, candles, startIndex, config = {}) {
  const {
    conservativeMode = true,
    newsEvents = [],
    volatilityRegime = 'NORMAL',
  } = config;

  // Get execution costs
  const spread = getSpread(signal.timestamp, false, volatilityRegime);
  const slippage = getSlippage(signal.timestamp, false, volatilityRegime);
  
  // Calculate entry price with costs
  const entryPrice = signal.direction === 'BUY'
    ? signal.entryZone.high + (spread / 2) + slippage
    : signal.entryZone.low - (spread / 2) - slippage;

  // Calculate stop and target with costs
  const stopLoss = signal.direction === 'BUY'
    ? signal.stopLoss - (spread / 2)
    : signal.stopLoss + (spread / 2);

  const target = signal.targets.primary;

  // Simulate candle-by-candle execution
  let outcome = null;
  let exitPrice = null;
  let exitIndex = null;
  let maxFavorable = entryPrice;
  let maxAdverse = entryPrice;

  for (let i = startIndex + 1; i < candles.length; i++) {
    const candle = candles[i];

    // Check for news during this candle
    const isNewsCandle = newsEvents.some(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const candleTime = new Date(candle.timestamp).getTime();
      return Math.abs(eventTime - candleTime) < 5 * 60 * 1000; // Within 5 minutes
    });

    // Track max favorable/adverse
    if (signal.direction === 'BUY') {
      maxFavorable = Math.max(maxFavorable, candle.high);
      maxAdverse = Math.min(maxAdverse, candle.low);
    } else {
      maxFavorable = Math.min(maxFavorable, candle.low);
      maxAdverse = Math.max(maxAdverse, candle.high);
    }

    // Check if both stop and target hit in same candle
    const stopHit = signal.direction === 'BUY'
      ? candle.low <= stopLoss
      : candle.high >= stopLoss;

    const targetHit = signal.direction === 'BUY'
      ? candle.high >= target
      : candle.low <= target;

    // CRITICAL: If both hit, assume worst case (stop hit first)
    if (conservativeMode && stopHit && targetHit) {
      outcome = 'LOSS';
      exitPrice = stopLoss;
      exitIndex = i;
      break;
    }

    // Stop hit
    if (stopHit) {
      outcome = 'LOSS';
      exitPrice = stopLoss;
      
      // If news, add additional slippage
      if (isNewsCandle) {
        const newsSlippage = GOLD_SLIPPAGE_CONFIG.NEWS;
        exitPrice = signal.direction === 'BUY'
          ? exitPrice - newsSlippage
          : exitPrice + newsSlippage;
      }
      
      exitIndex = i;
      break;
    }

    // Target hit
    if (targetHit) {
      outcome = 'WIN';
      exitPrice = target;
      
      // Reduce by spread
      exitPrice = signal.direction === 'BUY'
        ? exitPrice - (spread / 2)
        : exitPrice + (spread / 2);
      
      exitIndex = i;
      break;
    }

    // Maximum trade duration (prevent holding too long)
    if (i - startIndex > 100) { // 100 candles max
      outcome = 'TIMEOUT';
      exitPrice = candle.close;
      exitIndex = i;
      break;
    }
  }

  // If no outcome by end of data
  if (!outcome) {
    outcome = 'INCOMPLETE';
    exitPrice = candles[candles.length - 1].close;
    exitIndex = candles.length - 1;
  }

  // Calculate P&L
  const pnl = signal.direction === 'BUY'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  const pnlPips = pnl / 10; // Gold: 1 pip = 10 points

  // Calculate R (risk units)
  const risk = Math.abs(entryPrice - stopLoss);
  const rMultiple = pnl / risk;

  return {
    outcome,
    entryPrice,
    exitPrice,
    stopLoss,
    target,
    pnl,
    pnlPips,
    rMultiple,
    spread,
    slippage,
    totalCost: spread + slippage,
    entryIndex: startIndex,
    exitIndex,
    duration: exitIndex - startIndex,
    maxFavorable,
    maxAdverse,
    mfe: signal.direction === 'BUY'
      ? (maxFavorable - entryPrice) / risk
      : (entryPrice - maxFavorable) / risk,
    mae: signal.direction === 'BUY'
      ? (entryPrice - maxAdverse) / risk
      : (maxAdverse - entryPrice) / risk,
  };
}

/**
 * Calculate realistic profit factor
 * Accounts for all execution costs
 */
export function calculateRealisticProfitFactor(trades) {
  const wins = trades.filter(t => t.outcome === 'WIN');
  const losses = trades.filter(t => t.outcome === 'LOSS' || t.outcome === 'TIMEOUT');

  const totalGross = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  return totalLoss > 0 ? totalGross / totalLoss : 0;
}

/**
 * Check if trade should be skipped due to conditions
 */
export function shouldSkipTrade(timestamp, config = {}) {
  const {
    avoidRollover = true,
    avoidLowVolatility = true,
    requireKillZone = false,
  } = config;

  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const estHour = (hour - 5 + 24) % 24;

  // Avoid rollover
  if (avoidRollover && (estHour >= 21 || estHour < 1)) {
    return { skip: true, reason: 'ROLLOVER_PERIOD' };
  }

  // Require kill zone
  if (requireKillZone) {
    const isLondonKillZone = estHour >= 2 && estHour < 5;
    const isNYKillZone = estHour >= 8 && estHour < 11;
    
    if (!isLondonKillZone && !isNYKillZone) {
      return { skip: true, reason: 'OUTSIDE_KILL_ZONE' };
    }
  }

  return { skip: false };
}

/**
 * Get session for timestamp
 */
export function getSession(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const estHour = (hour - 5 + 24) % 24;

  if (estHour >= 19 || estHour < 4) return 'ASIAN';
  if (estHour >= 3 && estHour < 12) return 'LONDON';
  if (estHour >= 8 && estHour < 17) return 'NEW_YORK';
  return 'OFF_HOURS';
}

/**
 * Check if timestamp is during kill zone
 */
export function isKillZone(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getMinutes();
  const estHour = (hour - 5 + 24) % 24;

  // London Kill Zone: 2:00-5:00 AM EST
  if (estHour >= 2 && estHour < 5) return { isKillZone: true, zone: 'LONDON' };

  // NY Kill Zone: 8:30-11:00 AM EST
  if ((estHour === 8 && minute >= 30) || (estHour >= 9 && estHour < 11)) {
    return { isKillZone: true, zone: 'NY' };
  }

  return { isKillZone: false, zone: null };
}
