// utils/backtestEngine.js
// Professional Backtesting Engine
// Candle-by-candle simulation with realistic execution

import { analyzeInstitutionalBias } from './institutional.js';
import { 
  mapLTFLiquidity,
  generateEntrySignal,
  isInKillZone,
  isVolatilityExpanding 
} from './ltfExecution.js';
import {
  calculateEntryPrice,
  calculateRealisticStop,
  calculateRealisticTarget,
  simulateTradeExecution,
  calculateTradeResult,
  shouldAvoidTrade,
  getGoldSession,
  calculateExecutionCost,
} from './goldExecution.js';
import { getCurrentRegime, getRegimeForPeriod } from './regimeDetection.js';

/**
 * Backtest configuration
 */
export const DEFAULT_BACKTEST_CONFIG = {
  // Capital management
  accountSize: 10000,
  riskPerTrade: 100, // $100 per trade (1%)
  
  // Strategies to test
  strategies: {
    htfBias: true,
    ltfExecution: true,
    liquiditySweeps: false,
    impulse: false,
  },

  // Filters
  filters: {
    htfMinScore: 50,        // Minimum HTF bias score
    ltfMinConfidence: 75,   // Minimum LTF confidence
    killZoneOnly: true,     // Only trade in kill zones
    avoidRollover: true,    // Avoid rollover periods
    regimeFilter: null,     // null = all, or 'TRENDING', 'CONSOLIDATION', etc.
  },

  // Execution settings
  execution: {
    useRealisticSpread: true,
    useRealisticSlippage: true,
    worstCaseExecution: true, // Assume stop hit if both touched
    maxSlippage: 50,          // Points
  },

  // Date range
  startDate: null,
  endDate: null,
};

/**
 * Trade record structure
 */
class Trade {
  constructor(signal, entryCandle, config) {
    this.id = `${signal.timestamp}_${signal.direction}`;
    this.signal = signal;
    this.entryTimestamp = entryCandle.timestamp;
    this.entryCandle = entryCandle;
    this.direction = signal.direction;
    this.regime = getCurrentRegime([entryCandle], 0);
    this.session = getGoldSession(entryCandle.timestamp);
    
    // Calculate entry with costs
    this.entry = calculateEntryPrice(signal, entryCandle, entryCandle.timestamp);
    this.stop = calculateRealisticStop(signal, entryCandle);
    this.target = calculateRealisticTarget(signal, entryCandle.timestamp);
    
    // Risk management
    this.riskAmount = config.riskPerTrade;
    this.stopDistance = Math.abs(this.entry - this.stop) * 10000; // In points
    
    // Execution costs
    this.executionCost = calculateExecutionCost(signal, entryCandle.timestamp, this.riskAmount);
    
    // State
    this.status = 'RUNNING';
    this.exitTimestamp = null;
    this.exitPrice = null;
    this.exitType = null;
    this.result = null;
    this.durationBars = 0;
  }

  close(exitCandle, exitType) {
    this.exitTimestamp = exitCandle.timestamp;
    this.exitType = exitType;
    
    // Determine exit price
    if (exitType === 'STOPPED') {
      this.exitPrice = this.stop;
    } else if (exitType === 'TARGET_HIT') {
      this.exitPrice = this.target;
    } else {
      this.exitPrice = exitCandle.close; // Manual close
    }

    // Calculate result
    this.result = calculateTradeResult(this, this.exitPrice, exitType);
    this.status = 'CLOSED';
  }
}

/**
 * Main backtest engine
 */
