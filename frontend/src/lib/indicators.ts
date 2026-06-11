import { OHLCV, IndicatorRow } from '../types';

const NaN_ = NaN;

function ema(values: number[], span: number): number[] {
  const k = 2 / (span + 1);
  const result: number[] = new Array(values.length).fill(NaN_);
  let initialized = false;
  let prev = NaN_;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isNaN(v)) continue;
    if (!initialized) {
      result[i] = v;
      prev = v;
      initialized = true;
    } else {
      result[i] = v * k + prev * (1 - k);
      prev = result[i];
    }
  }
  return result;
}

function rollingMean(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN_);
  for (let i = window - 1; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      if (!isNaN(values[j])) { sum += values[j]; count++; }
    }
    if (count === window) result[i] = sum / count;
  }
  return result;
}

function rollingStd(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN_);
  for (let i = window - 1; i < values.length; i++) {
    let sum = 0, sqSum = 0, count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      if (!isNaN(values[j])) { sum += values[j]; sqSum += values[j] * values[j]; count++; }
    }
    if (count === window) {
      const mean = sum / count;
      result[i] = Math.sqrt(sqSum / count - mean * mean);
    }
  }
  return result;
}

function rollingMin(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN_);
  for (let i = window - 1; i < values.length; i++) {
    let min = Infinity;
    for (let j = i - window + 1; j <= i; j++) {
      if (!isNaN(values[j]) && values[j] < min) min = values[j];
    }
    if (min !== Infinity) result[i] = min;
  }
  return result;
}

function rollingMax(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN_);
  for (let i = window - 1; i < values.length; i++) {
    let max = -Infinity;
    for (let j = i - window + 1; j <= i; j++) {
      if (!isNaN(values[j]) && values[j] > max) max = values[j];
    }
    if (max !== -Infinity) result[i] = max;
  }
  return result;
}

function rollingSum(values: number[], window: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN_);
  for (let i = window - 1; i < values.length; i++) {
    let sum = 0, count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      if (!isNaN(values[j])) { sum += values[j]; count++; }
    }
    if (count === window) result[i] = sum;
  }
  return result;
}

