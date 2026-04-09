// utils/finageAPI.js
// FINAGE API INTEGRATION FOR BACKTESTING
// Fetches historical OHLCV data for Gold (XAUUSD) and other instruments

/**
 * FINAGE API DOCUMENTATION:
 * Endpoint: https://api.finage.co.uk/history/stock/candles/{symbol}
 * 
 * Supported Timeframes:
 * - 1min, 5min, 15min, 30min
 * - 1h, 4h
 * - 1d (daily)
 * 
 * Data Structure:
 * {
 *   "symbol": "XAUUSD",
 *   "results": [
 *     { "t": timestamp, "o": open, "h": high, "l": low, "c": close, "v": volume }
 *   ]
 * }
 */

const FINAGE_API_KEY = process.env.NEXT_PUBLIC_FINAGE_API_KEY || 'YOUR_API_KEY';
const FINAGE_BASE_URL = 'https://api.finage.co.uk';

/**
 * Generate random 10-day historical period
 * @param {Number} maxDaysBack - Maximum days to look back (default: 365)
 * @returns {Object} Start and end dates
 */
export function generateRandomPeriod(maxDaysBack = 365) {
  const now = new Date();
  const maxStartDate = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)); // 10 days before now
  const earliestDate = new Date(now.getTime() - (maxDaysBack * 24 * 60 * 60 * 1000));
  
  // Random start date
  const randomTimestamp = earliestDate.getTime() + 
    Math.random() * (maxStartDate.getTime() - earliestDate.getTime());
  
  const startDate = new Date(randomTimestamp);
  const endDate = new Date(startDate.getTime() + (10 * 24 * 60 * 60 * 1000));
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    startTimestamp: startDate.getTime(),
    endTimestamp: endDate.getTime(),
    displayLabel: `${formatDate(startDate)} to ${formatDate(endDate)}`,
    durationDays: 10
  };
}

/**
 * Format date to YYYY-MM-DD for API
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day