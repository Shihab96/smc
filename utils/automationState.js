// utils/automationState.js
// Automation State Management & Deduplication

import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'automation-state.json');
const SIGNAL_HISTORY_FILE = path.join(process.cwd(), 'signal-history.json');

/**
 * Default automation state
 */
export const DEFAULT_STATE = {
  enabled: false,
  timeframe: '5m',
  symbol: 'XAUUSD',
  strategies: {
    htfBias: true,
    ltfExecution: true,
    liquiditySweeps: true,
    impulse: true,
    scalping: true,
  },
  notifications: {
    whatsapp: true,
    trello: true,
  },
  lastRun: null,
  signalCount: 0,
};

/**
 * Merge saved state with current defaults so older JSON files
 * still pick up newly added settings like scalping mode.
 */
export function normalizeAutomationState(state = {}) {
  return {
    ...DEFAULT_STATE,
    ...state,
    strategies: {
      ...DEFAULT_STATE.strategies,
      ...(state.strategies || {}),
    },
    notifications: {
      ...DEFAULT_STATE.notifications,
      ...(state.notifications || {}),
    },
  };
}

/**
 * Load automation state
 */
export function loadAutomationState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return normalizeAutomationState(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error loading automation state:', error);
  }
  return normalizeAutomationState();
}

/**
 * Save automation state
 */
export function saveAutomationState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(normalizeAutomationState(state), null, 2));
    return true;
  } catch (error) {
    console.error('Error saving automation state:', error);
    return false;
  }
}

/**
 * Load signal history
 */
export function loadSignalHistory() {
  try {
    if (fs.existsSync(SIGNAL_HISTORY_FILE)) {
      const data = fs.readFileSync(SIGNAL_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading signal history:', error);
  }
  return [];
}

/**
 * Save signal history
 */
export function saveSignalHistory(history) {
  try {
    // Keep only last 1000 signals
    const trimmed = history.slice(-1000);
    fs.writeFileSync(SIGNAL_HISTORY_FILE, JSON.stringify(trimmed, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving signal history:', error);
    return false;
  }
}

/**
 * Check if signal is duplicate
 */
export function isDuplicateSignal(signal, history, windowMinutes = 30) {
  const signalTime = new Date(signal.timestamp).getTime();
  const windowMs = windowMinutes * 60 * 1000;

  return history.some(existing => {
    const existingTime = new Date(existing.timestamp).getTime();
    const timeDiff = Math.abs(signalTime - existingTime);

    // Check if same signal within time window
    return (
      timeDiff < windowMs &&
      existing.type === signal.type &&
      existing.direction === signal.direction &&
      Math.abs(existing.price - signal.price) < signal.price * 0.001 // Within 0.1%
    );
  });
}

/**
 * Add signal to history
 */
export function addSignalToHistory(signal) {
  const history = loadSignalHistory();
  
  // Add signal with metadata
  const signalWithMeta = {
    ...signal,
    id: `${signal.timestamp}-${signal.type}-${signal.direction}`,
    recordedAt: new Date().toISOString(),
  };
  
  history.push(signalWithMeta);
  saveSignalHistory(history);
  
  return signalWithMeta;
}

/**
 * Get automation statistics
 */
export function getAutomationStats() {
  const state = loadAutomationState();
  const history = loadSignalHistory();
  
  const last24h = history.filter(s => {
    const time = new Date(s.timestamp).getTime();
    const now = Date.now();
    return now - time < 24 * 60 * 60 * 1000;
  });
  
  const buySignals = last24h.filter(s => s.direction === 'BUY');
  const sellSignals = last24h.filter(s => s.direction === 'SELL');
  
  return {
    enabled: state.enabled,
    timeframe: state.timeframe,
    lastRun: state.lastRun,
    totalSignals: state.signalCount,
    last24h: {
      total: last24h.length,
      buy: buySignals.length,
      sell: sellSignals.length,
    },
  };
}

/**
 * Clear old signals (cleanup)
 */
export function cleanupOldSignals(daysToKeep = 7) {
  const history = loadSignalHistory();
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  const filtered = history.filter(s => {
    const time = new Date(s.timestamp).getTime();
    return time > cutoffTime;
  });
  
  saveSignalHistory(filtered);
  return history.length - filtered.length; // Number of signals removed
}
