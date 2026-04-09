// app/api/automation/run/route.js
// API Route for Running Automation (Called by Cron)

import { NextResponse } from 'next/server';
import { 
  loadAutomationState, 
  saveAutomationState,
  isDuplicateSignal,
  addSignalToHistory,
  loadSignalHistory 
} from '../../../../utils/automationState';
import { fetchLatestCandles } from '../../../../utils/marketData';
import { processSignals, isHighQualitySignal } from '../../../../utils/signalProcessor';
import { sendAllNotifications } from '../../../../utils/notifications';

/**
 * POST /api/automation/run
 * Run automation cycle (called by cron job)
 * 
 * Security: This should be protected with an API key
 */
export async function POST(request) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    // Load automation state
    const state = loadAutomationState();

    // Check if automation is enabled
    if (!state.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Automation is disabled',
        skipped: true,
      });
    }

    console.log(`\n🤖 Running automation for ${state.symbol} ${state.timeframe}...`);

    // STEP 1: Fetch latest market data
    console.log('📊 Fetching market data...');
    let candles;
    try {
      candles = await fetchLatestCandles(state.symbol, state.timeframe, 500);
      console.log(`✅ Fetched ${candles.length} candles`);
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch market data: ' + error.message,
      }, { status: 500 });
    }

    // STEP 2: Process signals
    console.log('🔍 Processing signals...');
    const result = await processSignals(candles, {
      symbol: state.symbol,
      timeframe: state.timeframe,
      strategies: state.strategies,
    });

    if (!result.success) {
      console.error('❌ Signal processing failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    console.log(`✅ Found ${result.signals.length} potential signals`);

    // STEP 3: Filter and deduplicate signals
    const history = loadSignalHistory();
    const newSignals = [];
    const duplicates = [];

    for (const signal of result.signals) {
      // Check quality
      if (!isHighQualitySignal(signal, 70)) {
        console.log(`⚠️ Signal quality too low (${signal.confidence}%), skipping`);
        continue;
      }

      // Check for duplicates
      if (isDuplicateSignal(signal, history, 30)) {
        console.log(`⚠️ Duplicate signal detected, skipping`);
        duplicates.push(signal);
        continue;
      }

      newSignals.push(signal);
    }

    console.log(`✅ ${newSignals.length} new signals after filtering`);
    console.log(`⚠️ ${duplicates.length} duplicates filtered out`);

    // STEP 4: Send notifications for new signals
    const notificationResults = [];

    for (const signal of newSignals) {
      console.log(`\n📢 Sending notifications for ${signal.direction} signal...`);
      
      // Send notifications
      const notifications = await sendAllNotifications(signal, state.notifications);
      
      notificationResults.push({
        signal: signal.type,
        direction: signal.direction,
        whatsapp: notifications.whatsapp,
        trello: notifications.trello,
      });

      // Add to history
      addSignalToHistory(signal);

      console.log(`✅ Notifications sent`);
      if (notifications.whatsapp?.success) console.log('  ✓ WhatsApp');
      if (notifications.trello?.success) console.log('  ✓ Trello');
    }

    // STEP 5: Update automation state
    state.lastRun = new Date().toISOString();
    state.signalCount += newSignals.length;
    saveAutomationState(state);

    // Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      symbol: state.symbol,
      timeframe: state.timeframe,
      candles: candles.length,
      htfBias: result.htfBias ? {
        bias: result.htfBias.bias,
        score: result.htfBias.score,
        strength: result.htfBias.strength,
      } : null,
      killZoneActive: result.killZoneActive,
      volatilityExpanding: result.volatilityExpanding,
      signalsFound: result.signals.length,
      signalsSent: newSignals.length,
      duplicatesFiltered: duplicates.length,
      notifications: notificationResults,
    });

  } catch (error) {
    console.error('❌ Automation run error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * GET /api/automation/run
 * Test automation without sending notifications
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const state = loadAutomationState();

    if (!state.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Automation is disabled',
        state,
      });
    }

    // Fetch data
    const candles = await fetchLatestCandles(state.symbol, state.timeframe, 500);

    // Process signals (but don't send notifications)
    const result = await processSignals(candles, {
      symbol: state.symbol,
      timeframe: state.timeframe,
      strategies: state.strategies,
    });

    return NextResponse.json({
      success: true,
      test: true,
      symbol: state.symbol,
      timeframe: state.timeframe,
      candles: candles.length,
      result,
    });

  } catch (error) {
    console.error('Test run error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
