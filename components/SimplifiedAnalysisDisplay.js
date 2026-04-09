// components/SimplifiedAnalysisDisplay.js
// Beginner-Friendly Analysis in Plain English
'use client';

export default function SimplifiedAnalysisDisplay({ 
  regime,
  triggers,
  evaluation,
  htfBias,
  dealingRange
}) {
  if (!regime && !triggers && !evaluation) {
    return (
      <div className="simplified-loading">
        <div className="loading-icon">📊</div>
        <h3>Waiting for Analysis...</h3>
        <p>Click "Load Data" to start</p>
        <style jsx>{`
          .simplified-loading {
            text-align: center;
            padding: 60px 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            margin: 20px 0;
          }
          .loading-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  const getCondition = () => {
    const map = {
      'STRONG_TREND_BULLISH': { icon: '📈', text: 'Strong Uptrend', color: '#00d4aa', desc: 'Market moving up. Look for buying opportunities when price dips.' },
      'STRONG_TREND_BEARISH': { icon: '📉', text: 'Strong Downtrend', color: '#ff4976', desc: 'Market moving down. Look for selling opportunities when price bounces.' },
      'RANGING': { icon: '↔️', text: 'Sideways', color: '#ffd60a', desc: 'Market stuck between levels. Buy low, sell high.' },
      'HIGH_VOLATILITY': { icon: '⚡', text: 'Very Volatile', color: '#ff9500', desc: 'Rapid unpredictable moves. Be careful!' },
      'REVERSAL_CHOCH': { icon: '🔄', text: 'Potential Reversal', color: '#bc8cff', desc: 'Direction might change. Wait for confirmation.' },
      'WEAK_TREND': { icon: '😐', text: 'Unclear', color: '#8b949e', desc: 'No clear direction. Wait for better setup.' }
    };
    return regime ? map[regime.regime] || map['WEAK_TREND'] : { icon: '❓', text: 'Loading...', color: '#8b949e', desc: '' };
  };

  const condition = getCondition();
  const approved = evaluation?.decision?.approved;

  return (
    <div className="simple-analysis">
      {/* Market Condition */}
      <div className="card main" style={{borderLeftColor: condition.color}}>
        <div className="icon">{condition.icon}</div>
        <div className="content">
          <h2>Market: {condition.text}</h2>
          <p>{condition.desc}</p>
          {regime && <span className="badge" style={{background: `${condition.color}20`, color: condition.color}}>{(regime.confidence*100).toFixed(0)}% Sure</span>}
        </div>
      </div>

      {/* Trading Decision */}
      <div className="card decision" style={{borderLeftColor: approved ? '#00d4aa' : '#ffd60a'}}>
        <div className="icon-large">{approved ? '✅' : '⚠️'}</div>
        <div className="content">
          <h3>{approved ? `${evaluation.risk?.entry?.includes('BUY') ? 'BUY' : 'SELL'} Signal` : 'Wait - No Trade'}</h3>
          <p>{evaluation?.decision?.reason || 'Analyzing...'}</p>
          {approved && evaluation.risk && (
            <div className="trade-box">
              <div className="row"><span>Entry:</span><b>{evaluation.risk.entry}</b></div>
              <div className="row"><span>Stop:</span><b>{evaluation.risk.stop} ({evaluation.risk.stopPips} pips)</b></div>
              <div className="row"><span>Target:</span><b>{evaluation.risk.target} ({evaluation.risk.targetPips} pips)</b></div>
              <div className="row highlight"><span>Risk:Reward:</span><b>{evaluation.risk.rrRatio}</b></div>
            </div>
          )}
        </div>
      </div>

      {/* Signals */}
      {triggers && triggers.triggerCount > 0 && (
        <div className="card signals">
          <h3>🎯 Institutional Signals ({triggers.triggerCount}/7)</h3>
          <div className="consensus">
            {triggers.consensus === 'BULLISH' && <div className="bull"><span>🟢</span><b>Professional traders are BUYING</b><span>{triggers.stackedConfidence}%</span></div>}
            {triggers.consensus === 'BEARISH' && <div className="bear"><span>🔴</span><b>Professional traders are SELLING</b><span>{triggers.stackedConfidence}%</span></div>}
            {triggers.consensus === 'NEUTRAL' && <div className="neut"><span>⚪</span><b>No clear direction</b></div>}
          </div>
        </div>
      )}

      {/* Quality Score */}
      {evaluation?.confluence && (
        <div className="card quality">
          <h3>✅ Signal Quality</h3>
          <div className="bars">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`bar ${i < evaluation.confluence.score ? 'on' : ''}`} style={{background: i < evaluation.confluence.score ? (evaluation.confluence.score >= 4 ? '#00d4aa' : evaluation.confluence.score === 3 ? '#ffd60a' : '#ff4976') : '#30363d'}}></div>
            ))}
          </div>
          <p><b>{evaluation.confluence.score}/6</b> - {evaluation.confluence.quality}</p>
        </div>
      )}

      <style jsx>{`
        .simple-analysis { display: flex; flex-direction: column; gap: 16px; margin: 20px 0; }
        .card { background: var(--bg-secondary); border-radius: 12px; padding: 20px; border-left: 4px solid; }
        .card.main { display: flex; gap: 16px; background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary)); }
        .card.decision { display: flex; gap: 16px; }
        .icon { font-size: 36px; }
        .icon-large { font-size: 56px; }
        .content { flex: 1; }
        h2 { font-size: 20px; margin: 0 0 8px 0; }
        h3 { font-size: 16px; margin: 0 0 12px 0; }
        p { margin: 0; color: var(--text-secondary); font-size: 14px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 12px; }
        .trade-box { background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-top: 16px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row.highlight { background: var(--primary); color: #fff; margin: 8px -12px -12px; padding: 12px; border-radius: 0 0 8px 8px; }
        .consensus { background: var(--bg-primary); padding: 16px; border-radius: 8px; }
        .consensus > div { display: flex; align-items: center; gap: 12px; }
        .consensus span:first-child { font-size: 24px; }
        .consensus b { flex: 1; font-size: 15px; }
        .bull b { color: #00d4aa; }
        .bear b { color: #ff4976; }
        .bars { display: flex; gap: 8px; margin-bottom: 12px; }
        .bar { flex: 1; height: 40px; border-radius: 6px; }
      `}</style>
    </div>
  );
}
