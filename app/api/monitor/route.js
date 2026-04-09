// app/api/monitor/route.js
// Automated Signal Monitoring API with Email Notifications

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory storage for active monitors
// In production, use Redis or database
let activeMonitors = new Map();
let monitorIntervals = new Map();

/**
 * Start monitoring for signals
 */
export async function POST(request) {
  try {
    const config = await request.json();
    const { action, email, symbol, timeframe } = config;

    if (action === 'start') {
      // Validate inputs
      if (!email || !symbol || !timeframe) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: email, symbol, timeframe',
        }, { status: 400 });
      }

      // Create monitor ID
      const monitorId = `${symbol}_${timeframe}_${Date.now()}`;

      // Store monitor config
      activeMonitors.set(monitorId, {
        id: monitorId,
        email,
        symbol,
        timeframe,
        startedAt: new Date().toISOString(),
        lastCheck: null,
        signalsDetected: 0,
        lastSignals: [],
        status: 'running',
      });

      // Start monitoring (check every minute)
      const intervalId = setInterval(async () => {
        await checkForSignals(monitorId);
      }, 60000); // 60 seconds

      monitorIntervals.set(monitorId, intervalId);

      // Run first check immediately
      checkForSignals(monitorId);

      console.log(`✅ Started monitor: ${monitorId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Timeframe: ${timeframe}`);

      return NextResponse.json({
        success: true,
        message: 'Monitor started successfully',
        monitorId,
        config: activeMonitors.get(monitorId),
      });

    } else if (action === 'stop') {
      const { monitorId } = config;

      if (!monitorId || !activeMonitors.has(monitorId)) {
        return NextResponse.json({
          success: false,
          error: 'Monitor not found',
        }, { status: 404 });
      }

      // Stop interval
      const intervalId = monitorIntervals.get(monitorId);
      if (intervalId) {
        clearInterval(intervalId);
        monitorIntervals.delete(monitorId);
      }

      // Update status
      const monitor = activeMonitors.get(monitorId);
      monitor.status = 'stopped';
      monitor.stoppedAt = new Date().toISOString();

      console.log(`⏸️  Stopped monitor: ${monitorId}`);

      return NextResponse.json({
        success: true,
        message: 'Monitor stopped successfully',
        config: monitor,
      });

    } else if (action === 'status') {
      // Get all active monitors
      const monitors = Array.from(activeMonitors.values());

      return NextResponse.json({
        success: true,
        monitors,
        activeCount: monitors.filter(m => m.status === 'running').length,
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: start, stop, or status',
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Monitor API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * Check for signals (runs every minute)
 */
async function checkForSignals(monitorId) {
  try {
    const monitor = activeMonitors.get(monitorId);
    if (!monitor || monitor.status !== 'running') return;

    console.log(`\n🔍 Checking signals for ${monitor.symbol} ${monitor.timeframe}...`);

    // Update last check time
    monitor.lastCheck = new Date().toISOString();

    // Fetch market data (same as live chart)
    const { symbol, timeframe } = monitor;
    
    // Import shared automation pipeline
    const { processSignals, isHighQualitySignal, getSignalPriority } = await import('../../../utils/signalProcessor');
    const { setupMTFStructure } = await import('../../../utils/mtfMapper');

    // Setup MTF structure
    const mtfSetup = setupMTFStructure(timeframe);

    // Fetch LTF data
    let ltfCandles;
    const apiKey = process.env.FINAGE_API_KEY;

    if (apiKey) {
      // Fetch from Finage
      const finageTimeframe = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '30m': '30',
        '1h': '60',
      }[timeframe] || '5';

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (mtfSetup.fetchParams.hours * 60 * 60 * 1000));

      const url = `https://api.finage.co.uk/history/${symbol}/forex?period=${finageTimeframe}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&apikey=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.results) {
        ltfCandles = data.results.map(item => ({
          timestamp: new Date(item.t).toISOString(),
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v || 0,
        }));
      }
    }

    if (!ltfCandles || ltfCandles.length < 100) {
      console.log('⚠️  Insufficient data, skipping...');
      return;
    }

    console.log(`✅ Fetched ${ltfCandles.length} candles`);

    const currentIndex = ltfCandles.length - 1;
    const result = await processSignals(ltfCandles, {
      symbol,
      timeframe,
      strategies: {
        htfBias: true,
        ltfExecution: true,
        liquiditySweeps: true,
        impulse: true,
        scalping: true,
      },
    });

    if (!result.success) {
      console.log('⚠️  Signal processor returned no result');
      return;
    }

    console.log(`📊 HTF Bias: ${result.htfBias?.bias || 'NEUTRAL'} (${result.htfBias?.score || 0}/100)`);

    const candidates = (result.signals || [])
      .filter(signal => isHighQualitySignal(signal, signal.mode === 'SCALPING' ? 60 : 70))
      .sort((a, b) => getSignalPriority(b) - getSignalPriority(a));

    const signal = candidates[0];

    if (signal) {
      console.log(`\n🎯 SIGNAL DETECTED!`);
      console.log(`   Type: ${signal.type}`);
      console.log(`   Direction: ${signal.direction}`);
      console.log(`   Confidence: ${signal.confidence}%`);
      console.log(`   Price: ${(signal.entry || signal.price || ltfCandles[currentIndex].close).toFixed(2)}`);

      // Check if this signal was already sent
      const signalPrice = signal.entry || signal.price || ltfCandles[currentIndex].close;
      const signalKey = `${signal.type}_${signal.direction}_${Math.floor(signalPrice)}`;
      
      if (!monitor.lastSignals.includes(signalKey)) {
        // Send email notification
        await sendEmailNotification(monitor, signal, ltfCandles[currentIndex], result.htfBias || { bias: 'NEUTRAL', confidence: 0 }, mtfSetup.structure);

        // Track signal to avoid duplicates
        monitor.lastSignals.push(signalKey);
        if (monitor.lastSignals.length > 10) {
          monitor.lastSignals.shift(); // Keep only last 10
        }

        monitor.signalsDetected++;
      } else {
        console.log('ℹ️  Signal already sent, skipping duplicate...');
      }
    } else {
      console.log('ℹ️  No strong signals detected');
    }

  } catch (error) {
    console.error('❌ Error checking signals:', error);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(monitor, signal, currentCandle, htfBias, mtfStructure) {
  try {
    console.log('\n📧 Sending email notification...');

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content
    const direction = signal.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL';
    const subject = `${direction} Signal Detected - ${monitor.symbol} ${monitor.timeframe}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${signal.direction === 'BUY' ? '#00d4aa' : '#ff4976'};">
          ${direction} Signal Detected!
        </h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Trade Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Symbol:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${monitor.symbol}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Direction:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${signal.direction === 'BUY' ? '#00d4aa' : '#ff4976'};">
                <strong>${signal.direction}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Entry Price:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${signal.entry?.toFixed(2) || currentCandle.close.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Stop Loss:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${signal.stopLoss?.toFixed(2) || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Take Profit:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${signal.takeProfit?.toFixed(2) || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Confidence:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${signal.confidence}%</strong></td>
            </tr>
          </table>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Multi-Timeframe Analysis</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>HTF (${mtfStructure.htf}):</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${htfBias.bias} (${(htfBias.confidence * 100).toFixed(0)}%)</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>ITF (${mtfStructure.itf}):</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Setup Confirmed</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>LTF (${mtfStructure.ltf}):</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Entry Signal</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <strong>⚠️ Risk Warning:</strong> This is an automated signal based on technical analysis. 
          Always use proper risk management and verify the setup before entering any trade.
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Detected at: ${new Date().toLocaleString()}<br>
          Monitor ID: ${monitor.id}
        </p>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: monitor.email,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${monitor.email}`);

  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

/**
 * GET endpoint to check status
 */
export async function GET(request) {
  const monitors = Array.from(activeMonitors.values());

  return NextResponse.json({
    success: true,
    monitors,
    activeCount: monitors.filter(m => m.status === 'running').length,
    totalChecks: monitors.reduce((sum, m) => sum + m.signalsDetected, 0),
  });
}
