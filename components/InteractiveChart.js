'use client';
// components/InteractiveChart.js
// Professional TradingView-style chart with proper bounds and performance

import { useEffect, useRef, useState, useCallback } from 'react';

export default function InteractiveChart({ 
  candles, 
  signals, 
  htfData,
  settings,
  visualSettings // New: toggle settings for visual elements
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Chart state
  const [offset, setOffset] = useState(0);
  const [candleWidth, setCandleWidth] = useState(8);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastOffset, setLastOffset] = useState(0);
  
  // Performance refs
  const animationFrameRef = useRef(null);
  const lastRenderRef = useRef(0);
  const renderTimeoutRef = useRef(null);

  // Update dimensions with proper bounds
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Initialize chart - ensure all candles fit
  useEffect(() => {
    if (candles && candles.length > 0 && dimensions.width > 0) {
      const padding = { left: 10, right: 100 };
      const availableWidth = dimensions.width - padding.left - padding.right;
      const visibleCandles = Math.floor(availableWidth / candleWidth);
      const newOffset = Math.max(0, candles.length - visibleCandles);
      setOffset(newOffset);
    }
  }, [candles, dimensions.width]);

  // Calculate max offset to keep candles in bounds
  const getMaxOffset = useCallback(() => {
    if (!candles || !dimensions.width) return 0;
    const padding = { left: 10, right: 100 };
    const availableWidth = dimensions.width - padding.left - padding.right;
    const visibleCandles = Math.floor(availableWidth / candleWidth);
    return Math.max(0, candles.length - visibleCandles);
  }, [candles, dimensions.width, candleWidth]);

  // Mouse handlers with improved performance
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setLastOffset(offset);
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !candles) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      // Smooth panning with bounds checking
      const deltaX = e.clientX - dragStart.x;
      const candlesMoved = Math.round(deltaX / candleWidth);
      
      const maxOffset = getMaxOffset();
      const newOffset = Math.max(0, Math.min(maxOffset, lastOffset - candlesMoved));
      
      if (newOffset !== offset) {
        setOffset(newOffset);
      }
    } else {
      // Update hovered candle and tooltip position
      const padding = { left: 10 };
      const relativeX = x - padding.left;
      const candleIndex = Math.floor(relativeX / candleWidth) + offset;
      
      if (candleIndex >= 0 && candleIndex < candles.length) {
        setHoveredCandle(candleIndex);
        
        // Smart tooltip positioning - avoid edges
        let tooltipX = x;
        let tooltipY = y;
        
        // Keep tooltip within bounds
        const tooltipWidth = 220; // Approximate tooltip width
        const tooltipHeight = 200; // Approximate tooltip height
        
        // Position to right of cursor, but flip if too close to right edge
        if (x + tooltipWidth + 20 > dimensions.width) {
          tooltipX = x - tooltipWidth - 20;
        } else {
          tooltipX = x + 20;
        }
        
        // Keep within left bound
        tooltipX = Math.max(10, tooltipX);
        
        // Position below cursor, but flip if too close to bottom
        if (y + tooltipHeight + 20 > dimensions.height) {
          tooltipY = Math.max(10, y - tooltipHeight - 20);
        } else {
          tooltipY = y + 20;
        }
        
        setTooltipPosition({ x: tooltipX, y: tooltipY });
      } else {
        setHoveredCandle(null);
      }
    }
  }, [isDragging, dragStart, offset, lastOffset, candleWidth, candles, dimensions, getMaxOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredCandle(null);
  }, []);

  // Smooth zoom with better performance
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    // Clear any pending render
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // Debounce zoom for smoother performance
    renderTimeoutRef.current = setTimeout(() => {
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newWidth = Math.max(4, Math.min(40, candleWidth * zoomFactor));
      
      // Calculate visible candles with new width
      const padding = { left: 10, right: 100 };
      const availableWidth = dimensions.width - padding.left - padding.right;
      const oldVisibleCandles = Math.floor(availableWidth / candleWidth);
      const newVisibleCandles = Math.floor(availableWidth / newWidth);
      
      // Adjust offset to keep center stable and within bounds
      const centerCandle = offset + Math.floor(oldVisibleCandles / 2);
      let newOffset = Math.max(0, centerCandle - Math.floor(newVisibleCandles / 2));
      
      // Ensure we don't exceed max offset
      const maxOffset = Math.max(0, candles.length - newVisibleCandles);
      newOffset = Math.min(newOffset, maxOffset);
      
      setCandleWidth(newWidth);
      setOffset(newOffset);
    }, 10);
  }, [candleWidth, offset, dimensions.width, candles]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!candles) return;

      const maxOffset = getMaxOffset();

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setOffset(o => Math.max(0, o - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setOffset(o => Math.min(maxOffset, o + 10));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setCandleWidth(w => Math.min(40, w * 1.15));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setCandleWidth(w => Math.max(4, w * 0.85));
          break;
        case 'Home':
          e.preventDefault();
          setOffset(0);
          break;
        case 'End':
          e.preventDefault();
          setOffset(maxOffset);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candles, getMaxOffset]);

  // Optimized render with proper bounds
  useEffect(() => {
    if (!canvasRef.current || !candles || candles.length === 0 || !dimensions.width || !dimensions.height) return;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      
      // High DPI support
      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;
      ctx.scale(dpr, dpr);

      // Clear with background
      ctx.fillStyle = '#0f1419';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Calculate visible range with proper padding
      const padding = { top: 40, right: 100, bottom: 40, left: 10 };
      const chartWidth = dimensions.width - padding.left - padding.right;
      const visibleCandles = Math.ceil(chartWidth / candleWidth) + 1;
      const startIdx = Math.max(0, offset);
      const endIdx = Math.min(candles.length, startIdx + visibleCandles);
      const displayCandles = candles.slice(startIdx, endIdx);

      if (displayCandles.length === 0) return;

      // Render chart with all elements
      renderChart(ctx, displayCandles, signals, htfData, {
        width: dimensions.width,
        height: dimensions.height,
        candleWidth,
        startIdx,
        hoveredCandle,
        settings,
        visualSettings,
        padding
      });
    };

    // Throttle rendering for performance
    const now = Date.now();
    if (now - lastRenderRef.current > 16) { // ~60fps
      render();
      lastRenderRef.current = now;
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [candles, signals, htfData, dimensions, offset, candleWidth, hoveredCandle, settings, visualSettings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Chart container - fixed height with proper bounds */}
      <div 
        ref={containerRef}
        className="chart-container-wrapper"
        style={{ 
          height: '600px',
          width: '100%',
          position: 'relative',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden', // Ensure nothing renders outside
          cursor: isDragging ? 'grabbing' : 'crosshair'
        }}
      >
        {htfData?.bias && visualSettings?.showHTFBias && (
          <div className={`htf-bias-indicator ${htfData.bias.toLowerCase()}`}>
            <span>HTF BIAS:</span>
            <strong>{htfData.bias}</strong>
            <span style={{fontSize: '0.65rem', opacity: 0.8}}>
              ({(htfData.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {hoveredCandle !== null && candles[hoveredCandle] && visualSettings?.showTooltip && (
          <CandleTooltip 
            candle={candles[hoveredCandle]} 
            position={tooltipPosition}
          />
        )}
      </div>

      {/* Controls outside chart wrapper */}
      <ChartControls
        onZoomIn={() => setCandleWidth(w => Math.min(40, w * 1.15))}
        onZoomOut={() => setCandleWidth(w => Math.max(4, w * 0.85))}
        onResetZoom={() => setCandleWidth(8)}
        onGoToStart={() => setOffset(0)}
        onGoToEnd={() => setOffset(getMaxOffset())}
      />
    </div>
  );
}

function renderChart(ctx, candles, signals, htfData, options) {
  const { width, height, candleWidth, startIdx, hoveredCandle, settings, visualSettings, padding } = options;
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate price range with proper bounds
  const prices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.05; // Less padding for better fit

  const scaleY = (price) => {
    return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
  };

  // Draw elements based on visual settings
  if (visualSettings?.showHTFLevels && htfData?.levels) {
    drawHTFLevels(ctx, htfData.levels, scaleY, padding, chartWidth);
  }

  if (visualSettings?.showDealingRange && htfData?.dealingRange) {
    drawDealingRange(ctx, htfData.dealingRange, scaleY, padding, chartWidth);
  }

  if (visualSettings?.showGrid) {
    drawGrid(ctx, padding, chartWidth, chartHeight);
  }

  // Draw candles - always visible
  candles.forEach((candle, i) => {
    const x = padding.left + i * candleWidth;
    const isHovered = (startIdx + i) === hoveredCandle;
    drawCandle(ctx, candle, x, candleWidth, scaleY, isHovered);
  });

  // Draw signals based on toggles
  if (signals && visualSettings?.showSignals) {
    signals.forEach(signal => {
      const localIdx = signal.index - startIdx;
      if (localIdx >= 0 && localIdx < candles.length) {
        const x = padding.left + localIdx * candleWidth;
        const shouldShow = checkSignalVisibility(signal.type, visualSettings);
        if (shouldShow) {
          drawSignal(ctx, signal, x, candleWidth, scaleY, candles[localIdx], settings);
        }
      }
    });
  }

  if (visualSettings?.showPriceAxis) {
    drawPriceAxis(ctx, width, padding, minPrice, maxPrice, scaleY);
  }

  if (visualSettings?.showCurrentPrice && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    drawPriceLine(ctx, lastCandle.close, scaleY, width, padding);
  }

  if (visualSettings?.showTimeAxis) {
    drawTimeAxis(ctx, candles, padding, chartWidth, candleWidth, height);
  }
}

function checkSignalVisibility(signalType, visualSettings) {
  const typeMap = {
    'SSL': visualSettings?.showSweeps,
    'BSL': visualSettings?.showSweeps,
    'BUY': visualSettings?.showConfirmed,
    'SELL': visualSettings?.showConfirmed,
    'IMPULSE_UP': visualSettings?.showImpulse,
    'IMPULSE_DOWN': visualSettings?.showImpulse,
    'MOMENTUM_BURST': visualSettings?.showMomentum,
    'HIGH_PROBABILITY': visualSettings?.showHighProb,
  };
  return typeMap[signalType] !== false; // Default to true if not specified
}

// ... (keep all the drawing functions: drawHTFLevels, drawDealingRange, drawGrid, drawCandle, drawSignal, drawPriceAxis, drawPriceLine, drawTimeAxis - same as before)

function drawHTFLevels(ctx, levels, scaleY, padding, chartWidth) {
  ctx.save();
  
  if (levels.support) {
    levels.support.forEach(lvl => {
      const y = scaleY(lvl.level);
      ctx.strokeStyle = '#00d4aa40';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      ctx.fillStyle = '#00d4aa';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText(`SUPPORT (${lvl.touches}x)`, padding.left + 5, y - 5);
    });
  }

  if (levels.resistance) {
    levels.resistance.forEach(lvl => {
      const y = scaleY(lvl.level);
      ctx.strokeStyle = '#ff497640';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      ctx.fillStyle = '#ff4976';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.fillText(`RESISTANCE (${lvl.touches}x)`, padding.left + 5, y + 15);
    });
  }
  
  ctx.restore();
}

function drawDealingRange(ctx, dealingRange, scaleY, padding, chartWidth) {
  const { high, low, mid } = dealingRange;
  
  const yHigh = scaleY(high);
  const yLow = scaleY(low);
  const yMid = scaleY(mid);
  
  ctx.fillStyle = '#ff497615';
  ctx.fillRect(padding.left, yHigh, chartWidth, yMid - yHigh);
  
  ctx.fillStyle = '#00d4aa15';
  ctx.fillRect(padding.left, yMid, chartWidth, yLow - yMid);
  
  ctx.strokeStyle = '#ffd60a80';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(padding.left, yMid);
  ctx.lineTo(padding.left + chartWidth, yMid);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = '#ff4976';
  ctx.font = 'bold 11px "JetBrains Mono"';
  ctx.textAlign = 'right';
  ctx.fillText('PREMIUM ZONE', padding.left + chartWidth - 5, yHigh + 15);
  
  ctx.fillStyle = '#00d4aa';
  ctx.fillText('DISCOUNT ZONE', padding.left + chartWidth - 5, yLow - 5);
  
  ctx.fillStyle = '#ffd60a';
  ctx.fillText('EQUILIBRIUM', padding.left + chartWidth - 5, yMid - 5);
}

function drawGrid(ctx, padding, chartWidth, chartHeight) {
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;

  const gridLines = 8;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }

  const verticalLines = 12;
  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (chartWidth / verticalLines) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();
  }
}

function drawCandle(ctx, candle, x, width, scaleY, isHovered) {
  const isBullish = candle.close > candle.open;
  const color = isBullish ? '#00d4aa' : '#ff4976';
  const bodyWidth = Math.max(1, width * 0.8);

  const high = scaleY(candle.high);
  const low = scaleY(candle.low);
  const open = scaleY(candle.open);
  const close = scaleY(candle.close);

  if (isHovered) {
    ctx.fillStyle = '#30363d40';
    ctx.fillRect(x - bodyWidth / 2 - 2, high - 10, bodyWidth + 4, low - high + 20);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, width * 0.1);
  ctx.beginPath();
  ctx.moveTo(x + bodyWidth / 2, high);
  ctx.lineTo(x + bodyWidth / 2, low);
  ctx.stroke();

  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.abs(close - open);
  
  if (bodyHeight < 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width * 0.15);
    ctx.beginPath();
    ctx.moveTo(x, close);
    ctx.lineTo(x + bodyWidth, close);
    ctx.stroke();
  } else {
    if (isHovered) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, bodyTop, bodyWidth, bodyHeight);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyTop, bodyWidth, bodyHeight);
  }
}

