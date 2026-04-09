// components/ReplayMode.js
// FX Replay Mode - Practice Trading with Historical Data
// Bar-by-bar playback with speed control

'use client';
import { useState, useEffect, useRef } from 'react';

export default function ReplayMode({ 
  allCandles, // Full dataset
  symbol = 'XAUUSD',
  timeframe = '5m',
  onReplayUpdate // Callback with current visible candles
}) {
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(100); // Start with 100 candles visible
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [selectedDate, setSelectedDate] = useState(null);
  const [simulatedTrades, setSimulatedTrades] = useState([]);
  const [replayStats, setReplayStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    pnl: 0,
    winRate: 0
  });

  const intervalRef = useRef(null);

  // Initialize replay mode
  useEffect(() => {
    if (isReplayMode && allCandles && allCandles.length > 0) {
      // Set initial date to first candle
      if (!selectedDate) {
        setSelectedDate(allCandles[0].timestamp);
      }
      // Send initial visible candles
      updateVisibleCandles(currentIndex);
    }
  }, [isReplayMode, allCandles]);

  // Update visible candles
  const updateVisibleCandles = (index) => {
    if (!allCandles || allCandles.length === 0) return;
    
    const visibleCandles = allCandles.slice(0, Math.min(index, allCandles.length));
    if (onReplayUpdate) {
      onReplayUpdate(visibleCandles, {
        isReplayMode: true,
        currentIndex: index,
        totalCandles: allCandles.length,
        progress: (index / allCandles.length) * 100
      });
    }
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying && isReplayMode) {
      const delay = 1000 / playbackSpeed; // Speed in ms per candle
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= allCandles.length) {
            setIsPlaying(false);
            return prev;
          }
          const newIndex = prev + 1;
          updateVisibleCandles(newIndex);
          return newIndex;
        });
      }, delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isReplayMode, playbackSpeed, allCandles]);

  // Jump to specific date
  const jumpToDate = (date) => {
    if (!allCandles) return;
    
    const targetTimestamp = new Date(date).getTime();
    const index = allCandles.findIndex(c => 
      new Date(c.timestamp).getTime() >= targetTimestamp
    );
    
    if (index !== -1) {
      setCurrentIndex(index);
      updateVisibleCandles(index);
      setSelectedDate(date);
    }
  };

  // Control handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(100);
    updateVisibleCandles(100);
    setSimulatedTrades([]);
    setReplayStats({
      totalTrades: 0,
      wins: 0,
      losses: 0,
      pnl: 0,
      winRate: 0
    });
  };

  const handleStepForward = () => {
    if (currentIndex < allCandles.length) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      updateVisibleCandles(newIndex);
    }
  };

  const handleStepBackward = () => {
    if (currentIndex > 100) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      updateVisibleCandles(newIndex);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
  };

  // Simulated trade entry
  const enterTrade = (direction, entry, stop, target) => {
    const trade = {
      id: Date.now(),
      direction,
      entry,
      stop,
      target,
      entryIndex: currentIndex,
      entryTime: allCandles[currentIndex]?.timestamp,
      status: 'OPEN',
      pnl: 0
    };
    
    setSimulatedTrades(prev => [...prev, trade]);
  };

  // Check trade exits on each new candle
  useEffect(() => {
    if (!isReplayMode || simulatedTrades.length === 0) return;
    
    const currentCandle = allCandles[currentIndex];
    if (!currentCandle) return;

    const updatedTrades = simulatedTrades.map(trade => {
      if (trade.status !== 'OPEN') return trade;

      // Check stop loss
      if (trade.direction === 'BUY' && currentCandle.low <= trade.stop) {
        const pnl = (trade.stop - trade.entry) * 10; // Simple calculation
        updateStats('LOSS', pnl);
        return { ...trade, status: 'CLOSED', exitPrice: trade.stop, pnl, result: 'LOSS' };
      }
      if (trade.direction === 'SELL' && currentCandle.high >= trade.stop) {
        const pnl = (trade.entry - trade.stop) * 10;
        updateStats('LOSS', pnl);
        return { ...trade, status: 'CLOSED', exitPrice: trade.stop, pnl, result: 'LOSS' };
      }

      // Check take profit
      if (trade.direction === 'BUY' && currentCandle.high >= trade.target) {
        const pnl = (trade.target - trade.entry) * 10;
        updateStats('WIN', pnl);
        return { ...trade, status: 'CLOSED', exitPrice: trade.target, pnl, result: 'WIN' };
      }
      if (trade.direction === 'SELL' && currentCandle.low <= trade.target) {
        const pnl = (trade.entry - trade.target) * 10;
        updateStats('WIN', pnl);
        return { ...trade, status: 'CLOSED', exitPrice: trade.target, pnl, result: 'WIN' };
      }

      return trade;
    });

    setSimulatedTrades(updatedTrades);
  }, [currentIndex, isReplayMode]);

  const updateStats = (result, pnl) => {
    setReplayStats(prev => ({
      totalTrades: prev.totalTrades + 1,
      wins: result === 'WIN' ? prev.wins + 1 : prev.wins,
      losses: result === 'LOSS' ? prev.losses + 1 : prev.losses,
      pnl: prev.pnl + pnl,
      winRate: result === 'WIN' 
        ? ((prev.wins + 1) / (prev.totalTrades + 1)) * 100
        : (prev.wins / (prev.totalTrades + 1)) * 100
    }));
  };

  if (!isReplayMode) {
    return (
      <div className="replay-toggle">
        <div className="toggle-card">
          <div className="toggle-icon">📹</div>
          <div className="toggle-content">
            <h3>FX Replay Mode</h3>
            <p>Practice trading with historical data - bar by bar playback</p>
            <button 
              className="enable-button"
              onClick={() => setIsReplayMode(true)}
            >
              🎬 Enable Replay Mode
            </button>
          </div>
        </div>

        <style jsx>{`
          .replay-toggle {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            border: 2px dashed var(--border);
          }

          .toggle-card {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .toggle-icon {
            font-size: 48px;
          }

          .toggle-content {
            flex: 1;
          }

          .toggle-content h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: var(--text-primary);
          }

          .toggle-content p {
            margin: 0 0 16px 0;
            color: var(--text-secondary);
            font-size: 14px;
          }

          .enable-button {
            background: var(--primary);
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .enable-button:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
          }
        `}</style>
      </div>
    );
  }

  // Replay mode active UI
  const progress = allCandles ? (currentIndex / allCandles.length) * 100 : 0;
  const currentCandle = allCandles?.[currentIndex];

  return (
    <div className="replay-mode">
      {/* Header */}
      <div className="replay-header">
        <div className="replay-title">
          <span className="icon">📹</span>
          <h3>Replay Mode Active</h3>
          <span className="status">{isPlaying ? '▶️ Playing' : '⏸️ Paused'}</span>
        </div>
        <button 
          className="close-button"
          onClick={() => {
            setIsReplayMode(false);
            setIsPlaying(false);
            if (onReplayUpdate) onReplayUpdate(allCandles, { isReplayMode: false });
          }}
        >
          ✕ Exit Replay
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-info">
          <span>Candle {currentIndex} / {allCandles?.length || 0}</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        {currentCandle && (
          <div className="current-time">
            📅 {new Date(currentCandle.timestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="playback-controls">
          <button onClick={handleStepBackward} disabled={currentIndex <= 100}>
            ⏮️
          </button>
          <button onClick={handlePlayPause} className="play-button">
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button onClick={handleStepForward} disabled={currentIndex >= allCandles?.length}>
            ⏭️
          </button>
          <button onClick={handleStop} className="stop-button">
            ⏹️ Reset
          </button>
        </div>

        <div className="speed-controls">
          <span className="label">Speed:</span>
          {[1, 2, 5, 10].map(speed => (
            <button
              key={speed}
              className={playbackSpeed === speed ? 'active' : ''}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="date-jump">
          <span className="label">Jump to:</span>
          <input
            type="datetime-local"
            onChange={(e) => jumpToDate(e.target.value)}
            disabled={isPlaying}
          />
        </div>
      </div>

      {/* Trading Controls */}
      <div className="trading-section">
        <h4>📊 Simulated Trading</h4>
        <div className="trade-buttons">
          <button
            className="buy-button"
            onClick={() => {
              const entry = currentCandle?.close || 0;
              const stop = entry - 20; // 20 pips
              const target = entry + 50; // 1:2.5 RR
              enterTrade('BUY', entry, stop, target);
            }}
            disabled={!currentCandle || isPlaying}
          >
            🟢 BUY (Practice)
          </button>
          <button
            className="sell-button"
            onClick={() => {
              const entry = currentCandle?.close || 0;
              const stop = entry + 20;
              const target = entry - 50;
              enterTrade('SELL', entry, stop, target);
            }}
            disabled={!currentCandle || isPlaying}
          >
            🔴 SELL (Practice)
          </button>
        </div>

        {/* Open Trades */}
        {simulatedTrades.filter(t => t.status === 'OPEN').length > 0 && (
          <div className="open-trades">
            <h5>Open Positions ({simulatedTrades.filter(t => t.status === 'OPEN').length})</h5>
            {simulatedTrades.filter(t => t.status === 'OPEN').map(trade => (
              <div key={trade.id} className="trade-card open">
                <div className="trade-direction">{trade.direction}</div>
                <div className="trade-details">
                  <div>Entry: {trade.entry.toFixed(2)}</div>
                  <div>Stop: {trade.stop.toFixed(2)}</div>
                  <div>Target: {trade.target.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="replay-stats">
          <div className="stat-box">
            <div className="stat-label">Total Trades</div>
            <div className="stat-value">{replayStats.totalTrades}</div>
          </div>
          <div className="stat-box win">
            <div className="stat-label">Wins</div>
            <div className="stat-value">{replayStats.wins}</div>
          </div>
          <div className="stat-box loss">
            <div className="stat-label">Losses</div>
            <div className="stat-value">{replayStats.losses}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{replayStats.winRate.toFixed(1)}%</div>
          </div>
          <div className={`stat-box pnl ${replayStats.pnl >= 0 ? 'profit' : 'loss'}`}>
            <div className="stat-label">P&L</div>
            <div className="stat-value">
              {replayStats.pnl >= 0 ? '+' : ''}{replayStats.pnl.toFixed(2)} pips
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .replay-mode {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border: 2px solid var(--primary);
        }

        .replay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .replay-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .replay-title .icon {
          font-size: 24px;
        }

        .replay-title h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .status {
          background: var(--primary);
          color: #fff;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .close-button {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: var(--bg-primary);
          border-color: var(--primary);
        }

        .progress-section {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s ease;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .current-time {
          font-size: 13px;
          color: var(--text-primary);
          text-align: center;
          font-weight: 600;
        }

        .controls-section {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .playback-controls {
          display: flex;
          gap: 8px;
        }

        .playback-controls button {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .playback-controls button:hover:not(:disabled) {
          background: var(--bg-primary);
          border-color: var(--primary);
        }

        .playback-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .play-button {
          background: var(--primary) !important;
          color: #fff !important;
          font-weight: 600;
        }

        .stop-button {
          background: #ff4976 !important;
          color: #fff !important;
        }

        .speed-controls, .date-jump {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .speed-controls button {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .speed-controls button.active {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .date-jump input {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .trading-section {
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }

        .trading-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--text-primary);
        }

        .trade-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .buy-button, .sell-button {
          flex: 1;
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .buy-button {
          background: #00d4aa;
          color: #fff;
        }

        .sell-button {
          background: #ff4976;
          color: #fff;
        }

        .buy-button:disabled, .sell-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .open-trades {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .open-trades h5 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .trade-card {
          background: var(--bg-primary);
          padding: 12px;
          border-radius: 6px;
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }

        .trade-direction {
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .trade-card.open .trade-direction {
          background: var(--primary);
          color: #fff;
        }

        .trade-details {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .replay-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .stat-box {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: var(--text-primary);
        }

        .stat-box.win .stat-value {
          color: #00d4aa;
        }

        .stat-box.loss .stat-value {
          color: #ff4976;
        }

        .stat-box.pnl.profit {
          background: #00d4aa20;
          border: 2px solid #00d4aa;
        }

        .stat-box.pnl.profit .stat-value {
          color: #00d4aa;
        }

        .stat-box.pnl.loss {
          background: #ff497620;
          border: 2px solid #ff4976;
        }

        .stat-box.pnl.loss .stat-value {
          color: #ff4976;
        }
      `}</style>
    </div>
  );
}
