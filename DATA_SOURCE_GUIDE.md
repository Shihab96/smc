# 📊 Data Source Guide

## Overview

The app supports **two data sources** - choose based on your needs:

---

## 🎯 Quick Comparison

| Feature | Sample Data | Real API Data |
|---------|-------------|---------------|
| **Setup Time** | 0 seconds ⚡ | ~2 minutes |
| **API Key Required** | ❌ No | ✅ Yes |
| **Cost** | 💰 Free | 💰 Free tier limited |
| **Internet Needed** | ❌ No | ✅ Yes |
| **Data Quality** | Realistic simulation | Real market data |
| **Date Range** | Last ~500 candles | Custom range |
| **Symbols Available** | XAU/USD only | Multiple pairs |
| **Best For** | Learning, testing | Serious analysis |

---

## 🆓 Option 1: Sample Data (Recommended for Beginners)

### ✅ Advantages

**Instant Start**
- No registration needed
- No API key needed
- Works offline
- Zero setup time

**Realistic Patterns**
- Built-in liquidity sweeps
- Displacement candles included
- Momentum bursts present
- Realistic Gold volatility
- Trend changes and reversals

**Perfect for Learning**
- Study signal formations
- Practice strategy development
- Test different settings
- Build pattern recognition
- No cost or limits

### ❌ Limitations

**Generated Data**
- Not real historical prices
- Cannot choose specific dates
- Limited to ~500 candles
- XAU/USD only (for now)
- May not perfectly match live behavior

### 🎓 Best Use Cases

1. **First-time users**: Learn how the app works
2. **Strategy testing**: Try different settings combinations
3. **Pattern recognition**: Study sweep formations
4. **Demos**: Show the tool to others
5. **Development**: Test code changes
6. **Offline analysis**: No internet required

### 💡 How It Works

The sample data generator creates realistic Gold price action:

```javascript
- Base price: ~$2050 (realistic Gold level)
- Volatility: Timeframe-adjusted (5m = 1.5 pips)
- Patterns injected:
  * 15% chance of liquidity sweeps
  * 8% chance of displacement candles
  * 5% chance of trend changes
- Volume: Randomized with spikes
- Timestamps: Properly spaced
```

### 🚀 Getting Started

1. Open app
2. Keep "Sample Data" selected
3. Click "Load Data"
4. Click "Start"
5. Done!

---

## 📈 Option 2: Real API Data (For Serious Traders)

### ✅ Advantages

**Authentic Data**
- Real historical prices
- Actual market conditions
- True volatility patterns
- Exact timestamps
- Real volume data

**Flexible Analysis**
- Choose any date range
- Multiple symbols (EUR/USD, GBP/USD, etc.)
- Different timeframes
- Up to 365 days of data
- Current market conditions

**Professional Use**
- Backtest strategies properly
- Validate edge statistically
- Study specific events
- Research market behavior
- Prepare for live trading

### ❌ Limitations

**Setup Required**
- Need Finage account
- API key configuration
- 2-5 minute setup
- Internet connection required

**Potential Costs**
- Free tier: Limited requests
- Paid tier: $19-79/month
- Rate limits apply
- May need subscription

**Dependencies**
- Finage uptime required
- API changes possible
- Rate limit delays
- Network latency

### 🎓 Best Use Cases

1. **Backtesting**: Validate strategy on real data
2. **Research**: Study specific market events
3. **Statistics**: Calculate actual win rates
4. **Preparation**: Analyze before live trading
5. **Multiple symbols**: Test EUR/USD, GBP/USD
6. **Long-term analysis**: 6-12 months of data

### 🔑 Getting Finage API Key

**Free Tier** (Good for testing):
```
1. Visit: https://finage.co.uk
2. Click "Sign Up"
3. Choose Free plan
4. Verify email
5. Go to Dashboard → API
6. Copy API key
```

**Limitations of Free Tier**:
- Limited API calls per day
- Delayed data (15 min)
- Basic support only

**Paid Plans** (For serious use):
- **Starter**: $19/month
- **Professional**: $49/month  
- **Enterprise**: $79/month

### 📊 Available Data

**Symbols Supported**:
- XAUUSD (Gold)
- EURUSD (Euro)
- GBPUSD (Pound)
- Many more forex pairs

**Timeframes**:
- 1 Minute
- 5 Minutes
- 15 Minutes
- 1 Hour
- 4 Hours
- Daily

**Date Ranges**:
- Intraday: Last 30 days
- Daily: Last 365 days

### 🚀 Getting Started

1. Get API key from Finage
2. Open app
3. Select "Real API Data"
4. Enter API key
5. Choose symbol & timeframe
6. Click "Load Data"
7. Wait 2-5 seconds
8. Click "Start"

---

## 🎯 Which Should You Use?

### Use Sample Data If:

✅ You're new to the app  
✅ Learning how signals work  
✅ Testing different settings  
✅ Don't have API key yet  
✅ Want instant results  
✅ Working offline  
✅ Showing demos  

### Use Real API Data If:

✅ Backtesting a strategy  
✅ Need specific dates/events  
✅ Validating an edge  
✅ Analyzing multiple symbols  
✅ Preparing for live trading  
✅ Research and statistics  
✅ Professional use  

---

## 🔄 Can I Switch Between Them?

**Yes!** You can switch anytime:

1. Change "Data Source" dropdown
2. Click "Load Data" again
3. The chart updates instantly

---

## 💡 Pro Tips

### For Sample Data:

```
✓ Start here - get familiar with the UI
✓ Test each preset strategy
✓ Learn what each signal looks like
✓ Experiment with extreme settings
✓ Use for teaching others
```

### For Real API Data:

```
✓ Sign up for free tier first
✓ Test with small date ranges
✓ Monitor API usage
✓ Save API key securely
✓ Upgrade plan if serious
```

### Hybrid Approach:

```
1. Learn on sample data (1 day)
2. Get free API key (5 minutes)
3. Validate on real data (1 week)
4. Upgrade if needed
```

---

## ❓ FAQ

**Q: Is sample data realistic enough?**  
A: Yes for learning patterns and testing settings. No for validating a real trading edge.

**Q: Can I trust sample data results?**  
A: Use it to learn, not to validate profitability. Real data required for serious backtesting.

**Q: How much does Finage cost?**  
A: Free tier available, paid plans start at $19/month.

**Q: Can sample data show me winning trades?**  
A: It shows realistic patterns, but don't assume same results on live data without testing.

**Q: Which is better for beginners?**  
A: Sample data - instant start, zero friction, perfect for learning.

**Q: When do I need real data?**  
A: When you want to backtest seriously or analyze specific market events.

**Q: Can I use other APIs besides Finage?**  
A: Currently only Finage supported, but code is open source for modifications.

---

## 🎓 Recommended Learning Path

### Week 1: Sample Data
```
Day 1-2: Learn the UI, run playback
Day 3-4: Test all presets
Day 5-7: Experiment with custom settings
```

### Week 2: Real Data
```
Day 1: Get free Finage API key
Day 2-3: Load real Gold data, compare patterns
Day 4-5: Test your favorite settings on real data
Day 6-7: Analyze specific events or sessions
```

### Week 3+: Serious Analysis
```
- Backtest your best setups
- Track statistics
- Validate edge
- Consider paid API plan
```

---

## 📞 Support

**Sample Data Issues:**
- Check browser console (F12)
- Verify app is running
- Try refreshing page

**API Data Issues:**
- Verify API key is correct
- Check Finage account status
- Test API key on Finage website
- Review rate limits

---

**Recommendation: Start with sample data today. Upgrade to real data when ready.** 🚀
