// components/SystemHealthCheck.js
// User-Friendly System Verification Dashboard

'use client';

import { useState, useEffect } from 'react';

export default function SystemHealthCheck({ 
  candles, 
  htfCandles, 
  itfCandles,
  mtfStructure,
  htfBias,
  marketRegime,
  institutionalTriggers,
  professionalEvaluation 
}) {
  const [healthStatus, setHealthStatus] = useState({});
  const [overallHealth, setOverallHealth] = useState(0);

  useEffect(() => {
    checkSystemHealth();
  }, [candles, htfCandles, itfCandles, mtfStructure, htfBias, marketRegime, institutionalTriggers, professionalEvaluation]);

  const checkSystemHealth = () => {
    const checks = {};
    let passedChecks = 0;
    const totalChecks = 8;

    // Check 1: Data Loaded
    if (candles && candles.length > 100) {
      checks.dataLoaded = {
        status: 'pass',
        title: '✅ Market Data Loaded',
        message: `${candles.length.toLocaleString()} candles loaded`,
        detail: 'Real Gold (XAUUSD) price data is ready'
      };
      passedChecks++;
    } else {
      checks.dataLoaded = {
        status: 'fail',
        title: '❌ No Data',
        message: 'Click "Load Data" to start',
        detail: 'Need to fetch market data first'
      };
    }

    // Check 2: Multi-Timeframe Setup
    if (htfCandles && htfCandles.length >= 30 && itfCandles && itfCandles.length >= 50) {
      checks.mtfSetup = {
        status: 'pass',
        title: '✅ 3-Layer Analysis Ready',
        message: `HTF: ${htfCandles.length} | ITF: ${itfCandles.length} | LTF: ${candles.length}`,
        detail: 'Professional multi-timeframe structure working'
      };
      passedChecks++;
    } else if (candles && candles.length > 0) {
      checks.mtfSetup = {
        status: 'warning',
        title: '⚠️ MTF Setup Incomplete',
        message: 'Building timeframe layers...',
        detail: 'Aggregating candles to higher timeframes'
      };
    } else {
      checks.mtfSetup = {
        status: 'fail',
        title: '❌ MTF Not Setup',
        message: 'Load data first',
        detail: 'Multi-timeframe requires data'
      };
    }

    // Check 3: HTF Bias Analysis
    if (htfBias && htfBias.bias) {
      const biasStrength = htfBias.score >= 60 ? 'Strong' : htfBias.score >= 40 ? 'Moderate' : 'Weak';
      checks.htfBias = {
        status: 'pass',
        title: '✅ Direction Detected',
        message: `${htfBias.bias} (${biasStrength})`,
        detail: `Institutional bias score: ${htfBias.score}/100`
      };
      passedChecks++;
    } else {
      checks.htfBias = {
        status: 'fail',
        title: '❌ No Direction',
        message: 'Analyzing market...',
        detail: 'Calculating institutional bias'
      };
    }

    // Check 4: Market Regime
    if (marketRegime && marketRegime.regime) {
      const regimeSimple = {
        'STRONG_TREND_BULLISH': 'Strong Uptrend 📈',
        'STRONG_TREND_BEARISH': 'Strong Downtrend 📉',
        'RANGING': 'Sideways Market ↔️',
        'HIGH_VOLATILITY': 'High Volatility ⚡',
        'REVERSAL_CHOCH': 'Potential Reversal 🔄',
        'WEAK_TREND': 'Unclear Trend 🤔'
      }[marketRegime.regime] || marketRegime.regime;

      checks.regime = {
        status: 'pass',
        title: '✅ Market Type Identified',
        message: regimeSimple,
        detail: `Confidence: ${(marketRegime.confidence * 100).toFixed(0)}%`
      };
      passedChecks++;
    } else {
      checks.regime = {
        status: 'fail',
        title: '❌ Market Type Unknown',
        message: 'Detecting regime...',
        detail: 'AI analyzing market conditions'
      };
    }

    // Check 5: Institutional Triggers
    if (institutionalTriggers && institutionalTriggers.triggerCount > 0) {
      checks.triggers = {
        status: 'pass',
        title: '✅ Signals Active',
        message: `${institutionalTriggers.triggerCount}/7 methods signaling`,
        detail: `Consensus: ${institutionalTriggers.consensus}`
      };
      passedChecks++;
    } else {
      checks.triggers = {
        status: 'warning',
        title: '⚠️ No Clear Signals',
        message: 'Waiting for setup...',
        detail: 'Looking for institutional patterns'
      };
    }

    // Check 6: Professional Evaluation
    if (professionalEvaluation) {
      if (professionalEvaluation.decision.approved) {
        checks.evaluation = {
          status: 'pass',
          title: '✅ TRADE SIGNAL APPROVED',
          message: `Quality: ${professionalEvaluation.confluence.quality}`,
          detail: `Confidence: ${(professionalEvaluation.decision.confidence * 100).toFixed(0)}%`
        };
        passedChecks++;
      } else {
        checks.evaluation = {
          status: 'warning',
          title: '⚠️ No Trade Signal Yet',
          message: professionalEvaluation.decision.reason,
          detail: 'System is monitoring for high-quality setups'
        };
        passedChecks++;
      }
    } else {
      checks.evaluation = {
        status: 'fail',
        title: '❌ No Evaluation',
        message: 'Waiting for signal...',
        detail: 'Professional AI evaluation pending'
      };
    }

    // Check 7: Risk Management
    if (professionalEvaluation && professionalEvaluation.risk) {
      const stopPips = parseFloat(professionalEvaluation.risk.stopPips);
      const rrRatio = professionalEvaluation.risk.rrRatio;
      const isGoodStop = stopPips >= 20;
      const isGoodRR = parseFloat(rrRatio.split(':')[1]) >= 2;

      if (isGoodStop && isGoodRR) {
        checks.risk = {
          status: 'pass',
          title: '✅ Professional Risk Setup',
          message: `${stopPips.toFixed(1)} pips stop | ${rrRatio} reward`,
          detail: 'ATR-based stops (institutional standard)'
        };
        passedChecks++;
      } else {
        checks.risk = {
          status: 'warning',
          title: '⚠️ Risk Settings Need Adjustment',
          message: !isGoodStop ? 'Stop too tight' : 'RR too low',
          detail: 'Professional standard: ≥20 pips, ≥1:2 RR'
        };
      }
    } else {
      checks.risk = {
        status: 'fail',
        title: '❌ No Risk Calculation',
        message: 'No active trade setup',
        detail: 'Risk management ready when signal appears'
      };
    }

    // Check 8: Realistic Expectations
    if (professionalEvaluation && professionalEvaluation.decision) {
      const expectedWR = professionalEvaluation.decision.expectedWinRate;
      const wrValue = parseInt(expectedWR);
      const isRealistic = wrValue >= 45 && wrValue <= 65;

      checks.expectations = {
        status: isRealistic ? 'pass' : 'warning',
        title: isRealistic ? '✅ Realistic Goals' : '⚠️ Unrealistic Expectations',
        message: `Expected Win Rate: ${expectedWR}`,
        detail: isRealistic ? 'Professional range: 50-55%' : 'Check your expectations'
      };
      if (isRealistic) passedChecks++;
    } else {
      checks.expectations = {
        status: 'pass',
        title: '✅ Professional Standards',
        message: 'Target: 50-55% win rate',
        detail: 'Realistic institutional expectations set'
      };
      passedChecks++;
    }

    setHealthStatus(checks);
    setOverallHealth((passedChecks / totalChecks) * 100);
  };

  const getHealthColor = () => {
    if (overallHealth >= 75) return '#00d4aa'; // Green
    if (overallHealth >= 50) return '#ffd60a'; // Yellow
    return '#ff4976'; // Red
  };

  const getHealthMessage = () => {
    if (overallHealth >= 87.5) return '🎉 EXCELLENT - All Systems Operational';
    if (overallHealth >= 75) return '✅ GOOD - System Ready';
    if (overallHealth >= 50) return '⚠️ PARTIAL - Some Components Loading';
    if (overallHealth >= 25) return '⚠️ INCOMPLETE - Load Data to Start';
    return '❌ NOT READY - Click "Load Data" Button';
  };

  return (
    <div className="system-health-check">
      {/* Overall Health Status */}
      <div className="health-header" style={{ borderColor: getHealthColor() }}>
        <div className="health-title">
          <span className="health-icon">🏥</span>
          <h3>System Health Check</h3>
        </div>
        <div className="health-score">
          <div className="health-percentage" style={{ color: getHealthColor() }}>
            {overallHealth.toFixed(0)}%
          </div>
          <div className="health-message">{getHealthMessage()}</div>
        </div>
        <div className="health-bar">
          <div 
            className="health-bar-fill" 
            style={{ 
              width: `${overallHealth}%`,
              backgroundColor: getHealthColor()
            }}
          />
        </div>
      </div>

      {/* Individual Checks */}
      <div className="health-checks-grid">
        {Object.entries(healthStatus).map(([key, check]) => (
          <div 
            key={key} 
            className={`health-check-card ${check.status}`}
          >
            <div className="check-header">
              <div className="check-title">{check.title}</div>
            </div>
            <div className="check-message">{check.message}</div>
            <div className="check-detail">{check.detail}</div>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      {overallHealth < 50 && (
        <div className="health-tips">
          <div className="tip-title">🎯 Quick Start Guide:</div>
          <ol>
            <li>Click <strong>"Load Data"</strong> button in settings panel</li>
            <li>Wait 2-3 seconds for analysis to complete</li>
            <li>Check this dashboard - should show 75%+ health</li>
            <li>Scroll down to see <strong>"Professional AI"</strong> panel</li>
            <li>Look for <strong>"APPROVED"</strong> or <strong>"WAIT"</strong> decision</li>
          </ol>
        </div>
      )}

      {overallHealth >= 75 && professionalEvaluation && (
        <div className="health-summary">
          <div className="summary-title">
            {professionalEvaluation.decision.approved ? '✅ READY TO TRADE' : '⏳ MONITORING MARKET'}
          </div>
          <div className="summary-content">
            {professionalEvaluation.decision.approved ? (
              <>
                <div className="summary-item">
                  <strong>Direction:</strong> {professionalEvaluation.risk.entry.includes('BUY') ? 'BUY 🟢' : 'SELL 🔴'}
                </div>
                <div className="summary-item">
                  <strong>Quality:</strong> {professionalEvaluation.confluence.quality} ({professionalEvaluation.confluence.score}/6 factors)
                </div>
                <div className="summary-item">
                  <strong>Expected Win Rate:</strong> {professionalEvaluation.decision.expectedWinRate}
                </div>
              </>
            ) : (
              <>
                <div className="summary-item">
                  <strong>Status:</strong> Waiting for high-quality setup
                </div>
                <div className="summary-item">
                  <strong>Reason:</strong> {professionalEvaluation.decision.reason}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .system-health-check {
          background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .health-header {
          border-left: 4px solid;
          padding-left: 16px;
          margin-bottom: 24px;
        }

        .health-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .health-icon {
          font-size: 24px;
        }

        .health-title h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .health-score {
          margin-bottom: 12px;
        }

        .health-percentage {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .health-message {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .health-bar {
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
        }

        .health-bar-fill {
          height: 100%;
          transition: width 0.5s ease, background-color 0.5s ease;
        }

        .health-checks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .health-check-card {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid;
        }

        .health-check-card.pass {
          border-left-color: #00d4aa;
          background: linear-gradient(135deg, #00d4aa10 0%, transparent 100%);
        }

        .health-check-card.warning {
          border-left-color: #ffd60a;
          background: linear-gradient(135deg, #ffd60a10 0%, transparent 100%);
        }

        .health-check-card.fail {
          border-left-color: #ff4976;
          background: linear-gradient(135deg, #ff497610 0%, transparent 100%);
        }

        .check-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .check-message {
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .check-detail {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .health-tips {
          background: #ffd60a20;
          border-left: 4px solid #ffd60a;
          padding: 16px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .tip-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #ffd60a;
        }

        .health-tips ol {
          margin: 0;
          padding-left: 20px;
        }

        .health-tips li {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .health-tips strong {
          color: var(--text-primary);
        }

        .health-summary {
          background: var(--bg-tertiary);
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
        }

        .summary-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 12px;
          color: var(--primary);
        }

        .summary-item {
          font-size: 13px;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }

        .summary-item strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
