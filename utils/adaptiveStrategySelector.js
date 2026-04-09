// utils/adaptiveStrategySelector.js
// Adaptive Strategy Selection System
// "This is exactly how Renaissance Technologies, Two Sigma operate" - PDF

import { detectMarketRegime, getStrategyForRegime, getRealisticWinRate } from './regimeDetector.js';
import { calculateProfessionalRisk, validateTradeSetup } from './professionalRisk.js';

/**
 * STRATEGY LIBRARY
 * 
 * Per PDF: "Reduce from 45 methods to 2-3 core setups"
 * Each regime gets its best-performing strategies
 */

const CORE_STRATEGIES = {
  // For Strong Trends
  BOS_CONTINUATION: {
    id: 'BOS_CONTINUATION',
    name: 'Break of Structure Continuation',
    description: 'Enter on pullback after BOS in trending market',
    bestFor: ['STRONG_TREND_BULLISH', 'STRONG_TREND_BEARISH'],
    winRate: 0.58, // Professional expectation
    minConfluence: 3,
  },

  FIRST_FVG_AFTER_BOS: {
    id: 'FIRST_FVG_AFTER_BOS',
    name: 'First FVG After BOS',
    description: 'Trade first pullback to FVG after structure break',
    bestFor: ['STRONG_TREND_BULLISH', 'STRONG_TREND_BEARISH'],
    winRate: 0.55,
    minConfluence: 3,
  },

  // For Ranging Markets
  LIQUIDITY_GRAB_EQUAL_HIGHS_LOWS: {
    id: 'LIQUIDITY_GRAB',
    name: 'Equal Highs/Lows Liquidity Grab',
    description: 'Fade liquidity sweeps at range extremes',
    bestFor: ['RANGING'],
    winRate: 0.52,
    minConfluence: 3,
  },

  ORDER_BLOCK_FVG_CONFLUENCE: {
    id: 'OB_FVG_CONFLUENCE',
    name: 'Order Block + FVG Confluence',
    description: 'Enter when OB and FVG align',
    bestFor: ['RANGING', 'WEAK_TREND'],
    winRate: 0.53,
    minConfluence: 4,
  },

  // For Reversals
  CHOCH_RETEST_ENTRY: {
    id: 'CHOCH_RETEST',
    name: 'CHOCH + Retest Entry',
    description: 'Enter on retest after change of character',
    bestFor: ['REVERSAL_CHOCH'],
    winRate: 0.52,
    minConfluence: 3,
  },
};

/**
 * Select best strategies for current regime
 * Returns top 2-3 strategies (not all 45!)
 */
export function selectStrategiesForRegime(regime) {
  const suitableStrategies = Object.values(CORE_STRATEGIES)
    .filter(strategy => strategy.bestFor.includes(regime.regime))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3); // Top 3 only

  return {
    regime: regime.regime,
    regimeConfidence: regime.confidence,
    strategies: suitableStrategies,
    count: suitableStrategies.length,
    note: 'Professional focus: 2-3 core setups (not 45)',
  };
}

/**
 * Evaluate signal confluence
 * Professional standard: Minimum 3-4 factors aligned
 */
export function evaluateSignalConfluence(signal, regime, candles) {
  const confluenceFactors = [];

  // 1. HTF Bias Alignment
  if (signal.htfBias && signal.htfBias.score >= 50) {
    confluenceFactors.push({
      factor: 'HTF Bias',
      status: '✅',
      value: `${signal.htfBias.bias} (${signal.htfBias.score})`,
    });
  }

  // 2. Market Regime Alignment
  if (regime && regime.confidence > 0.6) {
    confluenceFactors.push({
      factor: 'Market Regime',
      status: '✅',
      value: regime.regime,
    });
  }

  // 3. Kill Zone Active
  if (signal.killZoneActive) {
    confluenceFactors.push({
      factor: 'Kill Zone',
      status: '✅',
      value: 'London/NY Active',
    });
  }

  // 4. Volatility Expansion
  if (signal.volatilityExpanding) {
    confluenceFactors.push({
      factor: 'Volatility',
      status: '✅',
      value: 'Expanding',
    });
  }

  // 5. Premium/Discount Alignment
  if (signal.dealingRange) {
    const inDiscount = signal.entry < signal.dealingRange.mid;
    const inPremium = signal.entry > signal.dealingRange.mid;
    
    if ((signal.direction === 'BUY' && inDiscount) || 
        (signal.direction === 'SELL' && inPremium)) {
      confluenceFactors.push({
        factor: 'Premium/Discount',
        status: '✅',
        value: signal.direction === 'BUY' ? 'Discount' : 'Premium',
      });
    }
  }

  // 6. Market Structure (MSS/BOS)
  if (signal.mss || signal.bos) {
    confluenceFactors.push({
      factor: 'Structure Break',
      status: '✅',
      value: signal.mss ? 'MSS' : 'BOS',
    });
  }

  const confluenceScore = confluenceFactors.length;
  const confluenceStrong = confluenceScore >= 3;

  return {
    score: confluenceScore,
    factors: confluenceFactors,
    strong: confluenceStrong,
    quality: confluenceScore >= 4 ? 'EXCELLENT' : 
             confluenceScore === 3 ? 'GOOD' : 
             confluenceScore === 2 ? 'WEAK' : 'POOR',
    recommendation: confluenceStrong ? 
      'Trade approved - strong confluence' : 
      'Wait for better setup - weak confluence',
  };
}

