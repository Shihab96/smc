'use client';
// components/Chart.js

import { useEffect, useRef, useState } from 'react';

export default function Chart({ candles, signals, htfBias, playbackIndex, settings }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth - 32,
          height: parent.clientHeight - 32,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !candles || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    if (playbackIndex < 0 || !dimensions.width) return;

    // Render chart
    renderChart(ctx, candles, signals, playbackIndex, dimensions, settings);
  }, [candles, signals, playbackIndex, dimensions, settings]);

  return (
    <div className="chart-container" style={{ height: '600px' }}>
      {htfBias && (
        <div className={`htf-bias-indicator ${htfBias.bias.toLowerCase()}`}>
          <span>HTF BIAS:</span>
          <strong>{htfBias.bias}</strong>
        </div>
      )}
      <canvas ref={canvasRef} className="chart-canvas" />
    </div>
  );
}

function renderChart(ctx, allCandles, signals, playbackIndex, dimensions, settings) {
  const { width, height } = dimensions;
  const padding = { top: 40, right: 80, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Show only candles up to playback index
  const visibleCandles = allCandles.slice(0, playbackIndex + 1);
  
  // Calculate visible window (show last 100 candles or less)
  const maxVisible = 100;
  const startIndex = Math.max(0, visibleCandles.length - maxVisible);
  const displayCandles = visibleCandles.slice(startIndex);

  if (displayCandles.length === 0) return;

  // Calculate price range
  const prices = displayCandles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;

  const scaleY = (price) => {
    return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
  };

  const candleWidth = chartWidth / displayCandles.length;
  const bodyWidth = Math.max(1, candleWidth * 0.7);

  // Draw grid
  drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice, priceRange);

  // Draw candles
  displayCandles.forEach((candle, i) => {
    const x = padding.left + i * candleWidth + candleWidth / 2;
    drawCandle(ctx, candle, x, bodyWidth, scaleY);
  });

  // Draw signals (only those that occurred up to playback index)
  if (signals) {
    const visibleSignals = signals.filter(s => s.index <= playbackIndex);
    visibleSignals.forEach(signal => {
      const candleLocalIndex = signal.index - startIndex;
      if (candleLocalIndex >= 0 && candleLocalIndex < displayCandles.length) {
        const x = padding.left + candleLocalIndex * candleWidth + candleWidth / 2;
        drawSignal(ctx, signal, x, scaleY, displayCandles[candleLocalIndex], settings);
      }
    });
  }

  // Draw price axis
  drawPriceAxis(ctx, width, padding, minPrice, maxPrice, scaleY);

  // Draw current price line
  if (displayCandles.length > 0) {
    const lastCandle = displayCandles[displayCandles.length - 1];
    drawPriceLine(ctx, lastCandle.close, scaleY, width, padding);
  }
}

function drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice, priceRange) {
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;

  // Horizontal grid lines
  const gridLines = 8;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }

  // Vertical grid lines
  const verticalLines = 10;
  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (chartWidth / verticalLines) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();
  }
}

function drawCandle(ctx, candle, x, bodyWidth, scaleY) {
  const isBullish = candle.close > candle.open;
  const color = isBullish ? '#00d4aa' : '#ff4976';

  const high = scaleY(candle.high);
  const low = scaleY(candle.low);
  const open = scaleY(candle.open);
  const close = scaleY(candle.close);

  // Draw wick
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, high);
  ctx.lineTo(x, low);
  ctx.stroke();

  // Draw body
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.abs(close - open);
  
  if (bodyHeight < 1) {
    // Doji - draw thin line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - bodyWidth / 2, close);
    ctx.lineTo(x + bodyWidth / 2, close);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
  }
}

function drawSignal(ctx, signal, x, scaleY, candle, settings) {
  const { type } = signal;

  if (type === 'SSL' || type === 'BSL') {
    // Draw sweep marker
    const y = type === 'SSL' ? scaleY(candle.low) : scaleY(candle.high);
    const color = type === 'SSL' ? '#00d4aa' : '#ff4976';
    
    ctx.fillStyle = color;
    ctx.font = '12px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(type, x, y + (type === 'SSL' ? 20 : -10));

    // Draw level line
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x - 50, y);
    ctx.lineTo(x + 50, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (type === 'BUY' || type === 'SELL') {
    // Draw confirmed signal
    const y = scaleY(candle.close);
    const color = type === 'BUY' ? '#00d4aa' : '#ff4976';
    
    // Draw arrow
    ctx.fillStyle = color;
    ctx.beginPath();
    if (type === 'BUY') {
      ctx.moveTo(x, y + 30);
      ctx.lineTo(x - 8, y + 45);
      ctx.lineTo(x + 8, y + 45);
    } else {
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x - 8, y - 45);
      ctx.lineTo(x + 8, y - 45);
    }
    ctx.fill();

    // Draw label
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(type, x, y + (type === 'BUY' ? 60 : -50));
  }

  if (type === 'IMPULSE_UP' || type === 'IMPULSE_DOWN') {
    // Draw impulse marker
    const y = type === 'IMPULSE_UP' ? scaleY(candle.low) : scaleY(candle.high);
    const color = type === 'IMPULSE_UP' ? '#58a6ff' : '#f85149';

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color + '40';
    ctx.fillRect(x - 3, scaleY(candle.high), 6, scaleY(candle.low) - scaleY(candle.high));
    ctx.shadowBlur = 0;

    // Label
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(
      type === 'IMPULSE_UP' ? '▲ BUYERS' : '▼ SELLERS',
      x,
      y + (type === 'IMPULSE_UP' ? 25 : -15)
    );
  }

  if (type === 'MOMENTUM_BURST') {
    // Draw lightning bolt
    const y = scaleY(candle.high);
    ctx.fillStyle = '#ffd60a';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', x, y - 10);
  }

  if (type === 'HIGH_PROBABILITY') {
    // Draw institutional entry zone
    const yTop = scaleY(candle.high);
    const yBottom = scaleY(candle.low);
    
    // Background highlight
    ctx.fillStyle = signal.direction === 'bullish' ? '#00d4aa20' : '#ff497620';
    ctx.fillRect(x - 20, yTop, 40, yBottom - yTop);

    // Border glow
    ctx.strokeStyle = signal.direction === 'bullish' ? '#00d4aa' : '#ff4976';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x - 20, yTop, 40, yBottom - yTop);
    ctx.shadowBlur = 0;

    // Label
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'center';
    ctx.fillText('🔥 INSTITUTIONAL', x, yTop - 15);
    
    if (signal.mtfConfirmed) {
      ctx.fillText('MTF ✓', x, yTop - 5);
    }
  }
}

function drawPriceAxis(ctx, width, padding, minPrice, maxPrice, scaleY) {
  ctx.fillStyle = '#6e7681';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'right';

  const priceSteps = 8;
  const priceStep = (maxPrice - minPrice) / priceSteps;

  for (let i = 0; i <= priceSteps; i++) {
    const price = minPrice + priceStep * i;
    const y = scaleY(price);
    ctx.fillText(price.toFixed(2), width - padding.right + 70, y + 4);
  }
}

function drawPriceLine(ctx, price, scaleY, width, padding) {
  const y = scaleY(price);
  
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding.left, y);
  ctx.lineTo(width - padding.right, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Price label
  ctx.fillStyle = '#58a6ff';
  ctx.fillRect(width - padding.right + 5, y - 10, 60, 20);
  ctx.fillStyle = '#0a0e14';
  ctx.font = 'bold 11px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText(price.toFixed(2), width - padding.right + 35, y + 4);
}
