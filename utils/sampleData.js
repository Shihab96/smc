// utils/sampleData.js
// Generate realistic Gold (XAU/USD) sample data for testing without API

export function generateGoldSampleData(count = 500, timeframe = '5m') {
  const candles = [];
  let basePrice = 2050; // Realistic Gold price
  const volatility = getVolatilityForTimeframe(timeframe);
  let trend = 1; // 1 for up, -1 for down
  let trendStrength = 0;
  
  const now = new Date();
  const timeframeMs = getTimeframeMilliseconds(timeframe);

  for (let i = 0; i < count; i++) {
    // Occasional trend changes
    if (Math.random() < 0.05) {
      trend = Math.random() < 0.5 ? 1 : -1;
      trendStrength = Math.random() * 0.7 + 0.3;
    }

    // Generate OHLC
    const trendMove = trend * trendStrength * volatility * (Math.random() * 0.5);
    const noise = (Math.random() - 0.5) * volatility;
    
    const open = basePrice;
    const close = basePrice + trendMove + noise;
    
    const wickMultiplier = Math.random() * 0.4 + 0.1;
    const high = Math.max(open, close) + Math.abs(close - open) * wickMultiplier;
    const low = Math.min(open, close) - Math.abs(close - open) * wickMultiplier;

    // Add occasional liquidity sweep patterns
    if (i > 20 && Math.random() < 0.15) {
      const recentLows = candles.slice(-10).map(c => c.low);
      const recentHighs = candles.slice(-10).map(c => c.high);
      
      if (Math.random() < 0.5) {
        // Sweep lows then reverse up
        candles.push({
          timestamp: new Date(now.getTime() - (count - i) * timeframeMs).toISOString(),
          open: basePrice,
          high: basePrice + volatility * 0.3,
          low: Math.min(...recentLows) - volatility * 0.2, // Sweep below
          close: basePrice + volatility * 0.8, // Strong close up
          volume: Math.random() * 2000 + 1000,
        });
        basePrice = basePrice + volatility * 0.8;
        trend = 1;
        trendStrength = 0.8;
        continue;
      } else {
        // Sweep highs then reverse down
        candles.push({
          timestamp: new Date(now.getTime() - (count - i) * timeframeMs).toISOString(),
          open: basePrice,
          high: Math.max(...recentHighs) + volatility * 0.2, // Sweep above
          low: basePrice - volatility * 0.3,
          close: basePrice - volatility * 0.8, // Strong close down
          volume: Math.random() * 2000 + 1000,
        });
        basePrice = basePrice - volatility * 0.8;
        trend = -1;
        trendStrength = 0.8;
        continue;
      }
    }

    // Add occasional displacement candles
    if (i > 20 && Math.random() < 0.08) {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const displacementSize = volatility * 3; // 3x normal range
      
      candles.push({
        timestamp: new Date(now.getTime() - (count - i) * timeframeMs).toISOString(),
        open: basePrice,
        high: direction > 0 ? basePrice + displacementSize : basePrice + volatility * 0.2,
        low: direction < 0 ? basePrice - displacementSize : basePrice - volatility * 0.2,
        close: basePrice + direction * displacementSize * 0.95,
        volume: Math.random() * 3000 + 2000, // Higher volume
      });
      basePrice = basePrice + direction * displacementSize * 0.95;
      trend = direction;
      trendStrength = 0.9;
      continue;
    }

    // Regular candle
    candles.push({
      timestamp: new Date(now.getTime() - (count - i) * timeframeMs).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.random() * 1500 + 500,
    });

    basePrice = close;
  }

  return candles;
}

export function generateHTFSampleData(ltfCandles, htfTimeframe) {
  // Aggregate LTF candles into HTF candles
  const htfCandles = [];
  const ratio = getTimeframeRatio('5m', htfTimeframe); // Assuming LTF is 5m
  
  for (let i = 0; i < ltfCandles.length; i += ratio) {
    const chunk = ltfCandles.slice(i, i + ratio);
    if (chunk.length === 0) continue;

    const htfCandle = {
      timestamp: chunk[0].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    };

    htfCandles.push(htfCandle);
  }

  return htfCandles;
}

function getVolatilityForTimeframe(timeframe) {
  const volatilityMap = {
    '1m': 0.5,
    '5m': 1.5,
    '15m': 3.0,
    '1h': 8.0,
    '4h': 20.0,
    '1D': 50.0,
  };
  return volatilityMap[timeframe] || 1.5;
}

function getTimeframeMilliseconds(timeframe) {
  const msMap = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
  };
  return msMap[timeframe] || 5 * 60 * 1000;
}

function getTimeframeRatio(ltf, htf) {
  const minutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1D': 1440,
  };
  return Math.floor(minutes[htf] / minutes[ltf]);
}

// Generate sample data with known patterns for testing
export function generateTestScenario(scenario = 'mixed') {
  const candles = [];
  let basePrice = 2050;
  const now = new Date();
  const timeframeMs = 5 * 60 * 1000; // 5 minutes

  if (scenario === 'ssl_sweep') {
    // Create setup with equal lows then sweep
    for (let i = 0; i < 50; i++) {
      const volatility = 2;
      const change = (Math.random() - 0.5) * volatility;
      
      candles.push({
        timestamp: new Date(now.getTime() - (50 - i) * timeframeMs).toISOString(),
        open: basePrice,
        high: basePrice + Math.random() * volatility,
        low: basePrice - Math.random() * volatility,
        close: basePrice + change,
        volume: 1000,
      });

      // Create equal lows at position 20 and 25
      if (i === 20 || i === 25) {
        candles[i].low = 2040;
      }

      basePrice += change;
    }

    // Add sweep candle
    candles.push({
      timestamp: new Date().toISOString(),
      open: 2042,
      high: 2045,
      low: 2038, // Sweeps below 2040
      close: 2054, // Strong reversal
      volume: 2500,
    });

    return candles;
  }

  // Default mixed scenario
  return generateGoldSampleData(500, '5m');
}

export const SAMPLE_DATA_INFO = {
  description: 'Pre-generated realistic Gold (XAU/USD) data with liquidity sweeps and displacement patterns',
  count: 500,
  timeframe: '5m',
  patterns: [
    'Liquidity sweeps (SSL/BSL)',
    'Displacement candles',
    'Momentum bursts',
    'Compression breakouts',
    'Trend changes',
  ],
  note: 'Data is randomly generated but follows realistic Gold price behavior',
};
