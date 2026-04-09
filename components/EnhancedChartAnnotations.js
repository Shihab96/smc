// components/EnhancedChartAnnotations.js
// User-Friendly Visual Overlays for Chart
// Makes everything crystal clear with labels and colors

'use client';

export function EnhancedChartAnnotations({ 
  canvasRef,
  candles,
  dealingRange,
  regime,
  triggers,
  evaluation,
  dimensions
}) {
  if (!canvasRef.current || !candles || candles.length === 0) return null;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const { width, height, padding, chartHeight } = dimensions;

  // Helper: Convert price to Y coordinate
  const priceToY = (price, minPrice, maxPrice) => {
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight + padding.top;
  };

  // Get price range
  const prices = candles.map(c => [c.high, c.low]).flat();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // === 1. PREMIUM/DISCOUNT ZONES ===
  if (dealingRange) {
    const eqY = priceToY(dealingRange.mid, minPrice, maxPrice);
    const highY = priceToY(dealingRange.high, minPrice, maxPrice);
    const lowY = priceToY(dealingRange.low, minPrice, maxPrice);

    // Premium zone (RED)
    ctx.fillStyle = 'rgba(255, 73, 118, 0.08)';
    ctx.fillRect(padding.left, highY, width - padding.left - padding.right, eqY - highY);

    // Discount zone (GREEN)
    ctx.fillStyle = 'rgba(0, 212, 170, 0.08)';
    ctx.fillRect(padding.left, eqY, width - padding.left - padding.right, lowY - eqY);

    // Equilibrium line (YELLOW)
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, eqY);
    ctx.lineTo(width - padding.right, eqY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels with background
    const drawLabel = (text, y, bgColor, textColor) => {
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const textWidth = ctx.measureText(text).width;
      const labelX = width - padding.right - textWidth - 16;
      const labelY = y - 6;

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(labelX - 4, labelY - 12, textWidth + 8, 20);
      
      // Border
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX - 4, labelY - 12, textWidth + 8, 20);

      // Text
      ctx.fillStyle = textColor;
      ctx.fillText(text, labelX, labelY + 2);
    };

    drawLabel(`🔴 PREMIUM (Sell Zone) ${dealingRange.high.toFixed(2)}`, highY + 15, 'rgba(255, 73, 118, 0.9)', '#fff');
    drawLabel(`⚖️ EQUILIBRIUM (50%) ${dealingRange.mid.toFixed(2)}`, eqY, 'rgba(255, 214, 10, 0.9)', '#000');
    drawLabel(`🟢 DISCOUNT (Buy Zone) ${dealingRange.low.toFixed(2)}`, lowY - 15, 'rgba(0, 212, 170, 0.9)', '#fff');
  }

  // === 2. MARKET REGIME INDICATOR ===
  if (regime) {
    const regimeColors = {
      'STRONG_TREND_BULLISH': { bg: '#00d4aa', text: '📈 STRONG UPTREND' },
      'STRONG_TREND_BEARISH': { bg: '#ff4976', text: '📉 STRONG DOWNTREND' },
      'RANGING': { bg: '#ffd60a', text: '↔️ SIDEWAYS MARKET' },
      'HIGH_VOLATILITY': { bg: '#ff9500', text: '⚡ HIGH VOLATILITY' },
      'REVERSAL_CHOCH': { bg: '#bc8cff', text: '🔄 POTENTIAL REVERSAL' },
      'WEAK_TREND': { bg: '#8b949e', text: '😐 WEAK TREND' }
    };

    const regimeInfo = regimeColors[regime.regime] || { bg: '#8b949e', text: regime.regime };
    
    // Regime badge (top left)
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const badgeText = `${regimeInfo.text} (${(regime.confidence * 100).toFixed(0)}%)`;
    const badgeWidth = ctx.measureText(badgeText).width + 20;
    
    // Background
    ctx.fillStyle = regimeInfo.bg;
    ctx.fillRect(padding.left + 10, padding.top + 10, badgeWidth, 28);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.fillText(badgeText, padding.left + 20, padding.top + 28);
  }

  // === 3. DECISION INDICATOR (Top Right) ===
  if (evaluation && evaluation.decision) {
    const approved = evaluation.decision.approved;
    const decisionBg = approved ? '#00d4aa' : '#ffd60a';
    const decisionText = approved ? '✅ TRADE APPROVED' : '⚠️ WAIT';
    const decisionSubtext = approved 
      ? `${(evaluation.decision.confidence * 100).toFixed(0)}% Confidence`
      : 'Better setup needed';

    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const mainWidth = ctx.measureText(decisionText).width + 20;
    
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const subWidth = ctx.measureText(decisionSubtext).width + 20;
    const boxWidth = Math.max(mainWidth, subWidth);
    
    const boxX = width - padding.right - boxWidth - 10;
    const boxY = padding.top + 10;

    // Background
    ctx.fillStyle = decisionBg;
    ctx.fillRect(boxX, boxY, boxWidth, 50);
    
    // Main text
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = approved ? '#fff' : '#000';
    ctx.fillText(decisionText, boxX + 10, boxY + 20);
    
    // Subtext
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(decisionSubtext, boxX + 10, boxY + 38);
  }

  // === 4. CONFLUENCE METER (Bottom Right) ===
  if (evaluation && evaluation.confluence) {
    const score = evaluation.confluence.score;
    const maxScore = 6;
    const quality = evaluation.confluence.quality;
    
    const meterX = width - padding.right - 180;
    const meterY = height - padding.bottom - 60;
    const meterWidth = 160;
    const meterHeight = 40;

    // Background
    ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

    // Title
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('CONFLUENCE', meterX + 8, meterY + 14);

    // Score bars
    const barWidth = 18;
    const barGap = 4;
    const barsX = meterX + 8;
    const barsY = meterY + 20;

    for (let i = 0; i < maxScore; i++) {
      const barX = barsX + (i * (barWidth + barGap));
      
      if (i < score) {
        // Filled bar
        const color = score >= 4 ? '#00d4aa' : score === 3 ? '#ffd60a' : '#ff4976';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barsY, barWidth, 12);
      } else {
        // Empty bar
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barsY, barWidth, 12);
      }
    }

    // Quality label
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const qualityColor = quality === 'EXCELLENT' ? '#00d4aa' : 
                        quality === 'GOOD' ? '#ffd60a' : '#ff4976';
    ctx.fillStyle = qualityColor;
    ctx.fillText(`${score}/6 ${quality}`, meterX + meterWidth - 72, meterY + 14);
  }

  // === 5. TRIGGER CONSENSUS (Bottom Left) ===
  if (triggers && triggers.triggerCount > 0) {
    const consensus = triggers.consensus;
    const count = triggers.triggerCount;
    const confidence = triggers.stackedConfidence;

    const boxX = padding.left + 10;
    const boxY = height - padding.bottom - 60;
    const boxWidth = 180;
    const boxHeight = 40;

    // Background
    ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('INSTITUTIONAL SIGNALS', boxX + 8, boxY + 14);

    // Consensus
    const consensusColor = consensus === 'BULLISH' ? '#00d4aa' : 
                          consensus === 'BEARISH' ? '#ff4976' : '#8b949e';
    const consensusIcon = consensus === 'BULLISH' ? '🟢 BUY' : 
                         consensus === 'BEARISH' ? '🔴 SELL' : '⚪ NEUTRAL';
    
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = consensusColor;
    ctx.fillText(consensusIcon, boxX + 8, boxY + 32);

    // Count and confidence
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText(`${count}/7 triggers (${confidence}%)`, boxX + 70, boxY + 32);
  }

  // === 6. CURRENT PRICE INDICATOR ===
  if (candles.length > 0) {
    const currentPrice = candles[candles.length - 1].close;
    const currentY = priceToY(currentPrice, minPrice, maxPrice);
    const isUp = candles[candles.length - 1].close > candles[candles.length - 1].open;

    // Price line
    ctx.strokeStyle = isUp ? '#00d4aa' : '#ff4976';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const priceText = currentPrice.toFixed(2);
    const priceWidth = ctx.measureText(priceText).width;
    
    ctx.fillStyle = isUp ? '#00d4aa' : '#ff4976';
    ctx.fillRect(width - padding.right + 5, currentY - 10, priceWidth + 10, 20);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(priceText, width - padding.right + 10, currentY + 4);
  }

  return null;
}
