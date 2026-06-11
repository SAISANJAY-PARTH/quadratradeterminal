export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorRow extends OHLCV {
  EMA9: number;
  EMA20: number;
  EMA44: number;
  EMA50: number;
  EMA200: number;
  SMA50: number;
  SMA200: number;
  RSI: number;
  StochRSI: number;
  StochK: number;
  StochD: number;
  MACD: number;
  MACD_Signal: number;
  MACD_Hist: number;
  True_Range: number;
  True_ATR: number;
  ATR: number;
  Plus_DM: number;
  Minus_DM: number;
  Plus_DI: number;
  Minus_DI: number;
  ADX: number;
  VWAP: number;
  BB_Mid: number;
  BB_STD: number;
  BB_Upper: number;
  BB_Lower: number;
  BB_Width: number;
  BB_Pct: number;
  KC_Mid: number;
  KC_Upper: number;
  KC_Lower: number;
  Squeeze: boolean;
  Support: number;
  Resistance: number;
  Pivot: number;
  R1: number;
  S1: number;
  R2: number;
  S2: number;
  OBV: number;
  CMF: number;
  WilliamsR: number;
  CCI: number;
  Supertrend: number;
  ST_Dir: number;
  HA_Close: number;
  HA_Open: number;
  HA_High: number;
  HA_Low: number;
  ROC: number;
  MFI: number;
  PSAR: number;
}

export type Signal =
  | 'STRONG BUY'
  | 'BUY'
  | 'STRONG SELL'
  | 'SELL'
  | 'RANGE'
  | 'PULLBACK'
  | 'WAIT';

export interface SignalInfo {
  text: string;
  type: 'bull' | 'bear' | 'neutral';
}

export interface DecisionResult {
  finalSignal: Signal;
  rawSignal: Signal;
  bullScore: number;
  bearScore: number;
  bullPct: number;
  strategyMode: 'MEAN REVERSION' | 'TREND FOLLOWING' | 'NO TRADE';
  signals: SignalInfo[];
  rangeEvidence: string[];
  isRangeMarket: boolean;
  isWeakTrend: boolean;
  adxTrending: boolean;
  adxStrong: boolean;
  adxV: number;
  signalOverride: string | null;
  entryWarning: string | null;
  entry: number | null;
  sl: number | null;
  target: number | null;
  target2: number | null;
  rr: number;
  midPrice: number;
  techDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK/NONE';
  primaryTrendRead: string;
  momentumRead: string;
  flowRead: string;
  bbSqueezeRead: string;
  bbWidthNow: number;
  bbWidthAvg: number;
}

export interface QuoteInfo {
  lastPrice: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  marketCap: number | null;
  lastVolume: number | null;
  currency: string;
  symbol: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  label: string;
}

export interface NewsItem {
  title: string;
  link: string;
  published: string;
}

export type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';
export type ChartType = 'Candlestick' | 'Heikin Ashi' | 'Line';
export type IndicatorOption =
  | 'EMA' | 'SMA' | 'VWAP' | 'Bollinger Bands' | 'Keltner Channel'
  | 'Support/Resistance' | 'Pivot Points' | 'Supertrend' | 'PSAR'
  | 'RSI' | 'Stoch RSI' | 'MACD' | 'Williams %R' | 'CCI' | 'MFI'
  | 'Volume' | 'OBV' | 'CMF' | 'ATR' | 'ADX' | 'ROC';
