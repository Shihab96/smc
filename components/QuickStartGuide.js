// components/QuickStartGuide.js
// Interactive Tutorial for First-Time Users

'use client';

import { useState } from 'react';

export default function QuickStartGuide({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '👋 Welcome to Professional Trading AI',
      content: (
        <div>
          <p>This app uses institutional-grade analysis to help you trade Gold (XAUUSD) like a professional.</p>
          <p><strong>You'll learn:</strong></p>
          <ul>
            <li>✅ How to verify the system is working</li>
            <li>✅ How to read trade signals</li>
            <li>✅ How to understand risk management</li>
            <li>✅ Realistic expectations (50-55% win rate, not 80-90%)</li>
          </ul>
          <p><em>This will take 2 minutes. Let's get started!</em></p>
        </div>
      ),
      action: 'Start Tutorial'
    },
    {
      title: '📊 Step 1: Load Market Data',
      content: (
        <div>
          <p><strong>First thing first - you need data!</strong></p>
          <ol>
            <li>Look at the <strong>left sidebar</strong></li>
            <li>Make sure <strong>"Sample"</strong> data source is selected (it's free!)</li>
            <li>Select <strong>"5m"</strong> timeframe (recommended for Gold)</li>
            <li>Click the big <strong>"Load Data"</strong> button</li>
          </ol>
          <div style={{background: '#ffd60a20', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #ffd60a'}}>
            <strong>💡 What happens:</strong> The system fetches 72 hours of Gold price data and analyzes it using professional methods.
          </div>
        </div>
      ),
      action: 'Next: Check Health'
    },
    {
      title: '🏥 Step 2: Check System Health',
      content: (
        <div>
          <p><strong>After loading data, verify everything works:</strong></p>
          <ol>
            <li>Scroll down to find <strong>"System Health Check"</strong> panel</li>
            <li>Look at the percentage (should be <strong>75%+</strong>)</li>
            <li>All green checkmarks ✅ = system working perfectly</li>
            <li>Yellow warnings ⚠️ = loading, wait a moment</li>
            <li>Red errors ❌ = something needs attention</li>
          </ol>
          <div style={{background: '#00d4aa20', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #00d4aa'}}>
            <strong>✅ Good Health:</strong> "EXCELLENT - All Systems Operational" or "GOOD - System Ready"
          </div>
        </div>
      ),
      action: 'Next: Understand Signals'
    },
    {
      title: '🎯 Step 3: Read Trade Signals',
      content: (
        <div>
          <p><strong>The main analysis appears below the health check:</strong></p>
          
          <div style={{marginBottom: '16px'}}>
            <strong>✅ APPROVED Signal:</strong>
            <ul>
              <li>Green banner = Good to trade</li>
              <li>Shows direction: BUY 🟢 or SELL 🔴</li>
              <li>Entry price, stop loss, take profit</li>
              <li>Expected win rate (realistic 50-55%)</li>
            </ul>
          </div>

          <div>
            <strong>⏳ WAIT Signal:</strong>
            <ul>
              <li>Yellow banner = Not ready yet</li>
              <li>Reason explained (e.g., "weak confluence")</li>
              <li>Be patient - quality over quantity</li>
            </ul>
          </div>

          <div style={{background: '#ffd60a20', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #ffd60a'}}>
            <strong>💡 Important:</strong> Only trade when you see "APPROVED". The AI rejects low-quality setups to protect your capital.
          </div>
        </div>
      ),
      action: 'Next: Risk Management'
    },
    {
      title: '💰 Step 4: Understand Risk Management',
      content: (
        <div>
          <p><strong>Every approved trade shows:</strong></p>
          
          <div style={{marginBottom: '12px'}}>
            <strong>Entry Price:</strong> Where to enter the trade
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <strong>Stop Loss:</strong> Where to exit if wrong (20-40 pips for Gold)<br/>
            <em style={{fontSize: '0.85em', color: 'var(--text-secondary)'}}>
              ❌ Never use 3-5 pip stops - they get hit by noise!<br/>
              ✅ Use ATR-based stops (system calculates automatically)
            </em>
          </div>

          <div style={{marginBottom: '12px'}}>
            <strong>Take Profit:</strong> Where to exit if right<br/>
            <em style={{fontSize: '0.85em', color: 'var(--text-secondary)'}}>
              Target: 1:2.5 Risk:Reward minimum (professional standard)
            </em>
          </div>

          <div style={{marginBottom: '12px'}}>
            <strong>Position Size:</strong> How much to trade<br/>
            <em style={{fontSize: '0.85em', color: 'var(--text-secondary)'}}>
              Max 1% account risk per trade
            </em>
          </div>

          <div style={{background: '#ff497620', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid #ff4976'}}>
            <strong>⚠️ Critical:</strong> Always use the stop loss shown. Don't move it based on emotions!
          </div>
        </div>
      ),
      action: 'Next: Expectations'
    },
    {
      title: '📈 Step 5: Realistic Expectations',
      content: (
        <div>
          <p><strong>Professional trading reality:</strong></p>
          
          <div style={{background: '#00d4aa20', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #00d4aa'}}>
            <strong>✅ REALISTIC:</strong>
            <ul>
              <li>Win Rate: 50-55% (you'll lose 45-50% of trades)</li>
              <li>Profit Factor: 1.5-2.0</li>
              <li>Max Drawdown: 15-20% (unavoidable)</li>
              <li>Profitability comes from RR ratio, not win rate</li>
            </ul>
          </div>

          <div style={{background: '#ff497620', padding: '12px', borderRadius: '8px', border: '1px solid #ff4976'}}>
            <strong>❌ UNREALISTIC (Marketing Lies):</strong>
            <ul>
              <li>80-90% win rates = Impossible sustained</li>
              <li>No losses = Doesn't exist</li>
              <li>Every trade wins = Red flag scam</li>
            </ul>
          </div>

          <p style={{marginTop: '16px'}}>
            <strong>Example with 52% win rate at 1:2.5 RR:</strong><br/>
            100 trades: 52 wins × $250 = $13,000<br/>
            100 trades: 48 losses × $100 = -$4,800<br/>
            <strong>Net Profit: $8,200 (82% return)</strong> ✅ Excellent!
          </p>
        </div>
      ),
      action: 'Next: Display Modes'
    },
    {
      title: '🎨 Step 6: Choose Your Display Mode',
      content: (
        <div>
          <p><strong>The app has two modes:</strong></p>
          
          <div style={{background: '#bc8cff20', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bc8cff'}}>
            <strong>🌟 Beginner Mode (Recommended for starters):</strong>
            <ul>
              <li>Simple, easy-to-understand language</li>
              <li>Big, clear APPROVED/WAIT banner</li>
              <li>Explains what everything means</li>
              <li>Hides complex technical details</li>
            </ul>
          </div>

          <div style={{background: '#bc8cff20', padding: '12px', borderRadius: '8px', border: '1px solid #bc8cff'}}>
            <strong>🎯 Professional Mode (For experienced traders):</strong>
            <ul>
              <li>Full technical analysis details</li>
              <li>All 6 confluence factors shown</li>
              <li>7 institutional trigger methods</li>
              <li>Complete regime analysis</li>
            </ul>
          </div>

          <p style={{marginTop: '12px'}}>
            <strong>💡 Switch anytime:</strong> Find "Display Mode" toggle in settings panel (left sidebar).
          </p>
        </div>
      ),
      action: 'Next: Final Tips'
    },
    {
      title: '🎯 You\'re Ready! Final Tips',
      content: (
        <div>
          <p><strong>Remember these key points:</strong></p>
          
          <ol>
            <li><strong>Check System Health first</strong> - should be 75%+ green</li>
            <li><strong>Only trade "APPROVED" signals</strong> - ignore "WAIT"</li>
            <li><strong>Always use the stop loss shown</strong> - don't adjust it</li>
            <li><strong>Be patient</strong> - 1-3 good setups per day is normal</li>
            <li><strong>Expect 50-55% win rate</strong> - not 80-90%</li>
            <li><strong>Use Beginner Mode</strong> if you're new</li>
            <li><strong>Paper trade first</strong> - test before risking real money</li>
          </ol>

          <div style={{background: '#00d4aa20', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '2px solid #00d4aa', textAlign: 'center'}}>
            <div style={{fontSize: '1.2em', fontWeight: 'bold', marginBottom: '8px'}}>
              🎉 You're all set!
            </div>
            <div>
              Click "Start Trading" below and load your first data.
            </div>
          </div>

          <div style={{fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center', fontStyle: 'italic'}}>
            💡 You can reopen this guide anytime from Settings → "Show Tutorial"
          </div>
        </div>
      ),
      action: 'Start Trading!'
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        {/* Progress Bar */}
        <div className="tutorial-progress">
          <div className="progress-text">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="tutorial-content">
          <h2 className="tutorial-title">{currentStepData.title}</h2>
          <div className="tutorial-body">
            {currentStepData.content}
          </div>
        </div>

        {/* Navigation */}
        <div className="tutorial-nav">
          {!isFirstStep && (
            <button 
              className="tutorial-btn tutorial-btn-secondary"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              ← Back
            </button>
          )}
          <button 
            className="tutorial-btn tutorial-btn-primary"
            onClick={() => {
              if (isLastStep) {
                onClose();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
          >
            {currentStepData.action} →
          </button>
          <button 
            className="tutorial-btn tutorial-btn-text"
            onClick={onClose}
          >
            Skip Tutorial
          </button>
        </div>
      </div>

      <style jsx>{`
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .tutorial-modal {
          background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
          border: 2px solid var(--primary);
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .tutorial-progress {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }

        .progress-text {
          font-size: 0.85em;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-align: center;
        }

        .progress-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, #00d4aa 100%);
          transition: width 0.3s ease;
        }

        .tutorial-content {
          padding: 32px;
        }

        .tutorial-title {
          font-size: 1.5em;
          margin: 0 0 24px 0;
          color: var(--primary);
        }

        .tutorial-body {
          font-size: 0.95em;
          line-height: 1.7;
          color: var(--text-secondary);
        }

        .tutorial-body p {
          margin: 0 0 16px 0;
        }

        .tutorial-body strong {
          color: var(--text-primary);
        }

        .tutorial-body ul, .tutorial-body ol {
          margin: 12px 0;
          padding-left: 24px;
        }

        .tutorial-body li {
          margin-bottom: 8px;
        }

        .tutorial-nav {
          padding: 20px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .tutorial-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 0.95em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .tutorial-btn-primary {
          background: var(--primary);
          color: #0d1117;
        }

        .tutorial-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3);
        }

        .tutorial-btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .tutorial-btn-secondary:hover {
          background: var(--bg-secondary);
        }

        .tutorial-btn-text {
          background: transparent;
          color: var(--text-secondary);
        }

        .tutorial-btn-text:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
