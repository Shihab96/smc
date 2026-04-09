// components/RealtimeSignalAlerts.js
// Shows signals forming in real-time during playback
// Visual confirmation that analysis is working

'use client';
import { useState, useEffect } from 'react';

export default function RealtimeSignalAlerts({ triggerAlerts, activeConditions, confluence }) {
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);

  // When new alerts appear, add them to visible list
  useEffect(() => {
    if (triggerAlerts && triggerAlerts.length > 0) {
      triggerAlerts.forEach(alert => {
        // Add to visible alerts with timestamp
        const alertWithId = {
          ...alert,
          id: `${alert.type}-${alert.index}-${Date.now()}`,
          appearedAt: Date.now()
        };
        
        setVisibleAlerts(prev => [...prev, alertWithId]);
        setAlertHistory(prev => [alertWithId, ...prev].slice(0, 20)); // Keep last 20

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setVisibleAlerts(prev => prev.filter(a => a.id !== alertWithId.id));
        }, 5000);
      });
    }
  }, [triggerAlerts]);

  return (
    <div className="realtime-alerts">
      {/* Active Alert Popups */}
      {visibleAlerts.length > 0 && (
        <div className="alert-popup-container">
          {visibleAlerts.map((alert, index) => (
            <div 
              key={alert.id} 
              className={`alert-popup ${alert.type.toLowerCase()}`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="alert-icon">
                {alert.type === 'BOS_TRIGGERED' && '🎯'}
                {alert.type === 'LIQUIDITY_SWEEP_TRIGGERED' && '💧'}
                {alert.type === 'FVG_TRIGGERED' && '📦'}
                {alert.type === 'ORDER_BLOCK_TRIGGERED' && '🔲'}
                {alert.type === 'SIGNAL_APPROVED' && '✅'}
              </div>
              <div className="alert-content">
                <div className="alert-title">{alert.message}</div>
                <div className="alert-details">
                  {alert.price && `@ ${alert.price.toFixed(2)}`}
                  {alert.zone && ` (${alert.zone.low.toFixed(2)} - ${alert.zone.high.toFixed(2)})`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Conditions Panel */}
      {activeConditions && activeConditions.length > 0 && (
        <div className="active-conditions-panel">
          <div className="panel-header">
            <h4>🔍 Active Conditions ({activeConditions.length})</h4>
            {confluence && (
              <div className="confluence-badges">
                {confluence.bullish >= 3 && (
                  <span className="badge bullish">
                    🟢 BUY: {confluence.bullish}/6
                  </span>
                )}
                {confluence.bearish >= 3 && (
                  <span className="badge bearish">
                    🔴 SELL: {confluence.bearish}/6
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="conditions-list">
            {activeConditions.map((condition, index) => (
              <div key={index} className="condition-item">
                <div className="condition-type">
                  {condition.type === 'BOS' && '🎯'}
                  {condition.type === 'LIQUIDITY_SWEEP' && '💧'}
                  {condition.type === 'FVG' && '📦'}
                  {condition.type === 'ORDER_BLOCK' && '🔲'}
                  {condition.type === 'IN_DISCOUNT' && '🟢'}
                  {condition.type === 'IN_PREMIUM' && '🔴'}
                  <span className="type-label">{condition.type}</span>
                </div>
                <div className="condition-desc">
                  {condition.description}
                </div>
                <div className="condition-confidence">
                  {condition.confidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert History (Collapsible) */}
      {alertHistory.length > 0 && (
        <details className="alert-history">
          <summary>
            📋 Alert History ({alertHistory.length})
          </summary>
          <div className="history-list">
            {alertHistory.map((alert, index) => (
              <div key={alert.id} className="history-item">
                <span className="history-time">
                  Candle #{alert.index}
                </span>
                <span className="history-message">
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <style jsx>{`
        .realtime-alerts {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
        }

        /* Alert Popups */
        .alert-popup-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .alert-popup {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease-out, pulse 0.5s ease-in-out infinite alternate;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          from {
            box-shadow: 0 8px 24px rgba(0, 212, 170, 0.3);
          }
          to {
            box-shadow: 0 8px 32px rgba(0, 212, 170, 0.6);
          }
        }

        .alert-popup.signal_approved {
          border-color: #00d4aa;
        }

        .alert-popup.bos_triggered {
          border-color: #bc8cff;
        }

        .alert-popup.liquidity_sweep_triggered {
          border-color: #ffd60a;
        }

        .alert-icon {
          font-size: 32px;
          line-height: 1;
        }

        .alert-content {
          flex: 1;
        }

        .alert-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 4px;
        }

        .alert-details {
          font-size: 12px;
          color: var(--text-secondary);
          font-family: monospace;
        }

        /* Active Conditions Panel */
        .active-conditions-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .panel-header h4 {
          margin: 0;
          font-size: 14px;
          color: var(--text-primary);
        }

        .confluence-badges {
          display: flex;
          gap: 8px;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge.bullish {
          background: #00d4aa20;
          color: #00d4aa;
          border: 1px solid #00d4aa;
        }

        .badge.bearish {
          background: #ff497620;
          color: #ff4976;
          border: 1px solid #ff4976;
        }

        .conditions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .condition-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 8px;
        }

        .condition-type {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 20px;
          min-width: 140px;
        }

        .type-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .condition-desc {
          flex: 1;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .condition-confidence {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
          min-width: 40px;
          text-align: right;
        }

        /* Alert History */
        .alert-history {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }

        .alert-history summary {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
          list-style: none;
          padding: 4px;
        }

        .alert-history summary::-webkit-details-marker {
          display: none;
        }

        .alert-history summary:hover {
          color: var(--primary);
        }

        .history-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 200px;
          overflow-y: auto;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          font-size: 11px;
        }

        .history-time {
          color: var(--text-secondary);
          font-family: monospace;
        }

        .history-message {
          color: var(--text-primary);
          flex: 1;
          margin-left: 12px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .realtime-alerts {
            right: 10px;
            left: 10px;
            max-width: none;
          }

          .alert-popup {
            padding: 12px;
          }

          .active-conditions-panel {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
