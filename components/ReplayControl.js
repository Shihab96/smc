// components/ReplayControl.js
// FX Replay Style - Time Machine for Practice Trading
// Optional feature - can enable/disable

'use client';
import { useState, useEffect } from 'react';

export default function ReplayControl({ 
  candles,
  onReplayUpdate,
  isEnabled,
  onToggle
}) {
  const [replayState, setReplayState] = useState({
    currentIndex: 0,
    isPlaying: false,
    speed: 1, // 1x, 2x, 5x, 10x
    totalCandles: candles?.length || 0
  });

  const [jumpToDate, setJumpToDate] = useState('');
  const [jumpToTime, setJumpToTime] = useState('');

  // Update total candles when data changes
  useEffect(() => {
    if (candles && candles.length > 0) {
      setReplayState(prev => ({
        ...prev,
        totalCandles: candles.length,
        currentIndex: Math.min(prev.currentIndex, candles.length - 1)
      }));
    }
  }, [candles]);

  // Replay playback interval
  useEffect(() => {
    if (!isEnabled || !replayState.isPlaying || !candles || candles.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setReplayState(prev => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= prev.totalCandles) {
          // Reached the end
          return { ...prev, isPlaying: false, currentIndex: prev.totalCandles - 1 };
        }
        
        // Notify parent component of new index
        if (onReplayUpdate) {
          onReplayUpdate(nextIndex, candles.slice(0, nextIndex + 1));
        }
        
        return { ...prev, currentIndex: nextIndex };
      });
    }, 1000 / replayState.speed); // Speed controls interval

    return () => clearInterval(interval);
  }, [isEnabled, replayState.isPlaying, replayState.speed, candles, onReplayUpdate]);

  // Controls
  const handlePlay = () => {
    if (replayState.currentIndex >= replayState.totalCandles - 1) {
      // If at end, restart from beginning
      setReplayState(prev => ({ ...prev, currentIndex: 100, isPlaying: true }));
    } else {
      setReplayState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const handlePause = () => {
    setReplayState(prev => ({ ...prev, isPlaying: false }));
  };

  const handleStepForward = () => {
    setReplayState(prev => {
      const nextIndex = Math.min(prev.currentIndex + 1, prev.totalCandles - 1);
      if (onReplayUpdate) {
        onReplayUpdate(nextIndex, candles.slice(0, nextIndex + 1));
      }
      return { ...prev, currentIndex: nextIndex, isPlaying: false };
    });
  };

  const handleStepBackward = () => {
    setReplayState(prev => {
      const nextIndex = Math.max(prev.currentIndex - 1, 100); // Keep minimum 100 candles
      if (onReplayUpdate) {
        onReplayUpdate(nextIndex, candles.slice(0, nextIndex + 1));
      }
      return { ...prev, currentIndex: nextIndex, isPlaying: false };
    });
  };

  const handleReset = () => {
    const initialIndex = 100; // Start with 100 candles visible
    setReplayState(prev => ({ 
      ...prev, 
      currentIndex: initialIndex, 
      isPlaying: false 
    }));
    if (onReplayUpdate) {
      onReplayUpdate(initialIndex, candles.slice(0, initialIndex + 1));
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setReplayState(prev => ({ ...prev, speed: newSpeed }));
  };

  const handleJumpTo = () => {
    if (!jumpToDate) return;

    // Find candle closest to selected date/time
    const targetDateTime = new Date(`${jumpToDate}T${jumpToTime || '00:00'}`).getTime();
    
    let closestIndex = 100;
    let closestDiff = Infinity;

    candles.forEach((candle, index) => {
      if (index < 100) return; // Keep minimum
      const candleTime = new Date(candle.timestamp).getTime();
      const diff = Math.abs(candleTime - targetDateTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });

    setReplayState(prev => ({ ...prev, currentIndex: closestIndex, isPlaying: false }));
    if (onReplayUpdate) {
      onReplayUpdate(closestIndex, candles.slice(0, closestIndex + 1));
    }
  };

  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value);
    setReplayState(prev => ({ ...prev, currentIndex: newIndex, isPlaying: false }));
    if (onReplayUpdate) {
      onReplayUpdate(newIndex, candles.slice(0, newIndex + 1));
    }
  };

  if (!candles || candles.length === 0) {
    return (
      <div className="replay-control">
        <div className="replay-disabled">
          <p>📊 Load data first to use Replay Mode</p>
        </div>
        <style jsx>{`
          .replay-control {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
          }
          .replay-disabled {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  const currentCandle = candles[replayState.currentIndex];
  const progressPercent = (replayState.currentIndex / replayState.totalCandles) * 100;

  return (
    <div className="replay-control">
      {/* Header with Toggle */}
      <div className="replay-header">
        <div className="header-left">
          <h3>🎬 Replay Mode (Time Machine)</h3>
          <p>Practice trading on historical data - move forward/backward in time</p>
        </div>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="slider"></span>
          <span className="label">{isEnabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      {isEnabled && (
        <>
          {/* Current Position Info */}
          <div className="replay-info">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Current Time:</span>
                <span className="value">
                  {currentCandle ? new Date(currentCandle.timestamp).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Candle:</span>
                <span className="value">
                  {replayState.currentIndex + 1} / {replayState.totalCandles}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Progress:</span>
                <span className="value">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="info-item">
                <span className="label">Speed:</span>
                <span className="value">{replayState.speed}x</span>
              </div>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="timeline">
            <input
              type="range"
              min="100"
              max={replayState.totalCandles - 1}
              value={replayState.currentIndex}
              onChange={handleSliderChange}
              className="timeline-slider"
              disabled={replayState.isPlaying}
            />
            <div className="timeline-progress" style={{width: `${progressPercent}%`}}></div>
          </div>

          {/* Playback Controls */}
          <div className="controls">
            <div className="control-group">
              <button 
                className="control-btn reset" 
                onClick={handleReset}
                title="Reset to start"
              >
                ⏮️ Reset
              </button>
              
              <button 
                className="control-btn step" 
                onClick={handleStepBackward}
                disabled={replayState.currentIndex <= 100}
                title="Step backward (1 candle)"
              >
                ⏪ -1
              </button>

              {!replayState.isPlaying ? (
                <button 
                  className="control-btn play" 
                  onClick={handlePlay}
                  title="Play forward"
                >
                  ▶️ Play
                </button>
              ) : (
                <button 
                  className="control-btn pause" 
                  onClick={handlePause}
                  title="Pause"
                >
                  ⏸️ Pause
                </button>
              )}

              <button 
                className="control-btn step" 
                onClick={handleStepForward}
                disabled={replayState.currentIndex >= replayState.totalCandles - 1}
                title="Step forward (1 candle)"
              >
                +1 ⏩
              </button>
            </div>

            {/* Speed Controls */}
            <div className="speed-controls">
              <span className="speed-label">Speed:</span>
              {[1, 2, 5, 10].map(speed => (
                <button
                  key={speed}
                  className={`speed-btn ${replayState.speed === speed ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Jump to Date/Time */}
          <div className="jump-controls">
            <div className="jump-header">
              <span>⏰ Jump to Specific Date/Time</span>
            </div>
            <div className="jump-inputs">
              <input
                type="date"
                value={jumpToDate}
                onChange={(e) => setJumpToDate(e.target.value)}
                className="date-input"
              />
              <input
                type="time"
                value={jumpToTime}
                onChange={(e) => setJumpToTime(e.target.value)}
                className="time-input"
              />
              <button 
                className="jump-btn" 
                onClick={handleJumpTo}
                disabled={!jumpToDate}
              >
                🎯 Jump
              </button>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="tips">
            <h4>💡 How to Use Replay Mode:</h4>
            <ul>
              <li><strong>Play/Pause:</strong> Automatically move forward in time</li>
              <li><strong>Step:</strong> Move forward/backward one candle at a time</li>
              <li><strong>Speed:</strong> Control how fast the replay plays (1x-10x)</li>
              <li><strong>Slider:</strong> Drag to any point in history</li>
              <li><strong>Jump:</strong> Go directly to a specific date/time</li>
              <li><strong>Practice:</strong> Test your strategies without risking real money!</li>
            </ul>
          </div>
        </>
      )}

      <style jsx>{`
        .replay-control {
          background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }

        .replay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }

        .header-left h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: var(--primary);
        }

        .header-left p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-switch input {
          display: none;
        }

        .slider {
          position: relative;
          width: 50px;
          height: 26px;
          background: var(--bg-tertiary);
          border-radius: 13px;
          transition: background 0.3s;
        }

        .slider::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          top: 3px;
          left: 3px;
          transition: transform 0.3s;
        }

        .toggle-switch input:checked + .slider {
          background: var(--primary);
        }

        .toggle-switch input:checked + .slider::before {
          transform: translateX(24px);
        }

        .toggle-switch .label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .replay-info {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item .label {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-item .value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: monospace;
        }

        .timeline {
          position: relative;
          margin-bottom: 24px;
          padding: 10px 0;
        }

        .timeline-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: var(--bg-tertiary);
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
        }

        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .timeline-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .timeline-progress {
          position: absolute;
          top: 10px;
          left: 0;
          height: 8px;
          background: var(--primary);
          border-radius: 4px;
          pointer-events: none;
          transition: width 0.1s linear;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .control-btn:hover:not(:disabled) {
          background: var(--bg-primary);
          transform: translateY(-1px);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn.play {
          background: #00d4aa;
          color: #fff;
        }

        .control-btn.pause {
          background: #ffd60a;
          color: #000;
        }

        .control-btn.reset {
          background: #ff4976;
          color: #fff;
        }

        .speed-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .speed-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin-right: 4px;
        }

        .speed-btn {
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .speed-btn.active {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .speed-btn:hover:not(.active) {
          background: var(--bg-primary);
        }

        .jump-controls {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .jump-header {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .jump-inputs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .date-input,
        .time-input {
          flex: 1;
          min-width: 150px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .jump-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          background: var(--primary);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .jump-btn:hover:not(:disabled) {
          background: #00b894;
          transform: translateY(-1px);
        }

        .jump-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tips {
          background: rgba(188, 140, 255, 0.1);
          border-left: 4px solid #bc8cff;
          padding: 16px;
          border-radius: 4px;
        }

        .tips h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #bc8cff;
        }

        .tips ul {
          margin: 0;
          padding-left: 20px;
        }

        .tips li {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          line-height: 1.5;
        }

        .tips strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
