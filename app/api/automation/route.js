// app/api/automation/route.js
// API Routes for Automation Control

import { NextResponse } from 'next/server';
import { 
  DEFAULT_STATE,
  loadAutomationState, 
  saveAutomationState,
  getAutomationStats,
  cleanupOldSignals 
} from '../../../utils/automationState';

/**
 * GET /api/automation
 * Get current automation state and statistics
 */
export async function GET(request) {
  try {
    const state = loadAutomationState();
    const stats = getAutomationStats();

    return NextResponse.json({
      success: true,
      state,
      stats,
    });

  } catch (error) {
    console.error('GET /api/automation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/automation
 * Update automation settings
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const currentState = loadAutomationState();

    // Update state with new values
    const newState = {
      ...currentState,
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    // Save state
    const saved = saveAutomationState(newState);

    if (!saved) {
      throw new Error('Failed to save automation state');
    }

    // If automation was enabled, trigger immediate run
    if (newState.enabled && !currentState.enabled) {
      console.log('Automation enabled - triggering immediate run');
      // This will be picked up by the cron job
    }

    return NextResponse.json({
      success: true,
      state: newState,
      message: newState.enabled ? 'Automation enabled' : 'Automation disabled',
    });

  } catch (error) {
    console.error('POST /api/automation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * DELETE /api/automation
 * Reset automation state and clear history
 */
export async function DELETE(request) {
  try {
    const clearedSignals = cleanupOldSignals(0); // Clear all

    saveAutomationState({ ...DEFAULT_STATE });

    return NextResponse.json({
      success: true,
      message: 'Automation reset',
      clearedSignals,
    });

  } catch (error) {
    console.error('DELETE /api/automation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
