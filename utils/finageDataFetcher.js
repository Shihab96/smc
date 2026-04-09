// utils/finageDataFetcher.js
// FINAGE API INTEGRATION FOR BACKTESTING
// Fetches historical data for random 10-day periods

/**
 * FINAGE API DOCUMENTATION:
 * Base URL: https://api.finage.co.uk
 * Endpoints:
 * - Stock History: /history/stock/candles/{symbol}
 * - Forex History: /history/forex/candles/{symbol}
 * 
 * Supported Timeframes:
 * 1, 5, 15, 30 (minutes)
 * 1H, 4H (hours)
 * 1D (daily)
 */

// API Configuration
const FINAGE_CONFIG = {
  baseUrl: 'https://api.finage.co.uk',
  apiKey: process.env.FINAGE_API_KEY || 'YOUR_API_KEY_HERE',
  timeout: 30000,
  maxRetries: 3
};

/**
 * Format date for Finage API (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {String} Formatted date string
 */
function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate random 10-day period from historical data
 * @param {Number} maxDaysBack - Maximum days back to select from (default 365)
 * @returns {Object} Period with start and end dates
 */
export function generateRandomPeriod(maxDaysBack = 365) {
  const currentDate = new Date();
  
  // Ensure we don't select too recent (need at least 10 days before today)
  const maxStartDate = new Date(currentDate.getTime() - (12 * 24 * 60 * 60 * 1000));
  const earliestDate = new Date(currentDate.getTime() - (maxDaysBack * 24 * 60 * 60 * 1000));
  
  // Random timestamp within available range
  const randomTimestamp = earliestDate.getTime() + 
    Math.random() * (maxStartDate.getTime() - earliestDate.getTime());
  
  const startDate = new Date(randomTimestamp);
  const endDate = new Date(startDate.getTime() + (10 * 24 * 60 * 60 * 1000));
  
  return {
    startDate: startDate,
    endDate: endDate,
    startDateStr: formatDateForAPI(startDate),
    endDateStr: formatDateForAPI(endDate),
    displayLabel: `${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)}`,
    durationDays: 10
  };
}

/**
 * Map user-friendly timeframe to Finage API format
 * @param {String} timeframe - User timeframe (5m, 15m, 1h, etc.)
 * @returns {String} Finage API timeframe
 */
function mapTimeframeToFinageFormat(timeframe) {
  const mapping = {
    '1m': '1',
    '1min': '1',
    '5m': '5',
    '5min': '5',
    '15m': '15',
    '15min': '15',
    '30m': '30',
    '30min': '30',
    '1h': '1H',
    '1hour': '1H',
    '4h': '4H',
    '4hour': '4H',
    '1d': '1D',
    '1day': '1D',
    'daily': '1D'
  };
  
  return mapping[timeframe.toLowerCase()] || '5'; // Default to 5min
}

/**
 * Fetch historical candle data from Finage API
 * @param {Object} params - Fetch parameters
 * @returns {Promise<Object>} Historical data with candles
 */
export async function fetchHistoricalData(params) {
  const {
    symbol,           // e.g., 'AAPL', 'XAUUSD'
    timeframe,        // e.g., '5m', '15m', '1h'
    startDate,        // Date object or string 'YYYY-MM-DD'
    endDate,          // Date object or string 'YYYY-MM-DD'
    market = 'stock'  // 'stock' or 'forex'
  } = params;

  // Format dates
  const startDateStr = startDate instanceof Date 
    ? formatDateForAPI(startDate) 
    : startDate;
  const endDateStr = endDate instanceof Date 
    ? formatDateForAPI(endDate) 
    : endDate;

  // Map timeframe
  const finageTimeframe = mapTimeframeToFinageFormat(timeframe);

  // Construct API URL
  const endpoint = market === 'forex' 
    ? `/history/forex/candles/${symbol}`
    : `/history/stock/candles/${symbol}`;

  const url = `${FINAGE_CONFIG.baseUrl}${endpoint}?` +
    `apikey=${FINAGE_CONFIG.apiKey}&` +
    `period=${finageTimeframe}&` +
    `from=${startDateStr}&` +
    `to=${endDateStr}`;

  console.log(`🔄 Fetching data from Finage API:`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Period: ${startDateStr} to ${endDateStr}`);
  console.log(`   Timeframe: ${timeframe} (${finageTimeframe})`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: FINAGE_CONFIG.timeout
    });

    if (!response.ok) {
      throw new Error(`Finage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No data returned from Finage API');
    }

    // Convert Finage format to our standard format
    const candles = data.results.map((item, index) => ({
      timestamp: item.t,
      time: new Date(item.t).toISOString(),
      open: parseFloat(item.o),
      high: parseFloat(item.h),
      low: parseFloat(item.l),
      close: parseFloat(item.c),
      volume: parseInt(item.v || 0),
      index: index
    }));

    console.log(`✅ Fetched ${candles.length} candles successfully`);

    return {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      startDate: startDateStr,
      endDate: endDateStr,
      candles: candles,
      candleCount: candles.length,
      firstCandle: candles[0],
      lastCandle: candles[candles.length - 1]
    };

  } catch (error) {
    console.error('❌ Finage API fetch error:', error);
    
    return {
      success: false,
      error: error.message,
      symbol: symbol,
      timeframe: timeframe,
      startDate: startDateStr,
      endDate: endDateStr
    };
  }
}

