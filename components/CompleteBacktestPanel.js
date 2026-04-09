// components/CompleteBacktestPanel.js
// Professional Backtesting - Uses EXACT same signals as Chart tab
// Simply manages trades when signals appear

'use client';
import { useState } from 'react';

export default function CompleteBacktestPanel({ 
  candles, 
  htfCandles,
  signals,  // ← RECEIVES SIGNALS FROM CHART TAB!
  symbol = 'XAUUSD',
  timeframe = '5m'
}) {
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  
  // Backtest settings
  const [startBalance, setStartBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [riskRewardRatio, setRiskRewardRatio] = useState(2.5);

  const runBacktest = async () => {
    if (!candles || candles.length < 100) {
      alert('Need at least 100 candles for backtest');
      return;
    }

    if (!signals || signals.length === 0) {
      alert('No signals found! Make sure Chart tab shows BUY/SELL signals first.\n\nLoad data and wait for signals to appear on chart, then run backtest.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentStatus('Initializing backtest...');

    // Use setTimeout to allow UI to update
    setTimeout(async () => {
      try {
        const backtestResults = await executeBacktest();
        setResults(backtestResults);
        setCurrentStatus('Backtest complete!');
      } catch (error) {
        console.error('Backtest error:', error);
        setCurrentStatus(`Error: ${error.message}`);
        alert(`Backtest failed: ${error.message}`);
      } finally {
        setIsRunning(false);
      }
    }, 100);
  };

  const executeBacktest = async () => {
    console.log('\n🔬 ========================================');
    console.log('   BACKTEST STARTING');
    console.log('========================================');
    console.log(`Start Balance: $${startBalance}`);
    console.log(`Risk Per Trade: ${riskPercent}%`);
    console.log(`Risk:Reward: 1:${riskRewardRatio}`);
    console.log(`Total Candles: ${candles.length}`);
    console.log(`Signals Available: ${signals.length}`);

    // ============================================
    // FILTER SIGNALS - ONLY BUY/SELL (NO IMPULSE, MOMENTUM, ETC.)
    // ============================================
    const filterSignalsForBacktest = (allSignals) => {
      // Signal types to KEEP (convert to BUY/SELL)
      const BULLISH_TYPES = ['BUY', 'BSL', 'SSL', 'BUY_IMPULSE', 'BULLISH_MSS', 'BULLISH_BOS', 
                             'BULLISH_INDUCEMENT', 'BULLISH_BREAKER', 'BULLISH_MITIGATION', 'BULLISH_FVG'];
      const BEARISH_TYPES = ['SELL', 'BSL_SELL', 'SELL_IMPULSE', 'BEARISH_MSS', 'BEARISH_BOS',
                             'BEARISH_INDUCEMENT', 'BEARISH_BREAKER', 'BEARISH_MITIGATION', 'BEARISH_FVG'];
      
      // Signal types to HIDE (analysis signals, not trades)
      const HIDDEN_TYPES = ['IMPULSE_UP', 'IMPULSE_DOWN', 'MOMENTUM_UP', 'MOMENTUM_DOWN', 
                           'MOMENTUM_BREAKDOWN', 'STRUCTURE_BREAK', 'LIQUIDITY_DETECTED', 
                           'ORDER_BLOCK_DETECTED', 'FVG_DETECTED', 'ANALYSIS', 'INFO'];
      
      return allSignals
        .filter(signal => {
          const type = signal.type?.toUpperCase();
          // Remove hidden signals
          if (HIDDEN_TYPES.includes(type)) return false;
          // Keep tradeable signals
          return BULLISH_TYPES.includes(type) || BEARISH_TYPES.includes(type);
        })
        .map(signal => {
          // Simplify to BUY or SELL
          const type = signal.type?.toUpperCase();
          const isBullish = BULLISH_TYPES.includes(type);
          return {
            ...signal,
            type: isBullish ? 'BUY' : 'SELL',
            originalType: signal.type // Preserve original
          };
        });
    };

    // Filter signals to only tradeable BUY/SELL
    const tradeableSignals = filterSignalsForBacktest(signals);
    
    console.log(`Original Signals: ${signals.length}`);
    console.log(`Tradeable Signals (BUY/SELL only): ${tradeableSignals.length}`);
    console.log(`Filtered Out: ${signals.length - tradeableSignals.length}`);
    console.log('========================================\n');

    const trades = [];
    const openTrades = [];
    let balance = startBalance;
    let peak = startBalance;
    let maxDrawdown = 0;

    // Create map of candle index -> signals at that candle
    const signalsByIndex = {};
    let mappedSignals = 0;
    
    tradeableSignals.forEach(signal => {
      if (signal.index !== undefined && signal.index >= 0) {
        if (!signalsByIndex[signal.index]) {
          signalsByIndex[signal.index] = [];
        }
        signalsByIndex[signal.index].push(signal);
        mappedSignals++;
      }
    });

    console.log(`✅ Mapped ${mappedSignals} signals to candle indices`);
    console.log(`   Unique candles with signals: ${Object.keys(signalsByIndex).length}\n`);

    if (mappedSignals === 0) {
      throw new Error('No signals could be mapped to candles. Signals may be missing index property.');
    }

    // Loop through each candle
    for (let i = 50; i < candles.length; i++) {
      const currentCandle = candles[i];
      
      // Update progress every 50 candles
      if (i % 50 === 0) {
        const progressPercent = Math.round((i / candles.length) * 100);
        setProgress(progressPercent);
        setCurrentStatus(`Processing candle ${i}/${candles.length} (${progressPercent}%)`);
      }

      // === 1. CHECK OPEN TRADES - Close if SL or TP hit ===
      for (let j = openTrades.length - 1; j >= 0; j--) {
        const trade = openTrades[j];
        const closeResult = checkTradeClose(trade, currentCandle, i);
        
        if (closeResult) {
          // Trade closed!
          const pnl = closeResult.pnl;
          balance += pnl;
          
          // Track drawdown
          if (balance > peak) peak = balance;
          const currentDD = ((peak - balance) / peak) * 100;
          if (currentDD > maxDrawdown) maxDrawdown = currentDD;
          
          // Record completed trade
          const completedTrade = {
            ...trade,
            exitPrice: closeResult.exitPrice,
            exitTime: new Date(currentCandle.timestamp),
            exitIndex: i,
            pnl,
            pnlPercent: (pnl / trade.risk) * 100,
            result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE',
            holdingPeriod: i - trade.entryIndex,
            balance
          };
          
          trades.push(completedTrade);
          openTrades.splice(j, 1);
          
          console.log(`${pnl > 0 ? '✅ WIN' : '❌ LOSS'} - Trade #${trades.length}`);
          console.log(`   ${trade.direction} ${symbol}`);
          console.log(`   Entry: ${trade.entryPrice.toFixed(2)} @ ${new Date(trade.entryTime).toLocaleTimeString()}`);
          console.log(`   Exit: ${closeResult.exitPrice.toFixed(2)} @ ${new Date(currentCandle.timestamp).toLocaleTimeString()} (${closeResult.reason})`);
          console.log(`   P&L: $${pnl.toFixed(2)}`);
          console.log(`   Held: ${completedTrade.holdingPeriod} candles`);
          console.log(`   Balance: $${balance.toFixed(2)}\n`);
        }
      }

      // === 2. CHECK FOR NEW SIGNALS AT THIS CANDLE ===
      const candleSignals = signalsByIndex[i];
      
      if (!candleSignals || candleSignals.length === 0) {
        continue; // No signals at this candle
      }

      // Risk management: Only 1 trade open at a time
      if (openTrades.length > 0) {
        continue; // Already have an open trade
      }

      // Use the first signal (they're all at the same candle)
      const signal = candleSignals[0];
      
      // Determine direction from signal type
      let direction = 'BUY';
      if (signal.type === 'SSL' || signal.type === 'SELL_IMPULSE' || signal.type === 'BEARISH_MSS') {
        direction = 'SELL';
      } else if (signal.type === 'BSL' || signal.type === 'BUY_IMPULSE' || signal.type === 'BULLISH_MSS') {
        direction = 'BUY';
      }

      // Calculate trade parameters
      const atr = calculateATR(candles, i, 14);
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
      const stopPips = stopDistance * 100; // Convert to pips
      const positionSize = Math.max(0.01, riskAmount / (stopPips * 1.0)); // $1 per pip per 0.01 lot
      
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
        targetDistance,
        rrRatio: riskRewardRatio
      };

      openTrades.push(trade);
      
      console.log(`🎯 NEW TRADE OPENED - #${trades.length + openTrades.length}`);
      console.log(`   ${direction} ${symbol} @ ${entryPrice.toFixed(2)}`);
      console.log(`   Signal: ${direction} (candle ${i})`); // Show BUY or SELL
      console.log(`   SL: ${stopLoss.toFixed(2)} (${stopDistance.toFixed(2)} distance)`);
      console.log(`   TP: ${takeProfit.toFixed(2)} (${targetDistance.toFixed(2)} distance)`);
      console.log(`   RR: 1:${riskRewardRatio}`);
      console.log(`   Risk: $${riskAmount.toFixed(2)}`);
      console.log(`   Size: ${positionSize.toFixed(3)} lots\n`);
    }

    // Close any remaining open trades at end
    for (const trade of openTrades) {
      const lastCandle = candles[candles.length - 1];
      const pnl = 0; // Close at break-even
      
      trades.push({
        ...trade,
        exitPrice: lastCandle.close,
        exitTime: new Date(lastCandle.timestamp),
        exitIndex: candles.length - 1,
        pnl: 0,
        pnlPercent: 0,
        result: 'BE',
        holdingPeriod: candles.length - 1 - trade.entryIndex,
        balance
      });
    }

    // Calculate final statistics
    const stats = calculateBacktestStats(trades, startBalance, balance, peak, maxDrawdown);

    console.log('\n========================================');
    console.log('   BACKTEST COMPLETE');
    console.log('========================================');
    console.log(`Total Trades: ${trades.length}`);
    console.log(`Wins: ${stats.wins} (${stats.winRate.toFixed(1)}%)`);
    console.log(`Losses: ${stats.losses}`);
    console.log(`Start Balance: $${startBalance.toFixed(2)}`);
    console.log(`End Balance: $${balance.toFixed(2)}`);
    console.log(`Total Return: ${stats.totalReturn.toFixed(2)}%`);
    console.log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
    console.log(`Profit Factor: ${stats.profitFactor.toFixed(2)}`);
    console.log('========================================\n');

    return {
      trades,
      stats,
      startBalance,
      endBalance: balance,
      peak,
      maxDrawdown,
      signalsUsed: mappedSignals
    };
  };

  // Helper: Check if trade should close
  const checkTradeClose = (trade, candle, currentIndex) => {
    if (trade.direction === 'BUY') {
      // Check stop loss hit
      if (candle.low <= trade.stopLoss) {
        return {
          exitPrice: trade.stopLoss,
          pnl: -trade.risk,
          reason: 'Stop Loss'
        };
      }
      // Check take profit hit
      if (candle.high >= trade.takeProfit) {
        return {
          exitPrice: trade.takeProfit,
          pnl: trade.risk * trade.rrRatio,
          reason: 'Take Profit'
        };
      }
    } else {
      // SELL trade
      // Check stop loss hit
      if (candle.high >= trade.stopLoss) {
        return {
          exitPrice: trade.stopLoss,
          pnl: -trade.risk,
          reason: 'Stop Loss'
        };
      }
      // Check take profit hit
      if (candle.low <= trade.takeProfit) {
        return {
          exitPrice: trade.takeProfit,
          pnl: trade.risk * trade.rrRatio,
          reason: 'Take Profit'
        };
      }
    }
    return null; // Trade still open
  };

  // Helper: Calculate ATR
  const calculateATR = (candles, currentIndex, period = 14) => {
    if (currentIndex < period) return 0.50; // Default for gold

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

  // Helper: Calculate backtest statistics
  const calculateBacktestStats = (trades, startBal, endBal, peak, maxDD) => {
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
        expectancy: 0,
        sharpeRatio: 0
      };
    }

    const wins = trades.filter(t => t.result === 'WIN');
    const losses = trades.filter(t => t.result === 'LOSS');
    
    const totalWinAmount = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    
    const winRate = (wins.length / trades.length) * 100;
    const totalReturn = ((endBal - startBal) / startBal) * 100;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;
    
    const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;
    
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
      worstTrade: Math.min(...trades.map(t => t.pnl)),
      avgHoldingPeriod: trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length
    };
  };

  return (
    <div className="backtest-panel">
      <div className="backtest-header">
        <h2>🔬 Professional Backtest</h2>
        <p>
          Uses EXACT signals from Chart tab • {signals?.length || 0} signals available
        </p>
      </div>

      {!signals || signals.length === 0 ? (
        <div className="no-signals-warning">
          <h3>⚠️ No Signals Available</h3>
          <p>The Chart tab hasn't generated any signals yet.</p>
          <p><strong>Steps to fix:</strong></p>
          <ol>
            <li>Go to Chart & Analysis tab</li>
            <li>Load data (click "Load Data" button)</li>
            <li>Wait for signals to appear on chart</li>
            <li>Come back to Backtest tab and run again</li>
          </ol>
        </div>
      ) : (
        <>
          {/* Settings */}
          <div className="backtest-settings">
            <h3>⚙️ Backtest Settings</h3>
            
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
                  <option value="5">1:5</option>
                </select>
              </div>
            </div>

            <button
              className="run-backtest-btn"
              onClick={runBacktest}
              disabled={isRunning || !candles || candles.length < 100}
            >
              {isRunning ? `Running... ${progress}%` : '▶️ Run Backtest'}
            </button>

            {isRunning && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">{currentStatus}</span>
              </div>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="backtest-results">
              <h3>✅ Backtest Results</h3>
              
              <div className="signals-info">
                <span>📊 Analyzed {results.signalsUsed} signals from Chart tab</span>
              </div>

              {/* Performance Summary */}
              <div className="results-summary">
                <div className="summary-card">
                  <div className="card-label">Total Return</div>
                  <div className={`card-value ${results.stats.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                    {results.stats.totalReturn >= 0 ? '+' : ''}{results.stats.totalReturn.toFixed(2)}%
                  </div>
                </div>

                <div className="summary-card">
                  <div className="card-label">Win Rate</div>
                  <div className="card-value">{results.stats.winRate.toFixed(1)}%</div>
                </div>

                <div className="summary-card">
                  <div className="card-label">Profit Factor</div>
                  <div className="card-value">{results.stats.profitFactor.toFixed(2)}</div>
                </div>

                <div className="summary-card">
                  <div className="card-label">Max Drawdown</div>
                  <div className="card-value negative">{results.maxDrawdown.toFixed(2)}%</div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="detailed-stats">
                <div className="stats-grid">
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
                    <span>Break-even:</span>
                    <strong>{results.stats.breakeven}</strong>
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
                  <div className="stat-row">
                    <span>Avg Holding:</span>
                    <strong>{results.stats.avgHoldingPeriod.toFixed(0)} candles</strong>
                  </div>
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
                        <th>Direction</th>
                        <th>Signal</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>SL</th>
                        <th>TP</th>
                        <th>Result</th>
                        <th>P&L</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.trades.map((trade, index) => (
                        <tr key={index} className={trade.result.toLowerCase()}>
                          <td>{index + 1}</td>
                          <td>{trade.direction}</td>
                          <td>{trade.direction}</td> {/* Show BUY or SELL only */}
                          <td>{trade.entryPrice.toFixed(2)}</td>
                          <td>{trade.exitPrice.toFixed(2)}</td>
                          <td>{trade.stopLoss.toFixed(2)}</td>
                          <td>{trade.takeProfit.toFixed(2)}</td>
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
        </>
      )}

      <style jsx>{`
        .backtest-panel {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .backtest-header {
          margin-bottom: 24px;
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

        .no-signals-warning {
          background: rgba(255, 193, 7, 0.1);
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
        }

        .no-signals-warning h3 {
          color: #ffc107;
          margin: 0 0 12px 0;
        }

        .no-signals-warning p {
          color: var(--text-secondary);
          margin: 8px 0;
        }

        .no-signals-warning ol {
          text-align: left;
          max-width: 400px;
          margin: 16px auto;
          color: var(--text-primary);
        }

        .no-signals-warning li {
          margin: 8px 0;
        }

        .backtest-settings {
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .backtest-settings h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
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

        .setting-item input[type="number"],
        .setting-item select {
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .run-backtest-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--primary) 0%, #00b894 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .run-backtest-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        }

        .run-backtest-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .progress-bar {
          margin-top: 12px;
          background: var(--bg-primary);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          height: 32px;
        }

        .progress-fill {
          background: linear-gradient(90deg, var(--primary) 0%, #00b894 100%);
          height: 100%;
          transition: width 0.3s;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 600;
        }

        .backtest-results {
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 8px;
        }

        .backtest-results h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary);
        }

        .signals-info {
          background: rgba(0, 212, 170, 0.1);
          border-left: 3px solid var(--primary);
          padding: 12px;
          margin-bottom: 20px;
          border-radius: 4px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .results-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .card-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .stat-row span {
          color: var(--text-secondary);
          font-size: 13px;
        }

        .stat-row strong {
          color: var(--text-primary);
          font-size: 14px;
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
          color: var(--text-primary);
          list-style: none;
          user-select: none;
        }

        .trade-log summary::-webkit-details-marker {
          display: none;
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
          color: var(--text-secondary);
          position: sticky;
          top: 0;
        }

        .log-table td {
          padding: 8px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
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

        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }

          .results-summary {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