function drawSignal(ctx, signal, x, candleWidth, scaleY, candle, settings) {
  const { type } = signal;

  if (type === 'SSL' || type === 'BSL') {
    const y = type === 'SSL' ? scaleY(candle.low) : scaleY(candle.high);
    const color = type === 'SSL' ? '#00d4aa' : '#ff4976';
    
    ctx.fillStyle = color;
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(type, x + candleWidth / 2, y + (type === 'SSL' ? 20 : -10));

    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (type === 'BUY' || type === 'SELL') {
    const y = scaleY(candle.close);
    const color = type === 'BUY' ? '#00d4aa' : '#ff4976';
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (type === 'BUY') {
      ctx.moveTo(x + candleWidth / 2, y + 25);
      ctx.lineTo(x + candleWidth / 2 - 6, y + 35);
      ctx.lineTo(x + candleWidth / 2 + 6, y + 35);
    } else {
      ctx.moveTo(x + candleWidth / 2, y - 25);
      ctx.lineTo(x + candleWidth / 2 - 6, y - 35);
      ctx.lineTo(x + candleWidth / 2 + 6, y - 35);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(type, x + candleWidth / 2, y + (type === 'BUY' ? 50 : -40));
  }

  if (type === 'IMPULSE_UP' || type === 'IMPULSE_DOWN') {
    const color = type === 'IMPULSE_UP' ? '#58a6ff' : '#f85149';
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color + '30';
    ctx.fillRect(x, scaleY(candle.high), candleWidth, scaleY(candle.low) - scaleY(candle.high));
    ctx.shadowBlur = 0;

    const y = type === 'IMPULSE_UP' ? scaleY(candle.low) : scaleY(candle.high);
    ctx.font = 'bold 9px "JetBrains Mono"';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(
      type === 'IMPULSE_UP' ? '▲ BUYERS' : '▼ SELLERS',
      x + candleWidth / 2,
      y + (type === 'IMPULSE_UP' ? 20 : -10)
    );
  }

  if (type === 'MOMENTUM_BURST') {
    ctx.fillStyle = '#ffd60a';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', x + candleWidth / 2, scaleY(candle.high) - 8);
  }

  if (type === 'HIGH_PROBABILITY') {
    const yTop = scaleY(candle.high);
    const yBottom = scaleY(candle.low);
    
    ctx.fillStyle = signal.direction === 'bullish' ? '#00d4aa15' : '#ff497615';
    ctx.fillRect(x - 15, yTop, candleWidth + 30, yBottom - yTop);

    ctx.strokeStyle = signal.direction === 'bullish' ? '#00d4aa' : '#ff4976';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.strokeRect(x - 15, yTop, candleWidth + 30, yBottom - yTop);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 9px "JetBrains Mono"';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'center';
    ctx.fillText('🔥 INSTITUTIONAL', x + candleWidth / 2, yTop - 12);
    
    if (signal.mtfConfirmed) {
      ctx.fillText('MTF ✓', x + candleWidth / 2, yTop - 2);
    }
  }
}

function drawPriceAxis(ctx, width, padding, minPrice, maxPrice, scaleY) {
  ctx.fillStyle = '#8b949e';
  ctx.strokeStyle = '#21262d';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'left';

  const priceSteps = 8;
  const priceStep = (maxPrice - minPrice) / priceSteps;

  for (let i = 0; i <= priceSteps; i++) {
    const price = minPrice + priceStep * i;
    const y = scaleY(price);
    
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - padding.right, y);
    ctx.lineTo(width - padding.right + 5, y);
    ctx.stroke();
    
    ctx.fillStyle = '#8b949e';
    ctx.fillText(price.toFixed(2), width - padding.right + 8, y + 4);
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

  ctx.fillStyle = '#58a6ff';
  ctx.fillRect(width - padding.right + 10, y - 10, 70, 20);
  ctx.fillStyle = '#0a0e14';
  ctx.font = 'bold 11px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText(price.toFixed(2), width - padding.right + 45, y + 4);
}

function drawTimeAxis(ctx, candles, padding, chartWidth, candleWidth, height) {
  if (candles.length === 0) return;

  ctx.fillStyle = '#8b949e';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'center';

  const step = Math.max(1, Math.floor(candles.length / 8));
  
  for (let i = 0; i < candles.length; i += step) {
    const x = padding.left + i * candleWidth + candleWidth / 2;
    const date = new Date(candles[i].timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, x, height - 20);
  }
}

function CandleTooltip({ candle, position }) {
  const date = new Date(candle.timestamp);
  const isBullish = candle.close > candle.open;
  
  return (
    <div 
      className="candle-tooltip"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(0, 0)', // No transform needed, position is already calculated
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div className="tooltip-time">{date.toLocaleString()}</div>
      <div className="tooltip-row">
        <span>Open:</span>
        <span>{candle.open.toFixed(2)}</span>
      </div>
      <div className="tooltip-row">
        <span>High:</span>
        <span style={{color: '#00d4aa'}}>{candle.high.toFixed(2)}</span>
      </div>
      <div className="tooltip-row">
        <span>Low:</span>
        <span style={{color: '#ff4976'}}>{candle.low.toFixed(2)}</span>
      </div>
      <div className="tooltip-row">
        <span>Close:</span>
        <span style={{color: isBullish ? '#00d4aa' : '#ff4976'}}>
          {candle.close.toFixed(2)}
        </span>
      </div>
      <div className="tooltip-row">
        <span>Change:</span>
        <span style={{color: isBullish ? '#00d4aa' : '#ff4976'}}>
          {((candle.close - candle.open) / candle.open * 100).toFixed(2)}%
        </span>
      </div>
      {candle.volume > 0 && (
        <div className="tooltip-row">
          <span>Volume:</span>
          <span>{candle.volume.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

function ChartControls({ onZoomIn, onZoomOut, onResetZoom, onGoToStart, onGoToEnd }) {
  return (
    <div className="chart-controls-external">
      <button onClick={onGoToStart} title="Go to start (Home)" className="chart-btn">
        ⏮ First
      </button>
      <button onClick={onZoomOut} title="Zoom out (-)" className="chart-btn">
        − Zoom Out
      </button>
      <button onClick={onResetZoom} title="Reset zoom" className="chart-btn">
        ⊙ Reset
      </button>
      <button onClick={onZoomIn} title="Zoom in (+)" className="chart-btn">
        + Zoom In
      </button>
      <button onClick={onGoToEnd} title="Go to end (End)" className="chart-btn">
        Last ⏭
      </button>
    </div>
  );
}

