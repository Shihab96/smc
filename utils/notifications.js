// utils/notifications.js
// WhatsApp & Trello Notification System

/**
 * Send WhatsApp notification
 * Using Twilio WhatsApp API
 */
export async function sendWhatsAppNotification(signal, config) {
  if (!config.whatsappEnabled) return { success: false, reason: 'disabled' };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // format: whatsapp:+14155238886
  const toNumber = process.env.TWILIO_WHATSAPP_TO; // format: whatsapp:+1234567890

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.error('WhatsApp: Missing Twilio credentials');
    return { success: false, reason: 'missing_credentials' };
  }

  // Format message
  const message = formatWhatsAppMessage(signal);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp send failed:', error);
      return { success: false, reason: error.message };
    }

    const data = await response.json();
    console.log('WhatsApp sent:', data.sid);
    return { success: true, messageId: data.sid };

  } catch (error) {
    console.error('WhatsApp error:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Format WhatsApp message
 */
function formatWhatsAppMessage(signal) {
  const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const arrow = signal.direction === 'BUY' ? '⬆️' : '⬇️';
  
  return `
${emoji} *${signal.direction} SIGNAL* ${arrow}

📊 *Symbol:* ${signal.symbol}
⏰ *Time:* ${new Date(signal.timestamp).toLocaleString()}
🎯 *Type:* ${signal.type}

💰 *Entry Zone:* ${signal.entryZone?.low?.toFixed(2)} - ${signal.entryZone?.high?.toFixed(2)}
🛑 *Stop Loss:* ${signal.stopLoss?.toFixed(2)}
🎯 *Target:* ${signal.targets?.primary?.toFixed(2)}
📈 *R:R:* 1:${signal.rr?.toFixed(1)}

✨ *Confidence:* ${signal.confidence}%
${signal.htfBias ? `📊 *HTF Bias:* ${signal.htfBias}` : ''}

_Automated Signal - Trade at your own risk_
`.trim();
}

/**
 * Send Trello card
 * Creates a card in specified Trello board/list
 */
export async function sendTrelloNotification(signal, config) {
  if (!config.trelloEnabled) return { success: false, reason: 'disabled' };

  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const listId = process.env.TRELLO_LIST_ID;

  if (!apiKey || !token || !listId) {
    console.error('Trello: Missing credentials');
    return { success: false, reason: 'missing_credentials' };
  }

  const { name, desc } = formatTrelloCard(signal);

  try {
    const response = await fetch(
      `https://api.trello.com/1/cards?key=${apiKey}&token=${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idList: listId,
          name: name,
          desc: desc,
          pos: 'top',
          // Optional: Add labels based on signal type
          idLabels: signal.direction === 'BUY' ? 
            process.env.TRELLO_LABEL_BUY : 
            process.env.TRELLO_LABEL_SELL,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Trello create failed:', error);
      return { success: false, reason: error };
    }

    const data = await response.json();
    console.log('Trello card created:', data.id);
    return { success: true, cardId: data.id, url: data.url };

  } catch (error) {
    console.error('Trello error:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Format Trello card
 */
function formatTrelloCard(signal) {
  const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const name = `${emoji} ${signal.direction} ${signal.symbol} - ${signal.confidence}%`;
  
  const desc = `
## Trade Signal Details

**Direction:** ${signal.direction}
**Symbol:** ${signal.symbol}
**Type:** ${signal.type}
**Timestamp:** ${new Date(signal.timestamp).toLocaleString()}

### Entry Details
- **Entry Zone:** ${signal.entryZone?.low?.toFixed(2)} - ${signal.entryZone?.high?.toFixed(2)}
- **Stop Loss:** ${signal.stopLoss?.toFixed(2)}
- **Target 1:** ${signal.targets?.primary?.toFixed(2)}
- **Target 2:** ${signal.targets?.secondary?.toFixed(2)}
- **Target 3:** ${signal.targets?.final?.toFixed(2)}

### Risk Management
- **Risk:Reward:** 1:${signal.rr?.toFixed(1)}
- **Confidence:** ${signal.confidence}%

### Analysis
${signal.htfBias ? `- **HTF Bias:** ${signal.htfBias}` : ''}
${signal.details?.sweep ? `- **Sweep:** ${signal.details.sweep.liquidityType} at ${signal.details.sweep.level.toFixed(2)}` : ''}
${signal.details?.displacement ? `- **Displacement:** ${signal.details.displacement.direction} (${signal.details.displacement.rangeMultiplier.toFixed(1)}x)` : ''}
${signal.details?.mss ? `- **MSS:** Confirmed at ${signal.details.mss.brokenLevel.toFixed(2)}` : ''}

### Notes
- Automated signal from institutional analysis
- Always verify with your own analysis before trading
- Manage risk appropriately

---
_Generated: ${new Date().toISOString()}_
`.trim();

  return { name, desc };
}

/**
 * Send all notifications
 */
export async function sendAllNotifications(signal, config) {
  const results = {
    whatsapp: null,
    trello: null,
  };

  // Send WhatsApp
  if (config.whatsapp) {
    results.whatsapp = await sendWhatsAppNotification(signal, {
      whatsappEnabled: true,
    });
  }

  // Send Trello
  if (config.trello) {
    results.trello = await sendTrelloNotification(signal, {
      trelloEnabled: true,
    });
  }

  return results;
}

/**
 * Test notifications
 */
export async function testNotifications(config) {
  const testSignal = {
    type: 'AGGRESSION_ALERT',
    direction: 'BUY',
    symbol: 'XAUUSD',
    timestamp: new Date().toISOString(),
    entryZone: { low: 2040.50, high: 2042.00 },
    stopLoss: 2039.00,
    targets: {
      primary: 2055.00,
      secondary: 2065.00,
      final: 2080.00,
    },
    rr: 8.5,
    confidence: 85,
    htfBias: 'STRONG BULLISH',
    details: {
      sweep: { liquidityType: 'SSL', level: 2040.00 },
      displacement: { direction: 'BULLISH', rangeMultiplier: 2.8 },
      mss: { confirmed: true, brokenLevel: 2048.00 },
    },
  };

  console.log('Sending test notifications...');
  const results = await sendAllNotifications(testSignal, config);
  
  console.log('Test results:', results);
  return results;
}
