// components/PerformanceDashboard.js
// Professional Performance Metrics Display
// Institutional-grade analytics visualization

'use client';
import { useEffect, useState } from 'react';
import { calculatePerformanceMetrics, analyzePerformanceBy } from '../utils/tradeJournal';

export default function PerformanceDashboard({ trades, onRefresh }) {
  const [metrics, setMetrics] = useState(null);
  const [bySession, setBySession] = useState(null);
  const [byDay, setByDay] = useState(null);
  const [byRegime, setByRegime] = useState(null);
  const [byConfluence, setByConfluence] = useState(null);
  const [bySetup, setBySetup] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    if (trades && trades.length > 0) {
      const perf = calculatePerformanceMetrics(trades);
      setMetrics(perf);
      
      // Calculate breakdowns
      setBySession(analyzePerformanceBy(trades, 'session'));
      setByDay(analyzePerformanceBy(trades, 'day'));
      setByRegime(analyzePerformanceBy(trades, 'regime'));
      setByConfluence(analyzePerformanceBy(trades, 'confluence'));
      setBySetup(analyzePerformanceBy(trades, 'setup'));
    }
  }, [trades]);

  if (!metrics || metrics.totalTrades === 0) {
    return (
      <div className="no-trades">
        <h3>📊 No Trades Yet</h3>
        <p>Start trading and your performance will be tracked here.</p>
        <p>Click "New Trade" to log your first trade!</p>
      </div>
    );
  }

  return (
    <div className="performance-dashboard">
      {/* View Selector */}
      <div className="view-selector">
        <button 
          className={selectedView === 'overview' ? 'active' : ''}
          onClick={() => setSelectedView('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={selectedView === 'breakdowns' ? 'active' : ''}
          onClick={() => setSelectedView('breakdowns')}
        >
          📈 Breakdowns
        </button>
        <button 
          className={selectedView === 'streaks' ? 'active' : ''}
          onClick={() => setSelectedView('streaks')}
        >
          🔥 Streaks
        </button>
      </div>

      {/* Overview Metrics */}
      {selectedView === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="metrics-grid">
            {/* Total Trades */}
            <div className="metric-card">
              <div className="metric-icon">📝</div>
              <div className="metric-content">
                <div className="metric-label">Total Trades</div>
                <div className="metric-value">{metrics.totalTrades}</div>
              </div>
            </div>

            {/* Win Rate */}
            <div className={`metric-card ${metrics.winRate >= 55 ? 'success' : metrics.winRate >= 50 ? 'warning' : 'danger'}`}>
              <div className="metric-icon">🎯</div>
              <div className="metric-content">
                <div className="metric-label">Win Rate</div>
                <div className="metric-value">{metrics.winRate}%</div>
                <div className="metric-subtext">
                  Target: 52-58%
                </div>
              </div>
            </div>

            {/* Total P&L */}
            <div className={`metric-card ${metrics.totalPnL > 0 ? 'success' : 'danger'}`}>
              <div className="metric-icon">{metrics.totalPnL > 0 ? '💰' : '📉'}</div>
              <div className="metric-content">
                <div className="metric-label">Total P&L</div>
                <div className="metric-value">
                  ${metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnL}
                </div>
              </div>
            </div>

            {/* Profit Factor */}
            <div className={`metric-card ${metrics.profitFactor >= 1.5 ? 'success' : metrics.profitFactor >= 1.0 ? 'warning' : 'danger'}`}>
              <div className="metric-icon">⚖️</div>
              <div className="metric-content">
                <div className="metric-label">Profit Factor</div>
                <div className="metric-value">{metrics.profitFactor}</div>
                <div className="metric-subtext">
                  Target: 1.5+
                </div>
              </div>
            </div>

            {/* Expectancy */}
            <div className={`metric-card ${metrics.expectancy > 0 ? 'success' : 'danger'}`}>
              <div className="metric-icon">💡</div>
              <div className="metric-content">
                <div className="metric-label">Expectancy</div>
                <div className="metric-value">
                  ${metrics.expectancy >= 0 ? '+' : ''}{metrics.expectancy}
                </div>
                <div className="metric-subtext">Per trade</div>
              </div>
            </div>

            {/* Average Win */}
            <div className="metric-card success">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-label">Avg Win</div>
                <div className="metric-value">+${Math.abs(metrics.avgWin)}</div>
              </div>
            </div>

            {/* Average Loss */}
            <div className="metric-card danger">
              <div className="metric-icon">📉</div>
              <div className="metric-content">
                <div className="metric-label">Avg Loss</div>
                <div className="metric-value">-${Math.abs(metrics.avgLoss)}</div>
              </div>
            </div>

            {/* Max Drawdown */}
            <div className={`metric-card ${metrics.maxDrawdownPercent < 10 ? 'success' : metrics.maxDrawdownPercent < 20 ? 'warning' : 'danger'}`}>
              <div className="metric-icon">⚠️</div>
              <div className="metric-content">
                <div className="metric-label">Max Drawdown</div>
                <div className="metric-value">{metrics.maxDrawdownPercent}%</div>
                <div className="metric-subtext">${metrics.maxDrawdown}</div>
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className={`metric-card ${metrics.sharpeRatio >= 1.0 ? 'success' : metrics.sharpeRatio >= 0.5 ? 'warning' : 'danger'}`}>
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <div className="metric-label">Sharpe Ratio</div>
                <div className="metric-value">{metrics.sharpeRatio}</div>
                <div className="metric-subtext">
                  {metrics.sharpeRatio >= 1.0 ? 'Excellent' : metrics.sharpeRatio >= 0.5 ? 'Good' : 'Poor'}
                </div>
              </div>
            </div>

            {/* Avg Time in Trade */}
            <div className="metric-card">
              <div className="metric-icon">⏱️</div>
              <div className="metric-content">
                <div className="metric-label">Avg Time</div>
                <div className="metric-value">{metrics.avgTimeInTrade} min</div>
              </div>
            </div>

            {/* Avg Slippage */}
            <div className="metric-card">
              <div className="metric-icon">📍</div>
              <div className="metric-content">
                <div className="metric-label">Avg Slippage</div>
                <div className="metric-value">{metrics.avgSlippage} pips</div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="insights-panel">
            <h3>💡 Key Insights</h3>
            <div className="insights-list">
              {metrics.winRate < 50 && (
                <div className="insight warning">
                  ⚠️ Win rate below 50% - Review strategy or be more selective
                </div>
              )}
              {metrics.winRate >= 55 && (
                <div className="insight success">
                  ✅ Excellent win rate! Maintain current approach
                </div>
              )}
              {metrics.profitFactor < 1.0 && (
                <div className="insight danger">
                  🚨 Profit factor below 1.0 - Losing money overall!
                </div>
              )}
              {metrics.profitFactor >= 1.5 && (
                <div className="insight success">
                  ✅ Strong profit factor - Good risk/reward management
                </div>
              )}
              {metrics.maxDrawdownPercent > 20 && (
                <div className="insight danger">
                  🚨 Drawdown exceeds 20% - Reduce position size immediately
                </div>
              )}
              {Math.abs(metrics.avgWin) < Math.abs(metrics.avgLoss) && (
                <div className="insight warning">
                  ⚠️ Average win smaller than average loss - Need better R:R
                </div>
              )}
              {metrics.expectancy > 0 && (
                <div className="insight success">
                  ✅ Positive expectancy - Strategy is profitable long-term
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Performance Breakdowns */}
      {selectedView === 'breakdowns' && (
        <div className="breakdowns">
          {/* By Session */}
          {bySession && Object.keys(bySession).length > 0 && (
            <div className="breakdown-section">
              <h3>📅 Performance by Session</h3>
              <div className="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                      <th>Expectancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bySession).map(([session, stats]) => (
                      <tr key={session}>
                        <td className="session-name">{session}</td>
                        <td>{stats.trades}</td>
                        <td className={stats.winRate >= 55 ? 'success' : stats.winRate >= 50 ? 'warning' : 'danger'}>
                          {stats.winRate}%
                        </td>
                        <td className={stats.totalPnL > 0 ? 'success' : 'danger'}>
                          ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                        </td>
                        <td className={stats.expectancy > 0 ? 'success' : 'danger'}>
                          ${stats.expectancy >= 0 ? '+' : ''}{stats.expectancy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="breakdown-insight">
                {findBestPerformer(bySession, 'session')}
              </div>
            </div>
          )}

          {/* By Day */}
          {byDay && Object.keys(byDay).length > 0 && (
            <div className="breakdown-section">
              <h3>📆 Performance by Day of Week</h3>
              <div className="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                      <th>Profit Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                      const stats = byDay[day];
                      if (!stats) return null;
                      return (
                        <tr key={day}>
                          <td>{day}</td>
                          <td>{stats.trades}</td>
                          <td className={stats.winRate >= 55 ? 'success' : stats.winRate >= 50 ? 'warning' : 'danger'}>
                            {stats.winRate}%
                          </td>
                          <td className={stats.totalPnL > 0 ? 'success' : 'danger'}>
                            ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                          </td>
                          <td className={stats.profitFactor >= 1.5 ? 'success' : 'warning'}>
                            {stats.profitFactor}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Regime */}
          {byRegime && Object.keys(byRegime).length > 0 && (
            <div className="breakdown-section">
              <h3>🎭 Performance by Market Regime</h3>
              <div className="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Regime</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                      <th>Expectancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byRegime).map(([regime, stats]) => (
                      <tr key={regime}>
                        <td>{regime}</td>
                        <td>{stats.trades}</td>
                        <td className={stats.winRate >= 55 ? 'success' : stats.winRate >= 50 ? 'warning' : 'danger'}>
                          {stats.winRate}%
                        </td>
                        <td className={stats.totalPnL > 0 ? 'success' : 'danger'}>
                          ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                        </td>
                        <td>${stats.expectancy >= 0 ? '+' : ''}{stats.expectancy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Confluence */}
          {byConfluence && Object.keys(byConfluence).length > 0 && (
            <div className="breakdown-section">
              <h3>🎯 Performance by Confluence Score</h3>
              <div className="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Confluence</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                      <th>Profit Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byConfluence)
                      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                      .map(([conf, stats]) => (
                        <tr key={conf}>
                          <td>{conf}</td>
                          <td>{stats.trades}</td>
                          <td className={stats.winRate >= 55 ? 'success' : stats.winRate >= 50 ? 'warning' : 'danger'}>
                            {stats.winRate}%
                          </td>
                          <td className={stats.totalPnL > 0 ? 'success' : 'danger'}>
                            ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                          </td>
                          <td>{stats.profitFactor}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Setup Type */}
          {bySetup && Object.keys(bySetup).length > 0 && (
            <div className="breakdown-section">
              <h3>🎨 Performance by Setup Type</h3>
              <div className="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Setup</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                      <th>Avg R:R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bySetup).map(([setup, stats]) => (
                      <tr key={setup}>
                        <td>{setup}</td>
                        <td>{stats.trades}</td>
                        <td className={stats.winRate >= 55 ? 'success' : stats.winRate >= 50 ? 'warning' : 'danger'}>
                          {stats.winRate}%
                        </td>
                        <td className={stats.totalPnL > 0 ? 'success' : 'danger'}>
                          ${stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL}
                        </td>
                        <td>{stats.profitFactor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streaks */}
      {selectedView === 'streaks' && (
        <div className="streaks-view">
          <div className="streak-cards">
            <div className="streak-card success">
              <div className="streak-icon">🔥</div>
              <div className="streak-content">
                <div className="streak-label">Longest Win Streak</div>
                <div className="streak-value">{metrics.longestWinStreak}</div>
                <div className="streak-subtext">consecutive wins</div>
              </div>
            </div>

            <div className="streak-card danger">
              <div className="streak-icon">❄️</div>
              <div className="streak-content">
                <div className="streak-label">Longest Loss Streak</div>
                <div className="streak-value">{metrics.longestLossStreak}</div>
                <div className="streak-subtext">consecutive losses</div>
              </div>
            </div>

            <div className={`streak-card ${metrics.currentStreak.type === 'WIN' ? 'success' : metrics.currentStreak.type === 'LOSS' ? 'danger' : ''}`}>
              <div className="streak-icon">
                {metrics.currentStreak.type === 'WIN' ? '🔥' : metrics.currentStreak.type === 'LOSS' ? '⚠️' : '➖'}
              </div>
              <div className="streak-content">
                <div className="streak-label">Current Streak</div>
                <div className="streak-value">
                  {metrics.currentStreak.count} {metrics.currentStreak.type || 'None'}
                </div>
                {metrics.currentStreak.type === 'LOSS' && metrics.currentStreak.count >= 3 && (
                  <div className="streak-warning">
                    🚨 3+ losses - Take a break!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="streak-advice">
            <h3>🎯 Streak Management Tips</h3>
            <ul>
              <li>
                <strong>After 3 wins in a row:</strong> Don't get overconfident. Stick to your process.
              </li>
              <li>
                <strong>After 2 losses in a row:</strong> Take a 2-hour break. Review what went wrong.
              </li>
              <li>
                <strong>After 3 losses in a row:</strong> Stop trading for the day. Something has changed.
              </li>
              <li>
                <strong>After 5 losses in a row:</strong> Take a week off. Review all trades. Paper trade to rebuild confidence.
              </li>
            </ul>
          </div>
        </div>
      )}

      <style jsx>{`
        .performance-dashboard {
          padding: 20px;
        }

        .no-trades {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }

        .no-trades h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
        }

        .no-trades p {
          margin: 8px 0;
          color: var(--text-secondary);
        }

        .view-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .view-selector button {
          flex: 1;
          padding: 12px 24px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-selector button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .view-selector button.active {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .metric-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .metric-card.success {
          border-left: 4px solid #00d4aa;
        }

        .metric-card.warning {
          border-left: 4px solid #ffd60a;
        }

        .metric-card.danger {
          border-left: 4px solid #ff4976;
        }

        .metric-icon {
          font-size: 32px;
          line-height: 1;
        }

        .metric-content {
          flex: 1;
        }

        .metric-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: monospace;
        }

        .metric-subtext {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .insights-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }

        .insights-panel h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
          font-size: 16px;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insight {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
        }

        .insight.success {
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid #00d4aa;
          color: #00d4aa;
        }

        .insight.warning {
          background: rgba(255, 214, 10, 0.1);
          border: 1px solid #ffd60a;
          color: #ffd60a;
        }

        .insight.danger {
          background: rgba(255, 73, 118, 0.1);
          border: 1px solid #ff4976;
          color: #ff4976;
        }

        .breakdowns {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .breakdown-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }

        .breakdown-section h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
          font-size: 16px;
        }

        .breakdown-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .breakdown-table th {
          text-align: left;
          padding: 12px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--border);
        }

        .breakdown-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 13px;
        }

        .breakdown-table td.success {
          color: #00d4aa;
          font-weight: 600;
        }

        .breakdown-table td.warning {
          color: #ffd60a;
          font-weight: 600;
        }

        .breakdown-table td.danger {
          color: #ff4976;
          font-weight: 600;
        }

        .streak-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .streak-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .streak-icon {
          font-size: 48px;
          line-height: 1;
        }

        .streak-content {
          flex: 1;
        }

        .streak-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .streak-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: monospace;
        }

        .streak-subtext {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .streak-warning {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(255, 73, 118, 0.1);
          border: 1px solid #ff4976;
          border-radius: 6px;
          font-size: 12px;
          color: #ff4976;
          font-weight: 600;
        }

        .streak-advice {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }

        .streak-advice h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
        }

        .streak-advice ul {
          margin: 0;
          padding-left: 20px;
        }

        .streak-advice li {
          margin-bottom: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .streak-advice strong {
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .view-selector {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

function findBestPerformer(breakdown, type) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return null;
  
  const best = entries.reduce((best, [key, stats]) => {
    if (!best || stats.expectancy > best.stats.expectancy) {
      return { key, stats };
    }
    return best;
  }, null);
  
  const worst = entries.reduce((worst, [key, stats]) => {
    if (!worst || stats.expectancy < worst.stats.expectancy) {
      return { key, stats };
    }
    return worst;
  }, null);
  
  return (
    <div className="breakdown-insight">
      <p>
        ✅ <strong>Best {type}:</strong> {best.key} (Win Rate: {best.stats.winRate}%, Expectancy: ${best.stats.expectancy})
      </p>
      <p>
        ⚠️ <strong>Worst {type}:</strong> {worst.key} (Win Rate: {worst.stats.winRate}%, Expectancy: ${worst.stats.expectancy})
      </p>
    </div>
  );
}