export function computeIndicators(data: OHLCV[]): IndicatorRow[] {
  const n = data.length;
  if (n === 0) return [];

  const close = data.map(d => d.close);
  const open = data.map(d => d.open);
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const volume = data.map(d => d.volume);

  // EMAs
  const EMA9 = ema(close, 9);
  const EMA20 = ema(close, 20);
  const EMA44 = ema(close, 44);
  const EMA50 = ema(close, 50);
  const EMA200 = ema(close, 200);
  const SMA50 = rollingMean(close, 50);
  const SMA200 = rollingMean(close, 200);

  // RSI
  const delta = close.map((c, i) => i === 0 ? NaN_ : c - close[i - 1]);
  const gain = delta.map(d => isNaN(d) ? NaN_ : Math.max(d, 0));
  const loss = delta.map(d => isNaN(d) ? NaN_ : Math.max(-d, 0));
  const avgGain = ema(gain, 14);
  const avgLoss = ema(loss, 14);
  const RSI = avgGain.map((g, i) => {
    if (isNaN(g) || isNaN(avgLoss[i])) return NaN_;
    const rs = g / (avgLoss[i] + 1e-10);
    return 100 - (100 / (1 + rs));
  });

  // Stoch RSI
  const rsiMin = rollingMin(RSI, 14);
  const rsiMax = rollingMax(RSI, 14);
  const StochRSI = RSI.map((r, i) => {
    if (isNaN(r) || isNaN(rsiMin[i]) || isNaN(rsiMax[i])) return NaN_;
    return (r - rsiMin[i]) / (rsiMax[i] - rsiMin[i] + 1e-10) * 100;
  });
  const StochK = rollingMean(StochRSI, 3);
  const StochD = rollingMean(StochK, 3);

  // MACD
  const ema12 = ema(close, 12);
  const ema26 = ema(close, 26);
  const MACD = ema12.map((v, i) => (isNaN(v) || isNaN(ema26[i])) ? NaN_ : v - ema26[i]);
  const MACD_Signal = ema(MACD.map(v => isNaN(v) ? NaN_ : v), 9);
  const MACD_Hist = MACD.map((v, i) => (isNaN(v) || isNaN(MACD_Signal[i])) ? NaN_ : v - MACD_Signal[i]);

  // True Range & ATR (Wilder's EWM)
  const prevClose = [NaN_, ...close.slice(0, -1)];
  const True_Range = close.map((_, i) => {
    if (i === 0) return high[i] - low[i];
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - prevClose[i]);
    const tr3 = Math.abs(low[i] - prevClose[i]);
    return Math.max(tr1, tr2, tr3);
  });
  const True_ATR = ema(True_Range, 14);

  // ADX
  const highDiff = high.map((h, i) => i === 0 ? 0 : h - high[i - 1]);
  const lowDiff = low.map((l, i) => i === 0 ? 0 : low[i - 1] - l);
  const Plus_DM_raw = highDiff.map((hd, i) => (hd > lowDiff[i] && hd > 0) ? hd : 0);
  const Minus_DM_raw = lowDiff.map((ld, i) => (ld > highDiff[i] && ld > 0) ? ld : 0);
  const Plus_DM_smooth = ema(Plus_DM_raw, 14);
  const Minus_DM_smooth = ema(Minus_DM_raw, 14);
  const Plus_DI = Plus_DM_smooth.map((v, i) => (isNaN(v) || isNaN(True_ATR[i])) ? NaN_ : 100 * v / (True_ATR[i] + 1e-10));
  const Minus_DI = Minus_DM_smooth.map((v, i) => (isNaN(v) || isNaN(True_ATR[i])) ? NaN_ : 100 * v / (True_ATR[i] + 1e-10));
  const DX = Plus_DI.map((p, i) => {
    if (isNaN(p) || isNaN(Minus_DI[i])) return NaN_;
    return Math.abs(p - Minus_DI[i]) / (p + Minus_DI[i] + 1e-10) * 100;
  });
  const ADX = ema(DX, 14);

  // VWAP
  const cumPV: number[] = [];
  const cumV: number[] = [];
  let pv = 0, vol = 0;
  for (let i = 0; i < n; i++) {
    pv += close[i] * volume[i];
    vol += volume[i];
    cumPV.push(pv);
    cumV.push(vol);
  }
  const VWAP = cumPV.map((pv, i) => pv / (cumV[i] + 1e-10));

  // Bollinger Bands
  const BB_Mid = rollingMean(close, 20);
  const BB_STD = rollingStd(close, 20);
  const BB_Upper = BB_Mid.map((m, i) => isNaN(m) ? NaN_ : m + 2 * BB_STD[i]);
  const BB_Lower = BB_Mid.map((m, i) => isNaN(m) ? NaN_ : m - 2 * BB_STD[i]);
  const BB_Width = BB_Mid.map((m, i) => (isNaN(m) || isNaN(BB_Upper[i])) ? NaN_ : (BB_Upper[i] - BB_Lower[i]) / (m + 1e-10));
  const BB_Pct = close.map((c, i) => isNaN(BB_Lower[i]) ? NaN_ : (c - BB_Lower[i]) / (BB_Upper[i] - BB_Lower[i] + 1e-10));

  // Keltner Channel
  const KC_Mid = ema(close, 20);
  const KC_Upper = KC_Mid.map((m, i) => isNaN(m) ? NaN_ : m + 2 * True_ATR[i]);
  const KC_Lower = KC_Mid.map((m, i) => isNaN(m) ? NaN_ : m - 2 * True_ATR[i]);
  const Squeeze = BB_Width.map((bw, i) => {
    if (isNaN(bw) || isNaN(KC_Upper[i]) || isNaN(KC_Mid[i])) return false;
    return bw < (KC_Upper[i] - KC_Lower[i]) / (KC_Mid[i] + 1e-10);
  });

  // Support / Resistance / Pivots
  const Support = rollingMin(low, 20);
  const Resistance = rollingMax(high, 20);
  const Pivot = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const R1 = Pivot.map((p, i) => 2 * p - low[i]);
  const S1 = Pivot.map((p, i) => 2 * p - high[i]);
  const R2 = Pivot.map((p, i) => p + (high[i] - low[i]));
  const S2 = Pivot.map((p, i) => p - (high[i] - low[i]));

  // OBV
  const OBV: number[] = [0];
  for (let i = 1; i < n; i++) {
    if (close[i] > close[i - 1]) OBV.push(OBV[i - 1] + volume[i]);
    else if (close[i] < close[i - 1]) OBV.push(OBV[i - 1] - volume[i]);
    else OBV.push(OBV[i - 1]);
  }

  // CMF
  const mfv = close.map((c, i) => ((c - low[i]) - (high[i] - c)) / (high[i] - low[i] + 1e-10) * volume[i]);
  const mfvSum = rollingSum(mfv, 20);
  const volSum = rollingSum(volume, 20);
  const CMF = mfvSum.map((m, i) => isNaN(m) ? NaN_ : m / (volSum[i] + 1e-10));

  // Williams %R
  const highMax14 = rollingMax(high, 14);
  const lowMin14 = rollingMin(low, 14);
  const WilliamsR = close.map((c, i) => isNaN(highMax14[i]) ? NaN_ : -100 * (highMax14[i] - c) / (highMax14[i] - lowMin14[i] + 1e-10));

  // CCI
  const tp = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const tpMean = rollingMean(tp, 20);
  const tpStd = rollingStd(tp, 20);
  const CCI = tp.map((t, i) => isNaN(tpMean[i]) ? NaN_ : (t - tpMean[i]) / (0.015 * tpStd[i] + 1e-10));

  // Supertrend
  const basicUpper = close.map((_, i) => (high[i] + low[i]) / 2 + 3 * True_ATR[i]);
  const basicLower = close.map((_, i) => (high[i] + low[i]) / 2 - 3 * True_ATR[i]);
  const finalUpper = [...basicUpper];
  const finalLower = [...basicLower];
  const Supertrend: number[] = new Array(n).fill(0);
  const ST_Dir: number[] = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    finalUpper[i] = (basicUpper[i] < finalUpper[i - 1] || close[i - 1] > finalUpper[i - 1])
      ? basicUpper[i] : finalUpper[i - 1];
    finalLower[i] = (basicLower[i] > finalLower[i - 1] || close[i - 1] < finalLower[i - 1])
      ? basicLower[i] : finalLower[i - 1];

    if (ST_Dir[i - 1] === 1) {
      ST_Dir[i] = close[i] < finalLower[i] ? -1 : 1;
    } else {
      ST_Dir[i] = close[i] > finalUpper[i] ? 1 : -1;
    }
    Supertrend[i] = ST_Dir[i] === 1 ? finalLower[i] : finalUpper[i];
  }

  // Heikin Ashi
  const HA_Close = close.map((c, i) => (open[i] + high[i] + low[i] + c) / 4);
  const HA_Open: number[] = new Array(n).fill(NaN_);
  HA_Open[0] = open[0];
  for (let i = 1; i < n; i++) HA_Open[i] = (HA_Open[i - 1] + HA_Close[i - 1]) / 2;
  const HA_High = HA_Open.map((ho, i) => Math.max(high[i], ho, HA_Close[i]));
  const HA_Low = HA_Open.map((ho, i) => Math.min(low[i], ho, HA_Close[i]));

  // ROC
  const ROC = close.map((c, i) => i < 10 ? NaN_ : (c - close[i - 10]) / close[i - 10] * 100);

  // MFI
  const tp2 = tp;
  const mf2 = tp2.map((t, i) => t * volume[i]);
  const posMF: number[] = new Array(n).fill(0);
  const negMF: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    posMF[i] = tp2[i] > tp2[i - 1] ? mf2[i] : 0;
    negMF[i] = tp2[i] < tp2[i - 1] ? mf2[i] : 0;
  }
  const posMFSum = rollingSum(posMF, 14);
  const negMFSum = rollingSum(negMF, 14);
  const MFI = posMFSum.map((p, i) => isNaN(p) ? NaN_ : 100 - 100 / (1 + p / (negMFSum[i] + 1e-10)));

  // Parabolic SAR
  let af = 0.02, maxAf = 0.20;
  let sar = low[0];
  let trend = 1;
  let ep = high[0];
  const PSAR: number[] = [];
  for (let i = 0; i < n; i++) {
    PSAR.push(sar);
    if (trend === 1) {
      sar = sar + af * (ep - sar);
      sar = Math.min(sar, low[Math.max(0, i - 1)], low[Math.max(0, i - 2)]);
      if (low[i] < sar) {
        trend = -1; sar = ep; ep = low[i]; af = 0.02;
      } else {
        if (high[i] > ep) { ep = high[i]; af = Math.min(af + 0.02, maxAf); }
      }
    } else {
      sar = sar + af * (ep - sar);
      sar = Math.max(sar, high[Math.max(0, i - 1)], high[Math.max(0, i - 2)]);
      if (high[i] > sar) {
        trend = 1; sar = ep; ep = high[i]; af = 0.02;
      } else {
        if (low[i] < ep) { ep = low[i]; af = Math.min(af + 0.02, maxAf); }
      }
    }
  }

  return data.map((d, i) => ({
    ...d,
    EMA9: EMA9[i], EMA20: EMA20[i], EMA44: EMA44[i], EMA50: EMA50[i], EMA200: EMA200[i],
    SMA50: SMA50[i], SMA200: SMA200[i],
    RSI: RSI[i], StochRSI: StochRSI[i], StochK: StochK[i], StochD: StochD[i],
    MACD: MACD[i], MACD_Signal: MACD_Signal[i], MACD_Hist: MACD_Hist[i],
    True_Range: True_Range[i], True_ATR: True_ATR[i], ATR: True_ATR[i],
    Plus_DM: Plus_DM_raw[i], Minus_DM: Minus_DM_raw[i],
    Plus_DI: Plus_DI[i], Minus_DI: Minus_DI[i], ADX: ADX[i],
    VWAP: VWAP[i],
    BB_Mid: BB_Mid[i], BB_STD: BB_STD[i], BB_Upper: BB_Upper[i], BB_Lower: BB_Lower[i],
    BB_Width: BB_Width[i], BB_Pct: BB_Pct[i],
    KC_Mid: KC_Mid[i], KC_Upper: KC_Upper[i], KC_Lower: KC_Lower[i], Squeeze: Squeeze[i],
    Support: Support[i], Resistance: Resistance[i],
    Pivot: Pivot[i], R1: R1[i], S1: S1[i], R2: R2[i], S2: S2[i],
    OBV: OBV[i], CMF: CMF[i], WilliamsR: WilliamsR[i], CCI: CCI[i],
    Supertrend: Supertrend[i], ST_Dir: ST_Dir[i],
    HA_Close: HA_Close[i], HA_Open: HA_Open[i], HA_High: HA_High[i], HA_Low: HA_Low[i],
    ROC: ROC[i], MFI: MFI[i], PSAR: PSAR[i],
  }));
}
