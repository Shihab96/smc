// utils/marketData.js
// Market Data Fetcher for Automation

/**
 * Fetch latest candles from market data API
 * Supports multiple data providers
 */
export async function fetchLatestCandles(symbol, timeframe, count = 500) {
  const provider = process.env.MARKET_DATA_PROVIDER || 'alpha_vantage';
  
  switch (provider) {
    case 'alpha_vantage':
      return fetchFromAlphaVantage(symbol, timeframe, count);
    case 'twelve_data':
      return fetchFromTwelveData(symbol, timeframe, count);
    case 'polygon':
      return fetchFromPolygon(symbol, timeframe, count);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Alpha Vantage (Free tier: 5 calls/min, 500 calls/day)
 */
async function fetchFromAlphaVantage(symbol, timeframe, count) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not set');
  }

  // Map timeframe to Alpha Vantage interval
  const intervalMap = {
    '1m': '1min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '60min',
  };
  
  const interval = intervalMap[timeframe] || '5min';
  
  // Alpha Vantage uses different symbols for forex
  const avSymbol = symbol.replace('/', '');
  const from = avSymbol.substring(0, 3);
  const to = avSymbol.substring(3, 6);

  const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${from}&to_symbol=${to}&interval=${interval}&apikey=${apiKey}&outputsize=full`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error('API rate limit reached');
    }

    const timeSeries = data[`Time Series FX (${interval})`];
    if (!timeSeries) {
      throw new Error('No data returned from Alpha Vantage');
    }

    // Convert to our candle format
    const candles = Object.entries(timeSeries)
      .slice(0, count)
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp).toISOString(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: 0, // FX doesn't have volume
      }))
      .reverse(); // Oldest first

    return candles;

  } catch (error) {
    console.error('Alpha Vantage fetch error:', error);
    throw error;
  }
}

/**
 * Twelve Data (Free tier: 8 calls/min, 800 calls/day)
 */
async function fetchFromTwelveData(symbol, timeframe, count) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY not set');
  }

  // Map timeframe
  const intervalMap = {
    '1m': '1min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '1h',
    '4h': '4h',
    '1d': '1day',
  };
  
  const interval = intervalMap[timeframe] || '5min';
  
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${count}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    if (!data.values) {
      throw new Error('No data returned from Twelve Data');
    }

    // Convert to our candle format
    const candles = data.values
      .map(candle => ({
        timestamp: new Date(candle.datetime).toISOString(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume) || 0,
      }))
      .reverse(); // Oldest first

    return candles;

  } catch (error) {
    console.error('Twelve Data fetch error:', error);
    throw error;
  }
}

/**
 * Polygon.io (Paid service, high quality data)
 */
async function fetchFromPolygon(symbol, timeframe, count) {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not set');
  }

  // Map timeframe to multiplier and timespan
  const timeframeMap = {
    '1m': { multiplier: 1, timespan: 'minute' },
    '5m': { multiplier: 5, timespan: 'minute' },
    '15m': { multiplier: 15, timespan: 'minute' },
    '30m': { multiplier: 30, timespan: 'minute' },
    '1h': { multiplier: 1, timespan: 'hour' },
    '4h': { multiplier: 4, timespan: 'hour' },
    '1d': { multiplier: 1, timespan: 'day' },
  };

  const { multiplier, timespan } = timeframeMap[timeframe] || { multiplier: 5, timespan: 'minute' };

  // Calculate date range
  const to = new Date();
  const from = new Date(to.getTime() - (count * multiplier * 60 * 1000));

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  // Polygon uses C: prefix for forex
  const polygonSymbol = `C:${symbol.replace('/', '')}`;

  const url = `https://api.polygon.io/v2/aggs/ticker/${polygonSymbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=${count}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(data.error || 'Polygon API error');
    }

    if (!data.results || data.results.length === 0) {
      throw new Error('No data returned from Polygon');
    }

    // Convert to our candle format
    const candles = data.results.map(candle => ({
      timestamp: new Date(candle.t).toISOString(),
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
      volume: candle.v || 0,
    }));

    return candles;

  } catch (error) {
    console.error('Polygon fetch error:', error);
    throw error;
  }
}

/**
 * Get supported timeframes for current provider
 */
export function getSupportedTimeframes() {
  return [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];
}

/**
 * Test market data connection
 */
export async function testMarketDataConnection(symbol = 'XAUUSD', timeframe = '5m') {
  try {
    console.log(`Testing market data connection for ${symbol} ${timeframe}...`);
    const candles = await fetchLatestCandles(symbol, timeframe, 10);
    
    if (!candles || candles.length === 0) {
      throw new Error('No candles returned');
    }

    console.log(`✅ Successfully fetched ${candles.length} candles`);
    console.log(`Latest candle:`, candles[candles.length - 1]);
    
    return {
      success: true,
      candles: candles.length,
      latest: candles[candles.length - 1],
    };

  } catch (error) {
    console.error('❌ Market data connection failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
