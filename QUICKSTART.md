# 🚀 Quick Start Guide

## Installation (2 minutes)

### 1. Install Dependencies
```bash
cd trading-app
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to: `http://localhost:3000`

---

## First Time Setup (30 seconds!)

### ⚡ FASTEST WAY - No API Key Needed

1. **Data Source**: Keep "Sample Data (No API Key Needed)" selected
2. **Timeframe**: Choose "5 Minutes"
3. **Click "Load Data"** - Instant realistic Gold data loads
4. **Click "Start"** - Watch signals appear!

**Done!** You're now analyzing liquidity sweeps on realistic Gold data.

---

## Alternative: Using Real Market Data

### Step 1: Get Finage API Key
1. Visit https://finage.co.uk
2. Sign up for free account
3. Navigate to API section
4. Copy your API key

### Step 2: Configure
1. Select "Real API Data (Finage)" from Data Source dropdown
2. Paste your API key in the "API Key" field
3. Choose symbol (XAU/USD recommended)
4. Select timeframe (5m for quick testing)

### Step 4: Adjust Settings (Optional)

**Recommended settings for Gold scalping:**
- Lookback: 20
- Range Multiplier: 2.5
- Body Ratio: 65%
- ✅ Enable MSS Confirmation
- ✅ Enable Impulse Detection
- ✅ Gold Aggressive Mode
- ✅ Multi-Timeframe Confirmation

### Step 5: Load Data
Click the blue **"Load Data"** button.

Wait 2-5 seconds for data to load.

### Step 6: Start Playback
Click the green **"Start"** button to begin signal detection.

Watch the chart as it:
- Renders candles progressively
- Detects liquidity sweeps
- Identifies impulse moves
- Shows institutional entry zones

---

## Understanding the Chart

### Color Coding

🟢 **Green Candles**: Bullish (close > open)  
🔴 **Red Candles**: Bearish (close < open)  
🔵 **Blue Line**: Current price  
📊 **Grid**: Price levels  

### Signal Markers

📍 **SSL** (below candle): Sell-side liquidity sweep  
📍 **BSL** (above candle): Buy-side liquidity sweep  
⬆️ **BUY** (green arrow): Confirmed bullish reversal  
⬇️ **SELL** (red arrow): Confirmed bearish reversal  
💎 **IMPULSE UP**: Rapid buyer aggression  
💀 **IMPULSE DOWN**: Rapid seller aggression  
⚡ **Lightning**: Momentum burst  
🔥 **INSTITUTIONAL**: High probability setup  

### HTF Bias Indicator

Top-right corner shows higher timeframe bias:
- **BULLISH** (green): HTF uptrend
- **BEARISH** (red): HTF downtrend
- **NEUTRAL** (yellow): No clear HTF direction

---

## Playback Controls

### Speed Settings
- **0.5x**: Slow (detailed analysis)
- **1x**: Normal (learning)
- **2x**: Moderate (review)
- **5x**: Fast (scanning)
- **10x**: Very fast (overview)

### Control Buttons
- **Start**: Begin playback from start
- **Resume**: Continue from current position
- **Pause**: Stop playback temporarily
- **Reset**: Clear all signals and restart

---

## Trade Log

The **Trade Log** at the bottom shows all detected signals:

- **Time**: When signal occurred
- **Type**: Signal category
- **Price**: Entry level
- **Timeframe**: Selected chart timeframe
- **Notes**: Additional context

Click on rows to review specific signals.

---

## Recommended Workflow

### For Learning:
1. Load 5m Gold data
2. Enable all detection features
3. Set playback to 1x speed
4. Watch each signal form
5. Study the trade log

### For Backtesting:
1. Load daily data (longer history)
2. Set strict settings (reduce false signals)
3. Use 5-10x playback speed
4. Count high probability setups
5. Track which setups had best follow-through

### For Real-Time Analysis:
1. Load 1m or 5m data
2. Enable Gold Aggressive Mode
3. Focus on high probability signals only
4. Watch HTF bias alignment
5. Use for confluence with your strategy

---

## Troubleshooting

**Q: No signals appearing?**  
A: Check that playback has started and settings aren't too strict.

**Q: API error?**  
A: Verify your API key is correct and has forex/gold access.

**Q: Chart is blank?**  
A: Click "Load Data" first, then "Start" playback.

**Q: Too many signals?**  
A: Increase Range Multiplier or enable Strict Mode.

**Q: Too few signals?**  
A: Enable Gold Mode or decrease thresholds.

---

## Tips for Best Results

✅ **Use multiple timeframes**: Confirm 5m signals with 15m/1h  
✅ **Watch HTF bias**: Only trade with higher timeframe direction  
✅ **Focus on high probability**: Best setups have all confluence factors  
✅ **Study false signals**: Learn what makes a weak vs strong setup  
✅ **Practice first**: Use playback to build pattern recognition  

---

## Next Steps

1. **Experiment with settings**: Find what works for your style
2. **Study patterns**: Notice which setups have best follow-through
3. **Add to strategy**: Use as confirmation for your existing approach
4. **Track performance**: Monitor which signals you would take
5. **Backtest thoroughly**: Test on months of historical data

---

## Need Help?

- Check the main README.md for detailed documentation
- Review the code comments for algorithm details
- Run `npm run dev` to see console logs
- Test detection with utils/tests.js

---

**You're ready to start analyzing institutional order flow! 🚀**
