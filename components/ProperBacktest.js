// components/ProperBacktest.js
// Professional Backtest - Uses SAME signals from Chart tab
// Simply manages trades when signals appear

'use client';
import { useState } from 'react';

export default function ProperBacktest({ 
  candles,
  signals, // USE SAME SIGNALS FROM CHART TAB!
  symbol = 'XAUUSD'
}) {
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Settings
  const [startBalance, setStartBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [riskRewardRatio, setRiskRewardRatio] = useState(2.5);

  const runBacktest = () => {
    if (!candles || candles.length < 50) {
      alert('Need at least 50 candles');
      return;
    }

    if (!signals || signals.length === 0) {
      alert('No signals detected! Make sure Chart tab shows signals first.');
      return;
    }

    setIsRunning(true);
    setProgress(0);

    setTimeout(() => {
      const backtestResults = executeBacktest();
      setResults(backtestResults);
      setIsRunning(false);
    }, 100);
  };

  const executeBacktest = () => {
    console.log('\n🔬 ========================================');
    console.log('   BACKTEST STARTING');
    console.log('========================================');
    console.log(`Start Balance: $${startBalance}`);
    console.log(`Risk Per Trade: ${riskPercent}%`);
    console.log(`Risk:Reward: 1:${riskRewardRatio}`);
    console.log(`Signals Available: ${signals.length}`);
    console.log('========================================\n');

    const trades = [];
    let balance = startBalance;
    let peak = startBalance;
    let maxDrawdown = 0;

    // Create a map of candle index to signals
    const signalsByIndex = {};
    signals.forEach(signal => {
      const candleIndex = candles.findIndex(c => 
        new Date(c.timestamp).getTime() === new Date(signal.timestamp).getTime()
      );
      
      if (candleIndex >= 0) {
        if (!signalsByIndex[candleIndex]) {
          signalsByIndex[candleIndex] = [];
        }
        signalsByIndex[candleIndex].push(signal);
      }
    });

    console.log(`Mapped ${Object.keys(signalsByIndex).length} candles with signals`);

    // Track open trades
    const openTrades = [];

    // Loop through all candles
    for (let i = 50; i < candles.length; i++) {
      const currentCandle = candles[i];
      
      // Update progress
      if (i % 50 === 0) {
        setProgress(Math.round((i / candles.length) * 100));
      }

      // === 1. CHECK OPEN TRADES (close if SL/TP hit) ===
      for (let j = openTrades.length - 1; j >= 0; j--) {
        const trade = openTrades[j];
        const closed = checkTradeClose(trade, currentCandle);
        
        if (closed) {
          const pnl = closed.pnl;
          balance += pnl;
          
          // Track drawdown
          if (balance > peak) peak = balance;
          const currentDD = ((peak - balance) / peak) * 100;
          if (currentDD > maxDrawdown) maxDrawdown = currentDD;
          
          // Record completed trade
          trades.push({
            ...trade,
            exitPrice: closed.exitPrice,
            exitTime: new Date(currentCandle.timestamp),
            exitIndex: i,
            pnl,
            result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE',
            balance
          });
          
          openTrades.splice(j, 1);
          
          console.log(`${pnl > 0 ? '✅ WIN' : '❌ LOSS'} - Trade #${trades.length}`);
          console.log(`   ${trade.direction} ${symbol}`);
          console.log(`   Entry: ${trade.entryPrice.toFixed(2)}`);
          console.log(`   Exit: ${closed.exitPrice.toFixed(2)} (${closed.reason})`);
          console.log(`   P&L: $${pnl.toFixed(2)}`);
          console.log(`   Balance: $${balance.toFixed(2)}\n`);
        }
      }

      // === 2. CHECK FOR NEW SIGNALS AT THIS CANDLE ===
      const candleSignals = signalsByIndex[i];
      
      if (!candleSignals || candleSignals.length === 0) {
        continue; // No signal at this candle
      }

      // Don't open new trade if already have one
      if (openTrades.length > 0) {
        continue;
      }

      // Use the first signal (highest priority)
      const signal = candleSignals[0];
      
      // Determine direction
      let direction = 'BUY';
      if (signal.type === 'SSL' || signal.type === 'SELL' || signal.direction === 'SELL') {
        direction = 'SELL';
      }
      if (signal.type === 'BOS' && signal.direction === 'BEARISH') {
        direction = 'SELL';
      }

      // Calculate trade parameters
      const atr = calculateATR(candles, i);
      const stopDistance = Math.max(atr * 1.5, 0.20); // Min 20 pips for gold
      const targetDistance = stopDistance * riskRewardRatio;
      
      const entryPrice = currentCandle.close;
      const stopLoss = direction === 'BUY' 
        ? entryPrice - stopDistance 
        : entryPrice + stopDistance;
      const takeProfit = direction === 'BUY'
        ? entryPrice + targetDistance
        : entryPrice - targetDistance;
      
      // Calculate position size
      const riskAmount = (balance * riskPercent) / 100;
      const stopPips = stopDistance * 100;
      const positionSize = Math.max(0.01, riskAmount / (stopPips * 1.0));
      
      // Create trade
      const trade = {
        id: `trade_${i}`,
        direction,
        symbol,
        entryPrice,
        stopLoss,
        takeProfit,
        entryTime: new Date(currentCandle.timestamp),
        entryIndex: i,
        positionSize,
        risk: riskAmount,
        signalType: signal.type,
        stopDistance,
        targetDistance
      };

      openTrades.push(trade);
      
      console.log(`🎯 NEW TRADE OPENED - #${trades.length + 1}`);
      console.log(`   ${direction} ${symbol} @ ${entryPrice.toFixed(2)}`);
      console.log(`   Signal: ${signal.type}`);
      console.log(`   SL: ${stopLoss.toFixed(2)}`);
      console.log(`   TP: ${takeProfit.toFixed(2)}`);
      console.log(`   Risk: $${riskAmount.toFixed(2)}`);
      console.log(`   Size: ${positionSize.toFixed(3)} lots\n`);
    }

    // Close any remaining open trades at end
    for (const trade of openTrades) {
      const lastCandle = candles[candles.length - 1];
      trades.push({
        ...trade,
        exitPrice: lastCandle.close,
        exitTime: new Date(lastCandle.timestamp),
        exitIndex: candles.length - 1,
        pnl: 0,
        result: 'BE',
        balance
      });
    }

    // Calculate statistics
    const stats = calculateStats(trades, startBalance, balance, maxDrawdown);

    console.log('\n========================================');
    console.log('   BACKTEST COMPLETE');
    console.log('========================================');
    console.log(`Total Trades: ${trades.length}`);
    console.log(`Wins: ${stats.wins}`);
    console.log(`Losses: ${stats.losses}`);
    console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
    console.log(`Start: $${startBalance}`);
    console.log(`End: $${balance.toFixed(2)}`);
    console.log(`Return: ${stats.totalReturn.toFixed(2)}%`);
    console.log(`Max DD: ${maxDrawdown.toFixed(2)}%`);
    console.log('========================================\n');

    return {
      trades,
      stats,
      startBalance,
      endBalance: balance,
      maxDrawdown
    };
  };

  const checkTradeClose = (trade, candle) => {
    if (trade.direction === 'BUY') {
      // Check stop loss
      if (candle.low <= trade.stopLoss) {
        return {
          exitPrice: trade.stopLoss,
          pnl: -trade.risk,
          reason: 'Stop Loss'
        };
      }
      // Check take profit
      if (candle.high >= trade.takeProfit) {
        return {
          exitPrice: trade.takeProfit,
          pnl: trade.risk * riskRewardRatio,
          reason: 'Take Profit'
        };
      }
    } else {
      // SELL trade
      if (candle.high >= trade.stopLoss) {
        return {
          exitPrice: trade.stopLoss,
          pnl: -trade.risk,
          reason: 'Stop Loss'
        };
      }
      if (candle.low <= trade.takeProfit) {
        return {
          exitPrice: trade.takeProfit,
          pnl: trade.risk * riskRewardRatio,
          reason: 'Take Profit'
        };
      }
    }
    return null;
  };

  const calculateATR = (candles, currentIndex, period = 14) => {
    if (currentIndex < period) return 0.50;

    let atr = 0;
    for (let i = currentIndex - period; i < currentIndex; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      atr += tr;
    }
    return atr / period;
  };

  const calculateStats = (trades, startBal, endBal, maxDD) => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalReturn: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0
      };
    }

    const wins = trades.filter(t => t.result === 'WIN');
    const losses = trades.filter(t => t.result === 'LOSS');
    
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    
    const winRate = (wins.length / trades.length) * 100;
    const totalReturn = ((endBal - startBal) / startBal) * 100;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: trades.filter(t => t.result === 'BE').length,
      winRate,
      totalReturn,
      profitFactor,
      avgWin,
      avgLoss,
      expectancy,
      maxDrawdown: maxDD,
      bestTrade: Math.max(...trades.map(t => t.pnl)),
      worstTrade: Math.min(...trades.map(t => t.pnl))
    };
  };

  return (
    <div className="backtest-panel">
      <div className="backtest-header">
        <h2>🔬 Professional Backtest</h2>
        <p>Uses SAME signals from Chart tab - {signals?.length || 0} signals available</p>
      </div>

      {/* Settings */}
      <div className="backtest-settings">
        <h3>⚙️ Settings</h3>
        
        <div className="settings-grid">
          <div className="setting-item">
            <label>Starting Balance ($)</label>
            <input
              type="number"
              value={startBalance}
              onChange={(e) => setStartBalance(Number(e.target.value))}
              disabled={isRunning}
              min="1000"
              step="1000"
            />
          </div>

          <div className="setting-item">
            <label>Risk Per Trade (%)</label>
            <input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              disabled={isRunning}
              min="0.1"
              max="5"
              step="0.1"
            />
          </div>

          <div className="setting-item">
            <label>Risk:Reward Ratio</label>
            <select
              value={riskRewardRatio}
              onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
              disabled={isRunning}
            >
              <option value="2">1:2</option>
              <option value="2.5">1:2.5</option>
              <option value="3">1:3</option>
              <option value="4">1:4</option>
            </select>
          </div>
        </div>

        <button
          className="run-btn"
          onClick={runBacktest}
          disabled={isRunning || !signals || signals.length === 0}
        >
          {isRunning ? `Running... ${progress}%` : '▶️ Run Backtest'}
        </button>

        {isRunning && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="results">
          <h3>✅ Results</h3>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="card">
              <div className="card-label">Total Return</div>
              <div className={`card-value ${results.stats.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                {results.stats.totalReturn >= 0 ? '+' : ''}{results.stats.totalReturn.toFixed(2)}%
              </div>
            </div>

            <div className="card">
              <div className="card-label">Win Rate</div>
              <div className="card-value">{results.stats.winRate.toFixed(1)}%</div>
            </div>

            <div className="card">
              <div className="card-label">Profit Factor</div>
              <div className="card-value">{results.stats.profitFactor.toFixed(2)}</div>
            </div>

            <div className="card">
              <div className="card-label">Max Drawdown</div>
              <div className="card-value negative">{results.maxDrawdown.toFixed(2)}%</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="detailed-stats">
            <div className="stat-row">
              <span>Total Trades:</span>
              <strong>{results.stats.totalTrades}</strong>
            </div>
            <div className="stat-row">
              <span>Wins:</span>
              <strong className="positive">{results.stats.wins}</strong>
            </div>
            <div className="stat-row">
              <span>Losses:</span>
              <strong className="negative">{results.stats.losses}</strong>
            </div>
            <div className="stat-row">
              <span>Start Balance:</span>
              <strong>${results.startBalance.toFixed(2)}</strong>
            </div>
            <div className="stat-row">
              <span>End Balance:</span>
              <strong className={results.endBalance >= results.startBalance ? 'positive' : 'negative'}>
                ${results.endBalance.toFixed(2)}
              </strong>
            </div>
            <div className="stat-row">
              <span>Average Win:</span>
              <strong className="positive">${results.stats.avgWin.toFixed(2)}</strong>
            </div>
            <div className="stat-row">
              <span>Average Loss:</span>
              <strong className="negative">${results.stats.avgLoss.toFixed(2)}</strong>
            </div>
            <div className="stat-row">
              <span>Best Trade:</span>
              <strong className="positive">${results.stats.bestTrade.toFixed(2)}</strong>
            </div>
            <div className="stat-row">
              <span>Worst Trade:</span>
              <strong className="negative">${results.stats.worstTrade.toFixed(2)}</strong>
            </div>
            <div className="stat-row">
              <span>Expectancy:</span>
              <strong className={results.stats.expectancy >= 0 ? 'positive' : 'negative'}>
                ${results.stats.expectancy.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Trade Log */}
          <details className="trade-log">
            <summary>📋 Trade Log ({results.trades.length} trades)</summary>
            <div className="log-table-container">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Result</th>
                    <th>P&L</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {results.trades.map((trade, idx) => (
                    <tr key={idx} className={trade.result.toLowerCase()}>
                      <td>{idx + 1}</td>
                      <td>{trade.direction}</td>
                      <td>{trade.entryPrice.toFixed(2)}</td>
                      <td>{trade.exitPrice.toFixed(2)}</td>
                      <td className={trade.result.toLowerCase()}>{trade.result}</td>
                      <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                        ${trade.pnl.toFixed(2)}
                      </td>
                      <td>${trade.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <style jsx>{`
        .backtest-panel {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .backtest-header h2 {
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }

        .backtest-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .backtest-settings {
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .backtest-settings h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .setting-item label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .setting-item input,
        .setting-item select {
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .run-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--primary) 0%, #00b894 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .run-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .progress-bar {
          margin-top: 12px;
          background: var(--bg-primary);
          border-radius: 8px;
          overflow: hidden;
          height: 8px;
        }

        .progress-fill {
          background: var(--primary);
          height: 100%;
          transition: width 0.3s;
        }

        .results {
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
        }

        .results h3 {
          margin: 0 0 20px 0;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .card {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .card-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 24px;
          font-weight: 700;
        }

        .card-value.positive {
          color: #00d4aa;
        }

        .card-value.negative {
          color: #ff4976;
        }

        .detailed-stats {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .stat-row span {
          color: var(--text-secondary);
        }

        .stat-row strong {
          color: var(--text-primary);
        }

        .stat-row strong.positive {
          color: #00d4aa;
        }

        .stat-row strong.negative {
          color: #ff4976;
        }

        .trade-log {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: 8px;
          cursor: pointer;
        }

        .trade-log summary {
          font-size: 14px;
          font-weight: 600;
          list-style: none;
        }

        .log-table-container {
          margin-top: 16px;
          overflow-x: auto;
        }

        .log-table {
          width: 100%;
          font-size: 12px;
          border-collapse: collapse;
        }

        .log-table th {
          background: var(--bg-tertiary);
          padding: 8px;
          text-align: left;
          font-weight: 600;
        }

        .log-table td {
          padding: 8px;
          border-bottom: 1px solid var(--border);
        }

        .log-table tr.win {
          background: rgba(0, 212, 170, 0.05);
        }

        .log-table tr.loss {
          background: rgba(255, 73, 118, 0.05);
        }

        .log-table td.win {
          color: #00d4aa;
          font-weight: 600;
        }

        .log-table td.loss {
          color: #ff4976;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
