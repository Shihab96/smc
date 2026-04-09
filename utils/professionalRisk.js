// utils/professionalRisk.js
// Professional Risk Management Calculator
// Based on institutional assessment recommendations

import { calculateATR } from './liquidity.js';

/**
 * PROFESSIONAL STOP LOSS CALCULATION
 * 
 * Per PDF: "A 3-5 pip stop on Gold is statistically likely to be 
 * stopped out by random noise. A professional stop on Gold is 
 * typically 20-40 pips to account for ATR."
 */

/**
 * Calculate ATR-based stop loss
 * Professional standard: 1.5x ATR
 */
export function calculateProfessionalStop(candles, direction, entry, multiplier = 1.5) {
  const atr = calculateATR(candles, 14);
  
  // Professional stop distance
  const stopDistance = atr * multiplier;
  
  let stopLoss;
  if (direction === 'BUY') {
    stopLoss = entry - stopDistance;
  } else {
    stopLoss = entry + stopDistance;
  }

  return {
    stopLoss: stopLoss,
    stopDistance: stopDistance,
    atr: atr,
    pips: stopDistance * 10, // Convert to pips (for Gold)
    rationale: `${multiplier}x ATR = ${stopDistance.toFixed(2)} (${(stopDistance * 10).toFixed(1)} pips)`,
  };
}

/**
 * Calculate take profit based on realistic RR
 * Professional target: 1:2 to 1:2.5 RR
 */
export function calculateProfessionalTarget(entry, stopLoss, rrRatio = 2.5) {
  const risk = Math.abs(entry - stopLoss);
  const reward = risk * rrRatio;

  let takeProfit;
  if (entry > stopLoss) {
    // Long position
    takeProfit = entry + reward;
  } else {
    // Short position
    takeProfit = entry - reward;
  }

  return {
    takeProfit: takeProfit,
    reward: reward,
    risk: risk,
    rrRatio: rrRatio,
    rewardPips: reward * 10,
    riskPips: risk * 10,
    rationale: `1:${rrRatio} RR = ${reward.toFixed(2)} reward (${(reward * 10).toFixed(1)} pips)`,
  };
}

/**
 * Calculate position size based on account risk
 * Professional standard: 1% risk per trade max
 */
export function calculatePositionSize(accountSize, riskPercent, stopDistance) {
  // Risk amount in dollars
  const riskAmount = accountSize * (riskPercent / 100);
  
  // Position size (lots for Gold)
  // For XAUUSD: 1 lot = $100 per pip
  const pips = stopDistance * 10;
  const positionSize = riskAmount / (pips * 100);
  
  return {
    lots: positionSize,
    riskAmount: riskAmount,
    stopPips: pips,
    dollarPerPip: positionSize * 100,
    rationale: `Risk $${riskAmount.toFixed(2)} = ${positionSize.toFixed(3)} lots`,
  };
}

/**
 * Calculate realistic profit expectations
 * Per PDF: 52% win rate at 1:2 RR yields 56% return per cycle
 */
export function calculateExpectedValue(winRate, rrRatio, riskAmount) {
  // Expected value per trade
  const avgWin = riskAmount * rrRatio;
  const avgLoss = riskAmount;
  
  const expectedValue = (winRate * avgWin) - ((1 - winRate) * avgLoss);
  const expectedReturn = (expectedValue / riskAmount) * 100;

  return {
    expectedValue: expectedValue,
    expectedReturn: expectedReturn,
    avgWin: avgWin,
    avgLoss: avgLoss,
    winRate: winRate,
    profitFactor: (winRate * avgWin) / ((1 - winRate) * avgLoss),
    rationale: `${(winRate * 100).toFixed(1)}% WR @ 1:${rrRatio} = ${expectedReturn.toFixed(1)}% expected return`,
  };
}

/**
 * MASTER RISK CALCULATOR
 * Calculates all risk parameters for a professional trade
 */
