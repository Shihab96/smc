// components/AutomatedMonitor.js
// Automated Signal Monitoring UI

'use client';

import { useState, useEffect } from 'react';

export default function AutomatedMonitor() {
  const [email, setEmail] = useState('');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('5m');
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Load monitors on mount
  useEffect(() => {
    loadMonitors();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadMonitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await fetch('/api/monitor?action=status');
      const data = await response.json();
      
      if (data.success) {
        setMonitors(data.monitors);
      }
    } catch (error) {
      console.error('Failed to load monitors:', error);
    }
  };

  const startMonitor = async () => {
    if (!email || !symbol || !timeframe) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          email,
          symbol,
          timeframe,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: '✅ Monitor started! You will receive email when BUY/SELL signals appear.' 
        });
        loadMonitors();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start monitor' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to start monitor: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const stopMonitor = async (monitorId) => {
    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          monitorId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '⏸️  Monitor stopped' });
        loadMonitors();
      }
    } catch (error) {
      console.error('Failed to stop monitor:', error);
    }
  };

  const activeMonitors = monitors.filter(m => m.status === 'running');

  return (
    <div className="automated-monitor">
      <div className="monitor-header">
        <h2>🤖 Automated Signal Monitor</h2>
        <p className="monitor-subtitle">
          Get email notifications when BUY/SELL signals appear
        </p>
      </div>

      {/* Configuration Form */}
      <div className="monitor-config">
        <h3>Start New Monitor</h3>
        
        <div className="config-form">
          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <small>You'll receive notifications at this email</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={loading}
              >
                <option value="XAUUSD">XAUUSD (Gold)</option>
                <option value="EURUSD">EURUSD</option>
                <option value="GBPUSD">GBPUSD</option>
                <option value="USDJPY">USDJPY</option>
              </select>
            </div>

            <div className="form-group">
              <label>Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                disabled={loading}
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes (Recommended)</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>
          </div>

          <button
            className="btn-start-monitor"
            onClick={startMonitor}
            disabled={loading}
          >
            {loading ? 'Starting...' : '🚀 Start Monitor'}
          </button>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Active Monitors */}
      {activeMonitors.length > 0 && (
        <div className="active-monitors">
          <h3>
            Active Monitors ({activeMonitors.length})
            <span className="status-indicator">●</span>
          </h3>

          <div className="monitors-list">
            {activeMonitors.map(monitor => (
              <div key={monitor.id} className="monitor-card">
                <div className="monitor-info">
                  <div className="monitor-main">
                    <span className="monitor-symbol">{monitor.symbol}</span>
                    <span className="monitor-timeframe">{monitor.timeframe}</span>
                  </div>
                  <div className="monitor-email">📧 {monitor.email}</div>
                  <div className="monitor-stats">
                    <span>Started: {new Date(monitor.startedAt).toLocaleString()}</span>
                    <span>Signals: {monitor.signalsDetected}</span>
                    {monitor.lastCheck && (
                      <span>Last check: {new Date(monitor.lastCheck).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
                <div className="monitor-actions">
                  <button
                    className="btn-stop"
                    onClick={() => stopMonitor(monitor.id)}
                  >
                    ⏸️  Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="monitor-info-panel">
        <h3>ℹ️ How It Works</h3>
        <ul>
          <li>✅ Monitor runs automatically every <strong>1 minute</strong></li>
          <li>✅ Fetches real-time data from Finage API</li>
          <li>✅ Runs <strong>same analysis</strong> as live chart (HTF → ITF → LTF)</li>
          <li>✅ Detects BUY/SELL signals with 75%+ confidence</li>
          <li>✅ Sends <strong>instant email</strong> notification</li>
          <li>✅ Includes entry, stop loss, take profit levels</li>
          <li>✅ Only sends once per signal (no spam)</li>
        </ul>

        <div className="info-box warning">
          <strong>⚠️ Setup Required:</strong>
          <p>Add these to your <code>.env.local</code> file:</p>
          <pre>
FINAGE_API_KEY=your_finage_api_key
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
          </pre>
          <p>For Gmail, use an <a href="https://support.google.com/accounts/answer/185833" target="_blank">App Password</a>, not your regular password.</p>
        </div>
      </div>

      <style jsx>{`
        .automated-monitor {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .monitor-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .monitor-header h2 {
          font-size: 24px;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .monitor-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .monitor-config {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .monitor-config h3 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 16px;
          color: var(--text-primary);
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .form-group small {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .btn-start-monitor {
          padding: 14px 24px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-start-monitor:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        }

        .btn-start-monitor:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          padding: 12px 16px;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 14px;
        }

        .message.success {
          background: #00d4aa20;
          color: #00d4aa;
          border: 1px solid #00d4aa40;
        }

        .message.error {
          background: #ff497620;
          color: #ff4976;
          border: 1px solid #ff497640;
        }

        .active-monitors {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .active-monitors h3 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 16px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          background: #00d4aa;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .monitors-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .monitor-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .monitor-info {
          flex: 1;
        }

        .monitor-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .monitor-symbol {
          font-size: 16px;
          font-weight: bold;
          color: var(--primary);
        }

        .monitor-timeframe {
          font-size: 14px;
          padding: 2px 8px;
          background: var(--primary-alpha);
          color: var(--primary);
          border-radius: 4px;
        }

        .monitor-email {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .monitor-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .btn-stop {
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-stop:hover {
          background: #ff497620;
          border-color: #ff4976;
          color: #ff4976;
        }

        .monitor-info-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
        }

        .monitor-info-panel h3 {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 16px;
          color: var(--text-primary);
        }

        .monitor-info-panel ul {
          list-style: none;
          padding: 0;
          margin: 0 0 20px 0;
        }

        .monitor-info-panel li {
          padding: 8px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .info-box {
          padding: 16px;
          border-radius: 6px;
          margin-top: 16px;
        }

        .info-box.warning {
          background: #ffd60a20;
          border: 1px solid #ffd60a40;
        }

        .info-box strong {
          color: #ffd60a;
          display: block;
          margin-bottom: 8px;
        }

        .info-box p {
          margin: 8px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .info-box pre {
          background: var(--bg-primary);
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
          margin: 8px 0;
        }

        .info-box a {
          color: var(--primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
