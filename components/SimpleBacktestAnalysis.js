// components/SimpleBacktestAnalysis.js
// Simple backtest display for understanding returns
// NOT for actual trading - just to see what WOULD have happened

'use client';
import { useState, useEffect } from 'react';

export default function SimpleBacktestAnalysis({ signals, candles }) {
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (signals && candles && signals.length > 0) {
      calculateReturns();
    }
  }, [signals, candles]);

  const calculateReturns = () => {
    const trades = [];
    let balance = 10000; // Starting balance
    let wins = 0;
    let losses = 0;

    signals.forEach((signal, index) => {
      // Find signal in candles
      const entryIndex = candles.findIndex(c => c.timestamp === signal.timestamp);
      if (entryIndex === -1 || entryIndex >= candles.length - 20) return;

      const entry = signal.entry || signal.price;
      const stop = signal.stop || signal.stopLoss;
      const target = signal.target || signal.takeProfit;
      const direction = signal.direction || signal.type;

      if (!entry || !stop || !target) return;

      // Simulate trade
      const isBuy = direction?.toUpperCase().includes('BUY');
      let exitPrice = null;
      let exitType = null;
      let bars = 0;

      // Look ahead to find stop or target
      for (let i = 1; i < 50 && entryIndex + i < candles.length; i++) {
        const candle = candles[entryIndex + i];
        bars = i;

        if (isBuy) {
          if (candle.low <= stop) {
            exitPrice = stop;
            exitType = 'STOP';
            break;
          }
          if (candle.high >= target) {
            exitPrice = target;
            exitType = 'TARGET';
            break;
          }
        } else {
          if (candle.high >= stop) {
            exitPrice = stop;
            exitType = 'STOP';
            break;
          }
          if (candle.low <= target) {
            exitPrice = target;
            exitType = 'TARGET';
            break;
          }
        }
      }

      if (!exitPrice) {
        exitPrice = candles[Math.min(entryIndex + 50, candles.length - 1)].close;
        exitType = 'TIME';
      }

      // Calculate P/L
      const riskAmount = balance * 0.01; // 1% risk
      const stopDistance = Math.abs(entry - stop);
      const profitDistance = isBuy ? (exitPrice - entry) : (entry - exitPrice);
      const pnl = (profitDistance / stopDistance) * riskAmount;

      balance += pnl;

      if (pnl > 0) wins++;
      else losses++;

      trades.push({
        number: trades.length + 1,
        date: new Date(signal.timestamp).toLocaleDateString(),
        direction: isBuy ? 'BUY' : 'SELL',
        entry,
        exit: exitPrice,
        exitType,
        pnl,
        balance,
        bars,
        confluence: signal.confluence || 0
      });
    });

    const totalReturn = ((balance - 10000) / 10000) * 100;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    setResults({
      trades,
      initialBalance: 10000,
      finalBalance: balance,
      totalReturn,
      wins,
      losses,
      winRate,
      totalTrades: trades.length
    });
  };

  if (!results) {
    return (
      <div className="backtest-simple">
        <p>📊 Load data to see backtest analysis</p>
      </div>
    );
  }

  const isProfit = results.totalReturn >= 0;

  return (
    <div className="backtest-simple">
      <div className="backtest-header">
        <h3>📊 Backtest Analysis (Understanding Returns)</h3>
        <p className="backtest-note">
          ⚠️ This shows what WOULD have happened - NOT actual trades
        </p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-row">
        <div className="metric-box">
          <div className="metric-label">Total Return</div>
          <div className={`metric-value ${isProfit ? 'positive' : 'negative'}`}>
            {isProfit ? '+' : ''}{results.totalReturn.toFixed(2)}%
          </div>
          <div className="metric-detail">
            ${results.initialBalance.toLocaleString()} → ${results.finalBalance.toLocaleString()}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Win Rate</div>
          <div className="metric-value">
            {results.winRate.toFixed(1)}%
          </div>
          <div className="metric-detail">
            {results.wins}W / {results.losses}L
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Total Trades</div>
          <div className="metric-value">
            {results.totalTrades}
          </div>
          <div className="metric-detail">
            Tested signals
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="trades-section">
        <div className="trades-header" onClick={() => setExpanded(!expanded)}>
          <h4>Trade-by-Trade Details ({results.trades.length})</h4>
          <button>{expanded ? '▼ Hide' : '▶ Show'}</button>
        </div>

        {expanded && (
          <div className="trades-table-container">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Dir</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Type</th>
                  <th>P/L</th>
                  <th>Balance</th>
                  <th>Conf</th>
                </tr>
              </thead>
              <tbody>
                {results.trades.map((trade, idx) => (
                  <tr key={idx} className={trade.pnl >= 0 ? 'win' : 'loss'}>
                    <td>{trade.number}</td>
                    <td>{trade.date}</td>
                    <td>{trade.direction}</td>
                    <td>{trade.entry.toFixed(2)}</td>
                    <td>{trade.exit.toFixed(2)}</td>
                    <td>{trade.exitType}</td>
                    <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                    <td>${trade.balance.toFixed(2)}</td>
                    <td>{trade.confluence}/6</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .backtest-simple {
          padding: 20px;
          background: var(--bg-primary);
          border-radius: 12px;
        }

        .backtest-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .backtest-note {
          margin: 0 0 20px 0;
          padding: 8px 12px;
          background: rgba(255, 214, 10, 0.1);
          border: 1px solid #ffd60a;
          border-radius: 6px;
          font-size: 13px;
          color: #ffd60a;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }

        .metric-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .metric-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--text-primary);
        }

        .metric-value.positive {
          color: #00d4aa;
        }

        .metric-value.negative {
          color: #ff4976;
        }

        .metric-detail {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .trades-section {
          margin-top: 20px;
        }

        .trades-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 16px;
        }

        .trades-header:hover {
          background: var(--bg-tertiary);
        }

        .trades-header h4 {
          margin: 0;
          font-size: 16px;
          color: var(--text-primary);
        }

        .trades-header button {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .trades-table-container {
          overflow-x: auto;
        }

        .trades-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .trades-table thead {
          background: var(--bg-secondary);
        }

        .trades-table th {
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 2px solid var(--border);
        }

        .trades-table td {
          padding: 10px;
          border-bottom: 1px solid var(--border);
        }

        .trades-table tr.win {
          background: rgba(0, 212, 170, 0.05);
        }

        .trades-table tr.loss {
          background: rgba(255, 73, 118, 0.05);
        }

        .trades-table .positive {
          color: #00d4aa;
          font-weight: 600;
        }

        .trades-table .negative {
          color: #ff4976;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