/**
 * Fetch data for random 10-day period
 * @param {String} symbol - Symbol to fetch
 * @param {String} timeframe - Timeframe
 * @param {String} market - Market type (stock/forex)
 * @returns {Promise<Object>} Random period data
 */
export async function fetchRandomPeriodData(symbol, timeframe, market = 'stock') {
  console.log(`\n📊 FETCHING RANDOM 10-DAY PERIOD`);
  console.log(`=====================================`);
  
  // Generate random period
  const period = generateRandomPeriod();
  
  console.log(`Random Period Selected:`);
  console.log(`  Start: ${period.startDateStr}`);
  console.log(`  End: ${period.endDateStr}`);
  console.log(`  Duration: ${period.durationDays} days\n`);
  
  // Fetch data for this period
  const result = await fetchHistoricalData({
    symbol,
    timeframe,
    startDate: period.startDate,
    endDate: period.endDate,
    market
  });
  
  if (result.success) {
    return {
      ...result,
      period: period,
      metadata: {
        generatedAt: new Date().toISOString(),
        isRandom: true,
        candlesPerDay: Math.floor(result.candleCount / 10)
      }
    };
  } else {
    return result;
  }
}

/**
 * Validate if candles have sufficient data for strategy
 * @param {Array} candles - Candle array
 * @param {Number} minRequired - Minimum candles needed (default 100)
 * @returns {Object} Validation result
 */
export function validateCandleData(candles, minRequired = 100) {
  if (!candles || !Array.isArray(candles)) {
    return {
      isValid: false,
      reason: 'Candles data is missing or invalid'
    };
  }
  
  if (candles.length < minRequired) {
    return {
      isValid: false,
      reason: `Insufficient candles: ${candles.length} (need ${minRequired})`,
      candleCount: candles.length,
      required: minRequired
    };
  }
  
  // Check for data gaps
  const timestamps = candles.map(c => c.timestamp);
  const gaps = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    const timeDiff = timestamps[i] - timestamps[i - 1];
    // Detect large gaps (> 1 hour for intraday data)
    if (timeDiff > 3600000) {
      gaps.push({
        index: i,
        gapMinutes: Math.floor(timeDiff / 60000)
      });
    }
  }
  
  return {
    isValid: true,
    candleCount: candles.length,
    hasGaps: gaps.length > 0,
    gaps: gaps,
    firstTimestamp: new Date(timestamps[0]).toISOString(),
    lastTimestamp: new Date(timestamps[timestamps.length - 1]).toISOString()
  };
}

/**
 * Get supported symbols for backtesting
 * @returns {Array} List of supported symbols
 */
export function getSupportedSymbols() {
  return {
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.', market: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', market: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'stock' },
      { symbol: 'META', name: 'Meta Platforms Inc.', market: 'stock' },
      { symbol: 'NFLX', name: 'Netflix Inc.', market: 'stock' }
    ],
    forex: [
      { symbol: 'EURUSD', name: 'Euro / US Dollar', market: 'forex' },
      { symbol: 'GBPUSD', name: 'British Pound / US Dollar', market: 'forex' },
      { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', market: 'forex' },
      { symbol: 'XAUUSD', name: 'Gold / US Dollar', market: 'forex' },
      { symbol: 'XAGUSD', name: 'Silver / US Dollar', market: 'forex' }
    ]
  };
}

/**
 * Get supported timeframes
 * @returns {Array} List of timeframes
 */
export function getSupportedTimeframes() {
  return [
    { value: '1m', label: '1 Minute', candlesPerDay: 1440 },
    { value: '5m', label: '5 Minutes', candlesPerDay: 288 },
    { value: '15m', label: '15 Minutes', candlesPerDay: 96 },
    { value: '30m', label: '30 Minutes', candlesPerDay: 48 },
    { value: '1h', label: '1 Hour', candlesPerDay: 24 },
    { value: '4h', label: '4 Hours', candlesPerDay: 