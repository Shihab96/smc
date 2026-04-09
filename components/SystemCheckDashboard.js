// components/SystemCheckDashboard.js
// User-Friendly System Verification Dashboard
// Shows EXACTLY what's working and what's not

'use client';
import { useState, useEffect } from 'react';

export default function SystemCheckDashboard({ 
  candles, 
  htfCandles, 
  itfCandles,
  mtfStructure,
  institutionalAnalysis,
  marketRegime,
  institutionalTriggers,
  professionalEvaluation,
  signals
}) {
  const [expanded, setExpanded] = useState(false);

  // Run all system checks
  const checks = {
    // 1. Data Loading
    dataLoaded: {
      name: '📥 Data Loading',
      status: candles && candles.length > 0,
      details: candles ? `${candles.length} candles loaded` : 'No data',
      importance: 'CRITICAL',
      fix: 'Click "Load Data" button'
    },

    // 2. MTF Structure
    mtfStructure: {
      name: '🎯 Multi-Timeframe Structure',
      status: mtfStructure && htfCandles && itfCandles,
      details: mtfStructure 
        ? `HTF: ${mtfStructure.htf.timeframe} (${htfCandles?.length || 0} candles), ITF: ${mtfStructure.itf.timeframe} (${itfCandles?.length || 0} candles), LTF: ${mtfStructure.ltf.timeframe} (${candles?.length || 0} candles)`
        : 'Not configured',
      importance: 'CRITICAL',
      fix: 'Select timeframe and load data'
    },

    // 3. HTF Bias Analysis
    htfBias: {
      name: '📊 HTF Institutional Bias',
      status: institutionalAnalysis && institutionalAnalysis.bias,
      details: institutionalAnalysis 
        ? `${institutionalAnalysis.bias} (${institutionalAnalysis.confidence}% confidence)`
        : 'Not calculated',
      importance: 'CRITICAL',
      fix: 'Ensure data loaded properly'
    },

    // 4. Premium/Discount Zones
    dealingRange: {
      name: '💰 Premium/Discount Zones',
      status: institutionalAnalysis && institutionalAnalysis.dealingRange,
      details: institutionalAnalysis?.dealingRange
        ? `Equilibrium: ${institutionalAnalysis.dealingRange.mid.toFixed(2)}, Range: ${institutionalAnalysis.dealingRange.low.toFixed(2)} - ${institutionalAnalysis.dealingRange.high.toFixed(2)}`
        : 'Not calculated',
      importance: 'HIGH',
      fix: 'Check HTF bias is working'
    },

    // 5. Market Regime Detection
    regimeDetection: {
      name: '🔍 Market Regime Detection',
      status: marketRegime && marketRegime.regime,
      details: marketRegime
        ? `${marketRegime.regime} (${(marketRegime.confidence * 100).toFixed(0)}% confidence)`
        : 'Not detected',
      importance: 'CRITICAL',
      fix: 'Verify regimeDetector.js is imported'
    },

    // 6. Institutional Triggers (7 methods)
    triggers: {
      name: '🎯 Institutional Triggers (7 Methods)',
      status: institutionalTriggers && institutionalTriggers.triggerCount > 0,
      details: institutionalTriggers
        ? `${institutionalTriggers.triggerCount}/7 active, Consensus: ${institutionalTriggers.consensus} (${institutionalTriggers.stackedConfidence}%)`
        : 'Not detected',
      importance: 'HIGH',
      fix: 'Check institutionalTriggers.js'
    },

    // 7. Strategy Selection
    strategySelection: {
      name: '🎲 Adaptive Strategy Selection',
      status: professionalEvaluation && professionalEvaluation.strategies,
      details: professionalEvaluation?.strategies
        ? `${professionalEvaluation.strategies.count} strategies selected: ${professionalEvaluation.strategies.selected.join(', ')}`
        : 'Not selected',
      importance: 'HIGH',
      fix: 'Regime detection must work first'
    },

    // 8. Confluence Scoring
    confluence: {
      name: '✅ Confluence Scoring (6 Factors)',
      status: professionalEvaluation && professionalEvaluation.confluence,
      details: professionalEvaluation?.confluence
        ? `${professionalEvaluation.confluence.score}/6 factors (${professionalEvaluation.confluence.quality})`
        : 'Not calculated',
      importance: 'HIGH',
      fix: 'Check signal generation'
    },

    // 9. Professional Risk Management
    riskManagement: {
      name: '🎯 ATR-Based Risk Management',
      status: professionalEvaluation && professionalEvaluation.risk,
      details: professionalEvaluation?.risk
        ? `Stop: ${professionalEvaluation.risk.stopPips} pips (ATR-based), RR: ${professionalEvaluation.risk.rrRatio}`
        : 'Not calculated',
      importance: 'CRITICAL',
      fix: 'Check professionalRisk.js'
    },

    // 10. Final Decision
    decision: {
      name: '✅ Final Decision (APPROVED/WAIT)',
      status: professionalEvaluation && professionalEvaluation.decision,
      details: professionalEvaluation?.decision
        ? `${professionalEvaluation.decision.approved ? '✅ APPROVED' : '⚠️ WAIT'} (${(professionalEvaluation.decision.confidence * 100).toFixed(0)}% confidence)`
        : 'Not generated',
      importance: 'CRITICAL',
      fix: 'All above checks must pass'
    },

    // 11. Signal Generation
    signals: {
      name: '📊 Signal Generation',
      status: signals && signals.length > 0,
      details: signals
        ? `${signals.length} total signals, ${signals.filter(s => s.type === 'HIGH_PROBABILITY').length} high-probability`
        : 'No signals',
      importance: 'MEDIUM',
      fix: 'Normal to have 0 signals if no setups present'
    },
  };

  // Calculate overall health
  const totalChecks = Object.keys(checks).length;
  const passedChecks = Object.values(checks).filter(c => c.status).length;
  const criticalFailed = Object.values(checks).filter(c => !c.status && c.importance === 'CRITICAL').length;
  const healthPercentage = (passedChecks / totalChecks) * 100;

  // Determine system status
  let systemStatus, statusColor, statusMessage;
  if (healthPercentage === 100) {
    systemStatus = '✅ ALL SYSTEMS OPERATIONAL';
    statusColor = '#00d4aa';
    statusMessage = 'Everything is working perfectly!';
  } else if (criticalFailed > 0) {
    systemStatus = '❌ CRITICAL ISSUES DETECTED';
    statusColor = '#ff4976';
    statusMessage = `${criticalFailed} critical component(s) not working`;
  } else if (healthPercentage >= 80) {
    systemStatus = '⚠️ MOSTLY WORKING';
    statusColor = '#ffd60a';
    statusMessage = 'Some non-critical issues found';
  } else {
    systemStatus = '❌ MULTIPLE ISSUES';
    statusColor = '#ff4976';
    statusMessage = 'Several components need attention';
  }

  return (
    <div className="system-check-dashboard">
      {/* Header */}
      <div className="system-header" onClick={() => setExpanded(!expanded)}>
        <div className="system-title">
          <span style={{ fontSize: '20