export class BacktestEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
    this.trades = [];
    this.openTrades = [];
    this.signals = [];
    this.currentIndex = 0;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run backtest on candle data
   * Multi-timeframe: 1H direction → 15M validation → 5M entry
   */
  async runBacktest(candles_5m, candles_1h = null, candles_15m = null, onProgress = null) {
    this.startTime = Date.now();
    this.trades = [];
    this.openTrades = [];
    this.signals = [];

    console.log(`\n🧪 Starting Multi-Timeframe Backtest...`);
    console.log(`   5M Candles:  ${candles_5m.length} (Entry Execution)`);
    console.log(`   15M Candles: ${candles_15m?.length || 0} (Validation)`);
    console.log(`   1H Candles:  ${candles_1h?.length || 0} (Direction)`);

    // Filter date range if specified
    let candlesToTest = candles_5m;
    if (this.config.startDate || this.config.endDate) {
      candlesToTest = this.filterDateRange(candles_5m);
    }

    console.log(`📊 Testing ${candlesToTest.length} candles`);

    // Candle-by-candle simulation
    for (let i = 100; i < candlesToTest.length; i++) {
      this.currentIndex = i;
      const candle = candlesToTest[i];

      // Update open trades
      await this.updateOpenTrades(candle);

      // Check for new signals (only if no open trades - one trade at a time)
      if (this.openTrades.length === 0) {
        await this.checkForSignals(candlesToTest, i, candles_1h, candles_15m);
      }

      // Progress callback
      if (onProgress && i % 100 === 0) {
        const progress = (i / candlesToTest.length) * 100;
        onProgress(progress, this.trades.length, this.openTrades.length);
      }
    }

    // Close any remaining open trades
    this.closeRemainingTrades(candlesToTest[candlesToTest.length - 1]);

    this.endTime = Date.now();
    const duration = ((this.endTime - this.startTime) / 1000).toFixed(2);

    console.log(`\n✅ Backtest Complete in ${duration}s`);
    console.log(`   Total Trades: ${this.trades.length}`);
    console.log(`   Total Signals: ${this.signals.length}`);

    return this.getResults();
  }

  /**
   * Filter candles by date range
   */
  filterDateRange(candles) {
    return candles.filter(c => {
      const date = new Date(c.timestamp);
      if (this.config.startDate && date < new Date(this.config.startDate)) {
        return false;
      }
      if (this.config.endDate && date > new Date(this.config.endDate)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Update open trades (check stops and targets)
   */
  async updateOpenTrades(candle) {
    for (let i = this.openTrades.length - 1; i >= 0; i--) {
      const trade = this.openTrades[i];
      trade.durationBars++;

      // Simulate execution
      const result = simulateTradeExecution(trade, candle);

      if (result === 'STOPPED' || result === 'TARGET_HIT') {
        trade.close(candle, result);
        this.trades.push(trade);
        this.openTrades.splice(i, 1);
        
        console.log(`${result}: ${trade.direction} @ ${trade.entry.toFixed(2)} → ${trade.exitPrice.toFixed(2)} (${trade.result.rMultiple.toFixed(2)}R)`);
      }
    }
  }

  /**
   * Check for new entry signals
   * SAME LOGIC AS LIVE CHART: 1H direction → 15M validation → 5M entry
   */
  async checkForSignals(candles_5m, currentIndex, candles_1h, candles_15m) {
    const candle = candles_5m[currentIndex];

    // Apply rollover filter
    if (this.config.filters.avoidRollover && shouldAvoidTrade(candle.timestamp)) {
      return;
    }

    // Apply regime filter
    if (this.config.filters.regimeFilter) {
      const regime = getCurrentRegime(candles_5m, currentIndex);
      if (regime !== this.config.filters.regimeFilter) {
        return;
      }
    }

    // STEP 1: Analyze 1H HTF Bias (Direction)
    let htfBias = null;
    if (this.config.strategies.htfBias && candles_1h) {
      // Use 1H candles for direction - SAME as live chart
      htfBias = analyzeInstitutionalBias(candles_1h);

      // Apply HTF filter
      if (htfBias.score < this.config.filters.htfMinScore) {
        return; // HTF bias too weak
      }
    }

    // STEP 2: Validate on 15M (optional but recommended)
    let mtfValidation = null;
    if (this.config.strategies.mtfValidation && candles_15m) {
      // Check 15M structure alignment with 1H
      mtfValidation = analyzeInstitutionalBias(candles_15m);
      
      // 15M must align with 1H direction
      if (htfBias && mtfValidation.bias !== htfBias.bias) {
        return; // MTF not aligned
      }

      // 15M must have minimum strength
      if (mtfValidation.score < (this.config.filters.mtfMinScore || 60)) {
        return; // MTF validation too weak
      }
    }

    // STEP 3: Generate 5M LTF Entry Signal - SAME as live chart
    if (this.config.strategies.ltfExecution) {
      const dealingRange = htfBias?.dealingRange;
      const liquidityLevels = mapLTFLiquidity(candles_5m.slice(0, currentIndex + 1), 50);
      const killZoneActive = isInKillZone(candle.timestamp);
      const volatilityExpanding = isVolatilityExpanding(candles_5m, currentIndex);

      // Apply kill zone filter
      if (this.config.filters.killZoneOnly && !killZoneActive) {
        return;
      }

      // Generate entry signal - EXACT same logic as live chart
      const signal = generateEntrySignal({
        candles: candles_5m.slice(0, currentIndex + 1),
        currentIndex,
        htfBias,
        dealingRange,
        liquidityLevels,
        killZoneActive,
        volatilityExpanding,
      });

      if (signal && signal.confidence >= this.config.filters.ltfMinConfidence) {
        // Record signal with multi-timeframe context
        this.signals.push({
          ...signal,
          index: currentIndex,
          regime: getCurrentRegime(candles_5m, currentIndex),
          htf_1h: htfBias ? `${htfBias.bias} (${htfBias.score})` : 'N/A',
          mtf_15m: mtfValidation ? `${mtfValidation.bias} (${mtfValidation.score})` : 'N/A',
        });

        // Open trade
        const trade = new Trade(signal, candle, this.config);
        this.openTrades.push(trade);

        console.log(`\n🎯 ENTRY SIGNAL:`);
        console.log(`   1H:  ${htfBias?.bias || 'N/A'} (${htfBias?.score || 0})`);
        console.log(`   15M: ${mtfValidation?.bias || 'N/A'} (${mtfValidation?.score || 0})`);
        console.log(`   5M:  ${trade.direction} @ ${trade.entry.toFixed(2)}`);
        console.log(`   Stop: ${trade.stop.toFixed(2)} | Target: ${trade.target.toFixed(2)}`);
      }
    }
  }

  /**
   * Close remaining open trades at market
   */
  closeRemainingTrades(lastCandle) {
    for (const trade of this.openTrades) {
      trade.close(lastCandle, 'MARKET_CLOSE');
      this.trades.push(trade);
    }
    this.openTrades = [];
  }

  /**
   * Get backtest results
   */
  getResults() {
    return {
      config: this.config,
      trades: this.trades,
      signals: this.signals,
      duration: this.endTime - this.startTime,
      summary: this.calculateSummary(),
      byRegime: this.calculateByRegime(),
      bySession: this.calculateBySession(),
      equity: this.calculateEquityCurve(),
    };
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary() {
    const winners = this.trades.filter(t => t.result.winner);
    const losers = this.trades.filter(t => !t.result.winner);

    const totalPnL = this.trades.reduce((sum, t) => sum + t.result.pnl, 0);
    const grossProfit = winners.reduce((sum, t) => sum + t.result.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.result.pnl, 0));

    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
    const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;

    const avgR = this.trades.reduce((sum, t) => sum + t.result.rMultiple, 0) / this.trades.length;
    
    const winRate = (winners.length / this.trades.length) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

    return {
      totalTrades: this.trades.length,
      winners: winners.length,
      losers: losers.length,
      winRate,
      totalPnL,
      grossProfit,
      grossLoss,
      avgWin,
      avgLoss,
      avgR,
      profitFactor,
      expectancy,
      maxDrawdown: this.calculateMaxDrawdown(),
      maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(),
      avgTradeDuration: this.calculateAvgDuration(),
    };
  }

  /**
   * Calculate results by regime
   */
  calculateByRegime() {
    const regimes = {};

    this.trades.forEach(trade => {
      if (!regimes[trade.regime]) {
        regimes[trade.regime] = [];
      }
      regimes[trade.regime].push(trade);
    });

    const results = {};
    for (const [regime, trades] of Object.entries(regimes)) {
      const winners = trades.filter(t => t.result.winner);
      const totalPnL = trades.reduce((sum, t) => sum + t.result.pnl, 0);
      const winRate = (winners.length / trades.length) * 100;

      results[regime] = {
        count: trades.length,
        winners: winners.length,
        winRate,
        totalPnL,
        avgR: trades.reduce((sum, t) => sum + t.result.rMultiple, 0) / trades.length,
      };
    }

    return results;
  }

  /**
   * Calculate results by session
   */
  calculateBySession() {
    const sessions = {};

    this.trades.forEach(trade => {
      if (!sessions[trade.session]) {
        sessions[trade.session] = [];
      }
      sessions[trade.session].push(trade);
    });

    const results = {};
    for (const [session, trades] of Object.entries(sessions)) {
      const winners = trades.filter(t => t.result.winner);
      const totalPnL = trades.reduce((sum, t) => sum + t.result.pnl, 0);
      const winRate = (winners.length / trades.length) * 100;

      results[session] = {
        count: trades.length,
        winners: winners.length,
        winRate,
        totalPnL,
        avgR: trades.reduce((sum, t) => sum + t.result.rMultiple, 0) / trades.length,
      };
    }

    return results;
  }

  /**
   * Calculate equity curve
   */
  calculateEquityCurve() {
    let equity = this.config.accountSize;
    const curve = [{ index: 0, equity, pnl: 0 }];

    this.trades.forEach((trade, i) => {
      equity += trade.result.pnl;
      curve.push({
        index: i + 1,
        equity,
        pnl: trade.result.pnl,
        timestamp: trade.exitTimestamp,
      });
    });

    return curve;
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown() {
    const curve = this.calculateEquityCurve();
    let maxDrawdown = 0;
    let peak = curve[0].equity;

    for (const point of curve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      amount: maxDrawdown,
      percentage: (maxDrawdown / this.config.accountSize) * 100,
    };
  }

  /**
   * Calculate maximum consecutive losses
   */
  calculateMaxConsecutiveLosses() {
    let maxLosses = 0;
    let currentLosses = 0;

    for (const trade of this.trades) {
      if (trade.result.winner) {
        currentLosses = 0;
      } else {
        currentLosses++;
        if (currentLosses > maxLosses) {
          maxLosses = currentLosses;
        }
      }
    }

    return maxLosses;
  }

  /**
   * Calculate average trade duration
   */
  calculateAvgDuration() {
    const total = this.trades.reduce((sum, t) => sum + t.durationBars, 0);
    return total / this.trades.length;
  }
}

/**
 * Quick backtest function
 */
export async function runQuickBacktest(candles, config = {}) {
  const engine = new BacktestEngine(config);
  return await engine.runBacktest(candles);
}
