// utils/signalDisplayFilter.js
// SIGNAL DISPLAY FILTER - Show only BUY/SELL on charts
// Filters out intermediate signals like impulse, momentum, etc.

/**
 * CONCEPT:
 * The system generates many signal types internally for analysis,
 * but on the chart we only want to see actual tradeable signals:
 * - BUY (green arrows pointing up)
 * - SELL (red arrows pointing down)
 * 
 * This filter converts all signal types to simple BUY/SELL
 * and removes non-tradeable signals from display.
 */

/**
 * Signal types that should be converted to BUY
 */
const BULLISH_SIGNAL_TYPES = [
  'BUY',
  'BSL',                    // Buy Side Liquidity swept (bullish)
  'SSL',                    // Sell Side Liquidity swept (bullish reversal)
  'BUY_IMPULSE',
  'BULLISH_MSS',
  'BULLISH_BOS',
  'BULLISH_INDUCEMENT',
  'BULLISH_BREAKER',
  'BULLISH_MITIGATION',
  'BULLISH_FVG',
  'LONG',
  'CALL'
];

/**
 * Signal types that should be converted to SELL
 */
const BEARISH_SIGNAL_TYPES = [
  'SELL',
  'SSL_SELL',               // Sell Side Liquidity (bearish)
  'BSL',                    // Buy Side Liquidity swept (bearish reversal)
  'SELL_IMPULSE',
  'BEARISH_MSS',
  'BEARISH_BOS',
  'BEARISH_INDUCEMENT',
  'BEARISH_BREAKER',
  'BEARISH_MITIGATION',
  'BEARISH_FVG',
  'SHORT',
  'PUT'
];

/**
 * Signal types that should be HIDDEN from chart display
 * (used internally but not shown to user)
 */
const HIDDEN_SIGNAL_TYPES = [
  'IMPULSE_UP',
  'IMPULSE_DOWN',
  'MOMENTUM_UP',
  'MOMENTUM_DOWN',
  'MOMENTUM_BREAKDOWN',
  'STRUCTURE_BREAK',
  'LIQUIDITY_DETECTED',
  'ORDER_BLOCK_DETECTED',
  'FVG_DETECTED',
  'ANALYSIS',
  'INFO',
  'DEBUG'
];

/**
 * Filter signals for chart display
 * @param {Array} signals - All signals from analysis
 * @param {Object} options - Filter options
 * @returns {Array} Filtered signals for display
 */
export function filterSignalsForDisplay(signals, options = {}) {
  const {
    showOnlyTradeable = true,        // Only show actual BUY/SELL
    minConfluence = 0,               // Minimum confluence to display
    hideHidden = true,               // Hide non-tradeable signals
    simplifyTypes = true             // Convert to simple BUY/SELL
  } = options;

  if (!signals || signals.length === 0) {
    return [];
  }

  let filteredSignals = [...signals];

  // Step 1: Remove hidden signals
  if (hideHidden) {
    filteredSignals = filteredSignals.filter(signal => 
      !HIDDEN_SIGNAL_TYPES.includes(signal.type)
    );
  }

  // Step 2: Filter by minimum confluence
  if (minConfluence > 0) {
    filteredSignals = filteredSignals.filter(signal => 
      (signal.confluence || 0) >= minConfluence
    );
  }

  // Step 3: Only show tradeable signals
  if (showOnlyTradeable) {
    filteredSignals = filteredSignals.filter(signal => {
      const type = signal.type?.toUpperCase();
      return BULLISH_SIGNAL_TYPES.includes(type) || 
             BEARISH_SIGNAL_TYPES.includes(type);
    });
  }

  // Step 4: Simplify to BUY/SELL
  if (simplifyTypes) {
    filteredSignals = filteredSignals.map(signal => ({
      ...signal,
      originalType: signal.type, // Preserve original type
      type: getSimplifiedType(signal.type), // Convert to BUY/SELL
      displayType: getSimplifiedType(signal.type)
    }));
  }

  return filteredSignals;
}

/**
 * Convert any signal type to simple BUY or SELL
 * @param {String} signalType - Original signal type
 * @returns {String} 'BUY' or 'SELL'
 */
