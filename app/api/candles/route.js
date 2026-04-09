// app/api/candles/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'XAUUSD';
  const timeframe = searchParams.get('timeframe') || '5m';
  
  // Get API key from environment variable (NOT from query params)
  const apiKey = process.env.FINAGE_API_KEY;

  if (!apiKey) {
    return Response.json({ 
      error: 'API key not configured. Please add FINAGE_API_KEY to your .env.local file' 
    }, { status: 500 });
  }

  // Map timeframe to Finage format
  const timeframeMap = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1D': 'D',
  };

  const finageTimeframe = timeframeMap[timeframe] || '5';
  
  try {
    // Get date range from query params or use defaults
    let startDate, endDate;
    
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    if(startParam && endParam) {
      // Use provided date range
      startDate = new Date(startParam);
      endDate = new Date(endParam);
    } else {
      // Default: last 7 days for intraday, 365 days for daily
      endDate = new Date();
      startDate = new Date();
      
      if (timeframe === '1D') {
        startDate.setDate(endDate.getDate() - 365);
      } else {
        startDate.setDate(endDate.getDate() - 7);
      }
    }

    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Build Finage API endpoint
    const endpoint = timeframe === '1D' 
      ? `https://api.finage.co.uk/agg/forex/${symbol}/${finageTimeframe}/${formatDate(startDate)}/${formatDate(endDate)}`
      : `https://api.finage.co.uk/agg/forex/${symbol}/${finageTimeframe}/minute/${formatDate(startDate)}/${formatDate(endDate)}`;

    const url = `${endpoint}?apikey=${apiKey}&limit=30000`;

    console.log(`Fetching: ${symbol} ${timeframe} from ${formatDate(startDate)} to ${formatDate(endDate)}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return Response.json({ 
        error: 'No data available for the specified date range',
        candles: [] 
      });
    }

    // Transform to our format
    const candles = data.results.map(candle => ({
      timestamp: new Date(candle.t).toISOString(),
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
      volume: candle.v || 0,
    }));

    console.log(`Fetched ${candles.length} candles`);

    return Response.json({ 
      candles, 
      symbol, 
      timeframe,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      count: candles.length
    });
  } catch (error) {
    console.error('Error fetching candles:', error);
    return Response.json(
      { error: 'Failed to fetch candle data', details: error.message },
      { status: 500 }
    );
  }
}
