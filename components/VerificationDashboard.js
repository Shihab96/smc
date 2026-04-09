// components/VerificationDashboard.js
// User-Friendly Verification Dashboard
// Shows exactly what's working and what's not

'use client';

import { useState, useEffect } from 'react';

export default function VerificationDashboard({ 
  candles, 
  htfCandles,
  itfCandles,
  institutionalAnalysis, 
  marketRegime,
  institutionalTriggers,
  professionalEvaluation,
  mtfStructure 
}) {
  const [activeSection, setActiveSection] = useState('overview');

  // Calculate overall health
  const getSystemHealth = () => {
    const checks = [];

    // 1. Data Check
    checks.push({
      name: 'Data Loaded',
      status: candles && candles.length > 0,
      detail: candles ? `${candles.length} candles` : 'No data',
      critical: true
    });

    // 2. MTF Structure
    checks.push({
      name: 'MTF Structure',
      status: mtfStructure && htfCandles && itfCandles,
      detail: mtfStructure ? `${mtfStructure.ltf.timeframe} → ${mtfStructure.itf.timeframe} → ${mtfStructure.htf.timeframe}` : 'Not configured',
      critical: true
    });

    // 3. HTF Bias
    checks.push({
      name: 'HTF Institutional Bias',
      status: institutionalAnalysis && institutionalAnalysis.bias,
      detail: institutionalAnalysis ? `${institutionalAnalysis.bias} (${institutionalAnalysis.confidence}%)` : 'Not calculated',
      critical: true
    });

    // 4. Dealing Range
    checks.push({
      name: 'Premium/Discount Zones',
      status: institutionalAnalysis && institutionalAnalysis.dealingRange,
      detail: institutionalAnalysis?.dealingRange ? `Equilibrium: ${institutionalAnalysis.dealingRange.mid?.toFixed(2)}` : 'Not calculated',
      critical: false
    });

    // 5. Market Regime
    checks.push({
      name: 'Market Regime Detection',
      status: marketRegime && marketRegime.regime,
      detail: marketRegime ? `${marketRegime.regime} (${(marketRegime.confidence * 100).toFixed(0)}%)` : 'Not detected',
      critical: true
    });

    // 6. Institutional Triggers
    checks.push({
      name: 'Directional Triggers',
      status: institutionalTriggers && institutionalTriggers.triggerCount > 0,
      detail: institutionalTriggers ? `${institutionalTriggers.triggerCount}/7 active (${institutionalTriggers.consensus})` : 'Not evaluated',
      critical: false
    });

    // 7. Professional Evaluation
    checks.push({
      name: 'Professional AI Evaluation',
      status: professionalEvaluation !== null,
      detail: professionalEvaluation ? `Decision: ${professionalEvaluation.decision.approved ? 'APPROVED ✅' : 'WAIT ⚠️'}` : 'No signal to evaluate',
      critical: false
    });

    // 8. Risk Management
    checks.push({
      name: 'Risk Calculation',
      status: professionalEvaluation && professionalEvaluation.risk,
      detail: professionalEvaluation?.risk ? `Stop: ${professionalEvaluation.risk.stopPips} pips, RR: ${professionalEvaluation.risk.rrRatio}` : 'Not calculated',
      critical: false
    });

    const criticalPassed = checks.filter(c => c.critical && c.status).length;
    const criticalTotal = checks.filter(c => c.critical).length;
    const allPassed = checks.filter(c => c.status).length;
    const allTotal = checks.length;

    return {
      checks,
      criticalPassed,
      criticalTotal,
      allPassed,
      allTotal,
      healthy: criticalPassed === criticalTotal,
      score: Math.round((allPassed / allTotal) * 100)
    };
  };

  const health = getSystemHealth();

  return (
    <div className="verification-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>🔍 System Verification Dashboard</h2>
        <p>Check if everything is working correctly</p>
      </div>

      {/* Overall Health */}
      <div className={`health-status ${health.healthy ? 'healthy' : 'unhealthy'}`}>
        <div className="health-icon">
          {health.healthy ? '✅' : '⚠️'}
        </div>
        <div className="health-content">
          <div className="health-title">
            {health.healthy ? 'System Healthy' : 'Issues Detected'}
          </div>
          <div className="health-score">
            System Score: {health.score}% ({health.allPassed}/{health.allTotal} checks passed)
          </div>
          <div className="health-critical">
            Critical Systems: {health.criticalPassed}/{health.criticalTotal} operational
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="dashboard-nav">
        <button 
          className={activeSection === 'overview' ? 'active' : ''}
          onClick={() => setActiveSection('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeSection === 'details' ? 'active' : ''}
          onClick={() => setActiveSection('details')}
        >
          🔬 Details
        </button>
        <button 
          className={activeSection === 'guide' ? 'active' : ''}
          onClick={() => setActiveSection('guide')}
        >
          📖 How to Verify
        </button>
      </div>

      {/* Content */}
      {activeSection === 'overview' && (
        <div className="dashboard-content">
          <h3>System Components Status</h3>
          
          <div className="checks-grid">
            {health.checks.map((check, i) => (
              <div key={i} className={`check-item ${check.status ? 'passed' : 'failed'}`}>
                <div className="check-header">
                  <span className="check-icon">
                    {check.status ? '✅' : '❌'}
                  </span>
                  <span className="check-name">{check.name}</span>
                  {check.critical && (
                    <span className="check-badge">CRITICAL</span>
                  )}
                </div>
                <div className="check-detail">{check.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'details' && (
        <div className="dashboard-content">
          <h3>Detailed Component Information</h3>

          {/* Data Details */}
          <div className="detail-section">
            <h4>📊 Data & Structure</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">LTF Candles</div>
                <div className="detail-value">{candles?.length || 0}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">ITF Candles</div>
                <div className="detail-value">{itfCandles?.length || 0}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">HTF Candles</div>
                <div className="detail-value">{htfCandles?.length || 0}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">MTF Structure</div>
                <div className="detail-value">
                  {mtfStructure ? `${mtfStructure.htf.timeframe} → ${mtfStructure.itf.timeframe} → ${mtfStructure.ltf.timeframe}` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* HTF Analysis */}
          {institutionalAnalysis && (
            <div className="detail-section">
              <h4>📈 HTF Institutional Analysis</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Bias</div>
                  <div className="detail-value" style={{color: 
                    institutionalAnalysis.bias === 'BULLISH' ? '#00d4aa' : 
                    institutionalAnalysis.bias === 'BEARISH' ? '#ff4976' : '#ffd60a'
                  }}>
                    {institutionalAnalysis.bias}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Confidence</div>
                  <div className="detail-value">{institutionalAnalysis.confidence}%</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Market Phase</div>
                  <div className="detail-value">{institutionalAnalysis.marketPhase || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Equilibrium</div>
                  <div className="detail-value">
                    {institutionalAnalysis.dealingRange?.mid?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Regime */}
          {marketRegime && (
            <div className="detail-section">
              <h4>🎯 Market Regime</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Regime Type</div>
                  <div className="detail-value">{marketRegime.regime?.replace(/_/g, ' ')}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Confidence</div>
                  <div className="detail-value">{(marketRegime.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Best Strategies</div>
                  <div className="detail-value">
                    {marketRegime.bestStrategies?.length || 0} selected
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Stop Recommendation</div>
                  <div className="detail-value">
                    {marketRegime.stopLossRecommendation?.toFixed(1) || 'N/A'} pips
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Triggers */}
          {institutionalTriggers && (
            <div className="detail-section">
              <h4>⚡ Institutional Triggers</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Active Triggers</div>
                  <div className="detail-value">{institutionalTriggers.triggerCount}/7</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Consensus</div>
                  <div className="detail-value" style={{color: 
                    institutionalTriggers.consensus === 'BULLISH' ? '#00d4aa' : 
                    institutionalTriggers.consensus === 'BEARISH' ? '#ff4976' : '#ffd60a'
                  }}>
                    {institutionalTriggers.consensus}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Stacked Confidence</div>
                  <div className="detail-value">{institutionalTriggers.stackedConfidence}%</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Bullish vs Bearish</div>
                  <div className="detail-value">
                    {institutionalTriggers.bullishCount} vs {institutionalTriggers.bearishCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Professional Evaluation */}
          {professionalEvaluation && (
            <div className="detail-section">
              <h4>✅ Professional Evaluation</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Decision</div>
                  <div className="detail-value" style={{color: 
                    professionalEvaluation.decision.approved ? '#00d4aa' : '#ffd60a'
                  }}>
                    {professionalEvaluation.decision.approved ? 'APPROVED ✅' : 'WAIT ⚠️'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Confluence Score</div>
                  <div className="detail-value">
                    {professionalEvaluation.confluence.score}/6 ({professionalEvaluation.confluence.quality})
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Selected Strategies</div>
                  <div className="detail-value">{professionalEvaluation.strategies.count}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Expected Win Rate</div>
                  <div className="detail-value">{professionalEvaluation.decision.expectedWinRate}</div>
                </div>
              </div>

              {professionalEvaluation.risk && (
                <>
                  <h5 style={{marginTop: '1rem', marginBottom: '0.5rem'}}>Risk Management</h5>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">Entry</div>
                      <div className="detail-value">{professionalEvaluation.risk.entry}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Stop Loss</div>
                      <div className="detail-value">
                        {professionalEvaluation.risk.stop} ({professionalEvaluation.risk.stopPips} pips)
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Take Profit</div>
                      <div className="detail-value">
                        {professionalEvaluation.risk.target} ({professionalEvaluation.risk.targetPips} pips)
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Risk:Reward</div>
                      <div className="detail-value">{professionalEvaluation.risk.rrRatio}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'guide' && (
        <div className="dashboard-content">
          <h3>📖 How to Verify Everything is Working</h3>

          <div className="guide-section">
            <h4>Step 1: Check Console Output</h4>
            <p>Open browser console (Press F12) and look for:</p>
            <div className="guide-code">
{`🎯 MTF STRUCTURE SETUP
✅ Fetched X candles
📊 Market Regime: [TYPE] ([X]% confidence)
🎯 Institutional Triggers: X/7
✅ Professional Evaluation Complete`}
            </div>
            <div className="guide-indicator">
              ✅ If you see these logs = System is working
            </div>
          </div>

          <div className="guide-section">
            <h4>Step 2: Check Visual Panels</h4>
            <ul className="guide-list">
              <li>
                <strong>MTF Structure Panel:</strong> Should show HTF → ITF → LTF with timeframes
              </li>
              <li>
                <strong>HTF Analysis Panel:</strong> Should show bias (BULLISH/BEARISH/NEUTRAL)
              </li>
              <li>
                <strong>Professional AI Panel:</strong> Should appear when signal detected
              </li>
              <li>
                <strong>Triggers Panel:</strong> Should show active triggers (X/7)
              </li>
            </ul>
          </div>

          <div className="guide-section">
            <h4>Step 3: Check Chart Overlays</h4>
            <ul className="guide-list">
              <li>Premium zone (RED shading) above equilibrium</li>
              <li>Discount zone (GREEN shading) below equilibrium</li>
              <li>Equilibrium line (YELLOW dashed) in middle</li>
              <li>Signal markers (blue/red arrows) on candles</li>
            </ul>
          </div>

          <div className="guide-section">
            <h4>Step 4: Verify Critical Components</h4>
            <div className="verification-checklist">
              <div className="checklist-item">
                <input type="checkbox" id="check1" disabled checked={health.checks[0]?.status} />
                <label htmlFor="check1">Data loaded (candles visible on chart)</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" id="check2" disabled checked={health.checks[1]?.status} />
                <label htmlFor="check2">MTF structure configured</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" id="check3" disabled checked={health.checks[2]?.status} />
                <label htmlFor="check3">HTF bias calculated</label>
              </div>
              <div className="checklist-item">
                <input type="checkbox" id="check4" disabled checked={health.checks[4]?.status} />
                <label htmlFor="check4">Market regime detected</label>
              </div>
            </div>
          </div>

          <div className="guide-section">
            <h4>Common Issues & Solutions</h4>
            <div className="troubleshooting">
              <div className="issue-item">
                <div className="issue-title">❌ No data loaded</div>
                <div className="issue-solution">
                  → Click "Load Data" button in settings panel
                </div>
              </div>
              <div className="issue-item">
                <div className="issue-title">❌ Professional AI panel not showing</div>
                <div className="issue-solution">
                  → This is normal if no high-quality signals detected yet
                  <br />→ Wait for market conditions to improve
                  <br />→ Or disable "Professional Filter" to see all signals
                </div>
              </div>
              <div className="issue-item">
                <div className="issue-title">❌ Console shows errors</div>
                <div className="issue-solution">
                  → Check if Finage API key is configured (for real data)
                  <br />→ Use "Sample" data source for testing
                </div>
              </div>
            </div>
          </div>

          <div className="guide-section">
            <h4>What "Working Correctly" Looks Like</h4>
            <div className="expected-output">
              <div className="output-item">
                <span className="output-icon">✅</span>
                <span>MTF structure shows 3 layers with timeframes</span>
              </div>
              <div className="output-item">
                <span className="output-icon">✅</span>
                <span>HTF bias shows percentage (e.g., "BULLISH 78%")</span>
              </div>
              <div className="output-item">
                <span className="output-icon">✅</span>
                <span>Chart has colored zones (red premium, green discount)</span>
              </div>
              <div className="output-item">
                <span className="output-icon">✅</span>
                <span>Console logs show all analysis steps</span>
              </div>
              <div className="output-item">
                <span className="output-icon">✅</span>
                <span>Professional AI panel appears (when signal detected)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .verification-dashboard {
          background: var(--bg-secondary);
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .dashboard-header h2 {
          font-size: 20px;
          margin: 0 0 8px 0;
          color: var(--primary);
        }

        .dashboard-header p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }

        .health-status {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .health-status.healthy {
          background: #00d4aa20;
          border: 2px solid #00d4aa;
        }

        .health-status.unhealthy {
          background: #ffd60a20;
          border: 2px solid #ffd60a;
        }

        .health-icon {
          font-size: 48px;
        }

        .health-content {
          flex: 1;
        }

        .health-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .health-score {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .health-critical {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .dashboard-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid var(--border);
        }

        .dashboard-nav button {
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .dashboard-nav button:hover {
          color: var(--text-primary);
        }

        .dashboard-nav button.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .dashboard-content {
          padding: 16px 0;
        }

        .dashboard-content h3 {
          font-size: 16px;
          margin: 0 0 20px 0;
          color: var(--text-primary);
        }

        .dashboard-content h4 {
          font-size: 14px;
          margin: 0 0 12px 0;
          color: var(--text-primary);
          font-weight: 600;
        }

        .dashboard-content h5 {
          font-size: 13px;
          margin: 0;
          color: var(--text-secondary);
        }

        .checks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 12px;
        }

        .check-item {
          padding: 16px;
          border-radius: 8px;
          border: 2px solid;
        }

        .check-item.passed {
          background: #00d4aa10;
          border-color: #00d4aa;
        }

        .check-item.failed {
          background: #ff497620;
          border-color: #ff4976;
        }

        .check-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .check-icon {
          font-size: 18px;
        }

        .check-name {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .check-badge {
          padding: 2px 8px;
          background: #ff497640;
          color: #ff4976;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .check-detail {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .detail-section {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-item {
          padding: 12px;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .detail-label {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .guide-section {
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .guide-section p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 8px 0;
        }

        .guide-code {
          background: var(--bg-primary);
          padding: 12px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #00d4aa;
          margin: 12px 0;
          white-space: pre;
          overflow-x: auto;
        }

        .guide-indicator {
          padding: 8px 12px;
          background: #00d4aa20;
          border-left: 4px solid #00d4aa;
          border-radius: 4px;
          font-size: 13px;
          color: var(--text-primary);
          margin-top: 8px;
        }

        .guide-list {
          list-style: none;
          padding: 0;
          margin: 12px 0;
        }

        .guide-list li {
          padding: 8px 0 8px 24px;
          position: relative;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .guide-list li:before {
          content: '▸';
          position: absolute;
          left: 8px;
          color: var(--primary);
        }

        .guide-list li strong {
          color: var(--text-primary);
        }

        .verification-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 12px 0;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .checklist-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .checklist-item label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .troubleshooting {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 12px 0;
        }

        .issue-item {
          padding: 12px;
          background: var(--bg-primary);
          border-radius: 6px;
          border-left: 4px solid #ffd60a;
        }

        .issue-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .issue-solution {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .expected-output {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 12px 0;
        }

        .output-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .output-icon {
          font-size: 18px;
        }

        .output-item span:last-child {
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
