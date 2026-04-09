// presets.js
// Strategy Presets for Different Trading Styles

export const STRATEGY_PRESETS = {
  goldScalper: {
    name: 'Gold Scalper (1m-5m)',
    description: 'High-frequency Gold scalping with aggressive detection',
    timeframes: ['1m', '5m'],
    settings: {
      lookback: 15,
      wickRatio: 0.35,
      equalTolerance: 0.0001,
      enableMSS: true,
      rangeMultiplier: 2.0,
      bodyRatio: 0.6,
      volumeMultiplier: 1.5,
      consecutiveMomentum: 3,
      atrMultiplier: 1.2,
      compressionLookback: 8,
      goldMode: true,
      enableImpulse: true,
      enableMTF: true,
      requireHTFBias: true,
      strictMode: false,
    },
    notes: [
      'Best for fast Gold moves during London/NY sessions',
      'Focus on high probability setups only',
      'Use 15m/1h as HTF confirmation',
      'Expect 3-8 signals per session',
    ],
  },

  goldIntraday: {
    name: 'Gold Intraday (15m-1h)',
    description: 'Swing trading Gold on mid-timeframes',
    timeframes: ['15m', '1h'],
    settings: {
      lookback: 25,
      wickRatio: 0.4,
      equalTolerance: 0.0002,
      enableMSS: true,
      rangeMultiplier: 2.5,
      bodyRatio: 0.65,
      volumeMultiplier: 1.8,
      consecutiveMomentum: 3,
      atrMultiplier: 1.5,
      compressionLookback: 10,
      goldMode: true,
      enableImpulse: true,
      enableMTF: true,
      requireHTFBias: true,
      strictMode: true,
    },
    notes: [
      'Balanced approach for daily Gold swings',
      'Strict mode reduces false signals',
      'HTF bias alignment critical',
      'Expect 2-5 quality setups daily',
    ],
  },

  goldSwing: {
    name: 'Gold Swing (4h-1D)',
    description: 'Position trading Gold on higher timeframes',
    timeframes: ['4h', '1D'],
    settings: {
      lookback: 30,
      wickRatio: 0.45,
      equalTolerance: 0.0003,
      enableMSS: true,
      rangeMultiplier: 3.0,
      bodyRatio: 0.7,
      volumeMultiplier: 2.0,
      consecutiveMomentum: 4,
      atrMultiplier: 2.0,
      compressionLookback: 15,
      goldMode: false,
      enableImpulse: true,
      enableMTF: false,
      requireHTFBias: false,
      strictMode: true,
    },
    notes: [
      'For multi-day Gold positions',
      'Focus on major structure breaks',
      'Higher thresholds = fewer, higher quality signals',
      'Expect 1-3 setups per week',
    ],
  },

  forexScalper: {
    name: 'Forex Scalper (EUR/USD, GBP/USD)',
    description: 'Fast forex scalping on major pairs',
    timeframes: ['1m', '5m'],
    settings: {
      lookback: 20,
      wickRatio: 0.4,
      equalTolerance: 0.00015,
      enableMSS: true,
      rangeMultiplier: 2.8,
      bodyRatio: 0.65,
      volumeMultiplier: 1.8,
      consecutiveMomentum: 3,
      atrMultiplier: 1.5,
      compressionLookback: 10,
      goldMode: false,
      enableImpulse: true,
      enableMTF: true,
      requireHTFBias: true,
      strictMode: false,
    },
    notes: [
      'Optimized for EUR/USD and GBP/USD',
      'Lower volatility than Gold',
      'Best during London/NY overlap',
      'Use tight stops and quick exits',
    ],
  },

  conservative: {
    name: 'Conservative (All Assets)',
    description: 'High-confidence setups with all confirmations',
    timeframes: ['15m', '1h', '4h'],
    settings: {
      lookback: 25,
      wickRatio: 0.5,
      equalTolerance: 0.0002,
      enableMSS: true,
      rangeMultiplier: 3.0,
      bodyRatio: 0.7,
      volumeMultiplier: 2.0,
      consecutiveMomentum: 4,
      atrMultiplier: 2.0,
      compressionLookback: 12,
      goldMode: false,
      enableImpulse: true,
      enableMTF: true,
      requireHTFBias: true,
      strictMode: true,
    },
    notes: [
      'Maximum filtering for quality over quantity',
      'All confluence factors required',
      'Best for risk-averse traders',
      'Lower frequency, higher accuracy',
    ],
  },

  aggressive: {
    name: 'Aggressive (High Volume)',
    description: 'Maximum signals for active traders',
    timeframes: ['1m', '5m', '15m'],
    settings: {
      lookback: 15,
      wickRatio: 0.3,
      equalTolerance: 0.0001,
      enableMSS: false,
      rangeMultiplier: 2.0,
      bodyRatio: 0.55,
      volumeMultiplier: 1.5,
      consecutiveMomentum: 2,
      atrMultiplier: 1.2,
      compressionLookback: 8,
      goldMode: true,
      enableImpulse: true,
      enableMTF: false,
      requireHTFBias: false,
      strictMode: false,
    },
    notes: [
      'High volume of signals',
      'Requires active monitoring',
      'More false positives expected',
      'Best for experienced traders who can filter manually',
    ],
  },

  learning: {
    name: 'Learning Mode',
    description: 'Balanced settings for studying patterns',
    timeframes: ['5m', '15m'],
    settings: {
      lookback: 20,
      wickRatio: 0.4,
      equalTolerance: 0.0002,
      enableMSS: true,
      rangeMultiplier: 2.5,
      bodyRatio: 0.65,
      volumeMultiplier: 1.8,
      consecutiveMomentum: 3,
      atrMultiplier: 1.5,
      compressionLookback: 10,
      goldMode: true,
      enableImpulse: true,
      enableMTF: true,
      requireHTFBias: false,
      strictMode: false,
    },
    notes: [
      'Default balanced settings',
      'Good for learning signal patterns',
      'Shows both confirmed and unconfirmed setups',
      'Use to build pattern recognition',
    ],
  },
};

// Helper function to apply preset
export function applyPreset(presetName) {
  const preset = STRATEGY_PRESETS[presetName];
  if (!preset) {
    console.error(`Preset "${presetName}" not found`);
    return null;
  }

  console.log(`📋 Applying preset: ${preset.name}`);
  console.log(`📝 Description: ${preset.description}`);
  console.log(`⏱️  Recommended timeframes: ${preset.timeframes.join(', ')}`);
  console.log('📌 Notes:');
  preset.notes.forEach(note => console.log(`   - ${note}`));

  return preset.settings;
}

// Get preset names
export function getPresetNames() {
  return Object.keys(STRATEGY_PRESETS);
}

// Get preset info
export function getPresetInfo(presetName) {
  const preset = STRATEGY_PRESETS[presetName];
  if (!preset) return null;

  return {
    name: preset.name,
    description: preset.description,
    timeframes: preset.timeframes,
    notes: preset.notes,
  };
}

// Compare current settings to presets
export function findMatchingPreset(currentSettings) {
  for (const [key, preset] of Object.entries(STRATEGY_PRESETS)) {
    const matches = Object.keys(preset.settings).every(
      settingKey => preset.settings[settingKey] === currentSettings[settingKey]
    );
    
    if (matches) {
      return key;
    }
  }
  
  return 'custom';
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STRATEGY_PRESETS,
    applyPreset,
    getPresetNames,
    getPresetInfo,
    findMatchingPreset,
  };
}