function getSimplifiedType(signalType) {
  const type = signalType?.toUpperCase();

  if (BULLISH_SIGNAL_TYPES.includes(type)) {
    return 'BUY';
  } else if (BEARISH_SIGNAL_TYPES.includes(type)) {
    return 'SELL';
  }

  // Default based on name patterns
  if (type?.includes('BUY') || type?.includes('BULL') || type?.includes('LONG')) {
    return 'BUY';
  } else if (type?.includes('SELL') || type?.includes('BEAR') || type?.includes('SHORT')) {
    return 'SELL';
  }

  return 'BUY'; // Default
}

/**
 * Get display color for signal
 * @param {String} signalType - Signal type
 * @returns {String} Color code
 */
export function getSignalDisplayColor(signalType) {
  const simplified = getSimplifiedType(signalType);
  
  return simplified === 'BUY' ? '#00d4aa' : '#ff4976'; // Green or Red
}

/**
 * Get display label for signal
 * @param {Object} signal - Signal object
 * @param {Object} options - Display options
 * @returns {String} Display label
 */
export function getSignalDisplayLabel(signal, options = {}) {
  const {
    showConfluence = true,
    showQuality = false,
    showPrice = false,
    simplified = true
  } = options;

  const type = simplified ? getSimplifiedType(signal.type) : signal.type;
  
  let label = type;

  // Add confluence
  if (showConfluence && signal.confluence !== undefined) {
    label += ` ${signal.confluence}/${signal.maxConfluence || 17}`;
  }

  // Add quality tier
  if (showQuality && signal.quality) {
    const qualityEmoji = {
      'PERFECT': '🏆',
      'EXCEPTIONAL': '💎',
      'EXCELLENT': '✨',
      'VERY_GOOD': '✅',
      'GOOD': '👍',
      'ACCEPTABLE': '⚠️',
      'SKIP': '⛔'
    };
    label += ` ${qualityEmoji[signal.quality] || ''}`;
  }

  // Add price
  if (showPrice && signal.price) {
    label += ` @${signal.price.toFixed(2)}`;
  }

  return label;
}

/**
 * Format signal for chart display
 * @param {Object} signal - Original signal
 * @param {Object} options - Format options
 * @returns {Object} Formatted signal for chart
 */
export function formatSignalForChart(signal, options = {}) {
  const simplified = getSimplifiedType(signal.type);
  
  return {
    // Essential data
    timestamp: signal.timestamp,
    price: signal.price || signal.entry,
    type: simplified,
    
    // Display properties
    label: getSignalDisplayLabel(signal, options),
    color: getSignalDisplayColor(signal.type),
    
    // Position on chart
    position: simplified === 'BUY' ? 'below' : 'above',
    
    // Marker style
    shape: simplified === 'BUY' ? 'arrowUp' : 'arrowDown',
    size: getSignalMarkerSize(signal),
    
    // Metadata (preserved but not displayed)
    metadata: {
      originalType: signal.type,
      confluence: signal.confluence,
      quality: signal.quality,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      riskReward: signal.riskReward
    }
  };
}

/**
 * Get marker size based on signal quality
 * @param {Object} signal - Signal object
 * @returns {String} Marker size
 */
function getSignalMarkerSize(signal) {
  const confluence = signal.confluence || 0;
  
  if (confluence >= 15) return 'large';   // PERFECT
  if (confluence >= 13) return 'large';   // EXCEPTIONAL
  if (confluence >= 10) return 'medium';  // EXCELLENT
  if (confluence >= 8) return 'medium';   // VERY GOOD
  if (confluence >= 6) return 'small';    // GOOD
  
  return 'tiny'; // Lower quality
}

/**
 * Filter and format signals for chart display
 * @param {Array} signals - All signals
 * @param {Object} options - Combined options
 * @returns {Array} Chart-ready signals
 */
