// components/ProfessionalRegimeDisplay.js
// Professional Market Regime & Strategy Display
// Shows adaptive AI system in action

'use client';

export default function ProfessionalRegimeDisplay({ evaluation }) {
  if (!evaluation) return null;

  const { regime, strategies, confluence, risk, decision, validation } = evaluation;

  // Color coding
  const regimeColor = {
    'STRONG_TREND_BULLISH': '#00d4aa',
    'STRONG_TREND_BEARISH': '#ff4976',
    'RANGING': '#ffd60a',
    'HIGH_VOLATILITY': '#ff9500',
    'REVERSAL_CHOCH': '#bc8cff',
    'WEAK_TREND': '#8b949e',
  }[regime.detected] || '#8b949e';

  const confluenceColor = confluence.strong ? '#00d4aa' : 
                         confluence.score >= 2 ? '#ffd60a' : '#ff4976';

  return (
    <div className="professional-regime-display">
      {/* Header */}
      <div className="regime-header">
        <h3>🎯 Professional Adaptive AI System</h3>
        <div className="regime-subtitle">
          Regime Detection → Strategy Selection → Risk Management
        </div>
      </div>

      {/* Market Regime */}
      <div className="regime-section">
        <h4>📊 Market Regime Analysis</h4>
        <div className="regime-card" style={{borderLeft: `4px solid ${regimeColor}`}}>
          <div className="regime-main">
            <span className="regime-name" style={{color: regimeColor}}>
              {regime.detected.replace(/_/g, ' ')}
            </span>
            <span className="regime-confidence">
              {(regime.confidence * 100).toFixed(0)}% Confidence
            </span>
          </div>
          <div className="regime-description">
            {regime.description}
          </div>
          {regime.characteristics && (
            <div className="regime-characteristics">
              {Object.entries(regime.characteristics).map(([key, value]) => (
                <div key={key} className="characteristic">
                  <span className="char-label">{key}:</span>
                  <span className="char-value">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Strategies */}
      <div className="strategies-section">
        <h4>🎲 Selected Strategies (2-3 Core)</h4>
        <div className="strategies-info">
          <div className="info-badge professional">
            Professional Focus: {strategies.count} strategies (not 45!)
          </div>
        </div>
        <div className="strategies-list">
          {strategies.selected.map((strategy, i) => (
            <div key={i} className="strategy-chip">
              {strategy}
            </div>
          ))}
        </div>
      </div>

      {/* Confluence Analysis */}
      <div className="confluence-section">
        <h4>✅ Confluence Analysis</h4>
        <div className="confluence-score" style={{borderColor: confluenceColor}}>
          <div className="score-main">
            <span className="score-number" style={{color: confluenceColor}}>
              {confluence.score}/6
            </span>
            <span className="score-quality" style={{color: confluenceColor}}>
              {confluence.quality}
            </span>
          </div>
          <div className="score-status">
            {confluence.strong ? '✅ Strong Confluence' : '⚠️ Weak Confluence'}
          </div>
        </div>
        <div className="confluence-factors">
          {confluence.factors.map((factor, i) => (
            <div key={i} className="factor-item">
              <span className="factor-status">{factor.status}</span>
              <span className="factor-name">{factor.factor}</span>
              <span className="factor-value">{factor.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Professional Risk Management */}
      <div className="risk-section">
        <h4>🎯 Professional Risk Management</h4>
        <div className="risk-grid">
          <div className="risk-item">
            <div className="risk-label">Entry</div>
            <div className="risk-value">{risk.entry}</div>
          </div>
          <div className="risk-item">
            <div className="risk-label">Stop Loss</div>
            <div className="risk-value">{risk.stop}</div>
            <div className="risk-detail">{risk.stopPips} pips (ATR-based)</div>
          </div>
          <div className="risk-item">
            <div className="risk-label">Take Profit</div>
            <div className="risk-value">{risk.target}</div>
            <div className="risk-detail">{risk.targetPips} pips</div>
          </div>
          <div className="risk-item">
            <div className="risk-label">Risk:Reward</div>
            <div className="risk-value highlight">{risk.rrRatio}</div>
          </div>
          <div className="risk-item">
            <div className="risk-label">Position Size</div>
            <div className="risk-value">{risk.positionSize}</div>
          </div>
          <div className="risk-item">
            <div className="risk-label">Expected Return</div>
            <div className="risk-value positive">{risk.expectedReturn}</div>
          </div>
        </div>
      </div>

      {/* Realistic Expectations */}
      <div className="expectations-section">
        <h4>📈 Realistic Professional Expectations</h4>
        <div className="expectations-grid">
          <div className="expectation">
            <div className="exp-label">Expected Win Rate</div>
            <div className="exp-value">{decision.expectedWinRate}</div>
            <div className="exp-note">Not 80-90%</div>
          </div>
          <div className="expectation">
            <div className="exp-label">Profit Factor</div>
            <div className="exp-value">{risk.profitFactor}</div>
            <div className="exp-note">Target: 1.5-2.0</div>
          </div>
          <div className="expectation">
            <div className="exp-label">Max Drawdown</div>
            <div className="exp-value">15-20%</div>
            <div className="exp-note">Unavoidable</div>
          </div>
        </div>
        <div className="expectation-note">
          ℹ️ Professional trading: 50-55% win rate at 1:2.5 RR = Institutional performance
        </div>
      </div>

      {/* Validation */}
      {validation.issues && validation.issues.length > 0 && (
        <div className="validation-section">
          <h4>⚠️ Professional Standards Check</h4>
          {validation.issues.map((issue, i) => (
            <div key={i} className={`validation-issue ${issue.severity.toLowerCase()}`}>
              <div className="issue-header">
                <span className="issue-severity">{issue.severity}</span>
                <span className="issue-text">{issue.issue}</span>
              </div>
              <div className="issue-recommendation">
                💡 {issue.recommendation}
              </div>
              <div className="issue-reference">
                📄 Reference: {issue.reference}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final Decision */}
      <div className={`decision-section ${decision.approved ? 'approved' : 'rejected'}`}>
        <div className="decision-main">
          <div className="decision-icon">
            {decision.approved ? '✅' : '⚠️'}
          </div>
          <div className="decision-content">
            <div className="decision-status">
              {decision.approved ? 'TRADE APPROVED' : 'WAIT FOR BETTER SETUP'}
            </div>
            <div className="decision-reason">
              {decision.reason}
            </div>
            {decision.approved && (
              <div className="decision-confidence">
                Confidence: {(decision.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>
        <div className="decision-note">
          {decision.note}
        </div>
      </div>

      <style jsx>{`
        .professional-regime-display {
          background: var(--bg-secondary);
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .regime-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .regime-header h3 {
          font-size: 20px;
          margin: 0 0 8px 0;
          color: var(--primary);
        }

        .regime-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .regime-section,
        .strategies-section,
        .confluence-section,
        .risk-section,
        .expectations-section,
        .validation-section {
          margin-bottom: 24px;
        }

        h4 {
          font-size: 14px;
          margin: 0 0 12px 0;
          color: var(--text-primary);
          font-weight: 600;
        }

        .regime-card {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          border-left-width: 4px;
        }

        .regime-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .regime-name {
          font-size: 16px;
          font-weight: bold;
        }

        .regime-confidence {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .regime-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .regime-characteristics {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .characteristic {
          font-size: 12px;
        }

        .char-label {
          color: var(--text-secondary);
          margin-right: 4px;
        }

        .char-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .strategies-info {
          margin-bottom: 12px;
        }

        .info-badge {
          display: inline-block;
          padding: 6px 12px;
          background: #00d4aa20;
          color: #00d4aa;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .strategies-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .strategy-chip {
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-primary);
        }

        .confluence-score {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          border: 2px solid;
          margin-bottom: 12px;
        }

        .score-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .score-number {
          font-size: 24px;
          font-weight: bold;
        }

        .score-quality {
          font-size: 14px;
          font-weight: 600;
        }

        .score-status {
          font-size: 13px;
        }

        .confluence-factors {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .factor-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          padding: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
        }

        .factor-status {
          font-size: 16px;
        }

        .factor-name {
          flex: 1;
          font-weight: 600;
        }

        .factor-value {
          color: var(--text-secondary);
        }

        .risk-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .risk-item {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
        }

        .risk-label {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .risk-value {
          font-size: 15px;
          font-weight: bold;
          color: var(--text-primary);
        }

        .risk-value.highlight {
          color: var(--primary);
        }

        .risk-value.positive {
          color: #00d4aa;
        }

        .risk-detail {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .expectations-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .expectation {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
          text-align: center;
        }

        .exp-label {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .exp-value {
          font-size: 18px;
          font-weight: bold;
          color: var(--primary);
          margin-bottom: 4px;
        }

        .exp-note {
          font-size: 10px;
          color: var(--text-secondary);
        }

        .expectation-note {
          padding: 12px;
          background: #ffd60a20;
          border-left: 4px solid #ffd60a;
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .validation-issue {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          border-left: 4px solid;
        }

        .validation-issue.critical {
          background: #ff497620;
          border-left-color: #ff4976;
        }

        .validation-issue.warning {
          background: #ffd60a20;
          border-left-color: #ffd60a;
        }

        .issue-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .issue-severity {
          font-size: 11px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.2);
        }

        .issue-text {
          font-size: 13px;
          font-weight: 600;
        }

        .issue-recommendation,
        .issue-reference {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .decision-section {
          padding: 20px;
          border-radius: 8px;
          border: 2px solid;
        }

        .decision-section.approved {
          background: #00d4aa10;
          border-color: #00d4aa;
        }

        .decision-section.rejected {
          background: #ffd60a10;
          border-color: #ffd60a;
        }

        .decision-main {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .decision-icon {
          font-size: 32px;
        }

        .decision-status {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .decision-reason {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .decision-confidence {
          font-size: 13px;
          font-weight: 600;
          margin-top: 4px;
        }

        .decision-note {
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
