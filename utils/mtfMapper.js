// utils/mtfMapper.js
// Professional Multi-Timeframe Mapper
// HTF (Direction) → ITF (Setup) → LTF (Entry)

/**
 * INSTITUTIONAL 3-LAYER MODEL
 * 
 * LTF (Lower TimeFrame) = Entry/Execution
 * ITF (Intermediate TimeFrame) = Setup/Structure
 * HTF (Higher TimeFrame) = Direction/Bias
 */

/**
 * Get optimal MTF structure based on entry timeframe
 * Gold-optimized for institutional trading
 */
export function getMTFStructure(ltfTimeframe) {
  const structures = {
    '1m': {
      ltf: '1m',
      ltfLabel: '1M Entry',
      itf: '5m',
      itfLabel: '5M Setup',
      htf: '15m',  // or '1h' for stronger filter
      htfLabel: '15M Direction',
      hoursToFetch: 48,  // 24-48 hours
      description: 'Scalping (1M entry, 5M setup, 15M direction)',
      recommended: false,
    },
    '5m': {
      ltf: '5m',
      ltfLabel: '5M Entry',
      itf: '15m',
      itfLabel: '15M Setup',
      htf: '1h',
      htfLabel: '1H Direction',
      hoursToFetch: 72,  // 48-96 hours
      description: 'Intraday Sniper (5M entry, 15M setup, 1H direction)',
      recommended: true,  // BEST for Gold
    },
    '15m': {
      ltf: '15m',
      ltfLabel: '15M Entry',
      itf: '1h',
      itfLabel: '1H Setup',
      htf: '4h',
      htfLabel: '4H Direction',
      hoursToFetch: 336,  // 7-14 days
      description: 'Swing Intraday (15M entry, 1H setup, 4H direction)',
      recommended: false,
    },
    '30m': {
      ltf: '30m',
      ltfLabel: '30M Entry',
      itf: '1h',
      itfLabel: '1H Setup',
      htf: '4h',
      htfLabel: '4H Direction',
      hoursToFetch: 336,  // 14 days
      description: 'Position Swing (30M entry, 1H setup, 4H direction)',
      recommended: false,
    },
    '1h': {
      ltf: '1h',
      ltfLabel: '1H Entry',
      itf: '4h',
      itfLabel: '4H Setup',
      htf: '1d',
      htfLabel: 'Daily Direction',
      hoursToFetch: 720,  // 30 days
      description: 'Swing Trading (1H entry, 4H setup, Daily direction)',
      recommended: false,
    },
  };

  return structures[ltfTimeframe] || structures['5m']; // Default to 5M (BEST)
}

/**
 * Calculate minimum candles needed for HTF structure
 */
export function calculateMinimumCandles(ltfTimeframe, htfTimeframe) {
  const timeframeToMinutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
  };

  const ltfMinutes = timeframeToMinutes[ltfTimeframe];
  const htfMinutes = timeframeToMinutes[htfTimeframe];

  // Need 30-50 HTF candles for proper structure
  const minHTFCandles = 50;
  const candlesPerHTF = htfMinutes / ltfMinutes;

  return minHTFCandles * candlesPerHTF;
}

/**
 * Aggregate LTF candles into HTF candles
 * Critical for building HTF from LTF data
 */
export function aggregateCandles(ltfCandles, targetTimeframe) {
  if (!ltfCandles || ltfCandles.length === 0) return [];

  const timeframeToMinutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
  };

  const ltfTimeframe = detectTimeframe(ltfCandles);
  const ltfMinutes = timeframeToMinutes[ltfTimeframe];
  const targetMinutes = timeframeToMinutes[targetTimeframe];

  if (!ltfMinutes || !targetMinutes) {
    console.error('Invalid timeframe for aggregation');
    return [];
  }

  if (targetMinutes <= ltfMinutes) {
    console.warn('Target timeframe must be higher than source timeframe');
    return ltfCandles;
  }

  const candlesPerTarget = targetMinutes / ltfMinutes;
  const htfCandles = [];

  for (let i = 0; i < ltfCandles.length; i += candlesPerTarget) {
    const group = ltfCandles.slice(i, i + candlesPerTarget);
    
    if (group.length === 0) continue;

    // Aggregate OHLC
    const htfCandle = {
      timestamp: group[0].timestamp,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + (c.volume || 0), 0),
    };

    htfCandles.push(htfCandle);
  }

  console.log(`✅ Aggregated ${ltfCandles.length} ${ltfTimeframe} candles → ${htfCandles.length} ${targetTimeframe} candles`);

  return htfCandles;
}

