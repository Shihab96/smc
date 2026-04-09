'use client';
// app/page.js

import { useState, useEffect, useRef } from 'react';
import InteractiveChart from '../components/InteractiveChart';
import { detectLiquiditySweeps } from '../utils/liquidity';
import { detectImpulse, detectHighProbabilitySetup } from '../utils/impulse';
import { 
  analyzeInstitutionalBias,
  mapLiquidityLevels,
  calculateDealingRange,
  detectMarketPhase,
  getSessionTiming,
  checkInstitutionalConfluence
} from '../utils/institutional';
import { analyzeHTFBias, checkMTFAlignment, getHigherTimeframes } from '../utils/mtf';
import { detectAllInstitutionalTriggers } from '../utils/institutionalTriggers';
import { 
  getMTFStructure, 
  aggregateCandles, 
  validateMTFData,
  setupMTFStructure,
  getGoldRecommendedStructure 
} from '../utils/mtfMapper';
import { detectMarketRegime } from '../utils/regimeDetector';
import { evaluateSignalProfessionally } from '../utils/adaptiveStrategySelector';
import ProfessionalRegimeDisplay from '../components/ProfessionalRegimeDisplay';
import SystemHealthCheck from '../components/SystemHealthCheck';
import SimplifiedAnalysisDisplay from '../components/SimplifiedAnalysisDisplay';
import QuickStartGuide from '../components/QuickStartGuide';
import ReplayMode from '../components/ReplayMode';
import RealtimeSignalAlerts from '../components/RealtimeSignalAlerts';
import { detectRealtimeSignals } from '../utils/realtimeSignals';
import TradingSessionDisplay from '../components/TradingSessionDisplay';
import SessionWarningBanner from '../components/SessionWarningBanner';
import CompleteBacktestPanel from '../components/CompleteBacktestPanel';
import { detectCurrentSession, getSessionAdjustedParams, shouldTrade } from '../utils/tradingSessions';
import { 
  evaluateSignalWithSession, 
  getSessionAppropriateStrategies,
  isSignalBlockedBySession,
  getSessionPositionMultiplier,
  getSessionTradingAdvice
} from '../utils/sessionAwareEvaluation';