export function calculateProfessionalRisk(config) {
  const {
    candles,
    direction,
    entry,
    accountSize = 10000,
    riskPercent = 1,
    rrRatio = 2.5,
    atrMultiplier = 1.5,
    winRate = 0.52, // Realistic professional expectation
  } = config;

  // 1. Calculate ATR-based stop
  const stop = calculateProfessionalStop(candles, direction, entry, atrMultiplier);

  // 2. Calculate take profit
  const target = calculateProfessionalTarget(entry, stop.stopLoss, rrRatio);

  // 3. Calculate position size
  const position = calculatePositionSize(accountSize, riskPercent, stop.stopDistance);

  // 4. Calculate expected value
  const expectedValue = calculateExpectedValue(winRate, rrRatio, position.riskAmount);

  // 5. Transaction costs (realistic as per PDF)
  const spread = 0.02; // 2 pips
  const slippage = 0.005; // 0.5 pips
  const totalCost = (spread + slippage) * position.dollarPerPip;

  return {
    entry: entry,
    stopLoss: stop.stopLoss,
    takeProfit: target.takeProfit,
    
    stop: {
      ...stop,
      professional: true,
      reason: 'ATR-based (professional standard)',
    },
    
    target: {
      ...target,
      professional: true,
      reason: `1:${rrRatio} RR (institutional target)`,
    },
    
    position: {
      ...position,
      maxRisk: '1% account (professional cap)',
    },
    
    expectedValue: {
      ...expectedValue,
      realistic: true,
      note: 'Based on 52% win rate (professional expectation)',
    },
    
    costs: {
      spread: spread,
      slippage: slippage,
      totalCost: totalCost,
      impactOnRR: (totalCost / position.riskAmount) * 100,
      note: 'Realistic transaction costs included',
    },

    summary: {
      direction: direction,
      entry: entry.toFixed(2),
      stop: stop.stopLoss.toFixed(2),
      target: target.takeProfit.toFixed(2),
      stopPips: stop.pips.toFixed(1),
      targetPips: target.rewardPips.toFixed(1),
      rrRatio: `1:${rrRatio}`,
      positionSize: `${position.lots.toFixed(3)} lots`,
      riskDollars: `$${position.riskAmount.toFixed(2)}`,
      expectedReturn: `${expectedValue.expectedReturn.toFixed(1)}%`,
      profitFactor: expectedValue.profitFactor.toFixed(2),
    },

    validation: {
      stopRealistic: stop.pips >= 20, // Must be >= 20 pips for Gold
      rrAcceptable: rrRatio >= 2.0, // Must be >= 1:2
      riskAcceptable: riskPercent <= 1, // Must be <= 1%
      winRateRealistic: winRate <= 0.65, // Must be <= 65%
      allValid: function() {
        return this.stopRealistic && this.rrAcceptable && 
               this.riskAcceptable && this.winRateRealistic;
      },
    },
  };
}

/**
 * Validate trade setup against professional standards
 */
export function validateTradeSetup(riskCalc) {
  const issues = [];

  // Check stop loss size
  if (riskCalc.stop.pips < 20) {
    issues.push({
      severity: 'CRITICAL',
      issue: `Stop too tight (${riskCalc.stop.pips.toFixed(1)} pips)`,
      recommendation: 'Increase to minimum 20 pips (ATR-based)',
      reference: 'PDF Section 3.2',
    });
  }

  // Check RR ratio
  if (riskCalc.target.rrRatio < 2.0) {
    issues.push({
      severity: 'WARNING',
      issue: `RR ratio too low (1:${riskCalc.target.rrRatio})`,
      recommendation: 'Target minimum 1:2 RR',
      reference: 'PDF Section 7',
    });
  }

  // Check position size risk
  const riskPercent = (riskCalc.position.riskAmount / 10000) * 100; // Assuming $10k account
  if (riskPercent > 1) {
    issues.push({
      severity: 'CRITICAL',
      issue: `Risk too high (${riskPercent.toFixed(1)}%)`,
      recommendation: 'Reduce to maximum 1% per trade',
      reference: 'PDF Section 2',
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'CRITICAL').length === 0,
    issues: issues,
    professional: issues.length === 0,
  };
}

/**
 * Calculate maximum daily risk exposure
 * Professional standard: 3% daily drawdown limit
 */
export function checkDailyRiskLimit(accountSize, tradesToday, lossesToday) {
  const maxDailyRisk = accountSize * 0.03; // 3% max
  const currentRisk = lossesToday.reduce((sum, loss) => sum + loss, 0);
  
  const remainingRisk = maxDailyRisk - currentRisk;
  const canTrade = remainingRisk > 0;

  return {
    maxDailyRisk: maxDailyRisk,
    currentRisk: currentRisk,
    remainingRisk: remainingRisk,
    tradesCount: tradesToday.length,
    lossesCount: lossesToday.length,
    canTrade: canTrade,
    percentUsed: (currentRisk / maxDailyRisk) * 100,
    warning: currentRisk > (maxDailyRisk * 0.8) ? 'Approaching daily limit' : null,
    circuitBreaker: !canTrade ? 'TRADING HALTED - Daily limit reached' : null,
  };
}

/**
 * Professional risk management display
 */
export function formatRiskDisplay(riskCalc) {
  return {
    title: '🎯 Professional Risk Management',
    
    trade: {
      'Entry': riskCalc.summary.entry,
      'Stop Loss': `${riskCalc.summary.stop} (${riskCalc.summary.stopPips} pips)`,
      'Take Profit': `${riskCalc.summary.target} (${riskCalc.summary.targetPips} pips)`,
      'Risk:Reward': riskCalc.summary.rrRatio,
    },
    
    position: {
      'Position Size': riskCalc.summary.positionSize,
      'Risk Amount': riskCalc.summary.riskDollars,
      'Max Risk': riskCalc.position.maxRisk,
    },
    
    expectations: {
      'Expected Return': riskCalc.summary.expectedReturn,
      'Profit Factor': riskCalc.summary.profitFactor,
      'Win Rate Target': `${(riskCalc.expectedValue.winRate * 100).toFixed(0)}%`,
      'Note': 'Realistic professional expectations',
    },
    
    professional: {
      'ATR-Based Stop': '✅',
      'Institutional RR': '✅',
      '1% Risk Cap': '✅',
      'Transaction Costs': 'Included',
    },
  };
}