/**
 * Detect timeframe from candle spacing
 */
function detectTimeframe(candles) {
  if (candles.length < 2) return '5m';

  const diff = new Date(candles[1].timestamp) - new Date(candles[0].timestamp);
  const minutes = Math.round(diff / (1000 * 60));

  const timeframes = {
    1: '1m',
    5: '5m',
    15: '15m',
    30: '30m',
    60: '1h',
    240: '4h',
    1440: '1d',
  };

  return timeframes[minutes] || '5m';
}

/**
 * Validate MTF data quality
 */
export function validateMTFData(ltfCandles, itfCandles, htfCandles) {
  const issues = [];

  // Check minimum candles
  if (!ltfCandles || ltfCandles.length < 100) {
    issues.push('LTF: Need at least 100 candles for entry detection');
  }

  if (!itfCandles || itfCandles.length < 50) {
    issues.push('ITF: Need at least 50 candles for setup structure');
  }

  if (!htfCandles || htfCandles.length < 30) {
    issues.push('HTF: Need at least 30 candles for directional bias');
  }

  // Check data alignment (timestamps should overlap)
  if (ltfCandles && htfCandles) {
    const ltfStart = new Date(ltfCandles[0].timestamp).getTime();
    const htfStart = new Date(htfCandles[0].timestamp).getTime();
    
    // HTF should start before or at same time as LTF
    if (htfStart > ltfStart + 3600000) { // 1 hour tolerance
      issues.push('Data alignment: HTF and LTF data not properly aligned');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    ltfCount: ltfCandles?.length || 0,
    itfCount: itfCandles?.length || 0,
    htfCount: htfCandles?.length || 0,
  };
}

/**
 * Get recommended structure for Gold (XAUUSD)
 */
export function getGoldRecommendedStructure() {
  return getMTFStructure('5m');
}

/**
 * Format MTF info for display
 */
export function formatMTFInfo(structure) {
  return {
    summary: `${structure.htfLabel} → ${structure.itfLabel} → ${structure.ltfLabel}`,
    details: {
      direction: `${structure.htfLabel} (${structure.htf})`,
      setup: `${structure.itfLabel} (${structure.itf})`,
      entry: `${structure.ltfLabel} (${structure.ltf})`,
    },
    dataNeeded: `${structure.hoursToFetch} hours of ${structure.ltf} data`,
    description: structure.description,
    goldOptimized: structure.recommended,
  };
}

/**
 * Get all available MTF structures
 */
export function getAllMTFStructures() {
  return [
    getMTFStructure('1m'),
    getMTFStructure('5m'),
    getMTFStructure('15m'),
    getMTFStructure('30m'),
    getMTFStructure('1h'),
  ];
}

/**
 * Calculate optimal data fetch parameters
 */
export function getDataFetchParams(structure) {
  const minCandles = calculateMinimumCandles(structure.ltf, structure.htf);
  
  return {
    symbol: 'XAUUSD',
    timeframe: structure.ltf,
    hours: structure.hoursToFetch,
    minCandles,
    expectedHTFCandles: Math.floor(minCandles / (getTimeframeMinutes(structure.htf) / getTimeframeMinutes(structure.ltf))),
  };
}

/**
 * Helper: Convert timeframe to minutes
 */
function getTimeframeMinutes(timeframe) {
  const map = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
  };
  return map[timeframe] || 5;
}

/**
 * MASTER FUNCTION: Setup complete MTF structure
 */
export function setupMTFStructure(entryTimeframe = '5m') {
  const structure = getMTFStructure(entryTimeframe);
  const fetchParams = getDataFetchParams(structure);
  const info = formatMTFInfo(structure);

  console.log('\n🎯 MTF STRUCTURE SETUP');
  console.log('═══════════════════════════════════════');
  console.log(`Entry TF:     ${structure.ltf} (${structure.ltfLabel})`);
  console.log(`Setup TF:     ${structure.itf} (${structure.itfLabel})`);
  console.log(`Direction TF: ${structure.htf} (${structure.htfLabel})`);
  console.log(`Data Needed:  ${structure.hoursToFetch} hours`);
  console.log(`Min Candles:  ${fetchParams.minCandles}`);
  console.log(`Gold Optimized: ${structure.recommended ? '✅ YES' : '⚠️ NO'}`);
  console.log('═══════════════════════════════════════\n');

  return {
    structure,
    fetchParams,
    info,
  };
}
