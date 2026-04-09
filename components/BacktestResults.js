// components/BacktestResults.js
'use client';

import { useState } from 'react';

export default function BacktestResults({ results }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!results) {
    return <div className="backtest-results">No results to display</div>;
  }

  const { summary, byRegime, bySession, equity, trades } = results;

  return (
    <div className="backtest-results">
      <div className="results-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Summary
        </button>
        <button
          className={`tab ${activeTab === 'regimes' ? 'active' : ''}`}
          onClick={() => setActiveTab('regimes')}
        >
          🔄 Regimes
        </button>
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          ⏰ Sessions
        </button>
        <button
          className={`tab ${activeTab === 'equity' ? 'active' : ''}`}
          onClick={() => setActiveTab('equity')}
        >
          📈 Equity
        </button>
        <button
          className={`tab ${activeTab === 'trades' ? 'active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          📋 Trades
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && <SummaryTab summary={summary} />}
        {activeTab === 'regimes' && <RegimesTab data={byRegime} />}
        {activeTab === 'sessions' && <SessionsTab data={bySession} />}
        {activeTab === 'equity' && <EquityTab equity={equity} />}
        {activeTab === 'trades' && <TradesTab trades={trades} />}
      </div>
    </div>
  );
}

function SummaryTab({ summary }) {
  const getScoreColor = (value, thresholds) => {
    if (value >= thresholds.good) return 'green';
    if (value >= thresholds.ok) return 'yellow';
    return 'red';
  };

  return (
    <div className="summary-tab">
      <div className="metrics-grid">
        <MetricCard
          label="Total Trades"
          value={summary.totalTrades}
          color="blue"
        />
        <MetricCard
          label="Win Rate"
          value={`${summary.winRate.toFixed(1)}%`}
          color={getScoreColor(summary.winRate, { good: 50, ok: 45 })}
        />
        <MetricCard
          label="Profit Factor"
          value={summary.profitFactor.toFixed(2)}
          color={getScoreColor(summary.profitFactor, { good: 1.5, ok: 1.3 })}
        />
        <MetricCard
          label="Expectancy"
          value={`$${summary.expectancy.toFixed(2)}`}
          color={summary.expectancy > 0 ? 'green' : 'red'}
        />
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Total P&L"
          value={`$${summary.totalPnL.toFixed(2)}`}
          color={summary.totalPnL > 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Avg Win"
          value={`$${summary.avgWin.toFixed(2)}`}
          color="green"
        />
        <MetricCard
          label="Avg Loss"
          value={`$${summary.avgLoss.toFixed(2)}`}
          color="red"
        />
        <MetricCard
          label="Avg R"
          value={`${summary.avgR.toFixed(2)}R`}
          color={summary.avgR > 0 ? 'green' : 'red'}
        />
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Max Drawdown"
          value={`$${summary.maxDrawdown.amount.toFixed(2)}`}
          subtitle={`${summary.maxDrawdown.percentage.toFixed(1)}%`}
          color="red"
        />
        <MetricCard
          label="Max Consecutive Losses"
          value={summary.maxConsecutiveLosses}
          color="orange"
        />
        <MetricCard
          label="Avg Duration"
          value={`${summary.avgTradeDuration.toFixed(1)} bars`}
          color="blue"
        />
        <MetricCard
          label="Winners"
          value={`${summary.winners} / ${summary.losers}`}
          subtitle="W / L"
          color="blue"
        />
      </div>

      {summary.winRate > 70 && (
        <div className="alert alert-warning">
          ⚠️ Win rate above 70% may indicate overfitting. Expected: 45-55% for institutional strategies.
        </div>
      )}

      {summary.profitFactor > 2.5 && (
        <div className="alert alert-warning">
          ⚠️ Profit factor above 2.5 is unusually high. Expected: 1.3-1.6 for Gold.
        </div>
      )}

      {summary.maxDrawdown.percentage < 10 && summary.totalTrades > 100 && (
        <div className="alert alert-warning">
          ⚠️ Low drawdown may indicate overfitting. Expected: 15-25% for Gold.
        </div>
      )}
    </div>
  );
}

function RegimesTab({ data }) {
  return (
    <div className="regimes-tab">
      <h3>Performance by Market Regime</h3>
      <div className="regime-grid">
        {Object.entries(data).map(([regime, stats]) => (
          <div key={regime} className="regime-card">
            <h4>{regime.replace('_', ' ')}</h4>
            <div className="regime-stats">
              <div className="stat">
                <span className="label">Trades:</span>
                <span className="value">{stats.count}</span>
              </div>
              <div className="stat">
                <span className="label">Win Rate:</span>
                <span className="value">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="label">P&L:</span>
                <span className={`value ${stats.totalPnL > 0 ? 'profit' : 'loss'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="stat">
                <span className="label">Avg R:</span>
                <span className="value">{stats.avgR.toFixed(2)}R</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsTab({ data }) {
  return (
    <div className="sessions-tab">
      <h3>Performance by Trading Session</h3>
      <div className="session-grid">
        {Object.entries(data).map(([session, stats]) => (
          <div key={session} className="session-card">
            <h4>{session.replace('_', ' ')}</h4>
            <div className="session-stats">
              <div className="stat">
                <span className="label">Trades:</span>
                <span className="value">{stats.count}</span>
              </div>
              <div className="stat">
                <span className="label">Win Rate:</span>
                <span className="value">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="label">P&L:</span>
                <span className={`value ${stats.totalPnL > 0 ? 'profit' : 'loss'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="stat">
                <span className="label">Avg R:</span>
                <span className="value">{stats.avgR.toFixed(2)}R</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EquityTab({ equity }) {
  // Simple ASCII-style equity curve
  const maxEquity = Math.max(...equity.map(e => e.equity));
  const minEquity = Math.min(...equity.map(e => e.equity));
  const range = maxEquity - minEquity;

  return (
    <div className="equity-tab">
      <h3>Equity Curve</h3>
      <div className="equity-stats">
        <div className="stat">
          <span className="label">Starting:</span>
          <span className="value">${equity[0].equity.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="label">Ending:</span>
          <span className="value">${equity[equity.length - 1].equity.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="label">Net Change:</span>
          <span className={`value ${equity[equity.length - 1].equity > equity[0].equity ? 'profit' : 'loss'}`}>
            ${(equity[equity.length - 1].equity - equity[0].equity).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="equity-chart">
        {equity.slice(0, 100).map((point, i) => {
          const height = ((point.equity - minEquity) / range) * 100;
          return (
            <div key={i} className="equity-bar" title={`Trade ${point.index}: $${point.equity.toFixed(2)}`}>
              <div 
                className="equity-fill" 
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      {equity.length > 100 && (
        <p className="chart-note">Showing first 100 trades (total: {equity.length})</p>
      )}
    </div>
  );
}

function TradesTab({ trades }) {
  const [filter, setFilter] = useState('all');

  const filteredTrades = trades.filter(t => {
    if (filter === 'winners') return t.result.winner;
    if (filter === 'losers') return !t.result.winner;
    return true;
  });

  return (
    <div className="trades-tab">
      <div className="trades-header">
        <h3>Trade List</h3>
        <div className="trade-filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({trades.length})
          </button>
          <button
            className={filter === 'winners' ? 'active' : ''}
            onClick={() => setFilter('winners')}
          >
            Winners ({trades.filter(t => t.result.winner).length})
          </button>
          <button
            className={filter === 'losers' ? 'active' : ''}
            onClick={() => setFilter('losers')}
          >
            Losers ({trades.filter(t => !t.result.winner).length})
          </button>
        </div>
      </div>

      <div className="trades-list">
        {filteredTrades.slice(0, 50).map((trade, i) => (
          <div key={i} className={`trade-item ${trade.result.winner ? 'winner' : 'loser'}`}>
            <div className="trade-direction">{trade.direction === 'BUY' ? '🟢' : '🔴'} {trade.direction}</div>
            <div className="trade-details">
              <span>Entry: {trade.entry.toFixed(2)}</span>
              <span>Exit: {trade.exitPrice.toFixed(2)}</span>
              <span>R: {trade.result.rMultiple.toFixed(2)}</span>
              <span className={trade.result.winner ? 'profit' : 'loss'}>
                ${trade.result.pnl.toFixed(2)}
              </span>
            </div>
            <div className="trade-meta">
              <span>{trade.session}</span>
              <span>{trade.regime}</span>
              <span>{trade.durationBars} bars</span>
            </div>
          </div>
        ))}
      </div>
      {filteredTrades.length > 50 && (
        <p className="trades-note">Showing first 50 trades (total: {filteredTrades.length})</p>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, color = 'blue' }) {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}