/**
 * MASTER SIGNAL EVALUATOR
 * Combines regime detection + strategy selection + confluence
 */
export function evaluateSignalProfessionally(signal, candles, currentIndex) {
  // 1. Detect Market Regime
  const regime = detectMarketRegime(candles, currentIndex);

  // 2. Select Appropriate Strategies
  const selectedStrategies = selectStrategiesForRegime(regime);

  // 3. Evaluate Confluence
  const confluence = evaluateSignalConfluence(signal, regime, candles);

  // 4. Calculate Professional Risk
  const riskCalc = calculateProfessionalRisk({
    candles: candles.slice(0, currentIndex + 1),
    direction: signal.direction,
    entry: signal.entry || candles[currentIndex].close,
    accountSize: 10000,
    riskPercent: 1,
    rrRatio: 2.5,
    atrMultiplier: 1.5,
    winRate: getRealisticWinRate(regime.regime, confluence.score),
  });

  // 5. Validate Against Professional Standards
  const validation = validateTradeSetup(riskCalc);

  // 6. Final Decision
  const approved = 
    regime.confidence > 0.6 &&
    confluence.strong &&
    validation.valid &&
    selectedStrategies.count > 0;

  return {
    // Regime Analysis
    regime: {
      detected: regime.regime,
      confidence: regime.confidence,
      description: regime.description,
      characteristics: regime.characteristics,
    },

    // Strategy Selection
    strategies: {
      selected: selectedStrategies.strategies.map(s => s.name),
      count: selectedStrategies.count,
      bestFor: selectedStrategies.regime,
    },

    // Confluence Analysis
    confluence: {
      score: confluence.score,
      factors: confluence.factors,
      quality: confluence.quality,
      strong: confluence.strong,
    },

    // Professional Risk
    risk: {
      entry: riskCalc.summary.entry,
      stop: riskCalc.summary.stop,
      target: riskCalc.summary.target,
      stopPips: riskCalc.summary.stopPips,
      targetPips: riskCalc.summary.targetPips,
      rrRatio: riskCalc.summary.rrRatio,
      positionSize: riskCalc.summary.positionSize,
      expectedReturn: riskCalc.summary.expectedReturn,
      profitFactor: riskCalc.summary.profitFactor,
      professional: true,
    },

    // Validation
    validation: {
      valid: validation.valid,
      professional: validation.professional,
      issues: validation.issues,
    },

    // Final Decision
    decision: {
      approved: approved,
      confidence: approved ? 
        Math.min(regime.confidence * confluence.score / 4, 0.85) : 0,
      reason: approved ? 
        'All criteria met - professional setup' :
        'Insufficient quality - wait for better opportunity',
      expectedWinRate: `${(getRealisticWinRate(regime.regime, confluence.score) * 100).toFixed(0)}%`,
      note: 'Professional expectation: 50-55% win rate typical',
    },

    // Summary for Display
    summary: {
      regime: regime.regime,
      strategies: selectedStrategies.strategies.map(s => s.name).join(', '),
      confluence: `${confluence.score}/6 factors`,
      risk: riskCalc.summary.rrRatio,
      approved: approved ? '✅ APPROVED' : '⚠️ WAIT',
    },
  };
}

/**
 * Generate professional trade recommendation
 */
export function generateTradeRecommendation(evaluation) {
  if (!evaluation.decision.approved) {
    return {
      action: 'WAIT',
      reason: evaluation.decision.reason,
      improvements: [
        evaluation.confluence.score < 3 ? 'Wait for stronger confluence (3+ factors)' : null,
        evaluation.regime.confidence < 0.6 ? 'Wait for clearer market regime' : null,
        evaluation.validation.issues.length > 0 ? 'Fix risk management issues' : null,
      ].filter(Boolean),
    };
  }

  return {
    action: 'TRADE',
    direction: evaluation.risk.entry.includes('BUY') ? 'BUY' : 'SELL',
    setup: {
      entry: evaluation.risk.entry,
      stop: evaluation.risk.stop,
      target: evaluation.risk.target,
      rrRatio: evaluation.risk.rrRatio,
    },
    regime: evaluation.regime.detected,
    strategies: evaluation.strategies.selected,
    confluence: evaluation.confluence.factors,
    expectations: {
      winRate: evaluation.decision.expectedWinRate,
      expectedReturn: evaluation.risk.expectedReturn,
      profitFactor: evaluation.risk.profitFactor,
      note: 'Realistic professional expectations',
    },
    professional: {
      atrBasedStop: true,
      institutionalRR: true,
      riskCapped: true,
      confluenceChecked: true,
      regimeAligned: true,
    },
  };
}
