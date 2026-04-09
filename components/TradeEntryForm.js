// components/TradeEntryForm.js
// Form for logging new trades with all required details

'use client';
import { useState } from 'react';
import { createTrade, saveTrade } from '../utils/tradeJournal';

export default function TradeEntryForm({ 
  currentPrice,
  marketRegime,
  confluenceScore,
  triggers,
  htfBias,
  session,
  sessionQuality,
  onTradeSaved
}) {
  const [formData, setFormData] = useState({
    direction: 'BUY',
    entryPrice: currentPrice || '',
    stopLoss: '',
    takeProfit: '',
    positionSize: 0.05,
    entryReason: '',
    emotionalState: 7,
    checklistCompleted: false,
    notes: '',
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate RR
    const entry = parseFloat(formData.entryPrice);
    const stop = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit);
    
    const riskDistance = Math.abs(entry - stop);
    const rewardDistance = Math.abs(tp - entry);
    const riskReward = riskDistance > 0 ? rewardDistance / riskDistance : 0;
    
    // Create trade object
    const trade = createTrade({
      entryPrice: entry,
      entryTime: new Date().toISOString(),
      entryReason: formData.entryReason,
      direction: formData.direction,
      
      symbol: 'XAUUSD',
      timeframe: '5M',
      positionSize: parseFloat(formData.positionSize),
      
      stopLoss: stop,
      takeProfit: tp,
      riskReward: parseFloat(riskReward.toFixed(2)),
      
      marketRegime: marketRegime?.detected || 'UNKNOWN',
      confluenceScore: confluenceScore || 0,
      triggers: triggers || [],
      htfBias: htfBias || 'NEUTRAL',
      session: session?.session || 'UNKNOWN',
      sessionQuality: sessionQuality?.rating || 'UNKNOWN',
      
      emotionalState: parseInt(formData.emotionalState),
      checklistCompleted: formData.checklistCompleted,
      notes: formData.notes,
      
      status: 'OPEN',
    });
    
    // Save trade
    const saved = saveTrade(trade);
    
    if (saved) {
      alert(`✅ Trade logged successfully!\n\nID: ${trade.id}\nDirection: ${trade.direction}\nEntry: ${trade.entryPrice}\nRR: 1:${trade.riskReward}`);
      
      // Reset form
      setFormData({
        ...formData,
        entryPrice: currentPrice || '',
        entryReason: '',
        notes: '',
      });
      
      setIsOpen(false);
      
      if (onTradeSaved) {
        onTradeSaved(trade);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Calculate RR for display
  const entry = parseFloat(formData.entryPrice) || 0;
  const stop = parseFloat(formData.stopLoss) || 0;
  const tp = parseFloat(formData.takeProfit) || 0;
  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(tp - entry);
  const rr = riskDistance > 0 ? (rewardDistance / riskDistance).toFixed(2) : '0';

  return (
    <div className="trade-entry-form-container">
      <button 
        className="open-form-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '📕 Close Trade Entry' : '📓 Log New Trade'}
      </button>

      {isOpen && (
        <div className="trade-entry-form">
          <h3>📝 Log New Trade</h3>
          
          <form onSubmit={handleSubmit}>
            {/* Direction */}
            <div className="form-row">
              <label>Direction:</label>
              <div className="direction-toggle">
                <button
                  type="button"
                  className={`dir-btn ${formData.direction === 'BUY' ? 'active buy' : ''}`}
                  onClick={() => handleChange('direction', 'BUY')}
                >
                  BUY
                </button>
                <button
                  type="button"
                  className={`dir-btn ${formData.direction === 'SELL' ? 'active sell' : ''}`}
                  onClick={() => handleChange('direction', 'SELL')}
                >
                  SELL
                </button>
              </div>
            </div>

            {/* Entry Price */}
            <div className="form-row">
              <label>Entry Price:</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => handleChange('entryPrice', e.target.value)}
                required
                placeholder="2042.50"
              />
            </div>

            {/* Stop Loss */}
            <div className="form-row">
              <label>Stop Loss:</label>
              <input
                type="number"
                step="0.01"
                value={formData.stopLoss}
                onChange={(e) => handleChange('stopLoss', e.target.value)}
                required
                placeholder="2041.50"
              />
            </div>

            {/* Take Profit */}
            <div className="form-row">
              <label>Take Profit:</label>
              <input
                type="number"
                step="0.01"
                value={formData.takeProfit}
                onChange={(e) => handleChange('takeProfit', e.target.value)}
                required
                placeholder="2045.00"
              />
            </div>

            {/* Risk:Reward Display */}
            <div className="form-row rr-display">
              <label>Risk:Reward:</label>
              <div className={`rr-value ${parseFloat(rr) >= 2.5 ? 'good' : 'warning'}`}>
                1:{rr}
                {parseFloat(rr) < 2.5 && <span className="warning-text">⚠️ Below 1:2.5</span>}
              </div>
            </div>

            {/* Position Size */}
            <div className="form-row">
              <label>Position Size (lots):</label>
              <input
                type="number"
                step="0.01"
                value={formData.positionSize}
                onChange={(e) => handleChange('positionSize', e.target.value)}
                required
              />
            </div>

            {/* Entry Reason */}
            <div className="form-row">
              <label>Entry Reason:</label>
              <textarea
                value={formData.entryReason}
                onChange={(e) => handleChange('entryReason', e.target.value)}
                required
                placeholder="BOS bullish + FVG + London kill zone + 4/6 confluence..."
                rows={3}
              />
            </div>

            {/* Emotional State */}
            <div className="form-row">
              <label>Emotional State (1-10):</label>
              <div className="emotion-slider">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.emotionalState}
                  onChange={(e) => handleChange('emotionalState', e.target.value)}
                />
                <span className="emotion-value">{formData.emotionalState}/10</span>
                <span className="emotion-label">
                  {formData.emotionalState <= 3 && '😰 Anxious'}
                  {formData.emotionalState > 3 && formData.emotionalState <= 5 && '😐 Uncertain'}
                  {formData.emotionalState > 5 && formData.emotionalState <= 7 && '😊 Confident'}
                  {formData.emotionalState > 7 && formData.emotionalState <= 9 && '😎 Very Confident'}
                  {formData.emotionalState > 9 && '🤩 Overconfident?'}
                </span>
              </div>
            </div>

            {/* Checklist */}
            <div className="form-row checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={formData.checklistCompleted}
                  onChange={(e) => handleChange('checklistCompleted', e.target.checked)}
                />
                Pre-trade checklist completed
              </label>
            </div>

            {/* Notes */}
            <div className="form-row">
              <label>Additional Notes:</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional observations..."
                rows={2}
              />
            </div>

            {/* Market Context (Read-only display) */}
            <div className="market-context">
              <h4>📊 Market Context (Auto-captured)</h4>
              <div className="context-grid">
                <div className="context-item">
                  <span>Regime:</span>
                  <span>{marketRegime?.detected || 'N/A'}</span>
                </div>
                <div className="context-item">
                  <span>Confluence:</span>
                  <span>{confluenceScore || 0}/6</span>
                </div>
                <div className="context-item">
                  <span>HTF Bias:</span>
                  <span>{htfBias || 'N/A'}</span>
                </div>
                <div className="context-item">
                  <span>Session:</span>
                  <span>{session?.name || 'N/A'}</span>
                </div>
                <div className="context-item">
                  <span>Triggers:</span>
                  <span>{triggers?.length || 0} active</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="submit-btn">
              📓 Save Trade to Journal
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .trade-entry-form-container {
          margin: 20px 0;
        }

        .open-form-btn {
          background: linear-gradient(135deg, var(--primary) 0%, #00b894 100%);
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s ease;
        }

        .open-form-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        }

        .trade-entry-form {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          margin-top: 16px;
        }

        .trade-entry-form h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary);
          font-size: 18px;
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-row label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-row input[type="number"],
        .form-row input[type="text"],
        .form-row textarea {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: monospace;
        }

        .form-row input:focus,
        .form-row textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .direction-toggle {
          display: flex;
          gap: 8px;
        }

        .dir-btn {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .dir-btn.active.buy {
          background: #00d4aa;
          color: #000;
          border-color: #00d4aa;
        }

        .dir-btn.active.sell {
          background: #ff4976;
          color: #fff;
          border-color: #ff4976;
        }

        .rr-display {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
        }

        .rr-value {
          font-size: 18px;
          font-weight: 700;
          font-family: monospace;
        }

        .rr-value.good {
          color: #00d4aa;
        }

        .rr-value.warning {
          color: #ffd60a;
        }

        .warning-text {
          font-size: 12px;
          margin-left: 8px;
        }

        .emotion-slider {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .emotion-slider input[type="range"] {
          flex: 1;
        }

        .emotion-value {
          font-weight: 700;
          font-family: monospace;
          color: var(--text-primary);
          min-width: 40px;
        }

        .emotion-label {
          font-size: 12px;
          color: var(--text-secondary);
          min-width: 120px;
        }

        .checkbox-row label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .market-context {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }

        .market-context h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text-primary);
        }

        .context-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .context-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-radius: 4px;
          font-size: 12px;
        }

        .context-item span:first-child {
          color: var(--text-secondary);
        }

        .context-item span:last-child {
          color: var(--text-primary);
          font-weight: 600;
          font-family: monospace;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--primary) 0%, #00b894 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.3s ease;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 212, 170, 0.4);
        }

        @media (max-width: 768px) {
          .context-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