export default function Home() {
  // Tab management
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' or 'backtest'
  
  const [institutionalTriggers, setInstitutionalTriggers] = useState(null);
  const [mtfStructure, setMtfStructure] = useState(getGoldRecommendedStructure()); // 5M default
  const [marketRegime, setMarketRegime] = useState(null);
  const [professionalEvaluation, setProfessionalEvaluation] = useState(null);
  const [approvedSignalsOnly, setApprovedSignalsOnly] = useState(true); // Professional filter
  const [showExplanations, setShowExplanations] = useState(true); // Help tooltips
  const [displayMode, setDisplayMode] = useState('beginner'); // 'beginner' or 'professional'
  const [showTutorial, setShowTutorial] = useState(false); // Tutorial overlay
  
  // Replay Mode (FX Replay style - optional)
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayCandles, setReplayCandles] = useState([]);
  const [fullCandleData, setFullCandleData] = useState([]); // Store full data for replay
  
  // Realtime Signal Detection (for playback verification)
  const [realtimeSignals, setRealtimeSignals] = useState({
    signals: [],
    activeConditions: [],
    triggerAlerts: [],
    confluence: { bullish: 0, bearish: 0 }
  });

  // Trading Session Management (Session-based strategy switching)
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionParams, setSessionParams] = useState(null);
  const [sessionWarnings, setSessionWarnings] = useState([]);

  // Check if first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  // Re-analyze when replay candles change
  useEffect(() => {
    if (replayEnabled && replayCandles.length > 0 && htfCandles.length > 0 && htfData) {
      console.log(`🎬 Replay: Analyzing ${replayCandles.length} candles...`);
      generateAllSignals(replayCandles, htfCandles, htfData);
    }
  }, [replayCandles, replayEnabled]);

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };
  const [apiKey, setApiKey] = useState('');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('5m');
  const [dataSource, setDataSource] = useState('sample'); // 'sample' or 'api'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoursToFetch, setHoursToFetch] = useState(72); // 72 hours for 5M (Gold optimized)
  const [candles, setCandles] = useState([]); // LTF candles (Entry)
  const [itfCandles, setItfCandles] = useState(null); // ITF candles (Setup)
  const [htfCandles, setHtfCandles] = useState(null); // HTF candles (Direction)
  const [htfData, setHtfData] = useState(null); // Institutional HTF analysis
  const [institutionalAnalysis, setInstitutionalAnalysis] = useState(null); // Institutional bias analysis
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [signals, setSignals] = useState([]);
  const [tradeLog, setTradeLog] = useState([]);
  const [dealingRange, setDealingRange] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('UNKNOWN');

  const [settings, setSettings] = useState({
    // Liquidity settings
    lookback: 20,
    wickRatio: 0.4,
    equalTolerance: 0.0002,
    enableMSS: true,
    
    // Impulse settings
    rangeMultiplier: 2.5,
    bodyRatio: 0.65,
    volumeMultiplier: 1.8,
    consecutiveMomentum: 3,
    atrMultiplier: 1.5,
    compressionLookback: 10,
    goldMode: true,
    enableImpulse: true,
    
    // MTF settings
    enableMTF: true,
    requireHTFBias: true,
    strictMode: false,
  });

  // Visual display settings - comprehensive toggles
  const [visualSettings, setVisualSettings] = useState({
    // Chart Elements
    showGrid: true,
    showTimeAxis: true,
    showPriceAxis: true,
    showCurrentPrice: true,
    showTooltip: true,
    
    // HTF Analysis
    showHTFBias: true,
    showHTFLevels: true,
    showDealingRange: true,
    
    // Signals
    showSignals: true,
    showSweeps: true,
    showConfirmed: true,
    showImpulse: true,
    showMomentum: true,
    showHighProb: true,
    
    // Advanced (for future expansion)
    showFVG: true,
    showOB: true,
    showBOS: true,
    showCHoCH: true,
  });

  // === REPLAY MODE HANDLERS (FX Replay Style) ===
  const handleReplayToggle = (enabled) => {
    setReplayEnabled(enabled);
    if (enabled && candles.length > 0) {
      // Initialize replay mode - start with 100 candles
      setFullCandleData(candles);
      const initialIndex = Math.min(100, candles.length - 1);
      setReplayIndex(initialIndex);
      setReplayCandles(candles.slice(0, initialIndex + 1));
      console.log(`🎬 Replay Mode ENABLED - Starting at candle ${initialIndex}`);
    } else {
      // Disable replay - show all candles
      setReplayCandles([]);
      setReplayIndex(0);
      setFullCandleData([]);
      console.log(`🎬 Replay Mode DISABLED - Showing all candles`);
    }
  };

  const handleReplayUpdate = (newIndex, newCandles) => {
    setReplayIndex(newIndex);
    setReplayCandles(newCandles);
    console.log(`🎬 Replay updated to candle ${newIndex} (${new Date(newCandles[newCandles.length - 1]?.timestamp).toLocaleString()})`);
    
    // ⭐ DETECT REALTIME SIGNALS AT EACH STEP
    if (htfCandles && htfData) {
      const realtimeResult = detectRealtimeSignals(
        fullCandleData.length > 0 ? fullCandleData : candles,
        newIndex,
        htfCandles,
        htfData
      );
      
      setRealtimeSignals(realtimeResult);
      
      // Log trigger alerts to console for verification
      if (realtimeResult.triggerAlerts.length > 0) {
        console.log(`🚨 NEW TRIGGERS:`, realtimeResult.triggerAlerts);
        realtimeResult.triggerAlerts.forEach(alert => {
          console.log(`   ${alert.message} @ ${alert.price?.toFixed(2) || 'N/A'}`);
        });
      }
      
      // Log active conditions
      console.log(`📊 Active Conditions: ${realtimeResult.activeConditions.length}`);
      console.log(`   Bullish: ${realtimeResult.confluence.bullish}/6, Bearish: ${realtimeResult.confluence.bearish}/6`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Setup MTF structure based on selected timeframe
      const mtfSetup = setupMTFStructure(timeframe);
      setMtfStructure(mtfSetup.structure);

      console.log(`\n🎯 Loading Data with Professional MTF Structure:`);
      console.log(`   LTF (Entry):     ${mtfSetup.structure.ltf}`);
      console.log(`   ITF (Setup):     ${mtfSetup.structure.itf}`);
      console.log(`   HTF (Direction): ${mtfSetup.structure.htf}`);
      console.log(`   Fetching:        ${mtfSetup.fetchParams.hours} hours\n`);

      let ltfCandleData;

      if (dataSource === 'sample') {
        // Use sample data
        const { generateGoldSampleData } = await import('../utils/sampleData');
        ltfCandleData = generateGoldSampleData(500, timeframe);
      } else {
        // PROFESSIONAL APPROACH: Fetch only LTF data
        // Build ITF and HTF internally via aggregation
        const params = new URLSearchParams({
          symbol,
          timeframe: mtfSetup.structure.ltf, // Fetch LTF only
          hours: mtfSetup.fetchParams.hours,   // Proper hours for structure
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`/api/candles?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch candle data');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        ltfCandleData = data.candles;
      }

      console.log(`✅ Fetched ${ltfCandleData.length} LTF candles (${mtfSetup.structure.ltf})`);

      // BUILD ITF and HTF from LTF via aggregation (Professional method)
      const itfCandleData = aggregateCandles(ltfCandleData, mtfSetup.structure.itf);
      const htfCandleData = aggregateCandles(ltfCandleData, mtfSetup.structure.htf);

      // Validate MTF data quality
      const validation = validateMTFData(ltfCandleData, itfCandleData, htfCandleData);
      
      if (!validation.valid) {
        console.warn('⚠️ MTF Data Quality Issues:');
        validation.issues.forEach(issue => console.warn(`   - ${issue}`));
      } else {
        console.log(`✅ MTF Data Validated:`);
        console.log(`   LTF: ${validation.ltfCount} candles`);
        console.log(`   ITF: ${validation.itfCount} candles`);
        console.log(`   HTF: ${validation.htfCount} candles`);
      }

      // Perform institutional HTF analysis on HTF candles
      let institutionalAnalysis = null;
      if (htfCandleData && htfCandleData.length > 0) {
        const bias = analyzeInstitutionalBias(htfCandleData);
        const liquidityLevels = mapLiquidityLevels(htfCandleData, timeframe);
        const htfDealingRange = calculateDealingRange(htfCandleData);
        
        institutionalAnalysis = {
          bias: bias.bias,
          confidence: bias.confidence,
          structure: bias.structure,
          levels: liquidityLevels,
          dealingRange: htfDealingRange,
        };
        
        setHtfData(institutionalAnalysis);
        setInstitutionalAnalysis(institutionalAnalysis); // Set state for use throughout component

        console.log(`\n📊 HTF Institutional Analysis:`);
        console.log(`   Bias: ${bias.bias} (${(bias.confidence * 100).toFixed(0)}%)`);
        console.log(`   Structure: ${bias.structure}`);
      }

      // Set all three timeframes
      setCandles(ltfCandleData);      // LTF for entry
      setItfCandles(itfCandleData);   // ITF for setup
      setHtfCandles(htfCandleData);   // HTF for direction
      
      // Initialize replay mode data if needed
      if (replayEnabled) {
        setFullCandleData(ltfCandleData);
        const initialIndex = Math.min(100, ltfCandleData.length - 1);
        setReplayIndex(initialIndex);
        setReplayCandles(ltfCandleData.slice(0, initialIndex + 1));
        console.log(`🎬 Replay data initialized: ${initialIndex + 1} candles visible`);
      }
      
      // Calculate LTF dealing range
      const ltfDealingRange = calculateDealingRange(ltfCandleData);
      setDealingRange(ltfDealingRange);
      
      // Detect current market phase
      const phase = detectMarketPhase(ltfCandleData, ltfCandleData.length - 1);
      setCurrentPhase(phase);
      
      // Generate ALL signals immediately (TradingView style)
      await generateAllSignals(ltfCandleData, htfCandleData, institutionalAnalysis);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const startPlayback = () => {
    if (candles.length === 0) return;
    
    setIsPlaying(true);
    setPlaybackIndex(0);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
  };

  const resetPlayback = () => {
    stopPlayback();
    setPlaybackIndex(-1);
    setSignals([]);
    setTradeLog([]);
  };

  const generateAllSignals = async (candleData, htfCandleData, institutionalAnalysis) => {
    // Generate all signals at once for immediate display (TradingView style)
    const allSignals = [];
    const allLogs = [];

    console.log(`Analyzing ${candleData.length} candles for signals...`);

    for (let i = 0; i < candleData.length; i++) {
      // Detect liquidity sweeps
      const liquidityResult = detectLiquiditySweeps(candleData, settings, i);
      
      // Detect impulse
      const impulseResult = settings.enableImpulse 
        ? detectImpulse(candleData, settings, i)
        : null;

      // Get session timing
      const session = getSessionTiming(candleData[i].timestamp);

      // Process liquidity signals with institutional confluence
      if (liquidityResult) {
        if (liquidityResult.ssl) {
          // Check institutional confluence
          const confluence = institutionalAnalysis 
            ? checkInstitutionalConfluence(
                { type: 'SSL', level: liquidityResult.ssl.level, data: liquidityResult.ssl },
                institutionalAnalysis,
                dealingRange,
                candleData[i].timestamp
              )
            : null;

          const signal = {
            type: 'SSL',
            index: i,
            timestamp: candleData[i].timestamp,
            price: liquidityResult.ssl.level,
            data: liquidityResult.ssl,
            session,
            confluence,
          };
          allSignals.push(signal);
          allLogs.push(createLogEntry(signal, confluence));
        }

        if (liquidityResult.bsl) {
          // Check institutional confluence
          const confluence = institutionalAnalysis 
            ? checkInstitutionalConfluence(
                { type: 'BSL', level: liquidityResult.bsl.level, data: liquidityResult.bsl },
                institutionalAnalysis,
                dealingRange,
                candleData[i].timestamp
              )
            : null;

          const signal = {
            type: 'BSL',
            index: i,
            timestamp: candleData[i].timestamp,
            price: liquidityResult.bsl.level,
            data: liquidityResult.bsl,
            session,
            confluence,
          };
          allSignals.push(signal);
          allLogs.push(createLogEntry(signal, confluence));
        }

        if (liquidityResult.mss && liquidityResult.mss.confirmed) {
          const signal = {
            type: liquidityResult.mss.type,
            index: i,
            timestamp: candleData[i].timestamp,
            price: candleData[i].close,
            data: liquidityResult.mss,
            session,
          };
          allSignals.push(signal);
          allLogs.push(createLogEntry(signal));
        }
      }

      // Process impulse signals
      if (impulseResult) {
        if (impulseResult.displacement) {
          const signal = {
            type: impulseResult.displacement.type,
            index: i,
            timestamp: candleData[i].timestamp,
            price: candleData[i].close,
            data: impulseResult.displacement,
            session,
          };
          allSignals.push(signal);
          allLogs.push(createLogEntry(signal));
        }

        if (impulseResult.momentum) {
          const signal = {
            type: 'MOMENTUM_BURST',
            index: i,
            timestamp: candleData[i].timestamp,
            price: candleData[i].close,
            data: impulseResult.momentum,
            session,
          };
          allSignals.push(signal);
          allLogs.push(createLogEntry(signal));
        }
      }

      // Check for high probability setup with institutional analysis
      const highProbSetup = detectHighProbabilitySetup(
        liquidityResult,
        impulseResult,
        { bias: institutionalAnalysis },
        settings
      );

      if (highProbSetup) {
        // Additional institutional confluence check
        const confluence = institutionalAnalysis && liquidityResult
          ? checkInstitutionalConfluence(
              liquidityResult.ssl || liquidityResult.bsl,
              institutionalAnalysis,
              dealingRange,
              candleData[i].timestamp
            )
          : null;

        const signal = {
          type: 'HIGH_PROBABILITY',
          index: i,
          timestamp: candleData[i].timestamp,
          price: candleData[i].close,
          data: highProbSetup,
          direction: highProbSetup.direction,
          mtfConfirmed: highProbSetup.mtfConfirmed,
          session,
          confluence,
        };
        allSignals.push(signal);
        allLogs.push(createLogEntry(signal, confluence));
      }
    }

    console.log(`Generated ${allSignals.length} signals`);
    
    // PROFESSIONAL ADAPTIVE AI SYSTEM
    console.log('\n🎯 Running Professional Adaptive AI System...');
    
    // 1. Detect Market Regime
    const currentIndex = candleData.length - 1;
    const regime = detectMarketRegime(candleData, currentIndex);
    setMarketRegime(regime);
    
    console.log(`📊 Market Regime: ${regime.regime} (${(regime.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`   Best Strategies: ${regime.bestStrategies ? regime.bestStrategies.join(', ') : 'None'}`);
    
    // 2. Detect institutional directional triggers
    const triggers = detectAllInstitutionalTriggers(candleData, currentIndex);
    console.log(`🎯 Institutional Triggers: ${triggers.triggerCount}/7 (Consensus: ${triggers.consensus})`);
    setInstitutionalTriggers(triggers);
    
    // 3. Professional Signal Evaluation
    // Per PDF: "Focus on 2-3 core setups, not 45"
    // Filter to high-probability signals only
    const highProbabilitySignals = allSignals.filter(s => 
      s.type === 'HIGH_PROBABILITY' || 
      (s.confluence && s.confluence.shouldTrade)
    );
    
    if (highProbabilitySignals.length > 0) {
      // Evaluate the most recent high-probability signal
      const latestSignal = highProbabilitySignals[highProbabilitySignals.length - 1];
      
      const evaluation = evaluateSignalProfessionally(
        {
          ...latestSignal,
          entry: latestSignal.price,
          direction: latestSignal.direction || (latestSignal.type === 'SSL' ? 'SELL' : 'BUY'),
          htfBias: institutionalAnalysis?.bias ? {
            bias: institutionalAnalysis.bias,
            score: institutionalAnalysis.confidence * 100,
          } : null,
          dealingRange: dealingRange,
          killZoneActive: latestSignal.session === 'LONDON_OPEN' || latestSignal.session === 'NY_OPEN',
          volatilityExpanding: true, // From ltfExecution
          mss: latestSignal.data?.mss,
          bos: latestSignal.data?.bos,
        },
        candleData,
        currentIndex
      );
      
      // ⭐ APPLY SESSION-BASED ADJUSTMENTS
      let finalEvaluation = evaluation;
      if (currentSession && sessionParams) {
        finalEvaluation = evaluateSignalWithSession(
          evaluation,
          currentSession,
          sessionParams,
          marketRegime,
          triggers
        );
        
        // Check if signal is blocked by session rules
        const signalType = latestSignal.type || evaluation.strategies?.primary;
        const isBlocked = isSignalBlockedBySession(signalType, currentSession);
        
        if (isBlocked) {
          finalEvaluation.approved = false;
          finalEvaluation.sessionBlocked = true;
          finalEvaluation.rejectionReason = `${currentSession.name}: This signal type not allowed`;
        }
        
        // Apply session position size multiplier
        if (finalEvaluation.risk) {
          const sizeMultiplier = getSessionPositionMultiplier(
            currentSession,
            finalEvaluation.confluenceScore || evaluation.confluence?.score || 0
          );
          finalEvaluation.risk.sessionSizeMultiplier = sizeMultiplier;
          finalEvaluation.risk.adjustedPositionSize = (finalEvaluation.risk.positionSize || 0.05) * sizeMultiplier;
        }
        
        // Get session trading advice
        const tradeability = shouldTrade();
        const confluenceScore = finalEvaluation.confluenceScore || evaluation.confluence?.score || 0;
        finalEvaluation.sessionAdvice = getSessionTradingAdvice(
          currentSession,
          tradeability,
          confluenceScore
        );
        
        console.log('\n🌍 SESSION-AWARE EVALUATION:');
        console.log(`   Session: ${currentSession.name} ${currentSession.icon}`);
        console.log(`   Required Confluence: ${sessionParams.confluenceThreshold}/6`);
        console.log(`   Current Confluence: ${confluenceScore}/6`);
        console.log(`   Session Quality: ${finalEvaluation.sessionQuality?.rating || 'N/A'}`);
        console.log(`   Kill Zone: ${currentSession.isKillZone ? '🎯 YES' : 'No'}`);
        if (finalEvaluation.sessionBlocked) {
          console.log(`   ⛔ BLOCKED: ${finalEvaluation.rejectionReason}`);
        }
        if (finalEvaluation.sessionWarning) {
          console.log(`   ⚠️ ${finalEvaluation.sessionWarning}`);
        }
      }
      
      setProfessionalEvaluation(finalEvaluation);
      
      console.log('\n✅ Professional Evaluation Complete:');
      console.log(`   Regime: ${finalEvaluation.regime?.detected || evaluation.regime?.detected}`);
      console.log(`   Strategies: ${finalEvaluation.strategies?.count || evaluation.strategies?.count} selected`);
      console.log(`   Confluence: ${finalEvaluation.confluenceScore || evaluation.confluence?.score}/6 (${finalEvaluation.confluence?.quality || evaluation.confluence?.quality})`);
      console.log(`   Risk: ${finalEvaluation.risk?.rrRatio || evaluation.risk?.rrRatio} (${finalEvaluation.risk?.stopPips || evaluation.risk?.stopPips} pips stop)`);
      console.log(`   Decision: ${finalEvaluation.approved !== false && (finalEvaluation.decision?.approved || evaluation.decision?.approved) ? '✅ APPROVED' : '⚠️ WAIT'}`);
      if (finalEvaluation.sessionAdvice && finalEvaluation.sessionAdvice.length > 0) {
        console.log(`   Session Advice:`);
        finalEvaluation.sessionAdvice.forEach(advice => console.log(`      ${advice}`));
      }      console.log(`   Expected Win Rate: ${evaluation.decision.expectedWinRate} (Professional: 50-55%)`);
      
      // Filter signals if "Approved Only" is enabled
      if (approvedSignalsOnly && !evaluation.decision.approved) {
        console.log('\n⚠️ Signal filtered - does not meet professional standards');
        console.log('   Reason: ' + evaluation.decision.reason);
      }
    } else {
      console.log('\nℹ️ No high-probability signals to evaluate');
      setProfessionalEvaluation(null);
    }
    
    console.log(`\n📊 Total Signals: ${allSignals.length}`);
    console.log(`   High Probability: ${highProbabilitySignals.length}`);
    console.log(`   Professional Filter: ${approvedSignalsOnly ? 'ON' : 'OFF'}`);
    console.log('');
    
    setSignals(allSignals);
    setTradeLog(allLogs);
  };

  const createLogEntry = (signal, confluence = null) => {
    let notes = getSignalNotes(signal);
    
    // Add confluence information
    if (confluence) {
      notes += ` | ${confluence.rating} (${confluence.score}%)`;
      if (confluence.shouldTrade) {
        notes += ' ✓';
      }
    }

    // Add session timing
    if (signal.session) {
      if (signal.session === 'LONDON_OPEN' || signal.session === 'NY_OPEN') {
        notes += ` | ${signal.session} 🔥`;
      }
    }

    return {
      time: new Date(signal.timestamp).toLocaleTimeString(),
      type: formatSignalType(signal.type),
      price: signal.price.toFixed(2),
      timeframe: timeframe,
      notes,
    };
  };

  const getSignalNotes = (signal) => {
    if (signal.type === 'HIGH_PROBABILITY') {
      return signal.mtfConfirmed 
        ? 'MTF Confirmed - Institutional Entry' 
        : 'LTF Only - Partial Confirmation';
    }
    if (signal.type === 'IMPULSE_UP' || signal.type === 'IMPULSE_DOWN') {
      return `Range: ${signal.data?.rangeRatio?.toFixed(2)}x avg`;
    }
    if (signal.type === 'MOMENTUM_BURST') {
      return `${signal.data?.candles} candles, ${signal.data?.pipMove} pips`;
    }
    return '';
  };

  const formatSignalType = (type) => {
    const typeMap = {
      'SSL': 'SSL Candidate',
      'BSL': 'BSL Candidate',
      'BUY': 'BUY Confirmed',
      'SELL': 'SELL Confirmed',
      'IMPULSE_UP': 'Impulse Up',
      'IMPULSE_DOWN': 'Impulse Down',
      'MOMENTUM_BURST': 'Momentum Burst',
      'HIGH_PROBABILITY': 'High Probability MTF Setup',
    };
    return typeMap[type] || type;
  };

  // Set default date range (last 7 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">
          <h1>INSTITUTIONAL LIQUIDITY TRADER</h1>
          <span className="header-badge">TRADINGVIEW-STYLE</span>
          <span className="header-badge">XAU/USD OPTIMIZED</span>
        </div>
        <div style={{fontSize: '0.75rem', color: '#6e7681', fontFamily: '"JetBrains Mono", monospace'}}>
          Multi-Timeframe • Smart Money Concepts • Interactive Charts
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          📊 Chart & Analysis
        </button>
        <button
          className={`tab-button ${activeTab === 'backtest' ? 'active' : ''}`}
          onClick={() => setActiveTab('backtest')}
          disabled={!candles || candles.length < 100}
        >
          🔬 Backtest (Test Your Logic)
        </button>
      </div>

      <main className="main-content">
        {/* CHART TAB */}
        {activeTab === 'chart' && (
          <>
        {/* Settings Panel */}
        <div className="settings-panel animate-in">
          <div className="settings-grid">
            <div className="setting-group">
              <label className="setting-label">Data Source</label>
              <select
                className="setting-select"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
              >
                <option value="sample">Sample Data (No API Key Needed)</option>
                <option value="api">Real API Data (Finage)</option>
              </select>
            </div>

            {dataSource === 'api' && (
              <div className="setting-group">
                <label className="setting-label">API Key</label>
                <input
                  type="password"
                  className="setting-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Finage API key"
                />
              </div>
            )}

            {dataSource === 'api' && (
              <>
                <div className="setting-group">
                  <label className="setting-label">Start Date</label>
                  <input
                    type="date"
                    className="setting-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">End Date</label>
                  <input
                    type="date"
                    className="setting-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">Hours to Fetch</label>
                  <input
                    type="number"
                    className="setting-input"
                    value={hoursToFetch}
                    onChange={(e) => setHoursToFetch(parseInt(e.target.value))}
                    min="1"
                    max="720"
                    placeholder="24"
                  />
                </div>
              </>
            )}

            <div className="setting-group">
              <label className="setting-label">Symbol</label>
              <select
                className="setting-select"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={dataSource === 'sample'}
              >
                <option value="XAUUSD">XAU/USD (Gold)</option>
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Timeframe</label>
              <select
                className="setting-select"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1D">Daily</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Lookback</label>
              <input
                type="number"
                className="setting-input"
                value={settings.lookback}
                onChange={(e) => setSettings({...settings, lookback: parseInt(e.target.value)})}
                min="10"
                max="50"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Range Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="setting-input"
                value={settings.rangeMultiplier}
                onChange={(e) => setSettings({...settings, rangeMultiplier: parseFloat(e.target.value)})}
                min="1"
                max="5"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Body Ratio %</label>
              <input
                type="number"
                step="0.05"
                className="setting-input"
                value={settings.bodyRatio}
                onChange={(e) => setSettings({...settings, bodyRatio: parseFloat(e.target.value)})}
                min="0.5"
                max="0.95"
              />
            </div>
          </div>

          <div className="settings-grid" style={{marginTop: '1rem'}}>
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.enableMSS}
                onChange={(e) => setSettings({...settings, enableMSS: e.target.checked})}
              />
              <span>Enable MSS Confirmation</span>
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.enableImpulse}
                onChange={(e) => setSettings({...settings, enableImpulse: e.target.checked})}
              />
              <span>Enable Impulse Detection</span>
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.goldMode}
                onChange={(e) => setSettings({...settings, goldMode: e.target.checked})}
              />
              <span>Gold Aggressive Mode</span>
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.enableMTF}
                onChange={(e) => setSettings({...settings, enableMTF: e.target.checked})}
              />
              <span>Multi-Timeframe Confirmation</span>
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.requireHTFBias}
                onChange={(e) => setSettings({...settings, requireHTFBias: e.target.checked})}
                disabled={!settings.enableMTF}
              />
              <span>Require HTF Bias Alignment</span>
            </label>
          </div>

          <div style={{marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <div style={{marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <button 
              className="btn btn-primary" 
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
            
            <button
              className="btn"
              onClick={() => setShowTutorial(true)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
              }}
              title="Show quick start tutorial"
            >
              📚 Tutorial
            </button>
          </div>

          {dataSource === 'sample' && (
            <div style={{
              fontSize: '0.75rem',
              color: '#8b949e',
              fontFamily: '"JetBrains Mono", monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}>
              <span>💡</span>
              <span>Using realistic sample Gold data with built-in sweep patterns</span>
            </div>
          )}
          </div>

          {/* PROFESSIONAL FILTER */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #00d4aa20 0%, #00d4aa10 100%)',
            border: '2px solid #00d4aa40',
            borderRadius: '8px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}>
              <input
                type="checkbox"
                checked={approvedSignalsOnly}
                onChange={(e) => setApprovedSignalsOnly(e.target.checked)}
                style={{width: '18px', height: '18px', cursor: 'pointer'}}
              />
              <div>
                <div style={{color: '#00d4aa', marginBottom: '0.25rem'}}>
                  ✅ Professional Filter (Recommended)
                </div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>
                  Only show signals meeting professional standards: ATR-based stops (20-40 pips), 
                  1:2.5 RR minimum, 3+ confluence factors, regime-aligned strategies
                </div>
              </div>
            </label>
            <div style={{
              marginTop: '0.75rem',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}>
              💡 Per PDF: Target 50-55% win rate (not 80-90%). Focus on 2-3 core setups (not 45).
            </div>
          </div>

          {/* DISPLAY MODE TOGGLE */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #bc8cff20 0%, #bc8cff10 100%)',
            border: '2px solid #bc8cff40',
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#bc8cff',
              marginBottom: '0.75rem',
            }}>
              🎨 Display Mode
            </div>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <button
                onClick={() => setDisplayMode('beginner')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: displayMode === 'beginner' ? '#bc8cff' : 'var(--bg-tertiary)',
                  color: displayMode === 'beginner' ? '#0d1117' : 'var(--text-primary)',
                  border: displayMode === 'beginner' ? '2px solid #bc8cff' : '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: displayMode === 'beginner' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🌟 Beginner Mode<br/>
                <span style={{fontSize: '0.7rem', opacity: 0.8}}>Easy to understand</span>
              </button>
              <button
                onClick={() => setDisplayMode('professional')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: displayMode === 'professional' ? '#bc8cff' : 'var(--bg-tertiary)',
                  color: displayMode === 'professional' ? '#0d1117' : 'var(--text-primary)',
                  border: displayMode === 'professional' ? '2px solid #bc8cff' : '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: displayMode === 'professional' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🎯 Professional Mode<br/>
                <span style={{fontSize: '0.7rem', opacity: 0.8}}>Full details</span>
              </button>
            </div>
            <div style={{
              marginTop: '0.75rem',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}>
              💡 Beginner mode simplifies the analysis. Professional mode shows all technical details.
            </div>
          </div>

          {/* REPLAY MODE TOGGLE (FX Replay Style) */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #ff950020 0%, #ff950010 100%)',
            border: '2px solid #ff950040',
            borderRadius: '8px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}>
              <input
                type="checkbox"
                checked={replayEnabled}
                onChange={(e) => setReplayEnabled(e.target.checked)}
                style={{width: '18px', height: '18px', cursor: 'pointer'}}
              />
              <div>
                <div style={{color: '#ff9500', marginBottom: '0.25rem'}}>
                  🎬 Replay Mode (FX Replay Style) - Optional
                </div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>
                  Enable bar-by-bar playback for backtesting. Play, pause, fast-forward, or jump to any date/time. 
                  Perfect for analyzing price action step-by-step without risk.
                </div>
              </div>
            </label>
            <div style={{
              marginTop: '0.75rem',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}>
              💡 When enabled, you'll see playback controls below the chart. You can control speed (0.5x to 50x) and jump to any point in history.
            </div>
          </div>
        </div>

        {error && (
          <div className="error animate-in">
            ⚠️ {error}
          </div>
        )}

        {/* FX Replay Mode (Optional Feature) */}
        {candles.length > 0 && (
          <ReplayMode
            allCandles={candles}
            symbol={symbol}
            timeframe={timeframe}
            onReplayUpdate={(visibleCandles, replayInfo) => {
              if (replayInfo.isReplayMode) {
                setReplayCandles(visibleCandles);
                setReplayIndex(replayInfo.currentIndex);
                setReplayEnabled(true);
                
                // ⭐ DETECT REALTIME SIGNALS DURING PLAYBACK
                if (htfCandles && htfData) {
                  const realtimeResult = detectRealtimeSignals(
                    candles,
                    replayInfo.currentIndex,
                    htfCandles,
                    htfData
                  );
                  setRealtimeSignals(realtimeResult);
                  
                  // Log triggers for verification
                  if (realtimeResult.triggerAlerts.length > 0) {
                    console.log(`🚨 Candle #${replayInfo.currentIndex} TRIGGERS:`, realtimeResult.triggerAlerts.map(a => a.message));
                  }
                }
              } else {
                setReplayEnabled(false);
                setReplayCandles([]);
                setRealtimeSignals({ signals: [], activeConditions: [], triggerAlerts: [], confluence: { bullish: 0, bearish: 0 } });
              }
            }}
          />
        )}

        {/* ⭐ REALTIME SIGNAL ALERTS (Shows during playback) */}
        {replayEnabled && candles.length > 0 && (
          <RealtimeSignalAlerts
            triggerAlerts={realtimeSignals.triggerAlerts}
            activeConditions={realtimeSignals.activeConditions}
            confluence={realtimeSignals.confluence}
          />
        )}

        {/* ⭐ SESSION-BASED STRATEGY SWITCHING (Professional Trading Sessions) */}
        <TradingSessionDisplay
          onSessionChange={(session, params) => {
            setCurrentSession(session);
            setSessionParams(params);
            
            // Log session change
            console.log(`\n🌍 SESSION CHANGED: ${session.name}`);
            console.log(`   Priority: ${session.priority}`);
            console.log(`   Confluence Threshold: ${params.confluenceThreshold}/6`);
            console.log(`   ATR Multiplier: ${params.atrMultiplier}x`);
            console.log(`   Expected Win Rate: ${params.winRateExpectation}`);
            
            // Check if should trade
            const tradeability = shouldTrade();
            if (!tradeability.shouldTrade) {
              setSessionWarnings([tradeability.reason]);
              console.log(`   ⚠️ ${tradeability.reason}`);
            } else {
              setSessionWarnings([]);
              if (session.isKillZone) {
                console.log(`   🎯 ${session.killZoneLabel} - Prime trading time!`);
              }
            }
          }}
        />

        {/* ⭐ SESSION WARNING BANNER (Prominent warnings and recommendations) */}
        {currentSession && (
          <SessionWarningBanner
            sessionInfo={currentSession}
            professionalEvaluation={professionalEvaluation}
            isVisible={candles.length > 0}
          />
        )}

        {/* Chart */}
        {candles.length > 0 && (
          <>
            <InteractiveChart
              candles={replayEnabled && replayCandles.length > 0 ? replayCandles : candles}
              signals={signals}
              htfData={htfData}
              settings={settings}
              visualSettings={visualSettings}
            />

            {/* Visual Display Controls */}
            <div className="visual-settings-panel animate-in">
              <div className="visual-settings-title">
                👁️ VISUAL DISPLAY CONTROLS
              </div>
              <div className="visual-toggles-grid">
                {/* Chart Elements */}
                <div className="visual-toggle-category">📊 Chart Elements</div>
                
                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={visualSettings.showGrid}
                    onChange={(e) => setVisualSettings({...visualSettings, showGrid: e.target.checked})}
                  />
                  <label htmlFor="showGrid">Grid Lines</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showTimeAxis"
                    checked={visualSettings.showTimeAxis}
                    onChange={(e) => setVisualSettings({...visualSettings, showTimeAxis: e.target.checked})}
                  />
                  <label htmlFor="showTimeAxis">Time Axis</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showPriceAxis"
                    checked={visualSettings.showPriceAxis}
                    onChange={(e) => setVisualSettings({...visualSettings, showPriceAxis: e.target.checked})}
                  />
                  <label htmlFor="showPriceAxis">Price Axis</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showCurrentPrice"
                    checked={visualSettings.showCurrentPrice}
                    onChange={(e) => setVisualSettings({...visualSettings, showCurrentPrice: e.target.checked})}
                  />
                  <label htmlFor="showCurrentPrice">Current Price Line</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showTooltip"
                    checked={visualSettings.showTooltip}
                    onChange={(e) => setVisualSettings({...visualSettings, showTooltip: e.target.checked})}
                  />
                  <label htmlFor="showTooltip">Hover Tooltip</label>
                </div>

                {/* HTF Analysis */}
                <div className="visual-toggle-category">📈 Multi-Timeframe</div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showHTFBias"
                    checked={visualSettings.showHTFBias}
                    onChange={(e) => setVisualSettings({...visualSettings, showHTFBias: e.target.checked})}
                  />
                  <label htmlFor="showHTFBias">HTF Bias Indicator</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showHTFLevels"
                    checked={visualSettings.showHTFLevels}
                    onChange={(e) => setVisualSettings({...visualSettings, showHTFLevels: e.target.checked})}
                  />
                  <label htmlFor="showHTFLevels">Support/Resistance Levels</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showDealingRange"
                    checked={visualSettings.showDealingRange}
                    onChange={(e) => setVisualSettings({...visualSettings, showDealingRange: e.target.checked})}
                  />
                  <label htmlFor="showDealingRange">Premium/Discount Zones</label>
                </div>

                {/* Signal Types */}
                <div className="visual-toggle-category">🎯 Signal Types</div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showSignals"
                    checked={visualSettings.showSignals}
                    onChange={(e) => setVisualSettings({...visualSettings, showSignals: e.target.checked})}
                  />
                  <label htmlFor="showSignals">All Signals (Master)</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showSweeps"
                    checked={visualSettings.showSweeps}
                    onChange={(e) => setVisualSettings({...visualSettings, showSweeps: e.target.checked})}
                  />
                  <label htmlFor="showSweeps">Liquidity Sweeps (SSL/BSL)</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showConfirmed"
                    checked={visualSettings.showConfirmed}
                    onChange={(e) => setVisualSettings({...visualSettings, showConfirmed: e.target.checked})}
                  />
                  <label htmlFor="showConfirmed">Confirmed Entries (BUY/SELL)</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showImpulse"
                    checked={visualSettings.showImpulse}
                    onChange={(e) => setVisualSettings({...visualSettings, showImpulse: e.target.checked})}
                  />
                  <label htmlFor="showImpulse">Impulse/Displacement</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showMomentum"
                    checked={visualSettings.showMomentum}
                    onChange={(e) => setVisualSettings({...visualSettings, showMomentum: e.target.checked})}
                  />
                  <label htmlFor="showMomentum">Momentum Bursts</label>
                </div>

                <div className="visual-toggle-item">
                  <input
                    type="checkbox"
                    id="showHighProb"
                    checked={visualSettings.showHighProb}
                    onChange={(e) => setVisualSettings({...visualSettings, showHighProb: e.target.checked})}
                  />
                  <label htmlFor="showHighProb">High Probability Setups 🔥</label>
                </div>
              </div>

              <div style={{
                marginTop: '1rem',
                fontSize: '0.7rem',
                color: '#6e7681',
                fontFamily: '"JetBrains Mono", monospace',
                textAlign: 'center'
              }}>
                💡 Toggle any visual element on/off for cleaner analysis
              </div>
            </div>

            {/* Institutional Analysis Panel */}
            {htfData && (
              <div className="settings-panel animate-in">
                <h3 style={{fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', marginBottom: '1rem', color: '#8b949e'}}>
                  📊 INSTITUTIONAL ANALYSIS - MTF STRUCTURE
                </h3>

                {/* MTF Structure Info */}
                <div style={{
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
                  border: '2px solid var(--primary)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}>
                  <div style={{fontSize: '0.7rem', color: '#6e7681', marginBottom: '0.5rem', textAlign: 'center'}}>
                    🎯 PROFESSIONAL 3-LAYER MODEL
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                  }}>
                    <div style={{textAlign: 'center', flex: 1}}>
                      <div style={{color: '#8b949e', marginBottom: '0.25rem'}}>HTF</div>
                      <div style={{color: '#ff4976', fontWeight: 'bold'}}>{mtfStructure.htf}</div>
                      <div style={{fontSize: '0.65rem', color: '#6e7681'}}>Direction</div>
                    </div>
                    <div style={{color: '#8b949e', fontSize: '1.5rem'}}>→</div>
                    <div style={{textAlign: 'center', flex: 1}}>
                      <div style={{color: '#8b949e', marginBottom: '0.25rem'}}>ITF</div>
                      <div style={{color: '#ffd60a', fontWeight: 'bold'}}>{mtfStructure.itf}</div>
                      <div style={{fontSize: '0.65rem', color: '#6e7681'}}>Setup</div>
                    </div>
                    <div style={{color: '#8b949e', fontSize: '1.5rem'}}>→</div>
                    <div style={{textAlign: 'center', flex: 1}}>
                      <div style={{color: '#8b949e', marginBottom: '0.25rem'}}>LTF</div>
                      <div style={{color: '#00d4aa', fontWeight: 'bold'}}>{mtfStructure.ltf}</div>
                      <div style={{fontSize: '0.65rem', color: '#6e7681'}}>Entry</div>
                    </div>
                  </div>
                  {mtfStructure.recommended && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: '#00d4aa20',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      color: '#00d4aa',
                      fontWeight: 'bold',
                    }}>
                      ✅ GOLD OPTIMIZED
                    </div>
                  )}
                </div>

                <div className="settings-grid">
                  <div className="setting-group">
                    <label className="setting-label">HTF Bias</label>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color: htfData.bias === 'BULLISH' ? '#00d4aa' : htfData.bias === 'BEARISH' ? '#ff4976' : '#ffd60a',
                      fontWeight: 'bold'
                    }}>
                      {htfData.bias} ({(htfData.confidence * 100).toFixed(0)}%)
                    </div>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">Market Phase</label>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color: '#58a6ff'
                    }}>
                      {currentPhase}
                    </div>
                  </div>

                  {dealingRange && (
                    <>
                      <div className="setting-group">
                        <label className="setting-label">Premium Zone</label>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.875rem',
                          color: '#ff4976'
                        }}>
                          {dealingRange.mid.toFixed(2)} - {dealingRange.high.toFixed(2)}
                        </div>
                      </div>

                      <div className="setting-group">
                        <label className="setting-label">Discount Zone</label>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.875rem',
                          color: '#00d4aa'
                        }}>
                          {dealingRange.low.toFixed(2)} - {dealingRange.mid.toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="setting-group">
                    <label className="setting-label">Total Signals</label>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color: '#bc8cff',
                      fontWeight: 'bold'
                    }}>
                      {signals.length} detected
                    </div>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">High Probability</label>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.875rem',
                      color: '#bc8cff',
                      fontWeight: 'bold'
                    }}>
                      {signals.filter(s => s.type === 'HIGH_PROBABILITY').length} setups
                    </div>
                  </div>
                </div>

                <div style={{marginTop: '1rem', fontSize: '0.75rem', color: '#6e7681', fontFamily: '"JetBrains Mono", monospace'}}>
                  💡 <strong>Institutional Rule:</strong> Buy in discount, Sell in premium
                </div>
              </div>
            )}

            {/* SYSTEM HEALTH CHECK */}
            <SystemHealthCheck
              candles={candles}
              htfCandles={htfCandles}
              itfCandles={itfCandles}
              mtfStructure={mtfStructure}
              htfBias={htfData?.bias}
              marketRegime={marketRegime}
              institutionalTriggers={institutionalTriggers}
              professionalEvaluation={professionalEvaluation}
            />

            {/* CONDITIONAL DISPLAY BASED ON MODE */}
            {displayMode === 'beginner' ? (
              /* BEGINNER MODE - Simplified Display */
              <SimplifiedAnalysisDisplay 
                regime={marketRegime}
                triggers={institutionalTriggers}
                evaluation={professionalEvaluation}
                htfBias={htfData?.bias ? {bias: htfData.bias, confidence: htfData.confidence} : null}
                dealingRange={htfData?.dealingRange ? {...htfData.dealingRange, current: htfData.dealingRange.current} : null}
              />
            ) : (
              /* PROFESSIONAL MODE - Full Technical Display */
              <>
                {professionalEvaluation && (
                  <ProfessionalRegimeDisplay evaluation={professionalEvaluation} />
                )}

                {/* Market Regime Indicator (if no signal) */}
                {!professionalEvaluation && marketRegime && (
                  <div className="settings-panel animate-in" style={{background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)', border: '2px solid var(--primary)'}}>
                    <h3 style={{fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', marginBottom: '1rem', color: '#8b949e'}}>
                      📊 MARKET REGIME DETECTED
                    </h3>
                    <div style={{padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px'}}>
                      <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem'}}>
                        {marketRegime.regime.replace(/_/g, ' ')}
                      </div>
                      <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
                        {marketRegime.description}
                      </div>
                      <div style={{fontSize: '0.75rem', color: '#6e7681'}}>
                        Confidence: {(marketRegime.confidence * 100).toFixed(0)}% | 
                        Stop Recommendation: {marketRegime.stopLossRecommendation?.toFixed(2)} pips
                      </div>
                      {marketRegime.bestStrategies && (
                        <div style={{marginTop: '0.75rem', fontSize: '0.75rem'}}>
                          <strong>Best Strategies:</strong> {marketRegime.bestStrategies.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{marginTop: '1rem', fontSize: '0.75rem', color: '#6e7681', fontStyle: 'italic', textAlign: 'center'}}>
                      ℹ️ Waiting for high-quality setup that meets professional standards
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

            {/* ⭐ BACKTEST ANALYSIS - Understanding Returns (NOT actual trades) */}
            {/* Institutional Directional Triggers - ONLY IN PROFESSIONAL MODE */}
            {displayMode === 'professional' && institutionalTriggers && institutionalTriggers.triggerCount > 0 && (
              <div className="settings-panel animate-in institutional-triggers-panel">
                <h3 style={{fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', marginBottom: '1rem', color: '#8b949e'}}>
                  🎯 INSTITUTIONAL DIRECTIONAL TRIGGERS
                </h3>

                {/* Consensus Summary */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  border: `2px solid ${institutionalTriggers.consensus === 'BULLISH' ? '#00d4aa' : institutionalTriggers.consensus === 'BEARISH' ? '#ff4976' : '#ffd60a'}`,
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <div style={{fontSize: '0.75rem', color: '#6e7681', marginBottom: '0.25rem'}}>CONSENSUS</div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: institutionalTriggers.consensus === 'BULLISH' ? '#00d4aa' : institutionalTriggers.consensus === 'BEARISH' ? '#ff4976' : '#ffd60a',
                      }}>
                        {institutionalTriggers.consensus}
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '0.75rem', color: '#6e7681', marginBottom: '0.25rem'}}>STACKED CONFIDENCE</div>
                      <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#bc8cff'}}>
                        {institutionalTriggers.stackedConfidence}%
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '0.75rem', color: '#6e7681', marginBottom: '0.25rem'}}>ACTIVE TRIGGERS</div>
                      <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#58a6ff'}}>
                        {institutionalTriggers.triggerCount} / 7
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Triggers */}
                <div style={{display: 'grid', gap: '0.75rem'}}>
                  {institutionalTriggers.activeTriggers.map((trigger, i) => (
                    <div key={i} style={{
                      padding: '0.875rem',
                      background: 'var(--bg-tertiary)',
                      border: `1px solid ${trigger.direction === 'BULLISH' ? '#00d4aa40' : '#ff497640'}`,
                      borderRadius: '6px',
                      borderLeft: `4px solid ${trigger.direction === 'BULLISH' ? '#00d4aa' : '#ff4976'}`,
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                        <div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#8b949e',
                            letterSpacing: '0.5px',
                          }}>
                            {trigger.type.split('_').join(' ')}
                          </span>
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '2px 6px',
                            background: trigger.direction === 'BULLISH' ? '#00d4aa20' : '#ff497620',
                            color: trigger.direction === 'BULLISH' ? '#00d4aa' : '#ff4976',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                          }}>
                            {trigger.direction}
                          </span>
                        </div>
                        <div style={{
                          padding: '2px 8px',
                          background: 'var(--bg-primary)',
                          borderRadius: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          color: '#bc8cff',
                        }}>
                          {trigger.confidence}%
                        </div>
                      </div>

                      <div style={{
                        fontSize: '0.8rem',
                        color: '#c9d1d9',
                        lineHeight: '1.4',
                        marginBottom: '0.5rem',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {trigger.description}
                      </div>

                      <div style={{display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#6e7681'}}>
                        <div>
                          <span style={{color: '#8b949e'}}>Level:</span> {trigger.level?.toFixed(2) || 'N/A'}
                        </div>
                        <div>
                          <span style={{color: '#8b949e'}}>Status:</span> {trigger.status}
                        </div>
                        {trigger.invalidation && (
                          <div>
                            <span style={{color: '#8b949e'}}>Invalidation:</span> {trigger.invalidation.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop: '1rem', fontSize: '0.75rem', color: '#6e7681', fontFamily: '"JetBrains Mono", monospace', textAlign: 'center'}}>
                  💡 <strong>Institutional Logic:</strong> &quot;If price holds X &#8594; Y likely&quot; (Always conditional, always level-based)
                </div>
              </div>
            )}

            {/* Trade Log */}
            <div className="trade-log animate-in">
              <h3>📊 Trade Log ({tradeLog.length} signals)</h3>
              <table className="trade-log-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Timeframe</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeLog.slice().reverse().map((log, i) => (
                    <tr key={i}>
                      <td>{log.time}</td>
                      <td>
                        <span className={`signal-type ${getSignalClass(log.type)}`}>
                          {log.type}
                        </span>
                      </td>
                      <td>{log.price}</td>
                      <td>{log.timeframe}</td>
                      <td>{log.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BACKTEST TAB */}
        {activeTab === 'backtest' && (
          <CompleteBacktestPanel
            candles={candles}
            htfCandles={htfCandles}
            signals={signals}
            symbol={symbol}
            timeframe={mtfStructure?.ltf?.label || '5m'}
          />
        )}
      </main>

      {/* Quick Start Tutorial */}
      {showTutorial && (
        <QuickStartGuide onClose={closeTutorial} />
      )}
    </div>
  );
}

function getSignalClass(type) {
  if (type.includes('SSL')) return 'ssl';
  if (type.includes('BSL')) return 'bsl';
  if (type.includes('BUY')) return 'buy';
  if (type.includes('SELL')) return 'sell';
  if (type.includes('Impulse Up')) return 'impulse-up';
  if (type.includes('Impulse Down')) return 'impulse-down';
  if (type.includes('Momentum')) return 'momentum';
  if (type.includes('High Probability')) return 'hp-setup';
  return '';
}
