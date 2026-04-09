// components/BacktestPanel.js
'use client';

import { useState } from 'react';
import BacktestResults from './BacktestResults';

export default function BacktestPanel() {
  const [config, setConfig] = useState({
    accountSize: 10000,
    riskPerTrade: 100,
    htfMinScore: 50,        // 1H direction minimum
    mtfMinScore: 60,        // 15M validation minimum
    ltfMinConfidence: 75,   // 5M entry minimum
    killZoneOnly: true,
    avoidRollover: true,
    regimeFilter: null,
    useRealisticSpread: true,
    useRealisticSlippage: true,
    worstCaseExecution: true,
    startDate: '',
    endDate: '',
  });

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  async function runBacktest() {
    setRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Backtest failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setProgress(100);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Backtest error:', err);
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="backtest-panel">
      <div className="panel-header">
        <h2>🧪 Backtest Engine</h2>
        <div className="header-subtitle">
          Professional Gold (XAUUSD) Multi-Timeframe Backtesting
          <br />
          <strong style={{color: 'var(--primary)'}}>1H Direction → 15M Validation → 5M Entry</strong>
        </div>
      </div>

      {!results && (
        <div className="config-section">
          <div className="alert alert-info" style={{marginBottom: '24px'}}>
            <strong>📊 Multi-Timeframe Strategy:</strong>
            <br />
            ✓ 1H Candles: HTF Direction & Bias
            <br />
            ✓ 15M Candles: Structure Validation
            <br />
            ✓ 5M Candles: Precise Entry Execution
            <br />
            <br />
            <strong>Data Source:</strong> Finage API (Real Market Data)
          </div>

          <div className="config-group">
            <h3>💰 Capital Management</h3>
            <div className="config-row">
              <label>
                Account Size:
                <input
                  type="number"
                  value={config.accountSize}
                  onChange={(e) => setConfig({ ...config, accountSize: Number(e.target.value) })}
                  disabled={running}
                />
              </label>
              <label>
                Risk Per Trade:
                <input
                  type="number"
                  value={config.riskPerTrade}
                  onChange={(e) => setConfig({ ...config, riskPerTrade: Number(e.target.value) })}
                  disabled={running}
                />
              </label>
            </div>
          </div>

          <div className="config-group">
            <h3>🎯 Multi-Timeframe Filters</h3>
            <div className="config-row">
              <label>
                1H Min Score (Direction):
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.htfMinScore}
                  onChange={(e) => setConfig({ ...config, htfMinScore: Number(e.target.value) })}
                  disabled={running}
                />
                <small style={{color: 'var(--text-secondary)'}}>Higher = Stronger 1H bias required</small>
              </label>
              <label>
                15M Min Score (Validation):
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.mtfMinScore}
                  onChange={(e) => setConfig({ ...config, mtfMinScore: Number(e.target.value) })}
                  disabled={running}
                />
                <small style={{color: 'var(--text-secondary)'}}>15M must align with 1H direction</small>
              </label>
              <label>
                5M Min Confidence (Entry):
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.ltfMinConfidence}
                  onChange={(e) => setConfig({ ...config, ltfMinConfidence: Number(e.target.value) })}
                  disabled={running}
                />
                <small style={{color: 'var(--text-secondary)'}}>Final entry signal strength</small>
              </label>
            </div>

            <div className="config-checks">
              <label>
                <input
                  type="checkbox"
                  checked={config.killZoneOnly}
                  onChange={(e) => setConfig({ ...config, killZoneOnly: e.target.checked })}
                  disabled={running}
                />
                <span>Kill Zone Only (London/NY Open)</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={config.avoidRollover}
                  onChange={(e) => setConfig({ ...config, avoidRollover: e.target.checked })}
                  disabled={running}
                />
                <span>Avoid Rollover Periods</span>
              </label>
            </div>

            <div className="config-row">
              <label>
                Regime Filter:
                <select
                  value={config.regimeFilter || ''}
                  onChange={(e) => setConfig({ ...config, regimeFilter: e.target.value || null })}
                  disabled={running}
                >
                  <option value="">All Regimes</option>
                  <option value="TRENDING">Trending Only</option>
                  <option value="CONSOLIDATION">Consolidation Only</option>
                  <option value="HIGH_VOLATILITY">High Volatility Only</option>
                </select>
              </label>
            </div>
          </div>

          <div className="config-group">
            <h3>⚙️ Execution Settings</h3>
            <div className="config-checks">
              <label>
                <input
                  type="checkbox"
                  checked={config.useRealisticSpread}
                  onChange={(e) => setConfig({ ...config, useRealisticSpread: e.target.checked })}
                  disabled={running}
                />
                <span>Realistic Spread (25-100 points)</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={config.useRealisticSlippage}
                  onChange={(e) => setConfig({ ...config, useRealisticSlippage: e.target.checked })}
                  disabled={running}
                />
                <span>Realistic Slippage (10-50 points)</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={config.worstCaseExecution}
                  onChange={(e) => setConfig({ ...config, worstCaseExecution: e.target.checked })}
                  disabled={running}
                />
                <span>Worst Case Execution (conservative)</span>
              </label>
            </div>

            <div className="alert alert-info">
              💡 Realistic execution costs: ~20-45 points per trade (spread + slippage)
            </div>
          </div>

          <div className="config-group">
            <h3>📅 Date Range (Optional)</h3>
            <div className="config-row">
              <label>
                Start Date:
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  disabled={running}
                />
              </label>
              <label>
                End Date:
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                  disabled={running}
                />
              </label>
            </div>
          </div>

          <div className="config-actions">
            <button
              onClick={runBacktest}
              disabled={running}
              className="btn btn-primary btn-large"
            >
              {running ? '⏳ Running Backtest...' : '🚀 Run Backtest'}
            </button>
          </div>

          {running && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
              <div className="progress-text">{progress.toFixed(0)}%</div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              ❌ Error: {error}
            </div>
          )}
        </div>
      )}

      {results && (
        <>
          <div className="results-actions">
            <button
              onClick={() => setResults(null)}
              className="btn btn-secondary"
            >
              ← Back to Config
            </button>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backtest-results-${Date.now()}.json`;
                a.click();
              }}
              className="btn btn-secondary"
            >
              💾 Export Results
            </button>
          </div>

          <BacktestResults results={results} />
        </>
      )}
    </div>
  );
}
