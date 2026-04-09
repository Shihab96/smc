# Buy and Sell Signal Strategy Guide

## Purpose

This document explains a clean chart strategy that shows only two signals:

- `BUY`
- `SELL`

The goal is to keep the chart readable while still letting the system use richer internal analysis.

## Core Idea

The chart should answer one question:

**Is price more likely to move up or down from here?**

To answer that, the strategy looks for:

1. Market context
2. Liquidity sweep or key level reaction
3. Confirmation candle
4. Volume and volatility validation

When these parts line up, the chart prints a buy or sell signal.

## Operating Modes

### Swing Mode

- Higher timeframes
- More confirmation
- Fewer signals
- Better for broader trend trades

### Scalping Mode

- Faster entries
- Lower confirmation threshold
- More focus on volume, session timing, and candle quality
- Best on active markets only

Recommended scalping defaults:

- Entry timeframe: `1m` or `3m` if available
- Bias timeframe: `5m` and `15m`
- Optional context: `1h`
- Confirmation candles: `1-2`
- Volume spike: about `1.5x` recent average
- Strong candle body: at least `70%` of candle range
- Keep risk tight and exits fast

## Strategy Logic

### 1. Market Context

Before any signal is shown, check:

- Is price trending up, down, or ranging?
- Is price in premium or discount?
- Is there nearby liquidity above or below price?
- Is the higher timeframe bias aligned, neutral, or strongly opposite?

For scalping, avoid making higher timeframe bias too strict. Neutral is acceptable if the setup is clean and the bias is not directly opposite.

### 2. Volume Confirmation

Volume should confirm the move, especially on the sweep candle.

Use one of these:

- Volume spike on the signal candle
- Relative volume above a chosen threshold
- Higher-than-average volume compared with the last few candles

If volume is weak, skip the signal.

### 3. Volatility Filter

Do not trade when the market is too dead or too wild.

Skip signals when:

- ATR is unusually low
- ATR is exploding after a news spike
- Price has already moved too far too fast
- Bollinger Bands are compressed so tightly that follow-through is unlikely

### 4. Buy Signal Conditions

Show a `BUY` when price has bullish intent.

A strong scalp BUY often looks like:

- Price is in discount or near support
- Sell-side liquidity is swept
- Price reclaims the sweep level within `1-2` candles
- The confirmation candle closes with a strong body
- Volume confirms the move
- Higher timeframe bias is bullish or neutral
- Price is above VWAP, or reclaims VWAP after the sweep

Simple rule:

```text
BUY = discount + liquidity sweep + bullish reclaim + volume + acceptable volatility
```

### 5. Sell Signal Conditions

Show a `SELL` when price has bearish intent.

A strong scalp SELL often looks like:

- Price is in premium or near resistance
- Buy-side liquidity is swept
- Price loses the sweep level within `1-2` candles
- The confirmation candle closes with a strong body
- Volume confirms the move
- Higher timeframe bias is bearish or neutral
- Price is below VWAP, or rejects VWAP after the sweep

Simple rule:

```text
SELL = premium + liquidity sweep + bearish reclaim failure + volume + acceptable volatility
```

## Micro-Structure Confirmation

For scalping, define confirmation clearly.

### BUY

- Wick below the sweep level
- Close back above the sweep level
- Body is at least half of the candle range
- Ideally the close is near the candle high

### SELL

- Wick above the sweep level
- Close back below the sweep level
- Body is at least half of the candle range
- Ideally the close is near the candle low

This is the acceptance rule: the market must accept the reversal, not just poke through the level.

## Indicator Settings for Scalping

If you use oscillators or trend tools, keep them fast.

| Indicator | Slower Setting | Scalping Setting |
|-----------|----------------|------------------|
| Stochastic | 14,3,3 | `5,3,3` or `9,3,1` |
| RSI | 14 | `5` or `7` |
| MACD | 12,26,9 | `8,17,9` or `6,13,5` |
| EMA | 50/200 | `9` and `21` |

Use these as support, not as the only trigger. If they slow the setup too much, simplify them.

## Session Filters

Liquidity behaves differently by session.

- Trade active sessions only
- London open and New York open are usually the best scalping windows
- Avoid lunch hours if the market gets choppy
- Pause around high-impact news
- Use tighter stops in active sessions and skip low-liquidity periods

## Risk Rules

Scalping needs strict risk control.

- Risk very little per trade
- Use a tight stop, usually beyond the sweep wick or about `1-2 ATR`
- Target at least `1:1.5`, ideally `1:2`
- Limit trades per hour
- Add a cooldown after losses
- If a scalp hesitates, exit early instead of hoping

## What the Chart Should Show

Keep the display minimal:

- Green marker below candle for `BUY`
- Red marker above candle for `SELL`
- Optional small `BUY` or `SELL` label

Do not show extra labels unless they are needed for debugging.

## What the Chart Should Not Show

Hide:

- Trend labels
- Internal calculation labels
- Debug messages
- Secondary pattern names
- Multiple entry variants

The cleaner the chart, the easier it is to trade from.

## Signal Filter Rules

To avoid noisy signals:

- Only one signal per swing
- Wait for candle close before confirming
- Do not print signals within `3` candles of the previous signal
- Reset after a structure break or after a short cooldown
- Skip signals in the middle of the range
- Skip signals if the market is too flat
- Skip signals against a strong higher timeframe bias
- Do not require every indicator to agree or the chart may go silent

## Example Workflow

1. Price moves into a key area
2. Liquidity is swept
3. Volume expands
4. The next candle closes back through the level
5. VWAP and timeframe bias are not strongly opposite
6. The system prints either `BUY` or `SELL`
7. No other signal types are shown on the chart

## Pseudocode

```text
if session is active
  and volatility is acceptable
  and price is in discount
  and sell_side_liquidity_swept
  and bullish_reclaim_close
  and volume is strong
  and htf_bias is not strongly bearish:
    show BUY

if session is active
  and volatility is acceptable
  and price is in premium
  and buy_side_liquidity_swept
  and bearish_reclaim_close
  and volume is strong
  and htf_bias is not strongly bullish:
    show SELL
```

## Quick Troubleshooting

If you see no signals:

- Lower the higher timeframe strictness from "match only" to "not strongly opposite"
- Reduce confirmation from `3` candles to `1-2`
- Make volume confirmation relative, not absolute
- Allow neutral bias when the market is not trending
- Remove any hard FVG requirement
- Check whether session filters are excluding too much
- Make sure the market actually has volatility

## Summary

If you want a chart that shows only buy and sell signals, the best setup is:

- Use market context first
- Require liquidity sweep plus candle acceptance
- Confirm with volume
- Filter by session and volatility
- Keep the chart limited to one clear marker: `BUY` or `SELL`

Start with volume confirmation and timeframe alignment. Those two filters usually have the biggest impact on whether scalping signals appear and whether they are worth taking.
