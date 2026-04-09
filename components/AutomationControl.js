// components/AutomationControl.js
'use client';

import { useState, useEffect } from 'react';

export default function AutomationControl() {
  const [state, setState] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load automation state
  useEffect(() => {
    loadState();
    // Refresh every 30 seconds
    const interval = setInterval(loadState, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadState() {
    try {
      const response = await fetch('/api/automation');
      const data = await response.json();
      
      if (data.success) {
        setState(data.state);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load automation state:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveState(updates) {
    setSaving(true);
    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (data.success) {
        setState(data.state);
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function testRun() {
    setTesting(true);
    try {
      const secret = prompt('Enter CRON_SECRET for testing:');
      if (!secret) return;

      const response = await fetch(`/api/automation/run?secret=${secret}`, {
        method: 'GET',
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Test successful!\n\nSignals found: ${data.result.signals.length}\nHTF Bias: ${data.result.htfBias?.bias}`);
      } else {
        alert('Test failed: ' + data.error);
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  }

  async function resetAutomation() {
    if (!confirm('Are you sure you want to reset automation and clear all signal history?')) {
      return;
    }

    try {
      const response = await fetch('/api/automation', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Reset successful!\nCleared ${data.clearedSignals} signals`);
        loadState();
      } else {
        alert('Reset failed: ' + data.error);
      }
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed: ' + error.message);
    }
  }

  if (loading || !state) {
    return <div className="automation-panel loading">Loading...</div>;
  }

  return (
    <div className="automation-panel">
      <div className="panel-header">
        <h2>🤖 Automation Control</h2>
        <div className={`status-badge ${state.enabled ? 'active' : 'inactive'}`}>
          {state.enabled ? '● ACTIVE' : '○ INACTIVE'}
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="control-section">
        <div className="control-row">
          <label className="control-label">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => saveState({ enabled: e.target.checked })}
              disabled={saving}
            />
            <span>Enable Automation</span>
          </label>
        </div>

        {state.enabled && (
          <div className="alert alert-info">
            ⚡ Automation is running every 2 minutes
          </div>
        )}
      </div>

      {/* Symbol Selection */}
      <div className="control-section">
        <label className="section-label">Trading Symbol</label>
        <select
          value={state.symbol}
          onChange={(e) => saveState({ symbol: e.target.value })}
          disabled={saving}
          className="select-input"
        >
          <option value="XAUUSD">Gold (XAUUSD)</option>
          <option value="EURUSD">EUR/USD</option>
          <option value="GBPUSD">GBP/USD</option>
          <option value="USDJPY">USD/JPY</option>
        </select>
      </div>

      {/* Timeframe Selection */}
      <div className="control-section">
        <label className="section-label">Timeframe</label>
        <select
          value={state.timeframe}
          onChange={(e) => saveState({ timeframe: e.target.value })}
          disabled={saving}
          className="select-input"
        >
          <option value="1m">1 Minute</option>
          <option value="5m">5 Minutes</option>
          <option value="15m">15 Minutes</option>
          <option value="30m">30 Minutes</option>
          <option value="1h">1 Hour</option>
          <option value="4h">4 Hours</option>
        </select>
      </div>

      {/* Strategy Selection */}
      <div className="control-section">
        <label className="section-label">Active Strategies</label>
        
        <div className="strategy-checks">
          <label className="control-label">
            <input
              type="checkbox"
              checked={state.strategies.scalping}
              onChange={(e) => saveState({
                strategies: { ...state.strategies, scalping: e.target.checked }
              })}
              disabled={saving}
            />
            <span>Scalping Signals</span>
          </label>

          <label className="control-label">
            <input
              type="checkbox"
              checked={state.strategies.htfBias}
              onChange={(e) => saveState({
                strategies: { ...state.strategies, htfBias: e.target.checked }
              })}
              disabled={saving}
            />
            <span>HTF Bias Analysis</span>
          </label>

          <label className="control-label">
            <input
              type="checkbox"
              checked={state.strategies.ltfExecution}
              onChange={(e) => saveState({
                strategies: { ...state.strategies, ltfExecution: e.target.checked }
              })}
              disabled={saving}
            />
            <span>LTF Execution Signals</span>
          </label>

          <label className="control-label">
            <input
              type="checkbox"
              checked={state.strategies.liquiditySweeps}
              onChange={(e) => saveState({
                strategies: { ...state.strategies, liquiditySweeps: e.target.checked }
              })}
              disabled={saving}
            />
            <span>Liquidity Sweeps</span>
          </label>

          <label className="control-label">
            <input
              type="checkbox"
              checked={state.strategies.impulse}
              onChange={(e) => saveState({
                strategies: { ...state.strategies, impulse: e.target.checked }
              })}
              disabled={saving}
            />
            <span>Impulse Moves</span>
          </label>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="control-section">
        <label className="section-label">Notifications</label>
        
        <div className="strategy-checks">
          <label className="control-label">
            <input
              type="checkbox"
              checked={state.notifications.whatsapp}
              onChange={(e) => saveState({
                notifications: { ...state.notifications, whatsapp: e.target.checked }
              })}
              disabled={saving}
            />
            <span>📱 WhatsApp</span>
          </label>

          <label className="control-label">
            <input
              type="checkbox"
              checked={state.notifications.trello}
              onChange={(e) => saveState({
                notifications: { ...state.notifications, trello: e.target.checked }
              })}
              disabled={saving}
            />
            <span>📋 Trello</span>
          </label>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="control-section">
          <label className="section-label">Statistics</label>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Signals</div>
              <div className="stat-value">{stats.totalSignals}</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Last 24h</div>
              <div className="stat-value">{stats.last24h.total}</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Buy Signals</div>
              <div className="stat-value green">{stats.last24h.buy}</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Sell Signals</div>
              <div className="stat-value red">{stats.last24h.sell}</div>
            </div>
          </div>

          {stats.lastRun && (
            <div className="last-run">
              Last run: {new Date(stats.lastRun).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="control-section">
        <div className="button-row">
          <button
            onClick={testRun}
            disabled={testing || !state.enabled}
            className="btn btn-secondary"
          >
            {testing ? 'Testing...' : '🧪 Test Run'}
          </button>

          <button
            onClick={resetAutomation}
            className="btn btn-danger"
          >
            🔄 Reset
          </button>

          <button
            onClick={loadState}
            className="btn btn-secondary"
          >
            ♻️ Refresh
          </button>
        </div>
      </div>

      {/* Warnings */}
      {!state.enabled && (
        <div className="alert alert-warning">
          ⚠️ Automation is currently disabled. Enable it above to start receiving signals.
        </div>
      )}

      {state.enabled && !state.notifications.whatsapp && !state.notifications.trello && (
        <div className="alert alert-warning">
          ⚠️ All notifications are disabled. You won't receive any alerts!
        </div>
      )}
    </div>
  );
}
