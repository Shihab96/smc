# 🚀 Liquidity Sweep Trader - Professional XAU/USD Analysis

A production-ready Next.js 14 trading analysis application that detects institutional order flow, liquidity sweeps, and rapid buyer/seller aggression zones — optimized specifically for Gold (XAU/USD).

**✨ New in v2.0:**
- 📅 **Date Range Selection** - Pick exact start/end dates for data
- 🔐 **Secure API Keys** - Environment variables (no hardcoding)
- 🎯 **Chart Navigation** - Jump to first/last candle instantly
- ⚡ **Instant Mode** - Optional playback (animated or show all signals)
- ⏰ **Hours Parameter** - Fetch data by hours (e.g., last 24 hours)

See [NEW_FEATURES.md](NEW_FEATURES.md) for complete details!

![Trading App](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Core Features

### 1. **Liquidity Sweep Detection**
- **Sell-Side Liquidity (SSL)**: Detects sweeps below equal lows followed by bullish reversals
- **Buy-Side Liquidity (BSL)**: Detects sweeps above equal highs followed by bearish reversals
- **Market Structure Shift (MSS)**: Confirms trend changes with break of structure

### 2. **Impulse Detection Engine**
- **Displacement Candles**: Identifies large range expansion candles indicating aggressive institutional entry
- **Momentum Bursts**: Detects 3-5 candle acceleration sequences
- **Compression Breakouts**: Identifies explosive moves after consolidation
- **Gold Aggressive Mode**: Optimized sensitivity for XAU/USD volatility

### 3. **Multi-Timeframe Confirmation**
- Automatic higher timeframe analysis (5m→15m, 15m→1h, etc.)
- HTF bias detection (bullish/bearish/neutral)
- Alignment checking between LTF signals and HTF structure
- Confluence-based high-probability setups

### 4. **Professional Visualization**
- Real-time candlestick chart with custom canvas rendering
- Color-coded signal markers (sweeps, impulses, confirmations)
- Institutional entry zone highlighting
- HTF bias indicator
- Interactive playback controls

### 5. **Trade Log System**
- Comprehensive signal logging
- Timestamp tracking
- Signal type categorization
- Performance notes and metrics

## 🛠 Tech Stack

- **Framework**: Next.js 14 (JavaScript)
- **Rendering**: HTML5 Canvas (high-performance charting)
- **Styling**: Custom CSS with terminal theme
- **Data**: Finage API (forex/gold data)
- **Architecture**: Serverless, zero-database

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- **Optional**: Finage API key ([Get one here](https://finage.co.uk)) - only needed for real data

### Setup

1. **Clone and install dependencies**:
```bash
cd trading-app
npm install
```

2. **Configure API Key (Optional - for real data only)**:
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your Finage API key
# FINAGE_API_KEY=your_actual_key_here
```

**Important:** Never commit `.env.local` to git (it's already in `.gitignore`)

3. **Run development server**:
```bash
npm run dev
```

4. **Open browser**:
```
http://localhost:3000
```

5. **Choose your data source**:
   - **Sample Data** (recommended for testing): No API key needed, works immediately
   - **Real API Data**: Uses your API key from `.env.local` for historical market data

## 🎮 Usage Guide

### Getting Started (Quick Start - No API Key)

1. **Open the app** at `http://localhost:3000`
2. **Data Source**: Keep "Sample Data" selected (default)
3. **Choose Timeframe**: Select 5m
4. **Load Data**: Click "Load Data" button
5. **Start Playback**: Click "Start" to begin signal detection

**That's it!** The app will use pre-generated realistic Gold data with built-in liquidity sweep patterns.

### Using Real Market Data (Optional)

1. **Get Finage API Key**: Sign up at https://finage.co.uk
2. **Select "Real API Data"** from Data Source dropdown
3. **Enter API Key**: Paste your key in the field
4. **Select Symbol**: Choose XAU/USD, EUR/USD, or GBP/USD
5. **Load Data**: Fetch real historical data

### Strategy Settings

#### Liquidity Settings
- **Lookback**: Number of candles to analyze for swing highs/lows (default: 20)
- **Wick Ratio**: Minimum wick size for sweep detection (default: 0.4)
- **Equal Tolerance**: Price tolerance for equal high/low detection (default: 0.0002)
- **Enable MSS**: Toggle market structure shift confirmation

#### Impulse Settings
- **Range Multiplier**: Candle must be X times larger than average (default: 2.5)
- **Body Ratio**: Minimum body size as % of total range (default: 65%)
- **Volume Multiplier**: Required volume spike (default: 1.8x)
- **Consecutive Momentum**: Number of candles for burst detection (default: 3)
- **ATR Multiplier**: Minimum move size relative to ATR (default: 1.5)

#### Gold Mode
When enabled, adjusts detection thresholds for XAU/USD's high volatility:
- Reduces range multiplier by 20%
- Lowers body ratio requirement by 10%
- Increases signal sensitivity for fast moves

#### Multi-Timeframe Settings
- **Enable MTF**: Activate higher timeframe analysis
- **Require HTF Bias**: Only signal when HTF bias aligns with LTF
- **Strict Mode**: Require all confluence factors (bias + level alignment)

### Signal Types

| Signal | Description | Visual |
|--------|-------------|--------|
| **SSL Candidate** | Sell-side liquidity swept | Green label below candle |
| **BSL Candidate** | Buy-side liquidity swept | Red label above candle |
| **BUY Confirmed** | Bullish MSS after SSL | Green arrow + label |
| **SELL Confirmed** | Bearish MSS after BSL | Red arrow + label |
| **Impulse Up** | Rapid buyer aggression | Blue glow + "▲ BUYERS" |
| **Impulse Down** | Rapid seller aggression | Red glow + "▼ SELLERS" |
| **Momentum Burst** | 3+ candle acceleration | ⚡ Lightning bolt |
| **High Probability** | Full confluence setup | 🔥 Institutional zone highlight |

### Playback Controls

- **Speed**: Adjust from 0.5x to 10x for different analysis speeds
- **Pause/Resume**: Control playback flow
- **Reset**: Clear all signals and restart from beginning

## 🧠 Detection Logic

### Liquidity Sweep Algorithm

```
1. Scan last N candles for swing highs/lows
2. Identify equal levels (within tolerance)
3. Check if current candle:
   - Swept beyond level (wick)
   - Closed back inside (strong body)
   - Closed opposite to sweep direction
4. If conditions met → Mark as SSL/BSL candidate
```

### MSS Confirmation

```
1. After sweep detected, monitor next candles
2. Check for break of recent structure:
   - Bullish: Close above prior swing high
   - Bearish: Close below prior swing low
3. If structure broken → Confirm as BUY/SELL
```

### Impulse Detection

```
1. Calculate average candle range (last 20)
2. Check if current candle:
   - Range > 2.5x average
   - Body > 65% of range
   - Close near high/low (within 15%)
   - Volume spike (if available)
3. If conditions met → Mark as IMPULSE_UP/DOWN
```

### High Probability Setup

```
Requires ALL of:
✓ Liquidity sweep (SSL or BSL)
✓ Displacement candle (within 3 candles)
✓ MSS confirmation
✓ HTF bias alignment (if MTF enabled)

Result: 🔥 INSTITUTIONAL ENTRY ZONE
```

## 🎨 UI Design

The application features a professional **terminal/trading platform aesthetic**:

- **Dark Theme**: Reduces eye strain during analysis
- **Monospace Fonts**: JetBrains Mono for data clarity
- **High Contrast**: Clear signal differentiation
- **Glowing Effects**: Highlights important institutional zones
- **Color Coding**: 
  - Green (#00d4aa): Bullish signals
  - Red (#ff4976): Bearish signals
  - Blue (#58a6ff): Informational/neutral
  - Yellow (#ffd60a): Momentum/acceleration
  - Purple (#bc8cff): High-confidence setups

## 📊 Architecture

```
trading-app/
├── app/
│   ├── api/
│   │   └── candles/
│   │       └── route.js          # Finage API proxy
│   ├── globals.css               # Terminal theme styles
│   ├── layout.js                 # Root layout
│   └── page.js                   # Main trading interface
├── components/
│   └── Chart.js                  # Canvas chart renderer
├── utils/
│   ├── liquidity.js              # Sweep detection engine
│   ├── impulse.js                # Displacement detection
│   └── mtf.js                    # Multi-timeframe analysis
├── package.json
├── next.config.js
└── README.md
```

## 🔧 Configuration

### Timeframe Hierarchy

The app automatically determines higher timeframes:

| Selected | Higher Timeframes Used |
|----------|------------------------|
| 1m | 5m + 15m |
| 5m | 15m + 1h |
| 15m | 1h + 4h |
| 1h | 4h + 1D |
| 4h | 1D |
| 1D | None |

### Data Fetching

- **Intraday**: Last 30 days of data
- **Daily**: Last 365 days of data
- **Auto-refresh**: Disabled (manual load only)
- **Max candles**: 50,000 per request

## 🚀 Performance

- **Canvas Rendering**: Smooth 60fps chart updates
- **Batch Detection**: Efficient signal processing
- **Precomputed Metrics**: ATR, averages cached
- **Progressive Display**: Candles render as playback progresses
- **No Re-computation**: Historical signals don't recalculate

## 📝 Best Practices

### For Scalping (1m - 5m)
1. Enable Gold Aggressive Mode
2. Set lookback to 15-20
3. Enable MTF with 15m/1h confirmation
4. Focus on High Probability setups only

### For Intraday (15m - 1h)
1. Standard settings work well
2. Increase lookback to 25-30
3. Require HTF bias alignment
4. Watch for momentum bursts

### For Swing Trading (4h - 1D)
1. Disable Gold Mode
2. Increase range multiplier to 3.0
3. Focus on MSS confirmations
4. HTF analysis less critical

## 🐛 Troubleshooting

### No signals appearing
- Check that playback has started
- Verify settings aren't too strict
- Ensure enough candles loaded (minimum 30)

### API errors
- Verify API key is valid
- Check symbol format (XAUUSD not XAU/USD)
- Ensure internet connection stable

### Slow playback
- Reduce playback speed
- Clear browser cache
- Close other resource-intensive tabs

## 🎯 Roadmap

- [ ] Add backtesting engine with P&L tracking
- [ ] Implement AI probability scoring
- [ ] Add alerts and notifications
- [ ] Export signals to CSV
- [ ] Save/load session states
- [ ] Add more symbols (stocks, crypto)
- [ ] Real-time data streaming
- [ ] Advanced fractal analysis

## 📄 License

MIT License - feel free to use and modify for your trading analysis.

## ⚠️ Disclaimer

This tool is for **educational and analytical purposes only**. It does not provide financial advice. Always do your own research and consult with licensed financial advisors before making trading decisions.

Past performance does not guarantee future results. Trading forex and gold involves substantial risk of loss.

---

**Built with 💎 for professional Gold traders**

*Optimized for institutional order flow analysis*
