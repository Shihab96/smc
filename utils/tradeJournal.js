// utils/tradeJournal.js
// Professional Trade Journal & Performance Tracking System
// Institutional-grade record keeping and analytics

/**
 * TRADE DATA STRUCTURE
 * Every field a professional trader tracks
 */

export const TRADE_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

export const TRADE_OUTCOME = {
  WIN: 'WIN',
  LOSS: 'LOSS',
  BREAKEVEN: 'BREAKEVEN'
};

export const EMOTIONAL_STATES = {
  1: 'Terrified',
  2: 'Very Anxious',
  3: 'Anxious',
  4: 'Nervous',
  5: 'Neutral',
  6: 'Calm',
  7: 'Confident',
  8: 'Very Confident',
  9: 'Certain',
  10: 'Overconfident'
};

/**
 * Create new trade record
 */
export function createTrade({
  // Entry Details
  entryPrice,
  entryTime = new Date(),
  direction, // 'BUY' or 'SELL'
  positionSize,
  
  // Risk Management
  stopLoss,
  takeProfit,
  riskAmount,
  riskPercent,
  
  // Market Analysis
  symbol = 'XAUUSD',
  timeframe = '5M',
  marketRegime,
  htfBias,
  session,
  
  // Signal Details
  confluenceScore,
  triggersActive = [],
  setupType,
  strategies = [],
  
  // Pre-Trade
  emotionalState = 5,
  checklistCompleted = false,
  notes = '',
  
  // Session
  sessionName,
  killZoneActive = false,
  
  // Chart Screenshot (base64 or URL)
  chartScreenshot = null
}) {
  const trade = {
    id: generateTradeId(),
    
    // Entry
    entryPrice: parseFloat(entryPrice),
    entryTime: new Date(entryTime),
    direction,
    positionSize: parseFloat(positionSize),
    
    // Risk
    stopLoss: parseFloat(stopLoss),
    takeProfit: parseFloat(takeProfit),
    riskAmount: parseFloat(riskAmount),
    riskPercent: parseFloat(riskPercent),
    
    // Market
    symbol,
    timeframe,
    marketRegime,
    htfBias,
    session: sessionName,
    
    // Signal
    confluenceScore: parseInt(confluenceScore),
    triggersActive: [...triggersActive],
    setupType,
    strategies: [...strategies],
    
    // Pre-Trade
    emotionalState: parseInt(emotionalState),
    emotionalStateLabel: EMOTIONAL_STATES[emotionalState] || 'Unknown',
    checklistCompleted,
    notes,
    
    // Session
    killZoneActive,
    
    // Chart
    chartScreenshot,
    
    // Exit (filled when closed)
    exitPrice: null,
    exitTime: null,
    exitReason: null,
    
    // Results
    status: TRADE_STATUS.OPEN,
    outcome: null,
    pnlDollars: null,
    pnlPips: null,
    pnlPercent: null,
    rrAchieved: null,
    
    // Execution
    slippagePips: 0,
    timeInTrade: null,
    
    // Post-Trade
    exitEmotionalState: null,
    exitNotes: '',
    lessonsLearned: '',
    
    // Metadata
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return trade;
}

/**
 * Close trade and calculate results
 */
export function closeTrade(trade, {
  exitPrice,
  exitTime = new Date(),
  exitReason,
  slippagePips = 0,
  exitEmotionalState = 5,
  exitNotes = '',
  lessonsLearned = ''
}) {
  const updatedTrade = { ...trade };
  
  // Exit details
  updatedTrade.exitPrice = parseFloat(exitPrice);
  updatedTrade.exitTime = new Date(exitTime);
  updatedTrade.exitReason = exitReason;
  updatedTrade.slippagePips = parseFloat(slippagePips);
  
  // Post-trade
  updatedTrade.exitEmotionalState = parseInt(exitEmotionalState);
  updatedTrade.exitNotes = exitNotes;
  updatedTrade.lessonsLearned = lessonsLearned;
  
  // Calculate time in trade
  const entryMs = new Date(trade.entryTime).getTime();
  const exitMs = new Date(exitTime).getTime();
  updatedTrade.timeInTrade = Math.round((exitMs - entryMs) / 1000 / 60); // minutes
  
  // Calculate P&L
  const results = calculatePnL(trade, exitPrice);
  updatedTrade.pnlDollars = results.pnlDollars;
  updatedTrade.pnlPips = results.pnlPips;
  updatedTrade.pnlPercent = results.pnlPercent;
  updatedTrade.rrAchieved = results.rrAchieved;
  updatedTrade.outcome = results.outcome;
  
  // Update status
  updatedTrade.status = TRADE_STATUS.CLOSED;
  updatedTrade.updatedAt = new Date();
  
  return updatedTrade;
}

/**
 * Calculate P&L for a trade
 */
function calculatePnL(trade, exitPrice) {
  const entry = parseFloat(trade.entryPrice);
  const exit = parseFloat(exitPrice);
  const size = parseFloat(trade.positionSize);
  const stop = parseFloat(trade.stopLoss);
  const target = parseFloat(trade.takeProfit);
  
  // Calculate pip movement
  let pips;
  if (trade.direction === 'BUY') {
    pips = (exit - entry) * 100; // For Gold: 1.00 = 100 pips
  } else {
    pips = (entry - exit) * 100;
  }
  
  // Calculate dollar P&L (approximate for Gold)
  // Gold: 0.01 lot = ~$1 per $1 move
  const pipValue = size * 10; // 0.01 lot = $10 per pip for gold
  const pnlDollars = pips * pipValue;
  
  // Calculate percent P&L (relative to risk)
  const pnlPercent = trade.riskAmount ? (pnlDollars / trade.riskAmount) * 100 : 0;
  
  // Calculate R:R achieved
  const stopDistance = Math.abs(entry - stop);
  const moveDistance = Math.abs(exit - entry);
  const rrAchieved = stopDistance > 0 ? moveDistance / stopDistance : 0;
  
  // Determine outcome
  let outcome;
  if (pnlDollars > 5) outcome = TRADE_OUTCOME.WIN;
  else if (pnlDollars < -5) outcome = TRADE_OUTCOME.LOSS;
  else outcome = TRADE_OUTCOME.BREAKEVEN;
  
  return {
    pnlDollars: parseFloat(pnlDollars.toFixed(2)),
    pnlPips: parseFloat(pips.toFixed(1)),
    pnlPercent: parseFloat(pnlPercent.toFixed(2)),
    rrAchieved: parseFloat(rrAchieved.toFixed(2)),
    outcome
  };
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(trades) {
  const closedTrades = trades.filter(t => t.status === TRADE_STATUS.CLOSED);
  
  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      lossRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      currentStreak: { type: null, count: 0 },
      avgTimeInTrade: 0,
      avgSlippage: 0
    };
  }
  
  // Basic counts
  const wins = closedTrades.filter(t => t.outcome === TRADE_OUTCOME.WIN);
  const losses = closedTrades.filter(t => t.outcome === TRADE_OUTCOME.LOSS);
  const totalTrades = closedTrades.length;
  
  // Win/Loss rates
  const winRate = (wins.length / totalTrades) * 100;
  const lossRate = (losses.length / totalTrades) * 100;
  
  // Average win/loss
  const avgWin = wins.length > 0 
    ? wins.reduce((sum, t) => sum + t.pnlDollars, 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0
    ? losses.reduce((sum, t) => sum + t.pnlDollars, 0) / losses.length
    : 0;
  
  // Profit factor
  const totalWins = wins.reduce((sum, t) => sum + t.pnlDollars, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnlDollars, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
  
  // Expectancy
  const expectancy = (winRate / 100 * avgWin) + (lossRate / 100 * avgLoss);
  
  // Total P&L
  const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnlDollars, 0);
  
  // Maximum drawdown
  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(closedTrades);
  
  // Sharpe ratio (simplified)
  const sharpeRatio = calculateSharpeRatio(closedTrades);
  
  // Streaks
  const { longestWinStreak, longestLossStreak, currentStreak } = calculateStreaks(closedTrades);
  
  // Averages
  const avgTimeInTrade = closedTrades.reduce((sum, t) => sum + (t.timeInTrade || 0), 0) / totalTrades;
  const avgSlippage = closedTrades.reduce((sum, t) => sum + (t.slippagePips || 0), 0) / totalTrades;
  
  return {
    totalTrades,
    winRate: parseFloat(winRate.toFixed(2)),
    lossRate: parseFloat(lossRate.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    longestWinStreak,
    longestLossStreak,
    currentStreak,
    avgTimeInTrade: parseFloat(avgTimeInTrade.toFixed(0)),
    avgSlippage: parseFloat(avgSlippage.toFixed(2))
  };
}

/**
 * Calculate maximum drawdown
 */
function calculateMaxDrawdown(trades) {
  let peak = 0;
  let maxDD = 0;
  let maxDDPercent = 0;
  let runningPnL = 0;
  
  trades.forEach(trade => {
    runningPnL += trade.pnlDollars;
    
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    
    const drawdown = peak - runningPnL;
    if (drawdown > maxDD) {
      maxDD = drawdown;
      maxDDPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  });
  
  return { maxDrawdown: maxDD, maxDrawdownPercent: maxDDPercent };
}

/**
 * Calculate Sharpe ratio (simplified)
 */
function calculateSharpeRatio(trades) {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(t => t.pnlPercent || 0);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Sharpe (assuming 0 risk-free rate)
  return stdDev > 0 ? avgReturn / stdDev : 0;
}

/**
 * Calculate win/loss streaks
 */
function calculateStreaks(trades) {
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  trades.forEach(trade => {
    if (trade.outcome === TRADE_OUTCOME.WIN) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (trade.outcome === TRADE_OUTCOME.LOSS) {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  });
  
  const currentStreak = currentWinStreak > 0 
    ? { type: 'WIN', count: currentWinStreak }
    : currentLossStreak > 0
    ? { type: 'LOSS', count: currentLossStreak }
    : { type: null, count: 0 };
  
  return { longestWinStreak, longestLossStreak, currentStreak };
}

/**
 * Performance breakdown by dimension
 */
export function analyzePerformanceBy(trades, dimension) {
  const closedTrades = trades.filter(t => t.status === TRADE_STATUS.CLOSED);
  
  const groups = {};
  
  closedTrades.forEach(trade => {
    let key;
    
    switch (dimension) {
      case 'session':
        key = trade.session || 'Unknown';
        break;
      case 'day':
        key = new Date(trade.entryTime).toLocaleDateString('en-US', { weekday: 'long' });
        break;
      case 'regime':
        key = trade.marketRegime?.detected || 'Unknown';
        break;
      case 'confluence':
        key = `${trade.confluenceScore}/6`;
        break;
      case 'setup':
        key = trade.setupType || 'Unknown';
        break;
      case 'hour':
        key = `${new Date(trade.entryTime).getHours()}:00`;
        break;
      default:
        key = 'Unknown';
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(trade);
  });
  
  // Calculate metrics for each group
  const results = {};
  Object.keys(groups).forEach(key => {
    const groupTrades = groups[key];
    const metrics = calculatePerformanceMetrics(groupTrades);
    results[key] = {
      ...metrics,
      trades: groupTrades.length
    };
  });
  
  return results;
}

/**
 * Generate trade ID
 */
function generateTradeId() {
  return `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export trades to CSV
 */
export function exportTradesToCSV(trades) {
  const headers = [
    'ID', 'Entry Time', 'Exit Time', 'Direction', 'Symbol',
    'Entry Price', 'Exit Price', 'Position Size',
    'Stop Loss', 'Take Profit', 'P&L ($)', 'P&L (pips)', 'R:R',
    'Outcome', 'Session', 'Regime', 'Confluence', 'Setup',
    'Triggers', 'Emotional State', 'Time in Trade (min)',
    'Slippage', 'Notes'
  ];
  
  const rows = trades.map(trade => [
    trade.id,
    new Date(trade.entryTime).toLocaleString(),
    trade.exitTime ? new Date(trade.exitTime).toLocaleString() : 'Open',
    trade.direction,
    trade.symbol,
    trade.entryPrice,
    trade.exitPrice || 'Open',
    trade.positionSize,
    trade.stopLoss,
    trade.takeProfit,
    trade.pnlDollars || 0,
    trade.pnlPips || 0,
    trade.rrAchieved || 0,
    trade.outcome || 'Open',
    trade.session,
    trade.marketRegime?.detected || '',
    trade.confluenceScore,
    trade.setupType,
    trade.triggersActive.join('; '),
    trade.emotionalStateLabel,
    trade.timeInTrade || 0,
    trade.slippagePips || 0,
    trade.notes
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csv;
}

/**
 * Save trades to localStorage
 */
export function saveTradesToStorage(trades) {
  try {
    localStorage.setItem('tradingJournal', JSON.stringify(trades));
    return true;
  } catch (error) {
    console.error('Error saving trades:', error);
    return false;
  }
}

/**
 * Load trades from localStorage
 */
export function loadTradesFromStorage() {
  try {
    const data = localStorage.getItem('tradingJournal');
    if (!data) return [];
    
    const trades = JSON.parse(data);
    // Convert date strings back to Date objects
    return trades.map(trade => ({
      ...trade,
      entryTime: new Date(trade.entryTime),
      exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
      createdAt: new Date(trade.createdAt),
      updatedAt: new Date(trade.updatedAt)
    }));
  } catch (error) {
    console.error('Error loading trades:', error);
    return [];
  }
}

export default {
  createTrade,
  closeTrade,
  calculatePerformanceMetrics,
  analyzePerformanceBy,
  exportTradesToCSV,
  saveTradesToStorage,
  loadTradesFromStorage,
  TRADE_STATUS,
  TRADE_OUTCOME,
  EMOTIONAL_STATES
};