export function prepareSignalsForChart(signals, options = {}) {
  // Default options
  const defaultOptions = {
    // Filtering
    showOnlyTradeable: true,
    minConfluence: 6,          // Only show 6+ confluence by default
    hideHidden: true,
    simplifyTypes: true,
    
    // Display
    showConfluence: true,
    showQuality: true,
    showPrice: false,
    simplified: true
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Step 1: Filter signals
  const filtered = filterSignalsForDisplay(signals, mergedOptions);

  // Step 2: Format for chart
  const formatted = filtered.map(signal => 
    formatSignalForChart(signal, mergedOptions)
  );

  console.log(`\n📊 CHART DISPLAY FILTER`);
  console.log(`Original signals: ${signals.length}`);
  console.log(`Filtered signals: ${filtered.length}`);
  console.log(`Chart signals: ${formatted.length}`);
  console.log(`Hidden: ${signals.length - formatted.length}\n`);

  return formatted;
}

/**
 * Get statistics about filtered signals
 * @param {Array} originalSignals - All signals
 * @param {Array} filteredSignals - Filtered signals
 * @returns {Object} Statistics
 */
export function getFilterStatistics(originalSignals, filteredSignals) {
  const buyCount = filteredSignals.filter(s => s.type === 'BUY').length;
  const sellCount = filteredSignals.filter(s => s.type === 'SELL').length;
  
  const hiddenCount = originalSignals.length - filteredSignals.length;
  
  // Count by quality
  const qualityCounts = {
    PERFECT: filteredSignals.filter(s => s.metadata?.quality === 'PERFECT').length,
    EXCEPTIONAL: filteredSignals.filter(s => s.metadata?.quality === 'EXCEPTIONAL').length,
    EXCELLENT: filteredSignals.filter(s => s.metadata?.quality === 'EXCELLENT').length,
    VERY_GOOD: filteredSignals.filter(s => s.metadata?.quality === 'VERY_GOOD').length,
    GOOD: filteredSignals.filter(s => s.metadata?.quality === 'GOOD').length
  };

  return {
    total: originalSignals.length,
    displayed: filteredSignals.length,
    hidden: hiddenCount,
    hidePercentage: ((hiddenCount / originalSignals.length) * 100).toFixed(1),
    
    byType: {
      buy: buyCount,
      sell: sellCount
    },
    
    byQuality: qualityCounts,
    
    avgConfluence: filteredSignals.length > 0
      ? (filteredSignals.reduce((sum, s) => sum + (s.metadata?.confluence || 0), 0) / filteredSignals.length).toFixed(1)
      : 0
  };
}

/**
 * Custom filter for specific use cases
 */
export const FILTER_PRESETS = {
  // Show only high quality signals (8+ confluence)
  HIGH_QUALITY: {
    showOnlyTradeable: true,
    minConfluence: 8,
    hideHidden: true,
    simplifyTypes: true,
    showConfluence: true,
    showQuality: true
  },

  // Show only perfect signals (13+ confluence)
  PERFECT_ONLY: {
    showOnlyTradeable: true,
    minConfluence: 13,
    hideHidden: true,
    simplifyTypes: true,
    showConfluence: true,
    showQuality: true
  },

  // Show all tradeable signals
  ALL_TRADEABLE: {
    showOnlyTradeable: true,
    minConfluence: 0,
    hideHidden: true,
    simplifyTypes: true,
    showConfluence: true,
    showQuality: false
  },

  // Minimal display (just BUY/SELL)
  MINIMAL: {
    showOnlyTradeable: true,
    minConfluence: 6,
    hideHidden: true,
    simplifyTypes: true,
    showConfluence: false,
    showQuality: false,
    showPrice: false
  },

  // Detailed display (all info)
  DETAILED: {
    showOnlyTradeable: true,
    minConfluence: 6,
    hideHidden: true,
    simplifyTypes: true,
    showConfluence: true,
    showQuality: true,
    showPrice: true
  }
};

/**
 * Apply preset filter
 * @param {Array} signals - All signals
 * @param {String} presetName - Preset name from FILTER_PRESETS
 * @returns {Array} Filtered signals
 */
export function applyFilterPreset(signals, presetName = 'HIGH_QUALITY') {
  const preset = FILTER_PRESETS[presetName];
  
  if (!preset) {
    console.warn(`Unknown preset: ${presetName}. Using HIGH_QUALITY.`);
    return prepareSignalsForChart(signals, FILTER_PRESETS.HIGH_QUALITY);
  }

  return prepareSignalsForChart(signals, preset);
}
