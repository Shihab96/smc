// components/SessionWarningBanner.js
// Prominent display of session warnings and trading recommendations

'use client';

export default function SessionWarningBanner({ 
  sessionInfo, 
  professionalEvaluation,
  isVisible = true 
}) {
  if (!isVisible || !sessionInfo) return null;

  const hasWarnings = sessionInfo.warnings && sessionInfo.warnings.length > 0;
  const hasSessionWarning = professionalEvaluation?.sessionWarning;
  const isSessionBlocked = professionalEvaluation?.sessionBlocked;
  const sessionAdvice = professionalEvaluation?.sessionAdvice || [];

  // Determine severity
  let severity = 'normal';
  if (isSessionBlocked) severity = 'blocked';
  else if (sessionInfo.session === 'ASIAN') severity = 'warning';
  else if (sessionInfo.priority === 'LOW') severity = 'warning';
  else if (sessionInfo.isKillZone) severity = 'excellent';
  else if (sessionInfo.priority === 'HIGHEST') severity = 'excellent';

  return (
    <div className={`session-warning-banner ${severity}`}>
      {/* Kill Zone Announcement */}
      {sessionInfo.isKillZone && !isSessionBlocked && (
        <div className="kill-zone-announcement">
          <div className="kz-icon">🎯</div>
          <div className="kz-content">
            <h3>{sessionInfo.killZoneLabel}</h3>
            <p>Prime trading hours - Highest probability setups active!</p>
          </div>
        </div>
      )}

      {/* Session Blocked Warning */}
      {isSessionBlocked && (
        <div className="blocked-warning">
          <div className="blocked-icon">⛔</div>
          <div className="blocked-content">
            <h3>Trading Signal Blocked by Session Rules</h3>
            <p>{professionalEvaluation.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Asian Session Warning */}
      {sessionInfo.session === 'ASIAN' && !isSessionBlocked && (
        <div className="asian-warning">
          <div className="warning-icon">🌏</div>
          <div className="warning-content">
            <h3>Asian Session Active - Low Volume Period</h3>
            <p>⚠️ Recommendation: Consider not trading. If trading: Range only, 4+/6 confluence, 50% size</p>
          </div>
        </div>
      )}

      {/* Session Warning from Evaluation */}
      {hasSessionWarning && !isSessionBlocked && sessionInfo.session !== 'ASIAN' && (
        <div className="session-caution">
          <div className="caution-icon">⚠️</div>
          <div className="caution-content">
            <p>{hasSessionWarning}</p>
          </div>
        </div>
      )}

      {/* Session Parameters Display */}
      <div className="session-params-quick">
        <div className="param-item">
          <span className="param-label">Session:</span>
          <span className="param-value">
            {sessionInfo.icon} {sessionInfo.name}
          </span>
        </div>
        <div className="param-item">
          <span className="param-label">Required Confluence:</span>
          <span className="param-value">
            {sessionInfo.optimal?.confluenceThreshold}/6 minimum
          </span>
        </div>
        <div className="param-item">
          <span className="param-label">Stop Size:</span>
          <span className="param-value">
            {sessionInfo.optimal?.atrMultiplier}x ATR
          </span>
        </div>
        <div className="param-item">
          <span className="param-label">Expected Win Rate:</span>
          <span className="param-value">
            {sessionInfo.optimal?.winRateExpectation}
          </span>
        </div>
      </div>

      {/* Session Advice */}
      {sessionAdvice.length > 0 && (
        <details className="session-advice-dropdown">
          <summary>💡 Session Trading Advice ({sessionAdvice.length})</summary>
          <ul className="advice-list">
            {sessionAdvice.map((advice, index) => (
              <li key={index}>{advice}</li>
            ))}
          </ul>
        </details>
      )}

      <style jsx>{`
        .session-warning-banner {
          margin: 20px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* Kill Zone Styling */
        .kill-zone-announcement {
          background: linear-gradient(135deg, #bc8cff 0%, #8b5cf6 100%);
          color: #fff;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(188, 140, 255, 0.5); }
          50% { box-shadow: 0 0 40px rgba(188, 140, 255, 0.8); }
        }

        .kz-icon {
          font-size: 48px;
          line-height: 1;
        }

        .kz-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .kz-content p {
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
        }

        /* Blocked Warning */
        .blocked-warning {
          background: linear-gradient(135deg, #ff4976 0%, #e63950 100%);
          color: #fff;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .blocked-icon {
          font-size: 48px;
          line-height: 1;
        }

        .blocked-content h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 700;
        }

        .blocked-content p {
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
        }

        /* Asian Session Warning */
        .asian-warning {
          background: linear-gradient(135deg, #2a1520 0%, #1a1520 100%);
          border: 2px solid #ff4976;
          color: #fff;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .warning-icon {
          font-size: 48px;
          line-height: 1;
        }

        .warning-content h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 700;
          color: #ff4976;
        }

        .warning-content p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        /* Session Caution */
        .session-caution {
          background: rgba(255, 149, 0, 0.1);
          border: 1px solid #ff9500;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .caution-icon {
          font-size: 24px;
          line-height: 1;
        }

        .caution-content p {
          margin: 0;
          font-size: 13px;
          color: var(--text-primary);
        }

        /* Session Parameters Quick View */
        .session-params-quick {
          background: var(--bg-secondary);
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .param-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .param-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .param-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: monospace;
        }

        /* Session Advice Dropdown */
        .session-advice-dropdown {
          background: var(--bg-tertiary);
          padding: 12px 16px;
          cursor: pointer;
        }

        .session-advice-dropdown summary {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          list-style: none;
          user-select: none;
        }

        .session-advice-dropdown summary::-webkit-details-marker {
          display: none;
        }

        .session-advice-dropdown summary:hover {
          color: var(--primary);
        }

        .advice-list {
          margin: 12px 0 0 0;
          padding-left: 20px;
          list-style: none;
        }

        .advice-list li {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
        }

        .advice-list li:before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--primary);
        }

        /* Severity Colors */
        .session-warning-banner.excellent {
          border: 2px solid #00d4aa;
        }

        .session-warning-banner.warning {
          border: 2px solid #ff4976;
        }

        .session-warning-banner.blocked {
          border: 2px solid #ff4976;
        }

        @media (max-width: 768px) {
          .session-params-quick {
            grid-template-columns: 1fr;
          }

          .kill-zone-announcement,
          .blocked-warning,
          .asian-warning {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
