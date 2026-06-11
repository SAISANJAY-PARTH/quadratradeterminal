import { IndicatorRow, DecisionResult, Signal, SignalInfo } from '../types';

export function runDecisionEngine(df: IndicatorRow[]): DecisionResult {
  if (df.length === 0) throw new Error('No data');

  const last = df[df.length - 1];
  const n = df.length;

  const safe = (v: number, fallback = 0) => (isNaN(v) ? fallback : v);

  const priceCur = last.close;
  const ema20V = safe(last.EMA20, priceCur);
  const ema50V = safe(last.EMA50, priceCur);
  const ema200V = safe(last.EMA200, priceCur);
  const rsiV = safe(last.RSI, 50);
  const macdV = safe(last.MACD, 0);
  const macdSig = safe(last.MACD_Signal, 0);
  const adxV = safe(last.ADX, 0);
  const atrV = safe(last.True_ATR, 0);
  const bbPct = safe(last.BB_Pct, 0.5);
  const cmfV = safe(last.CMF, 0);
  const cciV = safe(last.CCI, 0);
  const mfiV = safe(last.MFI, 50);
  const willR = safe(last.WilliamsR, -50);
  const stDir = last.ST_Dir;
  const psarV = safe(last.PSAR, 0);
  const obvSlope = n > 5 ? df[n - 1].OBV - df[n - 5].OBV : 0;

  // Candle structure
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  const body = Math.abs(last.close - last.open);
  const bearishRejection = upperWick > body * 1.5 && last.close < last.open;
  const bullishRejection = lowerWick > body * 1.5 && last.close > last.open;

  // Market structure
  const adxTrending = adxV > 20;
  const adxStrong = adxV > 25;
  const adxVeryWeak = adxV < 15;
  const adxSlope = n > 5 && !isNaN(df[n - 5].ADX) ? df[n - 1].ADX - df[n - 5].ADX : 0;
  const adxRising = adxSlope > 0;

  const bbWidthNow = safe(last.BB_Width, 0);
  const bbWidthSeries = df.slice(-50).map(r => safe(r.BB_Width, 0)).filter(v => v > 0);
  const bbWidthAvg = bbWidthSeries.length > 0 ? bbWidthSeries.reduce((a, b) => a + b, 0) / bbWidthSeries.length : bbWidthNow;
  const bbSqueeze = bbWidthNow < bbWidthAvg * 0.7;

  const emaSpreadPct = Math.abs(ema20V - ema50V) / (ema50V + 1e-10) * 100;
  const emaCompressed = emaSpreadPct < 1.5;

  const pullbackActive =
    priceCur < ema200V &&
    priceCur > ema20V &&
    rsiV > 50 &&
    macdV > macdSig;

  // Range evidence
  const rangeEvidence: string[] = [];
  if (adxVeryWeak) rangeEvidence.push(`ADX=${adxV.toFixed(1)} (< 15, no trend)`);
  if (emaCompressed) rangeEvidence.push(`EMA spread=${emaSpreadPct.toFixed(1)}% (< 1.5%, EMAs converging)`);
  if (bbSqueeze) rangeEvidence.push(`BB squeeze (bands tighter than avg ${(bbWidthAvg * 100).toFixed(2)}%)`);

  const isRangeMarket = rangeEvidence.length >= 2;
  const isWeakTrend = !adxTrending;

  let strategyMode: DecisionResult['strategyMode'];
  if (isRangeMarket) strategyMode = 'MEAN REVERSION';
  else if (adxV > 20 && adxRising) strategyMode = 'TREND FOLLOWING';
  else strategyMode = 'NO TRADE';

  const midPrice = (safe(last.Support, priceCur) + safe(last.Resistance, priceCur)) / 2;
  const midRange = Math.abs(priceCur - midPrice) < atrV * 1.2;

  // Scoring
  let bullScore = 0;
  let bearScore = 0;
  const signals: SignalInfo[] = [];

  // Trend (max 6)
  if (priceCur > ema200V) {
    bullScore += 2; signals.push({ text: '✅ Price > EMA200 (Uptrend)', type: 'bull' });
  } else {
    bearScore += 2; signals.push({ text: '❌ Price < EMA200 (Downtrend)', type: 'bear' });
  }

  if (ema20V > ema50V && ema50V > ema200V) {
    bullScore += 2; signals.push({ text: '✅ EMA stack bullish (20>50>200)', type: 'bull' });
  } else if (ema20V < ema50V && ema50V < ema200V) {
    bearScore += 2; signals.push({ text: '❌ EMA stack bearish (20<50<200)', type: 'bear' });
  } else {
    signals.push({ text: '⚠️ EMA stack mixed — possible transition/range', type: 'neutral' });
  }

  if (stDir === 1) {
    bullScore += 1; signals.push({ text: '✅ Supertrend Bullish', type: 'bull' });
  } else {
    bearScore += 1; signals.push({ text: '❌ Supertrend Bearish', type: 'bear' });
  }

  if (priceCur > psarV) {
    bullScore += 1; signals.push({ text: '✅ Price above PSAR', type: 'bull' });
  } else {
    bearScore += 1; signals.push({ text: '❌ Price below PSAR', type: 'bear' });
  }

  // Momentum (max 4)
  if (rsiV > 70) {
    bearScore += 1; signals.push({ text: `⚠️ RSI Overbought (${rsiV.toFixed(1)}) — potential reversal`, type: 'neutral' });
  } else if (rsiV > 50) {
    bullScore += 2; signals.push({ text: `✅ RSI bullish zone (${rsiV.toFixed(1)})`, type: 'bull' });
  } else if (rsiV >= 30) {
    bearScore += 2; signals.push({ text: `❌ RSI bearish zone (${rsiV.toFixed(1)})`, type: 'bear' });
  } else {
    bullScore += 1; signals.push({ text: `⚠️ RSI Oversold (${rsiV.toFixed(1)}) — potential bounce`, type: 'neutral' });
  }

  if (macdV > macdSig) {
    bullScore += 1; signals.push({ text: '✅ MACD bullish crossover', type: 'bull' });
  } else {
    bearScore += 1; signals.push({ text: '❌ MACD bearish crossover', type: 'bear' });
  }

  if (willR > -20) {
    bearScore += 1; signals.push({ text: `⚠️ Williams %R Overbought (${willR.toFixed(1)})`, type: 'neutral' });
  } else if (willR > -50) {
    bullScore += 1; signals.push({ text: `✅ Williams %R neutral-bull (${willR.toFixed(1)})`, type: 'bull' });
  } else if (willR < -80) {
    bullScore += 1; signals.push({ text: `⚠️ Williams %R Oversold (${willR.toFixed(1)})`, type: 'neutral' });
  } else {
    bearScore += 1; signals.push({ text: `❌ Williams %R bearish zone (${willR.toFixed(1)})`, type: 'bear' });
  }

  // Volume/Flow (max 3)
  if (cmfV > 0.05) {
    bullScore += 1; signals.push({ text: '✅ CMF positive (buying pressure)', type: 'bull' });
  } else if (cmfV < -0.05) {
    bearScore += 1; signals.push({ text: '❌ CMF negative (selling pressure)', type: 'bear' });
  } else {
    signals.push({ text: `⚠️ CMF near zero (${cmfV.toFixed(3)}) — neutral flow`, type: 'neutral' });
  }

  if (obvSlope > 0) {
    bullScore += 1; signals.push({ text: '✅ OBV rising (accumulation)', type: 'bull' });
  } else {
    bearScore += 1; signals.push({ text: '❌ OBV falling (distribution)', type: 'bear' });
  }

  if (mfiV > 60) {
    bullScore += 1; signals.push({ text: `✅ MFI bullish (${mfiV.toFixed(1)})`, type: 'bull' });
  } else if (mfiV < 40) {
    bearScore += 1; signals.push({ text: `❌ MFI bearish (${mfiV.toFixed(1)})`, type: 'bear' });
  } else {
    signals.push({ text: `⚠️ MFI neutral (${mfiV.toFixed(1)})`, type: 'neutral' });
  }

  // ADX context
  if (adxStrong) {
    signals.push({ text: `✅ ADX strong trend (${adxV.toFixed(1)}) — trend-follow OK`, type: bullScore > bearScore ? 'bull' : 'bear' });
  } else if (adxTrending) {
    signals.push({ text: `⚠️ ADX moderate (${adxV.toFixed(1)}) — light trend present`, type: 'neutral' });
  } else if (adxVeryWeak) {
    signals.push({ text: `⚠️ ADX very weak (${adxV.toFixed(1)}) — choppy/range market`, type: 'neutral' });
  } else {
    signals.push({ text: `⚠️ ADX weak (${adxV.toFixed(1)}) — range market, avoid trend signals`, type: 'neutral' });
  }

  // Raw signal
  const total = bullScore + bearScore;
  const bullPct = Math.round((bullScore / Math.max(total, 1)) * 100);

  let rawSignal: Signal;
  if (bullScore >= 9) rawSignal = 'STRONG BUY';
  else if (bullScore >= 6) rawSignal = 'BUY';
  else if (bearScore >= 9) rawSignal = 'STRONG SELL';
  else if (bearScore >= 6) rawSignal = 'SELL';
  else rawSignal = 'WAIT';

  // Decision logic
  let finalSignal: Signal = rawSignal;
  let signalOverride: string | null = null;
  let entryWarning: string | null = null;
  const rr = 2.5;

  if (strategyMode === 'NO TRADE') {
    finalSignal = 'WAIT';
    signalOverride = '⚠️ No clear structure (ADX too weak, not enough trend). Skip trades.';
  } else if (isRangeMarket) {
    if (midRange) {
      finalSignal = 'WAIT';
      signalOverride = '⚠️ Mid-range. No edge. Avoid trades.';
    } else {
      finalSignal = 'RANGE';
      if (rawSignal === 'BUY' || rawSignal === 'STRONG BUY') {
        signalOverride = '📦 Range: Signals near SUPPORT — buy only with tight stop.';
      } else if (rawSignal === 'SELL' || rawSignal === 'STRONG SELL') {
        signalOverride = '📦 Range: Signals near RESISTANCE — sell only with tight stop.';
      } else {
        signalOverride = '📦 Sideways market. Wait for extremes.';
      }
    }
  } else if (pullbackActive) {
    finalSignal = 'PULLBACK';
    signalOverride = '⚠️ Bearish trend + bullish pullback active. Wait for short entry on rejection.';
  } else if (isWeakTrend) {
    if (rawSignal === 'STRONG BUY') {
      finalSignal = 'BUY';
      signalOverride = `⚠️ Weak trend (ADX=${adxV.toFixed(1)}). Downgraded STRONG BUY → BUY.`;
    } else if (rawSignal === 'STRONG SELL') {
      finalSignal = 'SELL';
      signalOverride = `⚠️ Weak trend (ADX=${adxV.toFixed(1)}). Downgraded STRONG SELL → SELL.`;
    }
  }

  const momentumConflictBear = rsiV > 60 && macdV > macdSig;
  const momentumConflictBull = rsiV < 40 && macdV < macdSig;

  if ((finalSignal === 'SELL' || finalSignal === 'STRONG SELL') && momentumConflictBear) {
    finalSignal = 'WAIT';
    signalOverride = '⚠️ Bearish price structure but momentum indicators still bullish. Wait for momentum to turn.';
  }
  if ((finalSignal === 'BUY' || finalSignal === 'STRONG BUY') && momentumConflictBull) {
    finalSignal = 'WAIT';
    signalOverride = '⚠️ Bullish price structure but momentum is weak/bearish. Wait for momentum confirmation.';
  }

  if (adxV < 18) {
    finalSignal = 'WAIT';
    signalOverride = `⚠️ ADX=${adxV.toFixed(1)} — Insufficient trend strength. No reliable signal.`;
  } else if (adxV < 22 && (finalSignal === 'STRONG BUY' || finalSignal === 'STRONG SELL')) {
    finalSignal = finalSignal === 'STRONG BUY' ? 'BUY' : 'SELL';
    signalOverride = `⚠️ ADX=${adxV.toFixed(1)} — Borderline trend. Strength downgraded.`;
  }

  if ((finalSignal === 'SELL' || finalSignal === 'STRONG SELL') && !bearishRejection) {
    entryWarning = '⚠️ No strong bearish candle confirmation on latest bar — consider waiting one more candle';
  }
  if ((finalSignal === 'BUY' || finalSignal === 'STRONG BUY') && !bullishRejection) {
    entryWarning = '⚠️ No strong bullish candle confirmation on latest bar — consider waiting one more candle';
  }

  const isBuy = finalSignal === 'BUY' || finalSignal === 'STRONG BUY';
  const isSell = finalSignal === 'SELL' || finalSignal === 'STRONG SELL';
  const isRange = finalSignal === 'RANGE';

  let entry: number | null = null;
  let sl: number | null = null;
  let target: number | null = null;
  let target2: number | null = null;

  if (isBuy && !isRange && atrV > 0) {
    entry = priceCur;
    sl = priceCur - atrV * 1.5;
    target = priceCur + atrV * rr;
    target2 = priceCur + atrV * rr * 1.6;
  } else if (isSell && !isRange && atrV > 0) {
    entry = priceCur;
    sl = priceCur + atrV * 1.5;
    target = priceCur - atrV * rr;
    target2 = priceCur - atrV * rr * 1.6;
  }

  const techDirection: DecisionResult['techDirection'] =
    bullScore > bearScore ? 'BULLISH' : bearScore > bullScore ? 'BEARISH' : 'NEUTRAL';
  const trendStrength: DecisionResult['trendStrength'] =
    adxStrong ? 'STRONG' : adxTrending ? 'MODERATE' : 'WEAK/NONE';

  const primaryTrendRead = (priceCur < ema200V && ema20V < ema200V) ? 'Bearish' : 'Bullish';
  const momentumRead = (rsiV > 50 && macdV > macdSig) ? 'Bullish'
    : (rsiV < 50 && macdV < macdSig) ? 'Bearish' : 'Mixed';
  const flowRead = (obvSlope > 0 && cmfV > 0) ? 'Bullish (accumulation)'
    : (obvSlope < 0 && cmfV < 0) ? 'Bearish (distribution)' : 'Mixed';
  const bbSqueezeRead = bbSqueeze ? 'Squeeze — range likely' : bbWidthNow > bbWidthAvg * 1.3 ? 'Wide bands — volatile' : 'Normal';

  return {
    finalSignal, rawSignal, bullScore, bearScore, bullPct, strategyMode, signals,
    rangeEvidence, isRangeMarket, isWeakTrend, adxTrending, adxStrong, adxV,
    signalOverride, entryWarning, entry, sl, target, target2, rr, midPrice,
    techDirection, trendStrength, primaryTrendRead, momentumRead, flowRead,
    bbSqueezeRead, bbWidthNow, bbWidthAvg,
  };
}
