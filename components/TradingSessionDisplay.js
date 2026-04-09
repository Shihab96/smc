// components/TradingSessionDisplay.js
// Visual display of current trading session with warnings and recommendations

'use client';
import { useState, useEffect } from 'react';
import { 
  detectCurrentSession, 
  shouldTrade, 
  getSessionTimeRemaining,
  getSessionAdjustedParams,
  SESSIONS
} from '../utils/tradingSessions';

export default function TradingSessionDisplay({ onSessionChange }) {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [tradeabilityInfo, setTradeabilityInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update every minute
  useEffect(() => {
    updateSession();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateSession();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const updateSession = () => {
    const now = new Date();
    const session = detectCurrentSession(now);
    const tradeability = shouldTrade(now);
    const remaining = getSessionTimeRemaining(session);
    
    setSessionInfo(session);
    setTradeabilityInfo(tradeability);
    setTimeRemaining(remaining);

    // Notify parent component of session change
    if (onSessionChange) {
      const params = getSessionAdjustedParams(session);
      onSessionChange(session, params);
    }
  };

  if (!sessionInfo) {
    return <div className="session-loading">Detecting session...</div>;
  }

  const isGoodSession = tradeabilityInfo?.severity === 'EXCELLENT' || tradeabilityInfo?.severity === 'GOOD';
  const isBadSession = tradeabilityInfo?.severity === 'WARNING' || sessionInfo.session === SESSIONS.ASIAN;

  return (
    <div className="session-display-container">
      {/* Main Session Card */}
      <div 
        className={`session-card ${sessionInfo.session.toLowerCase()} ${isBadSession ? 'warning' : ''}`}
        style={{
          borderLeftColor: sessionInfo.color
        }}
      >
        <div className="session-header">
          <div className="session-icon-name">
            <span className="session-icon">{sessionInfo.icon}</span>
            <div className="session-name-time">
              <h3>{sessionInfo.name}</h3>
              <p className="session-time-range">{sessionInfo.timeRange}</p>
            </div>
          </div>
          <div className="session-status">
            {sessionInfo.isKillZone && (
              <span className="kill-zone-badge">
                {sessionInfo.killZoneLabel}
              </span>
            )}
            <span className="time-remaining">{timeRemaining}</span>
          </div>
        </div>

        {/* Tradeability Status */}
        <div className={`tradeability-status ${tradeabilityInfo.severity.toLowerCase()}`}>
          <div className="status-indicator">
            {tradeabilityInfo.severity === 'EXCELLENT' && '✅'}
            {tradeabilityInfo.severity === 'GOOD' && '👍'}
            {tradeabilityInfo.severity === 'NORMAL' && 'ℹ️'}
            {tradeabilityInfo.severity === 'CAUTION' && '⚠️'}
            {tradeabilityInfo.severity === 'WARNING' && '🚨'}
            {tradeabilityInfo.severity === 'INFO' && '🔒'}
          </div>
          <div className="status-content">
            <strong>{tradeabilityInfo.shouldTrade ? 'Trading Active' : 'Trading Not Recommended'}</strong>
            <p>{tradeabilityInfo.reason}</p>
            {tradeabilityInfo.alternativeAction && (
              <p className="alternative-action">💡 {tradeabilityInfo.alternativeAction}</p>
            )}
          </div>
        </div>

        {/* Session Characteristics */}
        {sessionInfo.characteristics && sessionInfo.characteristics.length > 0 && (
          <div className="session-characteristics">
            <h4>📊 Session Characteristics</h4>
            <ul>
              {sessionInfo.characteristics.map((char, index) => (
                <li key={index}>{char}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Trading Parameters */}
        {sessionInfo.optimal && (
          <div className="trading-parameters">
            <h4>⚙️ Recommended Settings</h4>
            <div className="params-grid">
              <div className="param">
                <span className="param-label">Confluence:</span>
                <span className="param-value">{sessionInfo.optimal.confluenceThreshold}/6 minimum</span>
              </div>
              <div className="param">
                <span className="param-label">Stop Size:</span>
                <span className="param-value">{sessionInfo.optimal.atrMultiplier}x ATR</span>
              </div>
              <div className="param">
                <span className="param-label">Risk:Reward:</span>
                <span className="param-value">Minimum 1:{sessionInfo.optimal.riskRewardMin}</span>
              </div>
              <div className="param">
                <span className="param-label">Max Positions:</span>
                <span className="param-value">{sessionInfo.optimal.maxPositions}</span>
              </div>
              <div className="param">
                <span className="param-label">Expected Win Rate:</span>
                <span className="param-value">{sessionInfo.optimal.winRateExpectation}</span>
              </div>
            </div>
          </div>
        )}

        {/* Optimal Strategies */}
        {sessionInfo.optimal?.strategies && (
          <div className="optimal-strategies">
            <h4>🎯 Optimal Strategies</h4>
            <div className="strategy-tags">
              {sessionInfo.optimal.strategies.map((strategy, index) => (
                <span key={index} className="strategy-tag">
                  {strategy}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {sessionInfo.warnings && sessionInfo.warnings.length > 0 && (
          <div className="session-warnings">
            <h4>⚠️ Warnings</h4>
            <ul>
              {sessionInfo.warnings.map((warning, index) => (
                <li key={index} className="warning-item">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {sessionInfo.recommendations && sessionInfo.recommendations.length > 0 && (
          <div className="session-recommendations">
            <h4>💡 Recommendations</h4>
            <ul>
              {sessionInfo.recommendations.map((rec, index) => (
                <li key={index} className="rec-item">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Trading Recommendation */}
        <div className={`final-recommendation ${sessionInfo.priority.toLowerCase()}`}>
          <strong>Trading Recommendation:</strong> {sessionInfo.tradingRecommendation}
        </div>
      </div>

      <style jsx>{`
        .session-display-container {
          margin: 20px 0;
        }

        .session-card {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border-radius: 12px;
          border-left: 4px solid;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .session-card.warning {
          background: linear-gradient(135deg, #2a1520 0%, #1a1520 100%);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .session-icon-name {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .session-icon {
          font-size: 32px;
          line-height: 1;
        }

        .session-name-time h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .session-time-range {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          font-family: monospace;
        }

        .session-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .kill-zone-badge {
          background: linear-gradient(135deg, #bc8cff 0%, #8b5cf6 100%);
          color: #fff;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .time-remaining {
          font-size: 12px;
          color: var(--text-secondary);
          font-family: monospace;
        }

        .tradeability-status {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .tradeability-status.excellent {
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid #00d4aa;
        }

        .tradeability-status.good {
          background: rgba(255, 214, 10, 0.1);
          border: 1px solid #ffd60a;
        }

        .tradeability-status.warning {
          background: rgba(255, 73, 118, 0.1);
          border: 1px solid #ff4976;
        }

        .tradeability-status.caution {
          background: rgba(255, 149, 0, 0.1);
          border: 1px solid #ff9500;
        }

        .status-indicator {
          font-size: 24px;
          line-height: 1;
        }

        .status-content {
          flex: 1;
        }

        .status-content strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .status-content p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .alternative-action {
          margin-top: 8px !important;
          font-style: italic;
          color: var(--primary) !important;
        }

        .session-characteristics,
        .trading-parameters,
        .optimal-strategies,
        .session-warnings,
        .session-recommendations {
          margin-bottom: 16px;
        }

        .session-characteristics h4,
        .trading-parameters h4,
        .optimal-strategies h4,
        .session-warnings h4,
        .session-recommendations h4 {
          font-size: 14px;
          margin: 0 0 12px 0;
          color: var(--text-primary);
        }

        .session-characteristics ul,
        .session-warnings ul,
        .session-recommendations ul {
          margin: 0;
          padding-left: 20px;
          list-style: none;
        }

        .session-characteristics li,
        .rec-item {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          position: relative;
          padding-left: 16px;
        }

        .session-characteristics li:before,
        .rec-item:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #00d4aa;
          font-weight: bold;
        }

        .warning-item {
          font-size: 13px;
          color: #ff4976;
          margin-bottom: 6px;
          position: relative;
          padding-left: 16px;
        }

        .warning-item:before {
          content: '⚠️';
          position: absolute;
          left: 0;
        }

        .params-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .param {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .param-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .param-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: monospace;
        }

        .strategy-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .strategy-tag {
          background: var(--primary);
          color: #fff;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }

        .final-recommendation {
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
          margin-top: 16px;
        }

        .final-recommendation.highest {
          background: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
          color: #fff;
        }

        .final-recommendation.high {
          background: linear-gradient(135deg, #ffd60a 0%, #ffb900 100%);
          color: #000;
        }

        .final-recommendation.low {
          background: linear-gradient(135deg, #ff4976 0%, #e63950 100%);
          color: #fff;
        }

        .final-recommendation.none {
          background: var(--bg-primary);
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .session-header {
            flex-direction: column;
            gap: 12px;
          }

          .session-status {
            align-items: flex-start;
          }

          .params-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
